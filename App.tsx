
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
import { Search, QrCode, X, ChevronRight, Activity, Target, Shield, Zap, Book, FileText, Star, RotateCcw, Trash2, Database, AlertCircle, RefreshCw, BookOpen, Eye, EyeOff, Plus, Fingerprint, Flame, CheckCircle2, Circle, Loader2, Bell, Crown, Medal, Trophy, AlertTriangle, LogOut, History, Users, Key, Settings, Sparkles, Download } from 'lucide-react';
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
  const APP_VERSION = "1.6.9"; // UI Corrections Release
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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showQuickLogin, setShowQuickLogin] = useState(true);
  const [directorySearch, setDirectorySearch] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleLogout = useCallback(() => {
    const remembered = localStorage.getItem('remembered_user');
    const version = localStorage.getItem('app_version');
    const dismissedBanner = localStorage.getItem('pwa_banner_dismissed');

    localStorage.clear();

    if (remembered) localStorage.setItem('remembered_user', remembered);
    if (version) localStorage.setItem('app_version', version);
    if (dismissedBanner) localStorage.setItem('pwa_banner_dismissed', dismissedBanner);

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
    setShowQuickLogin(true);

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

    const storedRemembered = localStorage.getItem('remembered_user');
    if (storedRemembered) {
      try {
        setRememberedUser(JSON.parse(storedRemembered));
      } catch (e) {
        localStorage.removeItem('remembered_user');
      }
    }

    fetchDailyVerse().then(res => {
      if (res.success && res.data) {
        setDailyVerse(res.data);
      } else {
        // Fallback para que siempre se muestre un versículo
        setDailyVerse({ verse: 'Porque donde están dos o tres congregados en mi nombre, allí estoy yo en medio de ellos.', reference: 'Mateo 18:20' });
      }
    }).catch(() => {
      setDailyVerse({ verse: 'Porque donde están dos o tres congregados en mi nombre, allí estoy yo en medio de ellos.', reference: 'Mateo 18:20' });
    });

    // PWA Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      if (!isInstalled) setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (!isInstalled && !localStorage.getItem('pwa_banner_dismissed')) {
      setShowInstallBanner(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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

      const summary = { id: user.id, name: user.name, photoUrl: user.photoUrl };
      localStorage.setItem('remembered_user', JSON.stringify(summary));
      setRememberedUser(summary);

      setLastActiveTime(now);
      setCurrentUser(user);
      setIsLoggedIn(true);
      setView(AppView.HOME);
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

        const summary = { id: user.id, name: user.name, photoUrl: user.photoUrl };
        localStorage.setItem('remembered_user', JSON.stringify(summary));
        setRememberedUser(summary);

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

  const effectiveRole = viewingAsRole || currentUser?.userRole || UserRole.STUDENT;

  const renderContent = () => {
    switch (view) {
      case AppView.HOME:
        return (
          <div className="p-5 md:p-8 space-y-6 animate-in fade-in pb-24 max-w-2xl mx-auto font-montserrat">
            <div className="flex flex-col items-center text-center space-y-3 mb-2">
              <div className="p-3 bg-[#ffb700]/10 rounded-full border border-[#ffb700]/20 animate-pulse">
                <Shield size={24} className="text-[#ffb700]" />
              </div>
              <div>
                <h2 className="text-2xl font-bebas font-black text-white tracking-widest leading-none">NODO CENTRAL</h2>
                <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.4em] mt-1">{currentUser?.name}</p>
              </div>
            </div>

            <div className="w-full animate-in slide-in-from-top-4 duration-1000 mb-6">
              <DailyVerse verse={dailyVerse || { verse: 'Cargando versículo del día...', reference: '' }} />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="relative group overflow-hidden rounded-3xl p-6 glass-amber shadow-[0_0_40px_rgba(255,183,0,0.1)] border border-[#ffb700]/30 transition-all duration-700">
                <div className="absolute inset-0 shimmer-bg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <Flame size={100} className="text-[#ffb700]" />
                </div>
                <div className="relative z-10 w-full flex justify-between items-center">
                  <div className="animate-fade">
                    <p className="text-[8px] font-black text-[#ffb700] uppercase tracking-[0.2em] mb-1">Racha de Consagración</p>
                    <p className="text-4xl font-bebas font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{currentUser?.streakCount || 0} DÍAS</p>
                  </div>
                  <div className="bg-[#ffb700] p-4 rounded-2xl shadow-[0_0_20px_rgba(255,183,0,0.4)] animate-scale">
                    <Flame size={32} className="text-[#001f3f]" />
                  </div>
                </div>
                <div className="w-full space-y-3 relative z-10 mt-4">
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <div className="h-full bg-gradient-to-r from-[#ffb700] to-amber-300 shadow-[0_0_15px_rgba(255,183,0,0.6)] transition-all duration-1000" style={{ width: `${Math.min(100, ((currentUser?.streakCount || 0) / 365) * 100)}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-widest italic">
                    <p className="text-white/30">Objetivo: 365 días</p>
                    <p className="text-[#ffb700]">{Math.floor(((currentUser?.streakCount || 0) / 365) * 100)}% Completado</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => setView(AppView.RANKING)} className="p-4 glass-card border-white/10 rounded-3xl flex flex-col items-center gap-2 hover:bg-[#ffb700]/10 hover:border-[#ffb700]/40 transition-all active:scale-90 shadow-lg group">
                <Trophy size={24} className="text-[#ffb700] group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,183,0,0.5)] transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest font-bebas text-white/60 group-hover:text-white transition-colors">Ranking</span>
              </button>
              <button onClick={() => setView(AppView.ACADEMIA)} className="p-4 glass-card border-white/10 rounded-3xl flex flex-col items-center gap-2 hover:bg-white/10 hover:border-white/20 transition-all active:scale-90 shadow-lg group">
                <Database size={24} className="text-[#ffb700] group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,183,0,0.5)] transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest font-bebas text-white/60 group-hover:text-white transition-colors">Academia</span>
              </button>
              <button onClick={() => setView(AppView.CONTENT)} className="p-4 glass-card border-white/10 rounded-3xl flex flex-col items-center gap-2 hover:bg-white/10 hover:border-white/20 transition-all active:scale-90 shadow-lg group">
                <BookOpen size={24} className="text-[#ffb700] group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,183,0,0.5)] transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest font-bebas text-white/60 group-hover:text-white transition-colors">Material</span>
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
        return (
          <div className="p-6 md:p-10 space-y-6 animate-in fade-in pb-24 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                <h2 className="text-3xl font-bebas text-white tracking-widest uppercase">Directorio de Agentes</h2>
                <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.3em] font-montserrat opacity-60">Toca un agente para ver su perfil</p>
              </div>
              <div className="bg-[#ffb700]/10 border border-[#ffb700]/20 px-6 py-4 rounded-2xl flex items-center gap-3">
                <Users className="text-[#ffb700]" size={18} />
                <span className="text-[10px] text-[#ffb700] font-black uppercase tracking-widest">{agents.length} Agentes</span>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="BUSCAR AGENTE..."
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-[11px] font-black uppercase tracking-widest outline-none focus:border-[#ffb700] transition-all placeholder:text-white/20"
              />
              <Search size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-white/30" />
            </div>

            {/* Clasificación por Rol */}
            {(() => {
              const search = directorySearch.toLowerCase();
              const matchSearch = (a: any) => !directorySearch || a.name.toLowerCase().includes(search) || String(a.id).includes(directorySearch);
              const directors = agents.filter(a => a.userRole === UserRole.DIRECTOR && matchSearch(a));
              const leaders = agents.filter(a => a.userRole === UserRole.LEADER && matchSearch(a)).sort((a, b) => b.xp - a.xp);
              const students = agents.filter(a => (a.userRole === UserRole.STUDENT || !a.userRole) && matchSearch(a)).sort((a, b) => b.xp - a.xp);

              const renderGrid = (list: typeof agents, borderClass: string, xpColor: string) => (
                <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
                  {list.map((a, idx) => (
                    <div
                      key={a.id}
                      onClick={() => setFoundAgent(a)}
                      style={{ animationDelay: `${idx * 50}ms` }}
                      className={`group relative aspect-square rounded-3xl overflow-hidden border-2 ${borderClass} animate-view transition-all p-1 active:scale-90 cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-1`}
                    >
                      <img src={formatDriveUrl(a.photoUrl)} className="w-full h-full object-cover rounded-2xl grayscale group-hover:grayscale-0 transition-all duration-700" onError={(e) => { e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'; }} />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-2 text-center pointer-events-none">
                        <p className="text-[8px] font-black text-white uppercase truncate leading-none mb-0.5">{a.name.split(' ')[0]}</p>
                        <p className={`text-[6px] font-bold ${xpColor}`}>{a.xp} XP</p>
                      </div>
                    </div>
                  ))}
                </div>
              );

              return (
                <div className="space-y-6 pb-10">
                  {directors.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <Crown size={14} className="text-[#ffb700]" />
                        <span className="text-[9px] text-[#ffb700] font-black uppercase tracking-[0.3em]">Directores ({directors.length})</span>
                      </div>
                      {renderGrid(directors, "border-[#ffb700]/30 bg-[#ffb700]/5 hover:border-[#ffb700]/50", "text-[#ffb700]")}
                    </div>
                  )}
                  {leaders.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <Shield size={14} className="text-blue-400" />
                        <span className="text-[9px] text-blue-400 font-black uppercase tracking-[0.3em]">Líderes ({leaders.length})</span>
                      </div>
                      {renderGrid(leaders, "border-blue-400/20 bg-blue-400/5 hover:border-blue-400/40", "text-blue-400")}
                    </div>
                  )}
                  {students.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <Users size={14} className="text-white/60" />
                        <span className="text-[9px] text-white/60 font-black uppercase tracking-[0.3em]">Estudiantes ({students.length})</span>
                      </div>
                      {renderGrid(students, "border-white/5 bg-white/5 hover:border-white/20", "text-[#ffb700]")}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );
      case AppView.CIU:
        return currentUser ? <CIUModule key={`ciu-${currentUser.id}`} agents={agents} currentUser={currentUser} onUpdateNeeded={() => syncData(true)} intelReport={intelReport} setView={setView} visitorCount={visitorRadar.length} onRefreshIntel={handleRefreshIntel} isRefreshingIntel={isRefreshingIntel} onAgentClick={(a) => setFoundAgent(a)} userRole={effectiveRole} /> : null;
      case AppView.VISITOR:
        return (
          <div className="p-6 md:p-10 space-y-8 animate-in fade-in pb-24 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                <h2 className="text-3xl font-bebas text-white tracking-widest uppercase">Radar de Visitantes</h2>
                <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.3em] font-montserrat opacity-60">Escaneo de Identidades Externas</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-[#ffb700]/10 border border-[#ffb700]/20 px-6 py-4 rounded-2xl flex items-center gap-3">
                  <Activity className="text-[#ffb700] animate-pulse" size={18} />
                  <span className="text-[10px] text-[#ffb700] font-black uppercase tracking-widest">{visitorRadar.length} Detectados</span>
                </div>
                <button
                  onClick={() => {
                    const name = prompt('Nombre del visitante:');
                    if (name && name.trim()) {
                      // Registrar visitante usando la misma mecánica de processScan con el nombre
                      alert(`Visitante "${name.trim()}" registrado. Actualiza la hoja de visitas para persistir.`);
                      syncData(true);
                    }
                  }}
                  className="bg-[#ffb700] px-5 py-4 rounded-2xl text-[#001f3f] text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2 shadow-lg"
                >
                  <Plus size={16} /> Registrar
                </button>
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

            {currentUser?.userRole === UserRole.DIRECTOR && (
              <div className="w-full space-y-2 mt-6">
                <p className="text-[8px] text-white/40 font-black uppercase tracking-widest text-center">Vista como rol</p>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setViewingAsRole(viewingAsRole === UserRole.STUDENT ? null : UserRole.STUDENT)} className={`py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 ${viewingAsRole === UserRole.STUDENT ? 'bg-[#ffb700] text-[#001f3f] border-[#ffb700]' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}>Estudiante</button>
                  <button onClick={() => setViewingAsRole(viewingAsRole === UserRole.LEADER ? null : UserRole.LEADER)} className={`py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 ${viewingAsRole === UserRole.LEADER ? 'bg-blue-500 text-white border-blue-500' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}>Líder</button>
                  <button onClick={() => setViewingAsRole(viewingAsRole === UserRole.DIRECTOR ? null : UserRole.DIRECTOR)} className={`py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 ${(!viewingAsRole || viewingAsRole === UserRole.DIRECTOR) ? 'bg-[#ffb700] text-[#001f3f] border-[#ffb700]' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}>Director</button>
                </div>
                {viewingAsRole && viewingAsRole !== UserRole.DIRECTOR && (
                  <p className="text-[7px] text-[#ffb700] font-bold uppercase tracking-widest text-center animate-pulse">
                    Viendo como: {viewingAsRole} — La navegación y módulos se ajustan a este rol
                  </p>
                )}
              </div>
            )}

            <div className="w-full grid grid-cols-1 gap-3 mt-6">

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

          {rememberedUser && showQuickLogin ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <img
                    src={formatDriveUrl(rememberedUser.photoUrl)}
                    className="w-24 h-24 rounded-full object-cover border-4 border-[#ffb700] shadow-[0_0_20px_rgba(255,183,0,0.3)] animate-pulse"
                    onError={(e) => { e.currentTarget.src = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'; }}
                  />
                  <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-[#001f3f]"></div>
                </div>
                <div className="text-center">
                  <p className="text-white font-black text-lg uppercase tracking-widest leading-none mb-1">{rememberedUser.name}</p>
                  <p className="text-[#ffb700] text-[8px] font-black uppercase tracking-[0.4em] opacity-80">Sesión Detectada</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <input
                    type="password"
                    placeholder="INTRODUCE TU PIN"
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-xs font-bold tracking-[0.5em] outline-none focus:border-[#ffb700] focus:bg-white/10 transition-all text-center"
                  />
                  <Key size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#ffb700]/30" />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => {
                      setLoginId(rememberedUser.id);
                      setTimeout(() => handleLogin(), 50);
                    }}
                    className="w-full bg-[#ffb700] py-6 rounded-2xl text-[#001f3f] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-[#ffb700]/90 active:scale-[0.98] transition-all font-bebas"
                  >
                    Acceder ahora
                  </button>

                  {biometricAvailable && (
                    <button
                      type="button"
                      onClick={() => {
                        setLoginId(rememberedUser.id);
                        setTimeout(() => handleBiometricLogin(), 50);
                      }}
                      className="w-full bg-blue-600/20 border border-blue-500/30 py-6 rounded-2xl text-blue-400 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-blue-600/30 active:scale-[0.98] transition-all font-bebas flex items-center justify-center gap-2"
                    >
                      <Fingerprint size={18} /> Acceso Biométrico
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickLogin(false);
                      setRememberedUser(null);
                      localStorage.removeItem('remembered_user');
                      setLoginId('');
                      setLoginPin('');
                    }}
                    className="w-full py-4 text-white/30 hover:text-white/60 text-[8px] font-black uppercase tracking-widest transition-all"
                  >
                    Ingresar con otra credencial
                  </button>
                </div>
              </div>
            </div>
          ) : (
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
          )}

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
    <Layout activeView={view} setView={setView} userRole={effectiveRole} userName={currentUser?.name || 'Agente'} onLogout={handleLogout} notificationCount={notificationCount}>
      <div key={view} className="relative h-full overflow-y-auto no-scrollbar animate-view">
        {renderContent()}
      </div>

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
        <div className="fixed inset-0 z-[100] bg-black/98 flex flex-col items-center p-6 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-sm sticky top-0 z-10 flex justify-end py-2">
            <button onClick={() => setFoundAgent(null)} className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl px-6 py-3 text-white uppercase transition-all text-[10px] font-black tracking-[0.3em] flex items-center gap-2 active:scale-95">
              <X size={16} /> Cerrar
            </button>
          </div>
          <div className="mt-4 flex-1 flex items-center justify-center w-full animate-scale">
            <DigitalIdCard agent={foundAgent} />
          </div>
        </div>
      )}

      {showInstallBanner && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 z-[90] animate-in slide-in-from-bottom-4 duration-500">
          <div className="max-w-md mx-auto bg-[#001833] border border-[#ffb700]/30 rounded-2xl p-5 shadow-2xl flex items-center gap-4">
            <div className="p-3 bg-[#ffb700]/10 rounded-xl shrink-0">
              <Download size={20} className="text-[#ffb700]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-white uppercase tracking-widest leading-tight">Instalar App</p>
              <p className="text-[8px] text-white/50 font-bold uppercase tracking-wider mt-0.5">Para eliminar barras del navegador</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  if (deferredPrompt) {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then(() => {
                      setDeferredPrompt(null);
                      setShowInstallBanner(false);
                    });
                  } else {
                    alert("Para instalar: toca el menú del navegador (⋮) y selecciona 'Agregar a pantalla de inicio' o 'Instalar aplicación'.");
                  }
                }}
                className="px-4 py-2.5 bg-[#ffb700] rounded-xl text-[#001f3f] text-[8px] font-black uppercase tracking-widest active:scale-95 transition-all"
              >
                Instalar
              </button>
              <button
                onClick={() => {
                  setShowInstallBanner(false);
                  localStorage.setItem('pwa_banner_dismissed', 'true');
                }}
                className="p-2.5 text-gray-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
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
