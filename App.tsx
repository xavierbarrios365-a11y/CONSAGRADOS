
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
import { Search, QrCode, X, ChevronRight, Activity, Target, Shield, Zap, Book, FileText, Star, RotateCcw, Trash2, Database, AlertCircle, RefreshCw, BookOpen, Eye, EyeOff, Plus, Fingerprint, Flame, CheckCircle2, Circle, Loader2, Bell, Crown, Medal, Trophy } from 'lucide-react';
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
  const APP_VERSION = "1.6.0"; // UI Refactor, Pure Session, Minimalist Profile
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<Agent | null>(null);
  const [loginId, setLoginId] = useState('');
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
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isAuthenticatingBio, setIsAuthenticatingBio] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0); // Iniciado en 0 como se pidió
  const [dailyVerse, setDailyVerse] = useState<DailyVerseType | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRegisteringBio, setIsRegisteringBio] = useState(false);
  const [rememberedUser, setRememberedUser] = useState<{ id: string; name: string; photoUrl: string } | null>(null);
  const [viewingAsRole, setViewingAsRole] = useState<UserRole | null>(null); // Solo para simulador de Director

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- FUNCIONES DE AYUDA (DEFINIDAS ANTES DE LOS EFFECTS) ---

  const handleLogout = useCallback(() => {
    console.log("🔴 PROTOCOLO DE CIERRE DE SESIÓN INICIADO");

    // 1. Limpiar persistencia de sesión EXCEPTO el usuario recordado
    const remembered = localStorage.getItem('remembered_user');
    const version = localStorage.getItem('app_version');

    localStorage.clear();

    if (remembered) localStorage.setItem('remembered_user', remembered);
    if (version) localStorage.setItem('app_version', version);

    // 2. Limpiar estados de React
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
    // Preservar rememberedUser en el estado si existe
    if (remembered) {
      try {
        setRememberedUser(JSON.parse(remembered));
        setLoginId(JSON.parse(remembered).id);
      } catch (e) { }
    } else {
      setRememberedUser(null);
    }

    // 3. Forzar purga total y recarga limpia
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

  // --- EFFECTS ---

  // 0. Cache Busting y Verificación de Versión
  useEffect(() => {
    const savedVersion = localStorage.getItem('app_version');
    if (savedVersion !== APP_VERSION) {
      console.log(`Nueva versión detectada (${APP_VERSION}). Limpiando caché y reiniciando...`);

      // Limpiar versiones antiguas pero mantener la sesión si es posible
      localStorage.setItem('app_version', APP_VERSION);

      // Forzar recarga omitiendo caché del navegador
      window.location.reload();
    }
  }, []);

  // 1. Inicialización y Persistencia
  useEffect(() => {
    const storedUser = localStorage.getItem('consagrados_agent');
    const storedLastActive = localStorage.getItem('last_active_time');

    if (storedUser) {
      try {
        const agent = JSON.parse(storedUser);
        const lastActive = storedLastActive ? parseInt(storedLastActive) : 0;
        const now = Date.now();

        // Expira si han pasado más de 12 horas (sesión larga) o si el tiempo de inactividad fue superado
        if (now - lastActive > 300000 && lastActive !== 0) {
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

    // Verificar disponibilidad de biometría
    isBiometricAvailable().then(setBiometricAvailable);

    // Cargar usuario recordado para quick login
    const storedRememberedUser = localStorage.getItem('remembered_user');
    if (storedRememberedUser) {
      try {
        const parsed = JSON.parse(storedRememberedUser);
        setRememberedUser(parsed);
        setLoginId(parsed.id); // Pre-llenar el ID para login rápido
      } catch { }
    }

    // Obtener versículo del día
    fetchDailyVerse().then(res => {
      if (res.success) setDailyVerse(res.data);
    });
  }, []);

  // Lógica de Rachas (Ejemplo simple: si ha visto la academia y tiene XP > 0)
  useEffect(() => {
    if (currentUser && currentUser.weeklyTasks) {
      const academyTask = currentUser.weeklyTasks.find(t => t.id === 'academy');
      if (academyTask && !academyTask.completed && view === AppView.ACADEMIA) {
        // Simular cumplimiento de tarea
        const updatedTasks = currentUser.weeklyTasks.map(t =>
          t.id === 'academy' ? { ...t, completed: true } : t
        );
        const isWeekComplete = updatedTasks.every(t => t.completed);
        updateAgentStreaks(currentUser.id, isWeekComplete, updatedTasks).then(res => {
          if (res.success) {
            setCurrentUser(prev => prev ? { ...prev, weeklyTasks: updatedTasks, streakCount: res.streak } : null);
          }
        });
      }
    }
  }, [view, currentUser]);

  // Limpiar mensaje de éxito después de unos segundos
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // 2. Temporizador de Expiración (5 min)
  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = now - lastActiveTime;
      if (diff >= 300000) {
        handleLogout();
      } else if (diff >= 210000) { // Aviso a los 3.5 min para dar tiempo en móvil
        setShowSessionWarning(true);
      }
    }, 5000); // Intervalo más largo para ahorrar batería

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
                  const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "attemptBoth",
                  });

                  if (code && code.data && code.data !== scannedId) {
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
                  }
                } catch (qrErr) {
                  console.error("Error en jsQR loop:", qrErr);
                }
              }
              if (active) requestAnimationFrame(scan);
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
  }, [view, scanStatus]);

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
          if (updatedSelf) {
            setCurrentUser(updatedSelf);
            // PERSISTENCIA: Solo actualizar si todavía estamos logueados (evita sobreescribir logout)
            if (localStorage.getItem('consagrados_agent')) {
              localStorage.setItem('consagrados_agent', JSON.stringify(updatedSelf));
            }
          }
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
        // Guardar usuario para quick login futuro
        localStorage.setItem('remembered_user', JSON.stringify({ id: user.id, name: user.name, photoUrl: user.photoUrl }));
        // Redirigir según rol
        const targetView = user.userRole === UserRole.DIRECTOR ? AppView.CIU : AppView.HOME;
        setView(targetView);
        return;
      } else {
        setLoginError({ field: 'pin', message: `PIN INCORRECTO PARA ID: ${user.id}` });
      }
    } else {
      setLoginError({ field: 'id', message: `ID '${loginId}' NO RECONOCIDO EN EL DIRECTORIO.` });
    }
  };

  const handleBiometricLogin = async () => {
    if (!loginId) {
      setLoginError({ field: 'id', message: "INGRESA TU ID PARA USAR BIOMETRÍA." });
      return;
    }

    setIsAuthenticatingBio(true);
    try {
      // 1. Obtener credencial guardada del backend
      const inputNumericId = loginId.replace(/[^0-9]/g, '');
      const user = agents.find(a => a.id.replace(/[^0-9]/g, '') === inputNumericId);

      if (!user || !user.biometricCredential) {
        setLoginError({ field: 'both', message: "BIOMETRÍA NO REGISTRADA PARA ESTE AGENTE." });
        setIsAuthenticatingBio(false);
        return;
      }

      // 2. Autenticar localmente
      const success = await authenticateBiometric(user.biometricCredential);

      if (success) {
        setLastActiveTime(Date.now());
        localStorage.setItem('consagrados_agent', JSON.stringify(user));
        setCurrentUser(user);
        setIsLoggedIn(true);
        const targetView = user.userRole === UserRole.DIRECTOR ? AppView.CIU : AppView.HOME;
        setView(targetView);
      } else {
        setLoginError({ field: 'both', message: "BIOMETRÍA NO VINCULADA O RECHAZADA. ENTRA CON PIN PARA RE-VINCULAR." });
      }
    } catch (err: any) {
      console.error("Bio Error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
        setLoginError({ field: 'both', message: "ESTE EQUIPO NO TIENE TU LLAVE. ENTRA CON PIN Y ACTÍVALA EN PERFIL." });
      } else {
        setLoginError({ field: 'both', message: "FALLO DE SEGURIDAD BIOMÉTRICA." });
      }
    } finally {
      setIsAuthenticatingBio(false);
    }
  };

  const handleRegisterBiometrics = async () => {
    if (!currentUser) return;
    setIsRegisteringBio(true);
    try {
      // Pasar credenciales existentes para evitar duplicados y permitir múltiples dispositivos
      const existingCredentials = currentUser.biometricCredential
        ? [currentUser.biometricCredential]
        : [];

      const credentialId = await registerBiometric(
        currentUser.id,
        currentUser.name,
        existingCredentials
      );

      if (credentialId) {
        const res = await registerBiometrics(currentUser.id, credentialId);
        if (res.success) {
          setCurrentUser({ ...currentUser, biometricCredential: credentialId });
          localStorage.setItem('consagrados_agent', JSON.stringify({ ...currentUser, biometricCredential: credentialId }));
          setSuccessMessage("🛡️ BIOMETRÍA ACTIVADA: ACCESO BLINDADO");
        }
      }
    } catch (error: any) {
      console.error("Fallo Biometría:", error);
      // Mostrar mensaje específico del error
      const msg = error.message || "ERROR EN EL SISTEMA BIOMÉTRICO.";
      alert(msg);
    } finally {
      setIsRegisteringBio(false);
    }
  };

  const handlePromptNotifications = () => {
    const OneSignal = (window as any).OneSignal;
    const isReady = (window as any).OneSignalReady;

    if (!isReady) {
      setSuccessMessage("📡 CONECTANDO CON NODO DE NOTIFICACIONES...");
      return;
    }

    if (OneSignal) {
      OneSignal.push(async () => {
        try {
          // Estándar OneSignal v16: Notifications.requestPermission()
          if (OneSignal.Notifications) {
            await OneSignal.Notifications.requestPermission();
            setSuccessMessage("🔔 SOLICITUD DE PERMISOS LANZADA");
          } else {
            OneSignal.showNativePrompt();
            setSuccessMessage("🔔 PROTOCOLO DE NOTIFICACIÓN ACTIVADO");
          }
        } catch (err) {
          console.error("OneSignal Error:", err);
          alert("ERROR AL LANZAR NOTIFICACIONES: " + err);
        }
      });
    } else {
      alert("SISTEMA DE NOTIFICACIONES NO INICIALIZADO");
    }
  };

  const handleVerseQuizComplete = async () => {
    if (!currentUser) return;

    // Simular que todas las tareas se mantienen y solo se asegura que el verso esté OK
    const updatedTasks = currentUser.weeklyTasks?.map(t =>
      t.id === 'verse' ? { ...t, completed: true } : t
    ) || [];

    const isWeekComplete = updatedTasks.length > 0 && updatedTasks.every(t => t.completed);

    try {
      // Lógica de racha diaria: siempre enviamos que se completó el verso
      const res = await updateAgentStreaks(currentUser.id, true, updatedTasks);
      if (res.success) {
        setCurrentUser({ ...currentUser, weeklyTasks: updatedTasks, streakCount: res.streak });
        setSuccessMessage("🛡️ RACHA ACTUALIZADA: SABIDURÍA REGISTRADA");
        syncData(true); // Sincronizar en segundo plano
      }
    } catch (err) {
      console.error("Error al actualizar racha por verso:", err);
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
    const label = type === 'BIBLIA' ? 'COMPROMISO' : 'SERVICIO';
    try {
      const res = await updateAgentPoints(scannedAgentForPoints.id, type, 10);
      if (res.success) {
        alert(`+10 PUNTOS DE ${label} ASIGNADOS A ${scannedAgentForPoints.name.split(' ')[0]}`);
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

  const startScanner = () => {
    setScanStatus('SCANNING');
  };

  const stopScanner = () => {
    setScanStatus('IDLE');
    setScannedId('');
  };

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

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-gradient-to-br from-[#ffb700]/20 to-transparent border border-[#ffb700]/30 rounded-[3rem] p-8 flex flex-col gap-6 overflow-hidden relative group shadow-2xl">
                <div className="absolute right-0 top-0 opacity-5 -translate-y-4 translate-x-4">
                  <Flame size={160} className="text-[#ffb700]" />
                </div>

                <div className="flex items-center justify-between relative z-10 w-full">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-[#ffb700] uppercase tracking-[0.2em] mb-1">Racha de Consagración</p>
                    <p className="text-6xl font-bebas font-black text-white">{currentUser?.streakCount || 0} DÍAS</p>
                  </div>
                  <div className="bg-[#ffb700] p-5 rounded-[2rem] shadow-[0_15px_30px_rgba(255,183,0,0.3)]">
                    <Activity size={32} className="text-[#001f3f] animate-pulse" />
                  </div>
                </div>

                {/* Progress Bar Tier System */}
                <div className="w-full space-y-3 relative z-10">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] text-[#ffb700] font-black uppercase tracking-widest">Objetivo: 365 Días</span>
                    <span className="text-[10px] text-white font-black">{Math.min(100, Math.floor(((currentUser?.streakCount || 0) / 365) * 100))}%</span>
                  </div>
                  <div className="h-3 w-full bg-white/5 rounded-full border border-white/5 overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-[#ffb700] to-orange-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,183,0,0.5)]"
                      style={{ width: `${Math.min(100, ((currentUser?.streakCount || 0) / 365) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest text-center mt-2">MANTENTE FIRME EN LA BRECHA</p>
                </div>
              </div>

              <DailyVerse verse={dailyVerse} onQuizComplete={handleVerseQuizComplete} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setView(AppView.ACADEMIA)} className="p-8 bg-white/5 border border-white/5 rounded-[2.5rem] flex flex-col items-center gap-4 hover:bg-white/10 transition-all active:scale-95 shadow-lg group">
                <Database size={32} className="text-[#ffb700] group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase tracking-widest font-bebas">Academia</span>
              </button>
              <button onClick={() => setView(AppView.CONTENT)} className="p-8 bg-white/5 border border-white/5 rounded-[2.5rem] flex flex-col items-center gap-4 hover:bg-white/10 transition-all active:scale-95 shadow-lg group">
                <BookOpen size={32} className="text-[#ffb700] group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-black uppercase tracking-widest font-bebas">Material</span>
              </button>
            </div>
          </div>
        );
      case AppView.VISITOR:
        return (
          <div className="p-6 md:p-10 space-y-6 animate-in fade-in pb-24 relative min-h-[calc(100svh-160px)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-left space-y-1">
                <h2 className="text-2xl font-bebas text-white uppercase tracking-widest">Radar de Visitantes</h2>
                <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-widest opacity-60 font-montserrat">Seguimiento de posibles reclutas detectados</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="manual-visitor-name"
                  placeholder="NOMBRE DEL VISITANTE..."
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-[10px] font-black uppercase tracking-widest focus:border-[#ffb700] outline-none transition-all flex-1 md:w-64 font-bebas"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      processScan(e.currentTarget.value);
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
                    className={`p-6 rounded-[2.5rem] border transition-all cursor-pointer relative overflow-hidden group ${v.status === 'INSCRIPCIÓN INMEDIATA'
                      ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${v.status === 'INSCRIPCIÓN INMEDIATA' ? 'bg-orange-500/20 border-orange-500/40 text-orange-500' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                        <Target size={24} className={v.status === 'INSCRIPCIÓN INMEDIATA' ? 'animate-pulse' : ''} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white uppercase truncate font-bebas tracking-wider">{v.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8px] text-[#ffb700] font-black uppercase tracking-widest">{v.visits || v.absences} {v.visits ? 'VISITAS' : 'FALTAS'}</span>
                          <span className={`text-[7px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${v.status === 'INSCRIPCIÓN INMEDIATA' || v.status === 'SALIDA DEL SISTEMA' ? 'bg-orange-500 text-white' : 'bg-white/10 text-gray-500'}`}>{v.status}</span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                ))
              )}
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
          <div className="p-6 md:p-10 min-h-[calc(100svh-160px)] md:h-full flex flex-col items-center justify-center animate-in fade-in relative pb-32">
            <button
              onClick={() => setView(AppView.HOME)}
              className="absolute top-6 right-6 md:top-10 md:right-10 bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 text-gray-400 hover:text-white transition-all active:scale-95 group z-50"
            >
              <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
            <div className="w-full flex flex-col items-center gap-8 max-w-sm">
              <div className="w-full flex justify-center">
                {currentUser && <DigitalIdCard key={`profile-${currentUser.id}`} agent={currentUser} />}
              </div>

              {/* Toast de Éxito */}
              {successMessage && (
                <div className="w-full bg-green-500/20 border border-green-500/40 rounded-3xl p-5 animate-in slide-in-from-top-4 shadow-xl">
                  <p className="text-[10px] text-green-500 font-black uppercase tracking-widest text-center flex items-center justify-center gap-2">
                    <Shield size={14} /> {successMessage}
                  </p>
                </div>
              )}

              {/* PROTOCOLOS DE SEGURIDAD Y ACCESO */}
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between px-2">
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] font-bebas">Seguridad Táctica</p>
                  <Shield size={14} className="text-[#ffb700] opacity-40" />
                </div>

                <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 space-y-6 shadow-2xl backdrop-blur-md">
                  {/* Botón Cambiar PIN - Resaltado a petición */}
                  <button
                    onClick={() => setIsMustChangeFlow(true)}
                    className="w-full bg-blue-600/20 border border-blue-500/30 rounded-2xl py-5 px-8 text-blue-400 text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg group"
                  >
                    <RotateCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                    Cambiar PIN o Pregunta
                  </button>

                  <div className="h-px bg-white/5 w-full"></div>

                  {/* Biometría */}
                  {biometricAvailable ? (
                    currentUser && !currentUser.biometricCredential ? (
                      <button
                        onClick={handleRegisterBiometrics}
                        disabled={isRegisteringBio}
                        className="w-full bg-[#ffb700] border border-[#ffb700]/30 rounded-2xl py-4 px-8 text-[#001f3f] text-[10px] font-black uppercase tracking-widest hover:bg-[#ffb700]/80 transition-all flex items-center justify-center gap-3 active:scale-95"
                      >
                        {isRegisteringBio ? <Loader2 size={18} className="animate-spin" /> : <Fingerprint size={18} />}
                        Activar FaceID / Huella
                      </button>
                    ) : (
                      <div className="flex flex-col items-center gap-2 p-4 bg-green-500/5 rounded-2xl border border-green-500/10">
                        <div className="flex items-center gap-2 text-[8px] text-green-500 font-black uppercase tracking-widest">
                          <Fingerprint size={14} />
                          Biometría Enlazada
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10 text-center">
                      <p className="text-[7px] text-red-500 font-bold uppercase tracking-widest">Biometría No Soportada</p>
                    </div>
                  )}

                  {/* Notificaciones */}
                  <button
                    onClick={handlePromptNotifications}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-8 text-gray-400 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    <Bell size={14} />
                    Probar Notificaciones
                  </button>
                </div>
              </div>

              {/* PROTOCOLO DE SIMULACIÓN (DIRECTOR ONLY) */}
              {currentUser?.userRole === UserRole.DIRECTOR && (
                <div className="w-full space-y-4 pt-4 border-t border-white/5 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-black text-[#ffb700] uppercase tracking-[0.3em] font-bebas">Simulador de Identidad</p>
                    <Crown size={14} className="text-[#ffb700] animate-pulse" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-black/40 p-2 rounded-2xl border border-white/5 shadow-inner">
                    <button
                      onClick={() => setViewingAsRole(UserRole.DIRECTOR)}
                      className={`py-3 rounded-xl text-[8px] font-black uppercase transition-all tracking-widest ${viewingAsRole === UserRole.DIRECTOR || viewingAsRole === null ? 'bg-[#ffb700] text-[#001f3f] shadow-lg shadow-[#ffb700]/10' : 'text-white/40 hover:text-white'}`}
                    >
                      Director
                    </button>
                    <button
                      onClick={() => setViewingAsRole(UserRole.LEADER)}
                      className={`py-3 rounded-xl text-[8px] font-black uppercase transition-all tracking-widest ${viewingAsRole === UserRole.LEADER ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' : 'text-white/40 hover:text-white'}`}
                    >
                      Líder
                    </button>
                    <button
                      onClick={() => setViewingAsRole(UserRole.STUDENT)}
                      className={`py-3 rounded-xl text-[8px] font-black uppercase transition-all tracking-widest ${viewingAsRole === UserRole.STUDENT ? 'bg-gray-600 text-white shadow-lg shadow-gray-500/10' : 'text-white/40 hover:text-white'}`}
                    >
                      Estudiante
                    </button>
                  </div>
                  <p className="text-[7px] text-white/20 font-bold uppercase tracking-[0.2em] text-center">CAMBIO DE VISTA TEMPORAL ACTIVADO</p>
                </div>
              )}

              <div className="pt-4 opacity-20 hover:opacity-100 transition-opacity">
                <p className="text-[7px] text-gray-500 font-black uppercase tracking-[0.5em] text-center">Protocolo v1.6.4 Phase II</p>
              </div>
            </div>
          </div>
        );
      case AppView.ACADEMIA:
        return currentUser ? <AcademyModule key={`academy-${currentUser.id}`} userRole={effectiveRole} agentId={currentUser.id} /> : null;
      case AppView.RANKING:
        return <TacticalRanking key={`ranking-${currentUser?.id || 'none'}`} agents={agents} currentUser={currentUser} />;
      case AppView.CONTENT:
        return <ContentModule key={`content-${currentUser?.id}`} userRole={effectiveRole} />;
      case AppView.CIU:
        return currentUser ? <CIUModule
          key={`ciu-${currentUser.id}`}
          agents={agents}
          currentUser={currentUser}
          onUpdateNeeded={() => syncData(true)}
          intelReport={intelReport}
          setView={setView}
          visitorCount={visitorRadar.length}
          onRefreshIntel={handleRefreshIntel}
          isRefreshingIntel={isRefreshingIntel}
        /> : null;
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

            {/* SMART LOGIN: Si hay un usuario recordado, mostramos bienvenida rápida */}
            {rememberedUser ? (
              <>
                <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.3em] mb-2 animate-pulse">Bienvenido de nuevo</p>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full border-2 border-[#ffb700]/50 overflow-hidden">
                    <img
                      src={formatDriveUrl(rememberedUser.photoUrl)}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"; }}
                    />
                  </div>
                  <h1 className="text-2xl font-bebas font-bold text-white tracking-wide">{rememberedUser.name.split(' ')[0]}</h1>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('remembered_user');
                    setRememberedUser(null);
                    setLoginId('');
                    setLoginPin('');
                  }}
                  className="text-[8px] text-gray-500 font-bold uppercase tracking-widest hover:text-[#ffb700] transition-colors"
                >
                  ¿No eres tú? Cambiar de agente
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Mostrar campo ID solo si no hay usuario recordado */}
            {!rememberedUser && (
              <div>
                <input
                  type="text"
                  placeholder="ID O CÉDULA"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-xs font-bold tracking-widest outline-none focus:border-[#ffb700] transition-all focus:bg-white/10 font-montserrat"
                />
              </div>
            )}
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

            {biometricAvailable && (
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={isAuthenticatingBio}
                className="w-full bg-white/5 border border-white/10 py-5 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest hover:bg-white/10 active:scale-[0.98] transition-all font-bebas flex items-center justify-center gap-3"
              >
                <Fingerprint size={20} className={isAuthenticatingBio ? "animate-pulse" : ""} />
                {isAuthenticatingBio ? "Verificando..." : "Acceso Biométrico"}
              </button>
            )}
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

              {!currentUser?.mustChangePassword && (
                <button
                  onClick={() => setIsMustChangeFlow(false)}
                  className="w-full text-[8px] text-gray-600 font-black uppercase tracking-widest hover:text-white transition-colors"
                >
                  Omitir por ahora
                </button>
              )}
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

  // SAFETY CHECK: Evitar "Pantalla Azul" si isLoggedIn es true pero currentUser aún no está hidratado
  if (isLoggedIn && !currentUser) {
    return <LoadingScreen message="CONECTANDO CON EL NODO CENTRAL..." />;
  }

  return (
    <Layout
      activeView={view}
      setView={setView}
      userRole={viewingAsRole || currentUser?.userRole || UserRole.STUDENT}
      userName={currentUser?.name || 'Agente'}
      onLogout={handleLogout}
      notificationCount={notificationCount}
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
                  label="Compromiso (+10)"
                  onClick={() => handleIncrementPoints('BIBLIA')}
                  disabled={isUpdatingPoints}
                  icon={<Zap size={16} />}
                />
                <PointButton
                  label="Servicio (+10)"
                  onClick={() => handleIncrementPoints('APUNTES')}
                  disabled={isUpdatingPoints}
                  icon={<Star size={16} />}
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

export default App;
