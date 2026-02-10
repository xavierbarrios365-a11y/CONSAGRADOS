
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import { AppView, Agent, UserRole, Visitor, Guide } from './types';
import { INITIAL_AGENTS } from './mockData';
import DigitalIdCard, { formatDriveUrl } from './components/DigitalIdCard';
import ContentModule from './components/ContentModule';
import AcademyModule from './components/AcademyModule';
import CIUModule from './components/IntelligenceCenter';
import { EnrollmentForm } from './components/EnrollmentForm';
import { fetchAgentsFromSheets, submitTransaction, updateAgentPoints, resetPasswordWithAnswer, updateAgentPin, fetchVisitorRadar, fetchDailyVerse, updateAgentStreaks, registerBiometrics, verifyBiometrics } from './services/sheetsService';
import { Search, QrCode, X, ChevronRight, Activity, Target, Shield, Zap, Book, FileText, Star, RotateCcw, Trash2, Database, AlertCircle, RefreshCw, BookOpen, Eye, EyeOff, Plus, Fingerprint, Flame, CheckCircle2, Circle, Loader2, Bell, Crown, Medal, Trophy, AlertTriangle, LogOut, History, Users, Key, Settings, Sparkles } from 'lucide-react';
import { getTacticalAnalysis } from './services/geminiService';
import jsQR from 'jsqr';
import TacticalRanking from './components/TacticalRanking';
import { isBiometricAvailable, registerBiometric, authenticateBiometric } from './services/BiometricService';
import DailyVerse from './components/DailyVerse';
import { DailyVerse as DailyVerseType } from './types';

const OFFICIAL_LOGO = "1DYDTGzou08o0NIPuCPH9JvYtaNFf2X5f"; // ID Real de Consagrados 2026

const LoadingScreen = ({ message }: { message: string }) => (
  <div className="min-h-screen bg-[#001f3f] flex flex-col items-center justify-center p-6 space-y-6 animate-in fade-in">
    <div className="w-20 h-20 bg-[#ffb700]/10 rounded-full flex items-center justify-center border-2 border-[#ffb700]/20 animate-pulse shadow-[0_0_50px_rgba(255,183,0,0.1)]">
      <Activity className="text-[#ffb700]" size={40} />
    </div>
    <div className="space-y-2 text-center">
      <p className="text-[#ffb700] text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">{message}</p>
      <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden mx-auto">
        <div className="w-1/2 h-full bg-[#ffb700] animate-[shimmer_2s_infinite] shadow-[0_0_10px_rgba(255,183,0,0.5)]"></div>
      </div>
    </div>
    <style>{`
      @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
    `}</style>
  </div>
);

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

const App: React.FC = () => {
  const APP_VERSION = "1.6.8"; // Official Restoration Release
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<Agent | null>(null);
  const [loginId, setLoginId] = useState(localStorage.getItem('last_login_id') || '');
  const [loginPin, setLoginPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loginError, setLoginError] = useState<{ field: 'id' | 'pin' | 'both' | null, message: string | null }>({ field: null, message: null });

  const [view, setView] = useState<AppView>(AppView.HOME);
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [intelReport, setIntelReport] = useState<string>('SISTEMAS EN LÍNEA...');
  const [scanStatus, setScanStatus] = useState<'IDLE' | 'SCANNING' | 'SUCCESS'>('IDLE');
  const [scannedId, setScannedId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [foundAgent, setFoundAgent] = useState<Agent | null>(null);
  const [scannedAgentForPoints, setScannedAgentForPoints] = useState<Agent | null>(null);
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);
  const [visitorRadar, setVisitorRadar] = useState<Visitor[]>([]);

  // Estados de Seguridad y Sesión
  const [lastActiveTime, setLastActiveTime] = useState<number>(Date.now());
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionIp, setSessionIp] = useState<string>(localStorage.getItem('consagrados_ip') || '');

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
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isAuthenticatingBio, setIsAuthenticatingBio] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [dailyVerse, setDailyVerse] = useState<DailyVerseType | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRegisteringBio, setIsRegisteringBio] = useState(false);
  const [rememberedUser, setRememberedUser] = useState<{ id: string; name: string; photoUrl: string } | null>(null);
  const [viewingAsRole, setViewingAsRole] = useState<UserRole | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    const remembered = localStorage.getItem('remembered_user');
    const version = localStorage.getItem('app_version');
    if (remembered) localStorage.setItem('remembered_user', remembered);
    if (version) localStorage.setItem('app_version', version);

    setIsLoggedIn(false);
    setCurrentUser(null);
    setFoundAgent(null);
    setLoginId('');
    setLoginPin('');
    setView(AppView.HOME);
    setShowSessionWarning(false);
    setIsMustChangeFlow(false);
    setShowForgotPassword(false);
    setViewingAsRole(null);

    setTimeout(() => {
      window.location.replace(window.location.origin + window.location.pathname + "?logout=" + Date.now());
    }, 50);
  }, []);

  const resetSessionTimer = useCallback(() => {
    if (isLoggedIn) {
      const now = Date.now();
      setLastActiveTime(now);
      localStorage.setItem('last_active_time', String(now));
      if (showSessionWarning) setShowSessionWarning(false);
    }
  }, [isLoggedIn, showSessionWarning]);

  useEffect(() => {
    const savedVersion = localStorage.getItem('app_version');
    if (savedVersion !== APP_VERSION) {
      localStorage.setItem('app_version', APP_VERSION);
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('consagrados_agent');
    const storedLastActive = localStorage.getItem('last_active_time');

    if (storedUser) {
      try {
        const agent = JSON.parse(storedUser);
        const lastActive = storedLastActive ? parseInt(storedLastActive) : 0;
        const now = Date.now();

        // Aumentamos el tiempo de expiración a 4 horas para estabilidad
        if (now - lastActive > 14400000 && lastActive !== 0) {
          handleLogout();
        } else {
          setIsLoggedIn(true);
          setCurrentUser(agent);
          setLastActiveTime(now);
        }
      } catch (e) {
        localStorage.removeItem('consagrados_agent');
      }
    }

    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => {
        if (data.ip) {
          setSessionIp(data.ip);
          localStorage.setItem('consagrados_ip', data.ip);
        }
      })
      .catch(err => console.error("Error obteniendo IP:", err));

    isBiometricAvailable().then(setBiometricAvailable);

    const storedLastId = localStorage.getItem('last_login_id');
    if (storedLastId) setLoginId(storedLastId);

    fetchDailyVerse().then(res => {
      if (res.success) setDailyVerse(res.data);
    });
  }, [handleLogout]);

  useEffect(() => {
    if (isLoggedIn) {
      const interval = setInterval(() => {
        const now = Date.now();
        const diff = now - lastActiveTime;
        if (diff >= 14400000) { // 4 Horas
          handleLogout();
        } else if (diff >= 13800000) { // Aviso a los 3h 50m
          setShowSessionWarning(true);
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, lastActiveTime, handleLogout]);

  const resetTimerOnActivity = useCallback(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetSessionTimer));
    return () => events.forEach(e => window.removeEventListener(e, resetSessionTimer));
  }, [resetSessionTimer]);

  useEffect(() => {
    resetTimerOnActivity();
  }, [resetTimerOnActivity]);

  useEffect(() => {
    if (view === AppView.SCANNER && scanStatus === 'SCANNING') {
      let active = true;
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
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
                const scanWidth = Math.min(videoRef.current.videoWidth, 480);
                const scanHeight = Math.min(videoRef.current.videoHeight, Math.floor(480 * (videoRef.current.videoHeight / videoRef.current.videoWidth)));

                canvas.width = scanWidth;
                canvas.height = scanHeight;
                context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

                try {
                  const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
                  if (code && code.data && code.data !== scannedId) {
                    const now = Date.now();
                    if (now - lastScanTime > 2000) {
                      setScannedId(code.data);
                      const scannerFrame = document.querySelector('.scanner-frame');
                      if (scannerFrame) {
                        scannerFrame.classList.add('border-[#ffb700]', 'shadow-[0_0_30px_rgba(255,183,0,0.5)]');
                        setTimeout(() => scannerFrame.classList.remove('border-[#ffb700]'), 500);
                      }
                      lastScanTime = now;
                      setTimeout(() => processScan(code.data), 500);
                    }
                  }
                } catch (qrErr) { }
              }
              if (active) setTimeout(scan, 200);
            };
            setTimeout(scan, 200);
          }
        } catch (err) {
          alert("NO SE PUDO ACTIVAR LA CÁMARA.");
        }
      };
      startCamera();
      return () => {
        active = false;
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      };
    }
  }, [view, scanStatus]);

  const syncData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsSyncing(true);
    try {
      const sheetAgents = await fetchAgentsFromSheets();
      if (sheetAgents) {
        setAgents(sheetAgents);
        if (currentUser) {
          const updatedSelf = sheetAgents.find(a => String(a.id).toUpperCase() === String(currentUser.id).toUpperCase());
          if (updatedSelf) {
            setCurrentUser(updatedSelf);
            if (localStorage.getItem('consagrados_agent')) localStorage.setItem('consagrados_agent', JSON.stringify(updatedSelf));
          }
        }
      }
      const radar = await fetchVisitorRadar();
      setVisitorRadar(radar || []);
    } catch (err) { } finally {
      if (!isSilent) setIsSyncing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    syncData();
    const interval = setInterval(() => syncData(true), 60000);
    return () => clearInterval(interval);
  }, [syncData]);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const user = agents.find(a => String(a.id).replace(/[^0-9]/g, '') === loginId.replace(/[^0-9]/g, ''));
    if (user && String(user.pin).trim() === loginPin.trim()) {
      localStorage.setItem('consagrados_agent', JSON.stringify(user));
      localStorage.setItem('last_login_id', user.id);
      const now = Date.now();
      localStorage.setItem('last_active_time', String(now));
      setLastActiveTime(now);
      setCurrentUser(user);
      setIsLoggedIn(true);
      setView(AppView.HOME); // Landing page: Nodo Central
    } else {
      setLoginError({ field: 'both', message: 'CREDENCIALES INVÁLIDAS' });
    }
  };

  const handleBiometricLogin = async () => {
    if (!loginId) {
      alert("INGRESA TU ID PRIMERO");
      return;
    }
    const user = agents.find(a => String(a.id).replace(/[^0-9]/g, '') === loginId.replace(/[^0-9]/g, ''));
    if (!user || !user.biometricCredential) {
      alert("BIOMETRÍA NO CONFIGURADA PARA ESTE ID");
      return;
    }

    setIsAuthenticatingBio(true);
    try {
      const success = await authenticateBiometric(user.biometricCredential);
      if (success) {
        localStorage.setItem('consagrados_agent', JSON.stringify(user));
        localStorage.setItem('last_login_id', user.id);
        const now = Date.now();
        localStorage.setItem('last_active_time', String(now));
        setLastActiveTime(now);
        setCurrentUser(user);
        setIsLoggedIn(true);
        setView(AppView.HOME);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAuthenticatingBio(false);
    }
  };

  const processScan = async (idToProcess?: string) => {
    const id = idToProcess || scannedId;
    if (!id || scanStatus === 'SUCCESS') return;
    setScanStatus('SCANNING');
    try {
      const result = await submitTransaction(id, 'ASISTENCIA');
      if (result.success) {
        setScanStatus('SUCCESS');
        const agent = agents.find(a => String(a.id) === String(id));
        if (agent) setScannedAgentForPoints(agent);
        setTimeout(() => { setScanStatus('IDLE'); setScannedId(''); syncData(true); }, 3000);
      } else {
        alert(result.error || "Fallo en registro.");
        setScanStatus('IDLE');
        setScannedId('');
      }
    } catch (err) {
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
        alert("+10 PUNTOS REGISTRADOS");
        syncData();
      }
    } finally {
      setIsUpdatingPoints(false);
    }
  };

  const [isRefreshingIntel, setIsRefreshingIntel] = useState(false);
  const handleRefreshIntel = async () => {
    setIsRefreshingIntel(true);
    const analysis = await getTacticalAnalysis(agents);
    setIntelReport(analysis || 'ESTATUS NOMINAL.');
    setIsRefreshingIntel(false);
  };

  const renderContent = () => {
    const effectiveRole = viewingAsRole || currentUser?.userRole || UserRole.STUDENT;
    switch (view) {
      case AppView.HOME:
        return (
          <div className="p-6 md:p-10 space-y-8 animate-in fade-in pb-24 max-w-2xl mx-auto font-montserrat">
            <div className="flex flex-col items-center text-center space-y-4 mb-4">
              <div className="p-4 bg-[#ffb700]/10 rounded-full border border-[#ffb700]/20 animate-pulse">
                <Shield size={32} className="text-[#ffb700]" />
              </div>
              <div>
                <h2 className="text-4xl font-bebas font-black text-white tracking-widest leading-none">NODO CENTRAL</h2>
                <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.4em] mt-1">{currentUser?.name}</p>
              </div>
            </div>

            {dailyVerse && (
              <div className="w-full animate-in slide-in-from-top-4 duration-1000 mb-6">
                <DailyVerse verse={dailyVerse} />
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              <div
                onClick={() => setView(AppView.RANKING)}
                className="bg-gradient-to-br from-[#ffb700]/10 to-transparent border border-[#ffb700]/20 rounded-[3rem] p-10 flex flex-col gap-6 overflow-hidden relative shadow-2xl cursor-pointer active:scale-[0.98] transition-all group"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Flame size={120} className="text-[#ffb700]" />
                </div>
                <div className="relative z-10 w-full flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-[#ffb700] uppercase tracking-[0.2em] mb-1">Racha de Consagración</p>
                    <p className="text-6xl font-bebas font-black text-white">{currentUser?.streakCount || 0} DÍAS</p>
                  </div>
                  <div className="bg-[#ffb700] p-6 rounded-3xl shadow-[0_0_30px_rgba(255,183,0,0.3)]">
                    <Flame size={40} className="text-[#001f3f]" />
                  </div>
                </div>

                <div className="w-full space-y-4 relative z-10">
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#ffb700] shadow-[0_0_15px_rgba(255,183,0,0.5)] transition-all duration-1000" style={{ width: `${Math.min(100, ((currentUser?.streakCount || 0) / 365) * 100)}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest italic">Objetivo: 365 días</p>
                    <button className="text-[8px] text-[#ffb700] font-black uppercase tracking-widest flex items-center gap-2">
                      Ver Racha <Sparkles size={10} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView(AppView.CIU)} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col items-center gap-4 hover:bg-[#ffb700]/10 hover:border-[#ffb700]/30 transition-all active:scale-95 shadow-lg group">
                <Users size={32} className="text-[#ffb700] group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase tracking-widest font-bebas">Gente</span>
              </button>
              <button onClick={() => setView(AppView.ACADEMIA)} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col items-center gap-4 hover:bg-white/10 transition-all active:scale-95 shadow-lg group">
                <Database size={32} className="text-[#ffb700] group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase tracking-widest font-bebas">Academia</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView(AppView.CONTENT)} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col items-center gap-4 hover:bg-white/10 transition-all active:scale-95 shadow-lg group">
                <BookOpen size={32} className="text-[#ffb700] group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase tracking-widest font-bebas">Material</span>
              </button>
              <button onClick={() => setView(AppView.RANKING)} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] flex flex-col items-center gap-4 hover:bg-white/10 transition-all active:scale-95 shadow-lg group">
                <Trophy size={32} className="text-[#ffb700] group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase tracking-widest font-bebas">Ranking</span>
              </button>
            </div>
          </div>
        );
      case AppView.SCANNER:
        return (
          <div className="fixed inset-0 z-50 bg-[#001f3f] flex flex-col p-6 animate-in fade-in">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <h2 className="text-3xl font-bebas text-white tracking-widest">Escáner Táctico</h2>
                <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-[0.3em] opacity-60">Consagrados Force 2026</p>
              </div>
              <button onClick={() => setView(AppView.HOME)} className="p-3 bg-white/5 rounded-2xl border border-white/10 text-gray-400"><X size={24} /></button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden rounded-[3rem] border border-white/5 bg-black/40">
              <div className="absolute inset-0 z-0">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale opacity-40" />
              </div>
              <div className="relative z-10 w-64 h-64 border-2 border-white/10 rounded-[2rem] flex flex-col items-center justify-center p-8 bg-black/20 backdrop-blur-sm scanner-frame">
                {scanStatus === 'SCANNING' ? (
                  <>
                    <QrCode size={48} className="text-[#ffb700] animate-pulse mb-3" />
                    <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-widest">Aguarda Identidad...</p>
                  </>
                ) : scanStatus === 'SUCCESS' ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 size={48} className="text-green-500" />
                    <p className="text-[10px] text-green-500 font-black uppercase">Verificado</p>
                  </div>
                ) : (
                  <button onClick={() => setScanStatus('SCANNING')} className="px-6 py-3 bg-blue-600 rounded-xl text-[10px] font-black text-white hover:bg-blue-500">Reiniciar</button>
                )}
              </div>

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#001f3f] to-transparent p-10 pt-20">
                <div className="max-w-sm mx-auto space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="BUSCAR NOMBRE O ID..."
                      value={scannedId}
                      onChange={(e) => setScannedId(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-8 text-white text-[12px] font-black uppercase tracking-widest outline-none focus:border-[#ffb700] transition-all text-center placeholder:text-white/20"
                    />
                    {scannedId && !agents.find(a => String(a.id) === scannedId) && (
                      <div className="absolute bottom-full left-0 right-0 mb-3 bg-[#001f3f] border border-white/10 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-2 z-50 animate-in slide-in-from-bottom-2 no-scrollbar">
                        {agents.filter(a => a.name.toLowerCase().includes(scannedId.toLowerCase()) || String(a.id).includes(scannedId)).slice(0, 8).map(a => (
                          <button key={a.id} onClick={() => { setScannedId(a.id); processScan(a.id); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-left">
                            <img src={formatDriveUrl(a.photoUrl)} className="w-8 h-8 rounded-lg object-cover" />
                            <div>
                              <p className="text-[10px] font-black text-white uppercase leading-none">{a.name}</p>
                              <p className="text-[7px] text-[#ffb700]/60 font-bold">ID: {a.id}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => scannedId && processScan(scannedId)}
                    disabled={!scannedId}
                    className="w-full bg-[#ffb700] py-5 rounded-3xl text-[#001f3f] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center gap-3"
                  >
                    <CheckCircle2 size={18} /> Confirmar Asistencia
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case AppView.DIRECTORY:
      case AppView.CIU:
        return currentUser ? <CIUModule key={`ciu-${currentUser.id}`} agents={agents} currentUser={currentUser} onUpdateNeeded={() => syncData(true)} intelReport={intelReport} setView={setView} visitorCount={visitorRadar.length} onRefreshIntel={handleRefreshIntel} isRefreshingIntel={isRefreshingIntel} onAgentClick={(a) => setFoundAgent(a)} /> : null;
      case AppView.VISITOR:
        return (
          <div className="p-6 md:p-10 space-y-8 animate-in fade-in pb-24 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                <h2 className="text-3xl font-bebas text-white tracking-widest uppercase">Radar de Visitantes</h2>
                <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.3em] font-montserrat opacity-60">Escaneo de Identidades Externas</p>
              </div>
              <div className="bg-[#ffb700]/10 border border-[#ffb700]/20 px-6 py-4 rounded-2xl flex items-center gap-3">
                <Activity className="text-[#ffb700] animate-pulse" size={18} />
                <span className="text-[10px] text-[#ffb700] font-black uppercase tracking-widest">{visitorRadar.length} Detectados</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visitorRadar.length > 0 ? (
                visitorRadar.map(v => (
                  <div key={v.id} onClick={() => { setScannedId(v.id); setView(AppView.SCANNER); }} className="group relative bg-[#001833] border border-white/5 rounded-[2.5rem] p-8 hover:border-[#ffb700]/30 transition-all cursor-pointer shadow-xl hover:-translate-y-1">
                    <div className="absolute top-4 right-6">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-3 bg-white/5 rounded-2xl w-fit group-hover:bg-[#ffb700]/10 transition-colors">
                        <Users className="text-[#ffb700]" size={24} />
                      </div>
                      <div>
                        <p className="text-xl font-bebas text-white uppercase tracking-wider group-hover:text-[#ffb700] transition-colors">{v.name}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex flex-col">
                            <span className="text-[7px] text-gray-500 font-black uppercase">Frecuencia</span>
                            <span className="text-[10px] text-white font-black uppercase">{v.visits || 0} Visitas</span>
                          </div>
                          <div className="w-px h-6 bg-white/10" />
                          <div className="flex flex-col">
                            <span className="text-[7px] text-gray-500 font-black uppercase">ID</span>
                            <span className="text-[10px] text-gray-400 font-mono">{v.id}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem]">
                  <Activity className="mx-auto text-gray-800 mb-4 opacity-20" size={48} />
                  <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest font-bebas">Buscando señales tácticas...</p>
                </div>
              )}
            </div>
          </div>
        );
      case AppView.ACADEMIA: return <AcademyModule userRole={effectiveRole} agentId={currentUser?.id || ''} onActivity={resetSessionTimer} />;
      case AppView.CONTENT: return <ContentModule userRole={effectiveRole} />;
      case AppView.PROFILE:
        return (
          <div className="p-6 md:p-10 space-y-8 animate-in fade-in pb-32 max-w-2xl mx-auto font-montserrat flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-4">
              <h2 className="text-3xl font-bebas text-white tracking-widest uppercase truncate">Expediente de Agente</h2>
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <Shield className="text-[#ffb700]" size={20} />
              </div>
            </div>

            {currentUser && <DigitalIdCard agent={currentUser} />}

            <div className="w-full grid grid-cols-1 gap-3 mt-6">
              <div className="grid grid-cols-3 gap-2 mb-2">
                <button onClick={() => setViewingAsRole(UserRole.STUDENT)} className={`py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all ${viewingAsRole === UserRole.STUDENT ? 'bg-[#ffb700] text-[#001f3f] border-[#ffb700]' : 'bg-white/5 text-white/40 border-white/10'}`}>Estudiante</button>
                <button onClick={() => setViewingAsRole(UserRole.LEADER)} className={`py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all ${viewingAsRole === UserRole.LEADER ? 'bg-[#ffb700] text-[#001f3f] border-[#ffb700]' : 'bg-white/5 text-white/40 border-white/10'}`}>Líder</button>
                <button onClick={() => setViewingAsRole(UserRole.DIRECTOR)} className={`py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all ${viewingAsRole === UserRole.DIRECTOR ? 'bg-[#ffb700] text-[#001f3f] border-[#ffb700]' : 'bg-white/5 text-white/40 border-white/10'}`}>Director</button>
              </div>

              <button onClick={() => alert("MÓDULO DE SEGURIDAD: Cambia tu PIN en la base de datos central.")} className="flex items-center justify-between px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all font-bebas">
                <div className="flex items-center gap-3">
                  <Key size={18} className="text-[#ffb700]" />
                  Cambiar PIN de Acceso
                </div>
                <ChevronRight size={14} className="text-gray-500" />
              </button>

              <button
                className="flex items-center justify-between px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all font-bebas"
                onClick={() => {
                  if (isBiometricAvailable) {
                    const confirmed = window.confirm("¿REGISTRAR DATOS BIOMÉTRICOS EN ESTE DISPOSITIVO?");
                    if (confirmed && currentUser) {
                      setIsRegisteringBio(true);
                      registerBiometric(currentUser.id, currentUser.name, currentUser.biometricCredential ? [currentUser.biometricCredential] : [])
                        .then(async (credId) => {
                          if (credId) {
                            const res = await registerBiometrics(currentUser.id, credId);
                            if (res.success) {
                              alert("BIOMETRÍA REGISTRADA EXITOSAMENTE");
                              syncData();
                            }
                          }
                        })
                        .catch(err => alert(err.message))
                        .finally(() => setIsRegisteringBio(false));
                    }
                  } else {
                    alert("TU DISPOSITIVO O CONEXIÓN NO SOPORTA BIOMETRÍA SEGURA (WebAuthn). ASEGÚRATE DE USAR HTTPS.");
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <Fingerprint size={18} className="text-[#ffb700]" />
                  {isRegisteringBio ? 'Registrando...' : 'Configurar Biometría'}
                </div>
                <ChevronRight size={14} className="text-gray-500" />
              </button>

              <button onClick={() => alert("CENTRO DE NOTIFICACIONES: Sin mensajes nuevos.")} className="flex items-center justify-between px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all font-bebas">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-[#ffb700]" />
                  Centro de Notificaciones
                </div>
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold">0</div>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-3 px-6 py-5 mt-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all font-bebas shadow-lg active:scale-95"
              >
                <LogOut size={18} />
                Cerrar Conexión
              </button>
            </div>
          </div>
        );
      case AppView.RANKING:
        return (
          <div className="space-y-0 min-h-full">
            <div className="bg-[#ffb700] p-8 pb-12 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-[#001f3f] rounded-full flex items-center justify-center shadow-xl border-4 border-[#ffb700]">
                <Flame size={32} className="text-[#ffb700] animate-pulse" />
              </div>
              <div>
                <h3 className="text-[#001f3f] font-bebas text-4xl font-black tracking-widest">RACHA DIARIA</h3>
                <p className="text-[10px] text-[#001f3f]/70 font-black uppercase tracking-widest">Consagrados Force 2026</p>
              </div>
            </div>

            <div className="p-6">
              <TacticalRanking agents={agents} currentUser={currentUser} />
            </div>
          </div>
        );
      case AppView.ENROLLMENT: return <EnrollmentForm onSuccess={() => { alert("Inscripción exitosa"); syncData(); setView(AppView.DIRECTORY); }} userRole={currentUser?.userRole} />;
      default: return null;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#001f3f] relative overflow-hidden font-montserrat">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ffb700]/10 blur-[120px] rounded-full"></div>
        </div>

        <div className="w-full max-w-sm space-y-10 z-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center space-y-2">
            <div className="relative inline-block mb-4">
              <img src={formatDriveUrl(OFFICIAL_LOGO)} alt="Logo" className="h-24 mx-auto relative z-10" />
              <div className="absolute inset-0 bg-[#ffb700] blur-2xl opacity-20 scale-150"></div>
            </div>
            <h1 className="text-4xl font-bebas font-bold text-white tracking-[0.2em] leading-none">CONSAGRADOS 2026</h1>
            <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-[0.5em] opacity-80">Command Center Táctico</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-4">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="ID DE AGENTE"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-xs font-bold tracking-widest outline-none focus:border-[#ffb700] focus:bg-white/10 transition-all group-hover:border-white/20 uppercase"
                />
                <Shield size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#ffb700]/30 group-focus-within:text-[#ffb700] transition-colors" />
              </div>

              <div className="relative group">
                <input
                  type="password"
                  placeholder="PIN DE SEGURIDAD"
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-xs font-bold tracking-[0.5em] outline-none focus:border-[#ffb700] focus:bg-white/10 transition-all group-hover:border-white/20"
                />
                <Key size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#ffb700]/30 group-focus-within:text-[#ffb700] transition-colors" />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-[#ffb700] py-6 rounded-2xl text-[#001f3f] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-[#ffb700]/90 active:scale-[0.98] transition-all font-bebas"
              >
                Acceder al Nodo
              </button>

              {biometricAvailable && (
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={isAuthenticatingBio}
                  className="w-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-[#ffb700] hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-50"
                  title="Acceso Biométrico"
                >
                  {isAuthenticatingBio ? <Loader2 size={24} className="animate-spin" /> : <Fingerprint size={24} />}
                </button>
              )}
            </div>

            <div className="pt-4 text-center">
              <button
                type="button"
                className="text-[8px] text-white/30 font-black uppercase tracking-widest hover:text-[#ffb700] transition-colors"
                onClick={() => setShowForgotPassword(true)}
              >
                ¿Olvidaste tu PIN de Seguridad?
              </button>
            </div>
          </form>

          <div className="text-center">
            <p className="text-[6px] text-white/20 font-black uppercase tracking-widest">
              V{APP_VERSION} // ENCRYPTED CONNECTION: {sessionIp}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoggedIn && !currentUser) return <LoadingScreen message="INICIALIZANDO CONEXIÓN..." />;

  return (
    <Layout activeView={view} setView={setView} userRole={currentUser?.userRole || UserRole.STUDENT} userName={currentUser?.name || 'Agente'} onLogout={handleLogout} notificationCount={notificationCount}>
      <div className="relative h-full overflow-y-auto no-scrollbar">{renderContent()}</div>

      {scannedAgentForPoints && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0a0a0a] border border-blue-500/30 rounded-[3rem] p-8 space-y-8 shadow-2xl">
            <p className="text-white font-black text-center uppercase tracking-widest">{scannedAgentForPoints.name}</p>
            <div className="grid grid-cols-1 gap-3">
              <PointButton label="Compromiso (+10)" onClick={() => handleIncrementPoints('BIBLIA')} disabled={isUpdatingPoints} icon={<Zap size={16} />} />
              <PointButton label="Servicio (+10)" onClick={() => handleIncrementPoints('APUNTES')} disabled={isUpdatingPoints} icon={<Star size={16} />} />
            </div>
            <button onClick={() => setScannedAgentForPoints(null)} className="w-full py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest">Cerrar</button>
          </div>
        </div>
      )}

      {foundAgent && (
        <div className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center justify-center p-6 animate-in fade-in">
          <button onClick={() => setFoundAgent(null)} className="mb-10 text-white/50 hover:text-white uppercase transition-colors text-[10px] font-black tracking-[0.4em]">Cerrar Expediente</button>
          <DigitalIdCard agent={foundAgent} />
        </div>
      )}

      {showSessionWarning && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#001f3f] border border-[#ffb700]/30 rounded-[2rem] p-8 space-y-6 text-center">
            <h3 className="text-white font-bebas text-2xl tracking-widest uppercase">¿Sigues ahí?</h3>
            <p className="text-[10px] text-white/60 font-montserrat uppercase tracking-widest">Tu sesión expirará pronto.</p>
            <button onClick={() => resetSessionTimer()} className="w-full bg-[#ffb700] py-4 rounded-2xl text-[#001f3f] font-black uppercase text-[10px] tracking-[0.2em]">Mantener Conexión</button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
