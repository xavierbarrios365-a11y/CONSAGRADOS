
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import { AppView, Agent, UserRole } from './types';
import { INITIAL_AGENTS } from './mockData';
import DigitalIdCard, { formatDriveUrl } from './components/DigitalIdCard';
import IntelligenceCenter from './components/IntelligenceCenter';
import { EnrollmentForm } from './components/EnrollmentForm';
import { fetchAgentsFromSheets, submitTransaction } from './services/sheetsService';
import {
  Search,
  RefreshCw,
  Database,
  Eye,
  EyeOff,
  X,
  Activity
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

            const scan = () => {
              if (!active) return;
              if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && context) {
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code && code.data) {
                  setScannedId(code.data);
                }
              }
              requestAnimationFrame(scan);
            };
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

  const handleEnrollmentSuccess = () => {
    // Al inscribir con éxito, forzamos una resincronización para ver al nuevo agente
    alert("¡Agente registrado con éxito! Actualizando directorio...");
    syncData();
    // Opcionalmente, cambiar a la vista de directorio para ver al nuevo agente
    setView(AppView.DIRECTORY);
  };

  const processScan = async () => {
    if (!scannedId) return;
    setScanStatus('SCANNING');
    const result = await submitTransaction(scannedId, 'ASISTENCIA');
    if (result.success) {
      setScanStatus('SUCCESS');
      setTimeout(() => { setScanStatus('IDLE'); setScannedId(''); }, 3000);
    }
  };

  const renderContent = () => {
    switch (view) {
      case AppView.CIU:
        return <IntelligenceCenter agents={agents} currentUser={currentUser} onUpdateNeeded={syncData} intelReport={intelReport} />;
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
          <div className="p-4 md:p-10 flex flex-col items-center justify-start space-y-4 md:space-y-6 animate-in fade-in h-full pt-6">
            <div className="text-center space-y-1 mb-2">
              <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Scanner Táctico</h2>
              <p className="text-[7px] text-blue-500 font-bold uppercase tracking-widest opacity-60 text-center">Apunta al código QR del agente</p>
            </div>
            <div className="relative w-full max-w-[280px] md:max-w-xs aspect-[3/4] border-2 border-blue-500/20 rounded-[2.5rem] overflow-hidden bg-black shadow-[0_0_50px_rgba(37,99,235,0.1)]">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale opacity-70" />
              <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_15px_blue] animate-scan-line"></div>

              {/* Overlay táctico */}
              <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-blue-500/30 rounded-3xl"></div>
            </div>

            <div className="w-full max-w-[280px] md:max-w-xs space-y-3 z-10">
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
                onClick={processScan}
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
          <div className="p-6 md:p-10 flex flex-col items-center gap-6 animate-in fade-in h-full pb-24">
            {currentUser && <DigitalIdCard agent={currentUser} />}
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

          <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-2 opacity-30">
            <Activity size={16} className="text-blue-500" />
            <p className="text-[7px] font-black text-gray-500 uppercase tracking-[0.4em]">SISTEMAS OPERATIVOS NOMINALES</p>
          </div>
        </div>
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

export default App;
