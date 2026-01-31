
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import { AppView, Agent, UserRole } from './types';
import { INITIAL_AGENTS } from './mockData';
import DigitalIdCard, { formatDriveUrl } from './components/DigitalIdCard';
import IntelligenceCenter from './components/IntelligenceCenter';
import { EnrollmentForm } from './components/EnrollmentForm';
import { fetchAgentsFromSheets, submitTransaction, updateAgentPoints, resetPasswordWithAnswer, updateAgentPin } from './services/sheetsService';
import {
  Search,
  RefreshCw,
  Database,
  Eye,
  EyeOff,
  X,
  Activity,
  AlertCircle
} from 'lucide-react';
import { getTacticalAnalysis } from './services/geminiService';
import jsQR from 'jsqr';

const OFFICIAL_LOGO = "1DYDTGzou08o0NIPuCPH9JvYtaNFf2X5f"; // ID Real de Consagrados 2026

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<Agent | null>(null);
  const [loginId, setLoginId] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loginError, setLoginError] = useState<{ field: 'id' | 'pin' | 'both' | null, message: string | null }>({ field: null, message: null });

  const [view, setView] = useState<AppView>(AppView.PROFILE);
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [intelReport, setIntelReport] = useState<string>('SISTEMAS EN LÍNEA...');
  const [scanStatus, setScanStatus] = useState<'IDLE' | 'SCANNING' | 'SUCCESS'>('IDLE');
  const [scannedId, setScannedId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [foundAgent, setFoundAgent] = useState<Agent | null>(null);
  const [scannedAgentForPoints, setScannedAgentForPoints] = useState<Agent | null>(null);
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);

  // Estados de Seguridad Avanzada
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'ID' | 'QUESTION' | 'SUCCESS'>('ID');
  const [securityAnswerInput, setSecurityAnswerInput] = useState('');
  const [resetError, setResetError] = useState('');
  const [revealedPin, setRevealedPin] = useState('');
  const [isMustChangeFlow, setIsMustChangeFlow] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [newQuestionInput, setNewQuestionInput] = useState('');
  const [newAnswerInput, setNewAnswerInput] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (view === AppView.SCANNER) {
      let active = true;
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: 1280, height: 720 }
          });
          if (videoRef.current && active) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', { willReadFrequently: true });

            let lastScanTime = 0;
            const scan = () => {
              if (!active) return;
              if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && context) {
                // Optimización: Escanear a baja resolución para mayor velocidad
                const scanWidth = Math.min(videoRef.current.videoWidth, 480);
                const scanHeight = Math.min(videoRef.current.videoHeight, Math.floor(480 * (videoRef.current.videoHeight / videoRef.current.videoWidth)));

                canvas.width = scanWidth;
                canvas.height = scanHeight;
                context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

                try {
                  const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "attemptBoth",
                  });

                  if (code && code.data && code.data !== scannedId && scanStatus === 'IDLE') {
                    const now = Date.now();
                    if (now - lastScanTime > 2000) {
                      console.log("✅ QR DETECTADO:", code.data);
                      setScannedId(code.data);

                      const scannerFrame = document.querySelector('.scanner-frame');
                      if (scannerFrame) {
                        scannerFrame.classList.add('border-green-500', 'shadow-[0_0_30px_rgba(34,197,94,0.5)]');
                        setTimeout(() => {
                          scannerFrame.classList.remove('border-green-500', 'shadow-[0_0_30px_rgba(34,197,94,0.5)]');
                        }, 500);
                      }
                      lastScanTime = now;
                      setTimeout(() => processScan(code.data), 500);
                    }
                  } else if (!code && scanStatus === 'IDLE' && scannedId) {
                    setScannedId('');
                  }
                } catch (qrErr) {
                  console.error("Error en jsQR loop:", qrErr);
                }
              }
              requestAnimationFrame(scan);
            };
            console.log("🚀 Iniciando loop de escaneo...");
            requestAnimationFrame(scan);
          }
        } catch (err) {
          console.error("Error al acceder a la cámara:", err);
          alert("NO SE PUDO ACTIVAR LA CÁMARA. ASEGÚRATE DE DAR PERMISOS.");
        }
      };
      startCamera();

      return () => {
        active = false;
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [view]);

  const syncData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsSyncing(true);
    try {
      const sheetAgents = await fetchAgentsFromSheets();
      if (sheetAgents && sheetAgents.length > 0) {
        setAgents(sheetAgents);
        if (currentUser) {
          const updatedSelf = sheetAgents.find(a =>
            String(a.id).toUpperCase().replace(/[^0-9A-Z]/gi, '') === String(currentUser.id).toUpperCase().replace(/[^0-9A-Z]/gi, '')
          );
          if (updatedSelf) setCurrentUser(updatedSelf);
        }
      }
    } catch (err) {
      console.error("Sync error", err);
    } finally {
      if (!isSilent) setIsSyncing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    syncData();
    const interval = setInterval(() => syncData(true), 60000);
    return () => clearInterval(interval);
  }, [syncData]);

  useEffect(() => {
    if (isLoggedIn && agents.length > 0) {
      const fetchIntel = async () => {
        const analysis = await getTacticalAnalysis(agents);
        setIntelReport(analysis || 'ESTATUS NOMINAL.');
      };
      fetchIntel();
    }
  }, [isLoggedIn, agents]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError({ field: null, message: null });

    const inputId = loginId.trim();
    const pinEntered = loginPin.trim();

    // Nueva lógica de búsqueda más robusta que se centra en la parte numérica del ID.
    const getNumericPart = (s: string) => String(s).replace(/[^0-9]/g, '');
    const inputNumericId = getNumericPart(inputId);

    if (inputNumericId.length === 0) {
      setLoginError({ field: 'id', message: `EL ID DEBE CONTENER NÚMEROS.` });
      return;
    }

    const user = agents.find(a => {
      const agentNumericId = getNumericPart(a.id);
      return agentNumericId.length > 0 && agentNumericId === inputNumericId;
    });

    if (user) {
      if (String(user.pin).trim() === pinEntered) {
        if (user.mustChangePassword) {
          setCurrentUser(user);
          setIsMustChangeFlow(true);
          return;
        }
        setCurrentUser(user);
        setIsLoggedIn(true);
        if (user.userRole === UserRole.DIRECTOR) setView(AppView.CIU);
        else if (user.userRole === UserRole.LEADER) setView(AppView.DIRECTORY);
        else setView(AppView.PROFILE);
      } else {
        setLoginError({ field: 'pin', message: `PIN INCORRECTO PARA ID: ${user.id}` });
      }
    } else {
      setLoginError({ field: 'id', message: `ID '${loginId}' NO RECONOCIDO EN EL DIRECTORIO.` });
    }
  };

  const handleManualPinChange = async () => {
    if (!currentUser) return;
    if (!newPinInput || !confirmPinInput || !newQuestionInput || !newAnswerInput) {
      alert("TODOS LOS CAMPOS SON REQUERIDOS (PIN, PREGUNTA Y RESPUESTA)");
      return;
    }
    if (newPinInput !== confirmPinInput) {
      alert("LOS PINS NO COINCIDEN");
      return;
    }
    // Validación alfanumérica simple
    const isAlphanumeric = /^[a-z0-9]+$/i.test(newPinInput);
    if (!isAlphanumeric) {
      alert("EL PIN DEBE SER ALFANUMÉRICO (LETRAS Y NÚMEROS)");
      return;
    }

    setIsUpdatingPin(true);
    try {
      const res = await updateAgentPin(currentUser.id, newPinInput, newQuestionInput, newAnswerInput);
      if (res.success) {
        alert("PERFIL DE SEGURIDAD ACTUALIZADO. INICIA SESIÓN CON TU NUEVO PIN.");
        setIsMustChangeFlow(false);
        setLoginPin('');
        syncData();
      } else {
        alert("ERROR AL ACTUALIZAR SEGURIDAD");
      }
    } catch (err) {
      alert("FALLO DE CONEXIÓN");
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleRequestQuestion = async () => {
    setResetError('');
    const inputId = loginId.trim();
    if (!inputId) {
      setResetError("INGRESA TU ID PARA RECUPERAR");
      return;
    }

    const user = agents.find(a => String(a.id).replace(/[^0-9]/g, '') === inputId.replace(/[^0-9]/g, ''));
    if (!user) {
      setResetError("AGENTE NO IDENTIFICADO");
      return;
    }

    setForgotPasswordStep('QUESTION');
  };

  const handleVerifyAnswer = async () => {
    setResetError('');
    const user = agents.find(a => String(a.id).replace(/[^0-9]/g, '') === loginId.replace(/[^0-9]/g, ''));
    if (!user) return;

    try {
      const res = await resetPasswordWithAnswer(user.id, securityAnswerInput);
      if (res.success) {
        setRevealedPin(res.pin);
        setForgotPasswordStep('SUCCESS');
      } else {
        setResetError("RESPUESTA INCORRECTA");
      }
    } catch (err) {
      setResetError("FALLO TÁCTICO EN CONEXIÓN");
    }
  };

  const handleEnrollmentSuccess = () => {
    // Al inscribir con éxito, forzamos una resincronización para ver al nuevo agente
    alert("¡Agente registrado con éxito! Actualizando directorio...");
    syncData();
    // Opcionalmente, cambiar a la vista de directorio para ver al nuevo agente
    setView(AppView.DIRECTORY);
  };

  const processScan = async (idToProcess?: string) => {
    const id = idToProcess || scannedId;
    if (!id || scanStatus !== 'IDLE') return;

    setScanStatus('SCANNING');
    try {
      const result = await submitTransaction(id, 'ASISTENCIA');
      if (result.success) {
        setScanStatus('SUCCESS');

        // Buscar al agente escaneado para el formulario de puntos
        const agent = agents.find(a => String(a.id) === String(id));
        if (agent) setScannedAgentForPoints(agent);

        setTimeout(() => {
          setScanStatus('IDLE');
          setScannedId('');
        }, 3000);
      } else {
        alert(result.error || "No se pudo registrar.");
        setScanStatus('IDLE');
        setScannedId(''); // Importante: desbloquear para reintento
      }
    } catch (err) {
      alert("ERROR DE CONEXIÓN AL REGISTRAR.");
      setScanStatus('IDLE');
      setScannedId('');
    }
  };

  const handleIncrementPoints = async (type: 'BIBLIA' | 'APUNTES' | 'LIDERAZGO') => {
    if (!scannedAgentForPoints) return;
    setIsUpdatingPoints(true);
    try {
      const res = await updateAgentPoints(scannedAgentForPoints.id, type, 10);
      if (res.success) {
        alert(`+10 PUNTOS DE ${type} ASIGNADOS A ${scannedAgentForPoints.name.split(' ')[0]}`);
        syncData(); // Sincronizar para ver los nuevos puntos
      } else {
        alert("ERROR AL ACTUALIZAR PUNTOS");
      }
    } catch (err) {
      alert("FALLO TÁCTICO EN CONEXIÓN");
    } finally {
      setIsUpdatingPoints(false);
    }
  };

  const renderContent = () => {
    switch (view) {
      case AppView.CIU:
        return <IntelligenceCenter key={currentUser?.id} agents={agents} currentUser={currentUser} onUpdateNeeded={syncData} intelReport={intelReport} />;
      case AppView.DIRECTORY:
        return (
          <div className="p-6 md:p-10 space-y-5 animate-in fade-in pb-24">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input
                type="text"
                placeholder="BUSCAR AGENTE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              {agents.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())).map(a => (
                <div key={a.id} onClick={() => setFoundAgent(a)} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-gray-900 overflow-hidden border border-white/5">
                    <img
                      src={formatDriveUrl(a.photoUrl)}
                      className="w-full h-full object-cover grayscale"
                      onError={(e) => e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-white uppercase">{a.name}</p>
                    <p className="text-[8px] text-blue-500 font-bold uppercase tracking-widest">{a.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black text-white">{a.xp} XP</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case AppView.SCANNER:
        return (
          <div className="p-6 md:p-10 flex flex-col items-center justify-between animate-in fade-in h-[calc(100svh-160px)] md:h-full pt-6 pb-10">
            <div className="text-center space-y-1 mb-4">
              <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Scanner Táctico</h2>
              <p className="text-[7px] text-blue-500 font-bold uppercase tracking-widest opacity-60 text-center">Apunta al código QR del agente</p>
            </div>
            <div className={`relative w-full max-w-[280px] md:max-w-xs aspect-square border-2 rounded-[2.5rem] overflow-hidden bg-black transition-all duration-300 scanner-frame ${scanStatus === 'SUCCESS' ? 'border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)]' :
              scanStatus === 'SCANNING' ? 'border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)]' :
                'border-blue-500/20 shadow-[0_0_50px_rgba(37,99,235,0.1)]'
              }`}>
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale opacity-70" />
              <div className={`absolute top-0 left-0 w-full h-0.5 shadow-[0_0_15px_blue] animate-scan-line ${scanStatus === 'SUCCESS' ? 'bg-green-500 shadow-green-500' :
                scanStatus === 'SCANNING' ? 'bg-yellow-500 shadow-yellow-500' :
                  'bg-blue-500 shadow-blue-500'
                }`}></div>

              {/* Overlay táctico */}
              <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"></div>
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border rounded-3xl transition-colors ${scanStatus === 'SUCCESS' ? 'border-green-500/50' :
                scanStatus === 'SCANNING' ? 'border-yellow-500/50' :
                  'border-blue-500/30'
                }`}></div>
            </div>

            <div className="w-full max-w-[280px] md:max-w-xs space-y-4 z-10">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ID O QR CAPTURADO..."
                  value={scannedId}
                  onChange={(e) => setScannedId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-white text-[10px] font-bold uppercase tracking-[0.2em] outline-none focus:border-blue-500 transition-all text-center placeholder:opacity-30"
                />
                {scannedId && (
                  <button
                    onClick={() => setScannedId('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={() => processScan()}
                disabled={!scannedId || scanStatus !== 'IDLE'}
                className={`w-full py-4 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${!scannedId || scanStatus !== 'IDLE'
                  ? 'bg-gray-800 text-gray-500'
                  : 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95'
                  }`}
              >
                {scanStatus === 'IDLE' ? 'Confirmar Registro' : 'Procesando...'}
              </button>
            </div>
          </div>
        );
      case AppView.ENROLLMENT:
        return <EnrollmentForm onSuccess={handleEnrollmentSuccess} />;
      case AppView.PROFILE:
        return (
          <div className="p-6 md:p-10 min-h-[calc(100svh-160px)] md:h-full flex flex-col items-center justify-center animate-in fade-in relative">
            <button
              onClick={() => setView(AppView.CIU)}
              className="absolute top-6 right-6 md:top-10 md:right-10 bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 text-gray-400 hover:text-white transition-all active:scale-95 group z-50"
            >
              <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
            <div className="w-full flex justify-center">
              {currentUser && <DigitalIdCard key={currentUser?.id} agent={currentUser} />}
            </div>
          </div>
        );
      default: return null;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#020202] relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/5 rounded-full blur-[120px]"></div>

        <div className="w-full max-w-sm space-y-10 z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="text-center">
            <img src={formatDriveUrl(OFFICIAL_LOGO)} alt="Logo Consagrados" className="h-28 w-auto mx-auto mb-6 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
            <h1 className="text-4xl font-orbitron font-bold text-white tracking-[0.2em] mb-1">CONSAGRADOS</h1>
            <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.5em] opacity-80">Agency of Experience</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="ID O CÉDULA"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-xs font-bold tracking-widest outline-none focus:border-blue-500 transition-all focus:bg-white/10"
              />
            </div>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                placeholder="PIN DE SEGURIDAD"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-xs font-bold tracking-[0.5em] outline-none focus:border-blue-500 transition-all focus:bg-white/10"
              />
              <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {loginError.message && (
              <div className="text-[9px] text-red-500 font-black uppercase text-center bg-red-500/10 py-3 px-4 rounded-xl border border-red-500/20 animate-pulse">
                {loginError.message}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 py-6 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:bg-blue-500 active:scale-[0.98] transition-all"
            >
              Entrar al Command Center
            </button>
          </form>

          <div className="flex justify-center">
            <button
              onClick={() => {
                setShowForgotPassword(true);
                setForgotPasswordStep('ID');
                setResetError('');
              }}
              className="text-[9px] text-gray-500 font-bold uppercase tracking-widest hover:text-blue-500 transition-colors"
            >
              ¿Olvidaste tu PIN de acceso? Solicitar Recuperación
            </button>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-2 opacity-30">
            <Activity size={16} className="text-blue-500" />
            <p className="text-[7px] font-black text-gray-500 uppercase tracking-[0.4em]">SISTEMAS OPERATIVOS NOMINALES</p>
          </div>
        </div>

        {/* MODAL: CAMBIO OBLIGATORIO DE PIN */}
        {isMustChangeFlow && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
            <div className="w-full max-w-sm bg-[#0a0a0a] border border-yellow-500/30 rounded-[3rem] p-8 space-y-8 shadow-[0_0_50px_rgba(234,179,8,0.2)]">
              <div className="text-center space-y-2">
                <AlertCircle className="mx-auto text-yellow-500" size={40} />
                <h3 className="text-white font-black uppercase tracking-widest text-sm">CAMBIO DE PIN OBLIGATORIO</h3>
                <p className="text-[9px] text-yellow-500/70 font-bold uppercase tracking-[0.2em]">DETECTADO PRIMER INICIO DE SESIÓN</p>
              </div>
              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="NUEVO PIN ALFANUMÉRICO"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-xs font-bold tracking-[0.5em] outline-none focus:border-yellow-500 transition-all"
                />
                <input
                  type="password"
                  placeholder="CONFIRMAR NUEVO PIN"
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-xs font-bold tracking-[0.5em] outline-none focus:border-yellow-500 transition-all"
                />
              </div>

              <div className="space-y-4 border-t border-white/5 pt-6">
                <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest text-center">Configura tu Recuperación</p>
                <input
                  type="text"
                  placeholder="PREGUNTA (EF. ¿NOMBRE DE TU MASCOTA?)"
                  value={newQuestionInput}
                  onChange={(e) => setNewQuestionInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-[10px] font-bold outline-none focus:border-blue-500 transition-all"
                />
                <input
                  type="text"
                  placeholder="RESPUESTA DE SEGURIDAD"
                  value={newAnswerInput}
                  onChange={(e) => setNewAnswerInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-[10px] font-bold outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <button
                onClick={handleManualPinChange}
                disabled={isUpdatingPin}
                className="w-full bg-yellow-600 py-6 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-yellow-500 transition-all disabled:opacity-50"
              >
                {isUpdatingPin ? 'Guardando Configuración...' : 'Finalizar y Entrar'}
              </button>
            </div>
          </div>
        )}

        {/* MODAL: OLVIDÉ MI CONTRASEÑA */}
        {showForgotPassword && (
          <div className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in">
            <div className="w-full max-w-sm space-y-8">
              <button
                onClick={() => setShowForgotPassword(false)}
                className="text-gray-500 hover:text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-4"
              >
                <X size={16} /> Cancelar Operación
              </button>

              <div className="bg-[#0a0a0a] border border-blue-500/20 rounded-[3rem] p-10 space-y-8">
                <div className="text-center space-y-2">
                  <h3 className="text-white font-black uppercase tracking-widest text-sm">RECUPERACIÓN DE ACCESO</h3>
                  <p className="text-[9px] text-blue-500 font-bold uppercase tracking-[0.2em]">PROTOCOLO DE SEGURIDAD V37</p>
                </div>

                {forgotPasswordStep === 'ID' && (
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="INGRESA TU ID O CÉDULA"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-xs font-bold tracking-widest outline-none focus:border-blue-500"
                    />
                    {resetError && <p className="text-[9px] text-red-500 font-bold text-center uppercase">{resetError}</p>}
                    <button
                      onClick={handleRequestQuestion}
                      className="w-full bg-blue-600 py-5 rounded-2xl text-white font-black uppercase text-[9px] tracking-widest"
                    >
                      Continuar
                    </button>
                  </div>
                )}

                {forgotPasswordStep === 'QUESTION' && (
                  <div className="space-y-6">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <p className="text-[8px] text-gray-500 font-black uppercase mb-2 tracking-widest">Pregunta de Seguridad:</p>
                      <p className="text-xs text-white font-bold">{agents.find(a => String(a.id).replace(/[^0-9]/g, '') === loginId.replace(/[^0-9]/g, ''))?.securityQuestion || "¿Cuál es tu color favorito?"}</p>
                    </div>
                    <input
                      type="text"
                      placeholder="TU RESPUESTA..."
                      value={securityAnswerInput}
                      onChange={(e) => setSecurityAnswerInput(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-xs font-bold outline-none focus:border-blue-500"
                    />
                    {resetError && <p className="text-[9px] text-red-500 font-bold text-center uppercase">{resetError}</p>}
                    <button
                      onClick={handleVerifyAnswer}
                      className="w-full bg-blue-600 py-5 rounded-2xl text-white font-black uppercase text-[9px] tracking-widest"
                    >
                      Verificar Identidad
                    </button>
                  </div>
                )}

                {forgotPasswordStep === 'SUCCESS' && (
                  <div className="space-y-6 text-center">
                    <div className="bg-green-500/10 p-6 rounded-3xl border border-green-500/20">
                      <p className="text-[9px] text-green-500 font-black uppercase tracking-widest mb-4">ACCESO CONCEDIDO</p>
                      <p className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-2">TU PIN DE ACCESO ES:</p>
                      <p className="text-4xl font-orbitron font-bold text-white tracking-[0.5em]">{revealedPin}</p>
                    </div>
                    <button
                      onClick={() => setShowForgotPassword(false)}
                      className="w-full bg-white/10 py-5 rounded-2xl text-white font-black uppercase text-[9px] tracking-widest"
                    >
                      Volver al Login
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Layout
      activeView={view}
      setView={setView}
      userRole={currentUser?.userRole || UserRole.STUDENT}
      userName={currentUser?.name || 'Agente'}
      onLogout={() => {
        setIsLoggedIn(false);
        setCurrentUser(null);
        setFoundAgent(null);
        setLoginId('');
        setLoginPin('');
        setView(AppView.PROFILE);
      }}
    >
      <div className="relative h-full">
        {renderContent()}

        {scannedAgentForPoints && (
          <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
            <div className="w-full max-w-sm bg-[#0a0a0a] border border-blue-500/30 rounded-[3rem] p-8 space-y-8 shadow-[0_0_50px_rgba(37,99,235,0.2)]">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 rounded-full border-2 border-blue-500/50 mx-auto overflow-hidden bg-gray-900">
                  <img src={formatDriveUrl(scannedAgentForPoints.photoUrl)} className="w-full h-full object-cover" />
                </div>
                <h3 className="text-white font-black uppercase tracking-widest text-sm">{scannedAgentForPoints.name}</h3>
                <p className="text-[9px] text-blue-500 font-bold uppercase tracking-[0.3em]">Registro de Méritos</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <PointButton
                  label="Trajo Biblia (+10)"
                  onClick={() => handleIncrementPoints('BIBLIA')}
                  disabled={isUpdatingPoints}
                  icon={<Database size={16} />}
                />
                <PointButton
                  label="Trajo Apuntes (+10)"
                  onClick={() => handleIncrementPoints('APUNTES')}
                  disabled={isUpdatingPoints}
                  icon={<RefreshCw size={16} />}
                />
                <PointButton
                  label="Participación (+10)"
                  onClick={() => handleIncrementPoints('LIDERAZGO')}
                  disabled={isUpdatingPoints}
                  icon={<Activity size={16} />}
                />
              </div>

              <button
                onClick={() => setScannedAgentForPoints(null)}
                className="w-full py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors"
              >
                Cerrar Protocolo
              </button>
            </div>
          </div>
        )}

        {foundAgent && (
          <div className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center p-6 backdrop-blur-lg animate-in fade-in">
            <button
              onClick={() => setFoundAgent(null)}
              className="mb-10 text-white/50 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3 group"
            >
              <X size={28} className="group-hover:rotate-90 transition-transform" /> Cerrar Expediente
            </button>
            <DigitalIdCard agent={foundAgent} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan-line { 0% { top: 0; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .animate-scan-line { animation: scan-line 2.5s infinite linear; }
        .animate-in { animation: fadeIn .5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </Layout>
  );
};

const PointButton = ({ label, onClick, disabled, icon }: { label: string, onClick: () => void, disabled: boolean, icon: any }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex items-center justify-between px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600/20 hover:border-blue-500/50 transition-all disabled:opacity-50"
  >
    <div className="flex items-center gap-3">
      <span className="text-blue-500">{icon}</span>
      {label}
    </div>
    <div className="w-5 h-5 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[10px] text-blue-400">+</div>
  </button>
);

export default App;
