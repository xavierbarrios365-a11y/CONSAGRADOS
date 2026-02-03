
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import { AppView, Agent, UserRole, Visitor, Guide } from './types';
import { INITIAL_AGENTS } from './mockData';
import DigitalIdCard, { formatDriveUrl } from './components/DigitalIdCard';
import ContentModule from './components/ContentModule';
import AcademyModule from './components/AcademyModule';
import CIUModule from './components/IntelligenceCenter';
import { EnrollmentForm } from './components/EnrollmentForm';
import { fetchAgentsFromSheets, submitTransaction, updateAgentPoints, resetPasswordWithAnswer, updateAgentPin, fetchVisitorRadar } from './services/sheetsService';
import { Search, QrCode, X, ChevronRight, Activity, Target, Shield, Zap, Book, FileText, Star, RotateCcw, Trash2, Database, AlertCircle, RefreshCw, BookOpen, Eye, EyeOff, Plus } from 'lucide-react';
import { getTacticalAnalysis } from './services/geminiService';
import jsQR from 'jsqr';
import TacticalRanking from './components/TacticalRanking';

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
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [showManualResults, setShowManualResults] = useState(false);
  const [visitorRadar, setVisitorRadar] = useState<Visitor[]>([]);

  // Estados de Seguridad y Sesión
  const [lastActiveTime, setLastActiveTime] = useState<number>(Date.now());
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionIp, setSessionIp] = useState<string>(localStorage.getItem('consagrados_ip') || '');

  // Estados de Seguridad Avanzada (Restaurados)
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

  // --- FUNCIONES DE AYUDA (DEFINIDAS ANTES DE LOS EFFECTS) ---

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setFoundAgent(null);
    setLoginId('');
    setLoginPin('');
    setView(AppView.PROFILE);
    localStorage.removeItem('consagrados_agent');
    setShowSessionWarning(false);
  }, []);

  const resetSessionTimer = useCallback(() => {
    if (isLoggedIn) {
      setLastActiveTime(Date.now());
      if (showSessionWarning) setShowSessionWarning(false);
    }
  }, [isLoggedIn, showSessionWarning]);

  // --- EFFECTS ---

  // 1. Inicialización y Persistencia
  useEffect(() => {
    const storedUser = localStorage.getItem('consagrados_agent');
    if (storedUser) {
      try {
        const agent = JSON.parse(storedUser);
        setIsLoggedIn(true);
        setCurrentUser(agent);
        setLastActiveTime(Date.now());
      } catch (e) {
        localStorage.removeItem('consagrados_agent');
      }
    }

    // Obtener IP Inicial
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => {
        if (data.ip) {
          setSessionIp(data.ip);
          localStorage.setItem('consagrados_ip', data.ip);
        }
      })
      .catch(err => console.error("Error obteniendo IP:", err));
  }, []);

  // 2. Temporizador de Expiración (5 min)
  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = now - lastActiveTime;
      if (diff >= 300000) {
        handleLogout();
      } else if (diff >= 270000) {
        setShowSessionWarning(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoggedIn, lastActiveTime, handleLogout]);

  // 3. Monitoreo de Red/IP
  useEffect(() => {
    if (!isLoggedIn || !sessionIp) return;

    const interval = setInterval(() => {
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => {
          if (data.ip && data.ip !== sessionIp) {
            alert("CAMBIO DE RED DETECTADO. Cierre de sesión por seguridad.");
            handleLogout();
          }
        })
        .catch(console.error);
    }, 60000);

    return () => clearInterval(interval);
  }, [isLoggedIn, sessionIp, handleLogout]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetSessionTimer));
    return () => events.forEach(e => window.removeEventListener(e, resetSessionTimer));
  }, [resetSessionTimer]);

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
                        scannerFrame.classList.add('border-[#ffb700]', 'shadow-[0_0_30px_rgba(255,183,0,0.5)]');
                        setTimeout(() => {
                          scannerFrame.classList.remove('border-[#ffb700]', 'shadow-[0_0_30px_rgba(255,183,0,0.5)]');
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

    // Sincronizar Radar de Visitantes
    try {
      const radar = await fetchVisitorRadar();
      setVisitorRadar(radar || []);
    } catch (err) {
      console.error("Radar sync error", err);
    }
  }, [currentUser]);

  useEffect(() => {
    syncData();
    const interval = setInterval(() => syncData(true), 60000);
    return () => clearInterval(interval);
  }, [syncData]);

  // ELIMINADO: Llamada automática a IA para evitar agotamiento de tokens
  // useEffect(() => {
  //   if (isLoggedIn && agents.length > 0) {
  //     const fetchIntel = async () => {
  //       const analysis = await getTacticalAnalysis(agents);
  //       setIntelReport(analysis || 'ESTATUS NOMINAL.');
  //     };
  //     fetchIntel();
  //   }
  // }, [isLoggedIn, agents]);

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
        setLastActiveTime(Date.now());
        localStorage.setItem('consagrados_agent', JSON.stringify(user));
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
          syncData(true); // Refrescar radar y agentes
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

  const [isRefreshingIntel, setIsRefreshingIntel] = useState(false);

  const handleRefreshIntel = async () => {
    if (isRefreshingIntel) return;
    setIsRefreshingIntel(true);
    try {
      const analysis = await getTacticalAnalysis(agents);
      setIntelReport(analysis || 'ESTATUS NOMINAL.');
    } catch (err) {
      console.error("AI Refresh error", err);
      setIntelReport("ERROR EN PROTOCOLO DE ANÁLISIS.");
    } finally {
      setIsRefreshingIntel(false);
    }
  };

  const renderContent = () => {
    switch (view) {
      case AppView.CIU:
        return <CIUModule
          agents={agents}
          currentUser={currentUser}
          onUpdateNeeded={() => syncData(true)}
          intelReport={intelReport}
          setView={setView}
          visitorCount={visitorRadar.length}
          onRefreshIntel={handleRefreshIntel}
          isRefreshingIntel={isRefreshingIntel}
        />;
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
                className="w-full bg-[#3A3A3A]/20 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#FFB700] font-montserrat"
              />
            </div>
            <div className="grid grid-cols-1 gap-3">
              {agents.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())).map(a => (
                <div key={a.id} onClick={() => setFoundAgent(a)} className="bg-[#3A3A3A]/10 p-4 rounded-2xl border border-white/5 flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-[#3A3A3A]/30 overflow-hidden border border-[#FFB700]/20">
                    <img
                      src={formatDriveUrl(a.photoUrl)}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      onError={(e) => {
                        e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
                        e.currentTarget.className = "w-full h-full object-cover opacity-20 transition-all";
                      }}
                    />
                  </div>
                  <div className="flex-1 font-montserrat">
                    <p className="text-[11px] font-black text-white uppercase font-bebas tracking-wide">{a.name}</p>
                    <p className="text-[8px] text-[#FFB700] font-bold uppercase tracking-widest">{a.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black text-white font-bebas">{a.xp} XP</p>
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
              <h2 className="text-[14px] font-bebas text-white uppercase tracking-[0.3em] font-bebas">Scanner Táctico</h2>
              <p className="text-[8px] text-[#FFB700] font-bold uppercase tracking-widest opacity-60 text-center font-montserrat">Apunta al código QR del agente</p>
            </div>
            <div className={`relative w-full max-w-[280px] md:max-w-xs aspect-square border-2 rounded-[2.5rem] overflow-hidden bg-black transition-all duration-300 scanner-frame ${scanStatus === 'SUCCESS' ? 'border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)]' :
              scanStatus === 'SCANNING' ? 'border-[#FFB700] shadow-[0_0_50px_rgba(255,183,0,0.3)]' :
                'border-[#FFB700]/20 shadow-[0_0_50px_rgba(255,183,0,0.1)]'
              }`}>
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale opacity-70" />
              <div className={`absolute top-0 left-0 w-full h-0.5 shadow-[0_0_15px_blue] animate-scan-line ${scanStatus === 'SUCCESS' ? 'bg-green-500 shadow-green-500' :
                scanStatus === 'SCANNING' ? 'bg-[#ffb700] shadow-[#ffb700]' :
                  'bg-[#ffb700] shadow-[#ffb700]'
                }`}></div>

              {/* Overlay táctico */}
              <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"></div>
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border rounded-3xl transition-colors ${scanStatus === 'SUCCESS' ? 'border-green-500/50' :
                scanStatus === 'SCANNING' ? 'border-yellow-500/50' :
                  'border-blue-500/30'
                }`}></div>
            </div>

            <div className="w-full max-w-[280px] md:max-w-xs space-y-4 z-10">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="ID / NOMBRE..."
                  value={scannedId}
                  onChange={(e) => setScannedId(e.target.value)}
                  className="w-full bg-[#3A3A3A]/20 border border-white/10 rounded-xl py-4 px-6 text-white text-[12px] font-black uppercase tracking-[0.2em] outline-none focus:border-[#FFB700] transition-all text-center placeholder:opacity-30 font-bebas"
                />
                {scannedId && (
                  <button
                    onClick={() => {
                      setScannedId('');
                      setManualSearchQuery('');
                      setShowManualResults(false);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
                {!scannedId && (
                  <p className="absolute -bottom-6 left-0 w-full text-center text-[6px] text-gray-500 font-black uppercase tracking-[0.2em] opacity-40 animate-pulse font-montserrat">
                    ¿SIN QR? ESCRIBE EL NOMBRE PARA EL RADAR
                  </p>
                )}
              </div>

              {/* Lista de Búsqueda Manual */}
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input
                    type="text"
                    placeholder="BUSCAR NOMBRE O ID..."
                    value={manualSearchQuery}
                    onChange={(e) => {
                      setManualSearchQuery(e.target.value);
                      setShowManualResults(e.target.value.length > 0);
                    }}
                    onFocus={() => {
                      if (manualSearchQuery.length > 0) setShowManualResults(true);
                    }}
                    className="w-full bg-[#3A3A3A]/20 border border-white/20 rounded-xl py-4 pl-10 pr-4 text-white text-[10px] font-black uppercase tracking-[0.2em] outline-none focus:border-[#FFB700] transition-all font-bebas"
                  />
                </div>

                {showManualResults && (
                  <div className="absolute bottom-full mb-2 w-full bg-[#001f3f] border border-[#ffb700]/30 rounded-[2rem] max-h-60 overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.8)] z-[100] animate-in fade-in slide-in-from-bottom-4">
                    <div className="p-3 border-b border-white/5 bg-white/5">
                      <p className="text-[7px] text-gray-500 font-black uppercase tracking-widest">Resultados de Búsqueda</p>
                    </div>

                    {/* Opción Permanente de Registro en Radar */}
                    {manualSearchQuery.length > 0 && (
                      <div
                        onClick={() => {
                          setScannedId(manualSearchQuery);
                          setShowManualResults(false);
                          processScan(manualSearchQuery);
                        }}
                        className="p-6 text-center bg-orange-500/10 border-b border-orange-500/20 hover:bg-orange-500/20 cursor-pointer group transition-all"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Plus size={24} className="text-orange-500 group-hover:scale-110 transition-transform" />
                          <p className="text-[10px] text-white font-black uppercase tracking-[0.2em] font-bebas">REGISTRAR "{manualSearchQuery}" EN RADAR</p>
                          <p className="text-[7px] text-orange-500 font-bold uppercase tracking-widest">TAP PARA GUARDAR VISITA AHORA</p>
                        </div>
                      </div>
                    )}

                    {/* Agentes en Directorio */}
                    {agents
                      .filter(a =>
                        a.name.toLowerCase().includes(manualSearchQuery.toLowerCase()) ||
                        a.id.toLowerCase().includes(manualSearchQuery.toLowerCase())
                      )
                      .slice(0, 5)
                      .map(a => (
                        <div
                          key={a.id}
                          onClick={() => {
                            setScannedId(a.id);
                            setManualSearchQuery(a.name);
                            setShowManualResults(false);
                          }}
                          className="flex items-center gap-3 p-4 hover:bg-white/5 cursor-pointer border-b border-white/5 transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#ffb700]/10 border border-[#ffb700]/30 flex items-center justify-center shrink-0">
                            <Shield size={18} className="text-[#ffb700]" />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-[11px] font-black text-white uppercase truncate font-bebas">{a.name}</p>
                            <p className="text-[7px] text-[#ffb700] font-black uppercase tracking-widest">{a.rank} | {a.id}</p>
                          </div>
                        </div>
                      ))}

                    {/* Visitantes en Radar */}
                    {visitorRadar
                      .filter(v => v.name.toLowerCase().includes(manualSearchQuery.toLowerCase()))
                      .map(v => (
                        <div
                          key={v.id}
                          onClick={() => {
                            setScannedId(v.id);
                            setManualSearchQuery(v.name);
                            setShowManualResults(false);
                          }}
                          className="flex items-center gap-3 p-4 hover:bg-orange-500/10 cursor-pointer border-b border-white/5 transition-colors text-left"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${v.status === 'POSIBLE RECLUTA' ? 'bg-orange-500/20 border-orange-500/40 text-orange-500' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                            <Target size={18} />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-[10px] font-black text-white uppercase truncate font-bebas">{v.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[7px] text-gray-400 font-black uppercase tracking-widest">{v.visits} VISITAS</span>
                              <span className={`text-[6px] px-1.5 py-0.5 rounded font-bold ${v.status === 'POSIBLE RECLUTA' ? 'bg-orange-500/20 text-orange-400' : 'bg-white/10 text-gray-500'}`}>{v.status}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => processScan()}
                disabled={!scannedId || scanStatus !== 'IDLE'}
                className={`w-full py-4 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all font-bebas ${!scannedId || scanStatus !== 'IDLE'
                  ? 'bg-gray-800 text-gray-500'
                  : agents.some(a => String(a.id).trim().toUpperCase() === scannedId.trim().toUpperCase())
                    ? 'bg-[#ffb700] text-[#001f3f] shadow-[0_10px_30px_rgba(255,183,0,0.2)]'
                    : 'bg-orange-500 text-white shadow-[0_10px_30px_rgba(249,115,22,0.2)]'
                  } active:scale-95`}
              >
                {scanStatus !== 'IDLE'
                  ? 'Procesando...'
                  : agents.some(a => String(a.id).trim().toUpperCase() === scannedId.trim().toUpperCase())
                    ? 'Confirmar Asistencia'
                    : 'Registrar en Radar'
                }
              </button>

              {/* Radar de Visitantes */}
              <div className="pt-4 border-t border-white/5 space-y-3">
                <div onClick={() => setView(AppView.VISITOR)} className="flex items-center justify-between px-2 cursor-pointer group">
                  <p className="text-[7px] text-[#ffb700] font-black uppercase tracking-[0.3em] font-bebas flex items-center gap-2 group-hover:text-white transition-colors text-left uppercase">
                    <Target size={10} className="animate-pulse" /> Radar de Visitantes
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-[6px] text-gray-600 font-bold uppercase tracking-widest leading-none">{visitorRadar.length} detectados</span>
                    <ChevronRight size={10} className="text-gray-600 group-hover:text-white transition-all group-hover:translate-x-0.5" />
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none pr-4">
                  {visitorRadar.map(v => (
                    <div
                      key={v.id}
                      onClick={() => {
                        if (scanStatus === 'IDLE') {
                          setScannedId(v.id);
                          setManualSearchQuery(v.name);
                        }
                      }}
                      className={`shrink-0 w-28 p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${v.status === 'POSIBLE RECLUTA'
                        ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20 shadow-[0_5px_15px_rgba(249,115,22,0.1)]'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                        } ${scannedId === v.id ? 'ring-2 ring-[#ffb700] border-[#ffb700]' : ''}`}
                    >
                      <div className="flex flex-col gap-1 items-center text-center">
                        <p className="text-[8px] font-black text-white uppercase truncate w-full font-bebas">{v.name}</p>
                        <div className={`px-2 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest ${v.status === 'POSIBLE RECLUTA' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-[#ffb700]'
                          }`}>
                          {v.visits} ENTRADAS
                        </div>
                        <p className={`text-[5px] font-black uppercase tracking-widest mt-0.5 ${v.status === 'POSIBLE RECLUTA' ? 'text-orange-400' : 'text-gray-500'
                          }`}>
                          {v.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case AppView.VISITOR:
        return (
          <div className="p-6 md:p-10 space-y-6 animate-in fade-in pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-left space-y-1">
                <h2 className="text-2xl font-bebas text-white uppercase tracking-widest">Radar de Visitantes</h2>
                <p className="text-[8px] text-[#ffb700] font-bold uppercase tracking-widest opacity-60 font-montserrat">Seguimiento de posibles reclutas detectados</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="manual-visitor-name"
                  placeholder="NOMBRE DEL VISITANTE..."
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-[10px] font-black uppercase tracking-widest focus:border-[#ffb700] outline-none transition-all flex-1 md:w-64 font-bebas"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.currentTarget as HTMLInputElement).value;
                      if (val) processScan(val);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('manual-visitor-name') as HTMLInputElement;
                    if (input.value) {
                      processScan(input.value);
                      input.value = '';
                    }
                  }}
                  className="bg-[#ffb700] p-3 rounded-xl text-[#001f3f] shadow-[0_5px_15px_rgba(255,183,0,0.3)] hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visitorRadar.length === 0 ? (
                <div className="col-span-full py-20 text-center space-y-4 bg-white/5 rounded-[2.5rem] border border-white/5">
                  <Target size={40} className="mx-auto text-gray-700" />
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest font-bebas leading-relaxed">
                    No se han detectado visitantes nuevos.<br />
                    Los visitantes aparecen automáticamente al escanear IDs no registrados.
                  </p>
                </div>
              ) : (
                visitorRadar.map(v => (
                  <div
                    key={v.id}
                    onClick={() => {
                      setScannedId(v.id);
                      setView(AppView.SCANNER);
                    }}
                    className={`p-6 rounded-[2.5rem] border transition-all cursor-pointer relative overflow-hidden group ${v.status === 'POSIBLE RECLUTA'
                      ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20 shadow-[0_10px_30px_rgba(249,115,22,0.1)]'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${v.status === 'POSIBLE RECLUTA' ? 'bg-orange-500/20 border-orange-500/40 text-orange-500' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                        <Target size={24} className={v.status === 'POSIBLE RECLUTA' ? 'animate-pulse' : ''} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white uppercase truncate font-bebas tracking-wider">{v.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8px] text-[#ffb700] font-black uppercase tracking-widest">{v.visits} ENTRADAS</span>
                          <span className={`text-[7px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${v.status === 'POSIBLE RECLUTA' ? 'bg-orange-500 text-white' : 'bg-white/10 text-gray-500'}`}>{v.status}</span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-[#ffb700]/5 border border-[#ffb700]/20 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-[#ffb700]" size={16} />
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest font-bebas">Inteligencia de Reclutamiento</h4>
              </div>
              <p className="text-[8px] text-gray-400 font-bold leading-relaxed uppercase font-montserrat">
                El Radar rastrea automáticamente los IDs ingresados manualmente o escaneados que no están en el Directorio Oficial.
                <br /><br />
                <span className="text-[#ffb700]">VISITANTE:</span> 1 asistencia detectada.
                <br />
                <span className="text-orange-500 font-black">POSIBLE RECLUTA:</span> 2 o más asistencias. Requiere registro inmediato.
              </p>
            </div>

            {/* Floating Quick Add for Mobile */}
            <button
              onClick={() => {
                const name = window.prompt("INGRESA NOMBRE DEL VISITANTE:");
                if (name) processScan(name);
              }}
              className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-[0_10px_30px_rgba(249,115,22,0.4)] z-[60] active:scale-90 transition-all border-2 border-white/20"
            >
              <Plus size={28} />
            </button>
          </div>
        );
      case AppView.ENROLLMENT:
        return <EnrollmentForm onSuccess={handleEnrollmentSuccess} userRole={currentUser?.userRole} />;
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
      case AppView.ACADEMIA:
        return <AcademyModule userRole={currentUser!.userRole} agentId={currentUser!.id} />;
      case AppView.RANKING:
        return <TacticalRanking agents={agents} currentUser={currentUser} />;
      case AppView.CONTENT:
        return <ContentModule userRole={currentUser?.userRole || UserRole.STUDENT} />;
      case AppView.CIU:
        return <CIUModule
          userRole={currentUser.userRole}
          agentId={currentUser.id}
          onActivity={resetSessionTimer}
        />;
      default: return null;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#001f3f] relative overflow-hidden font-montserrat">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#ffb700]/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ffb700]/5 rounded-full blur-[120px]"></div>

        <div className="w-full max-w-sm space-y-10 z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="text-center">
            <img src={formatDriveUrl(OFFICIAL_LOGO)} alt="Logo Consagrados" className="h-28 w-auto mx-auto mb-6 drop-shadow-[0_0_30px_rgba(255,183,0,0.4)]" />
            <h1 className="text-4xl font-bebas font-bold text-white tracking-[0.2em] mb-1">CONSAGRADOS</h1>
            <div className="space-y-1 mt-2">
              <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-[0.2em] opacity-80 font-montserrat leading-relaxed">
                No pedimos permiso para ser luz.
              </p>
              <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-[0.2em] opacity-80 font-montserrat leading-relaxed">
                Vivimos en un mundo que celebra lo superficial y premia lo frágil.
              </p>
              <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-[0.2em] opacity-80 font-montserrat leading-relaxed">
                Pero nosotros no somos de ese mundo.
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="ID O CÉDULA"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-xs font-bold tracking-widest outline-none focus:border-[#ffb700] transition-all focus:bg-white/10 font-montserrat"
              />
            </div>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                placeholder="PIN DE SEGURIDAD"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-xs font-bold tracking-[0.5em] outline-none focus:border-[#ffb700] transition-all focus:bg-white/10 font-montserrat"
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
              className="w-full bg-[#ffb700] py-6 rounded-2xl text-[#001f3f] font-black uppercase text-[10px] tracking-widest shadow-[0_10px_30px_rgba(255,183,0,0.2)] hover:bg-[#ffb700]/90 active:scale-[0.98] transition-all font-bebas"
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
              className="text-[9px] text-gray-500 font-bold uppercase tracking-widest hover:text-[#ffb700] transition-colors font-montserrat"
            >
              ¿Olvidaste tu PIN de acceso? Solicitar Recuperación
            </button>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-2 opacity-30">
            <Activity size={16} className="text-[#ffb700]" />
            <p className="text-[7px] font-black text-gray-500 uppercase tracking-[0.4em] font-bebas">SISTEMAS OPERATIVOS NOMINALES</p>
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
                <p className="text-[9px] text-[#ffb700] font-bold uppercase tracking-widest text-center font-bebas">Configura tu Recuperación</p>
                <input
                  type="text"
                  placeholder="PREGUNTA (EF. ¿NOMBRE DE TU MASCOTA?)"
                  value={newQuestionInput}
                  onChange={(e) => setNewQuestionInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-[10px] font-bold outline-none focus:border-[#ffb700] transition-all"
                />
                <input
                  type="text"
                  placeholder="RESPUESTA DE SEGURIDAD"
                  value={newAnswerInput}
                  onChange={(e) => setNewAnswerInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-[10px] font-bold outline-none focus:border-[#ffb700] transition-all"
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

              <div className="bg-[#001833] border border-[#ffb700]/20 rounded-[3rem] p-10 space-y-8 font-montserrat shadow-2xl">
                <div className="text-center space-y-2">
                  <h3 className="text-white font-black uppercase tracking-widest text-sm font-bebas">RECUPERACIÓN DE ACCESO</h3>
                  <p className="text-[9px] text-[#ffb700] font-bold uppercase tracking-[0.2em] font-montserrat">PROTOCOLO DE SEGURIDAD V37</p>
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
                      <p className="text-2xl md:text-4xl font-orbitron font-bold text-white tracking-[0.3em] md:tracking-[0.5em] break-all">{revealedPin}</p>
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
      onLogout={handleLogout}
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

        {showSessionWarning && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
            <div className="w-full max-w-sm bg-[#001f3f] border border-[#ffb700]/30 rounded-[2rem] p-8 space-y-6 shadow-[0_0_50px_rgba(255,183,0,0.2)] text-center">
              <div className="w-16 h-16 bg-[#ffb700]/10 rounded-full flex items-center justify-center mx-auto border border-[#ffb700]/30 focus-within:ring-2 focus-within:ring-[#ffb700]">
                <Activity className="text-[#ffb700] animate-pulse" size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-white font-bebas text-2xl tracking-widest uppercase">¿Sigues ahí, Agente?</h3>
                <p className="text-[10px] text-white/60 font-montserrat uppercase tracking-widest leading-relaxed">
                  Tu sesión táctica expirará en 30 segundos por inactividad.
                </p>
              </div>
              <button
                onClick={() => resetSessionTimer()}
                className="w-full bg-[#ffb700] py-4 rounded-2xl text-[#001f3f] font-black uppercase text-[10px] tracking-[0.2em] shadow-[0_0_20px_rgba(255,183,0,0.3)] hover:scale-[1.02] active:scale-95 transition-all outline-none"
              >
                Mantener Conexión
              </button>
              <button
                onClick={handleLogout}
                className="w-full py-2 text-[9px] text-white/30 font-black uppercase tracking-widest hover:text-white transition-colors outline-none"
              >
                Cerrar Sesión Ahora
              </button>
            </div>
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
    className="flex items-center justify-between px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#ffb700]/10 hover:border-[#ffb700]/50 transition-all disabled:opacity-50 font-bebas"
  >
    <div className="flex items-center gap-3">
      <span className="text-[#ffb700]">{icon}</span>
      {label}
    </div>
    <div className="w-5 h-5 rounded-full bg-[#ffb700]/10 border border-[#ffb700]/30 flex items-center justify-center text-[10px] text-[#ffb700]">+</div>
  </button>
);

export default App;
