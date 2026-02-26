import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import { AppView, Agent, UserRole, Visitor, Guide, Badge } from './types';
import DigitalIdCard, { formatDriveUrl } from './components/DigitalIdCard';
import IntelFeed from './components/IntelFeed';
import AcademyModule from './components/AcademyModule';
import CIUModule from './components/IntelligenceCenter';
import { EnrollmentForm } from './components/EnrollmentForm';
import DailyVerse from './components/DailyVerse';
import EliteRecruitmentTest from './components/EliteRecruitmentTest';
import TacticalProfileDetail from './components/TacticalProfileDetail';
import { DailyVerse as DailyVerseType, InboxNotification } from './types';
import TacticalExpediente from './components/TacticalExpediente';
import ContentModule from './components/ContentModule';
import NotificationInbox from './components/NotificationInbox';
import { TacticalAlertProvider, useTacticalAlert } from './components/TacticalAlert';
import TacticalChat from './components/TacticalChat';
import TacticalRanking from './components/TacticalRanking';
import PromotionModule from './components/PromotionModule';
import TasksModule from './components/TasksModule';
import PromotionProgressCard from './components/PromotionProgressCard';
import TrainingCenter from './components/TrainingCenter';
import BadgeShowcase from './components/BadgeShowcase';
import TacticalCertificate from './components/TacticalCertificate';
import LoadingScreen from './components/LoadingScreen';
import LighthouseIndicator from './components/LighthouseIndicator';
import AdminDashboard from './components/AdminDashboard';
import { parseAttendanceDate } from './utils/dateUtils';
import {
  fetchAgentsFromSheets,
  uploadImage,
  reconstructDatabase,
  updateAgentPoints,
  getSecurityQuestion,
  resetPasswordWithAnswer,
  updateAgentPin,
  fetchGuides,
  deductPercentagePoints,
  deleteGuide,
  fetchVisitorRadar,
  fetchAcademyData,
  submitQuizResult,
  deleteAcademyLesson,
  deleteAcademyCourse,
  saveBulkAcademyData,
  updateAgentAiProfile,
  resetStudentAttempts,
  updateNotifPrefs,
  fetchDailyVerse,
  updateAgentStreaks,
  registerBiometrics,
  verifyBiometrics,
  updateAgentAiPendingStatus,
  fetchNotifications,
  syncFcmToken,
  deleteAgent as deleteAgentService,
} from './services/sheetsService';
import {
  syncAllAgentsToSupabase,
  fetchAgentsFromSupabase,
  updateAgentPointsSupabase,
  fetchUserEventConfirmationsSupabase as fetchUserEventConfirmations,
  fetchActiveEventsSupabase as fetchActiveEvents,
  confirmEventAttendanceSupabase as confirmEventAttendanceService,
  updateAgentPhotoSupabase,
  enrollAgentSupabase,
  submitTransactionSupabase
} from './services/supabaseService';
import { generateGoogleCalendarLink, downloadIcsFile, parseEventDate } from './services/calendarService';
import { requestForToken, onMessageListener, db, trackEvent } from './firebase-config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Search, QrCode, X, ChevronRight, ChevronUp, Activity, Target, Zap, Book, FileText, Star, RotateCcw, Trash2, Database, AlertCircle, RefreshCw, BookOpen, Eye, EyeOff, Plus, Fingerprint, Flame, CheckCircle2, Circle, Loader2, Bell, Crown, Medal, Trophy, AlertTriangle, LogOut, History, Users, UserPlus, Key, Settings, Sparkles, Download, MessageSquare, Calendar, Radio, GraduationCap, ClipboardList, Share2, ShieldCheck, Brain } from 'lucide-react';
import { generateTacticalProfile, getTacticalAnalysis } from './services/geminiService';
import jsQR from 'jsqr';
import { isBiometricAvailable, registerBiometric, authenticateBiometric } from './services/BiometricService';
import { initRemoteConfig } from './services/configService';

// --- Custom Hooks ---
import { useAuth } from './hooks/useAuth';
import { useDataSync } from './hooks/useDataSync';
import { useFirebaseMessaging } from './hooks/useFirebaseMessaging';

const OFFICIAL_LOGO = "/logo_white.png";

const viewVariants: any = {
  initial: { opacity: 0, y: 15, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: "circOut" } },
  exit: { opacity: 0, y: -15, filter: 'blur(10px)', transition: { duration: 0.3, ease: "circIn" } }
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

const App: React.FC = () => {
  const APP_VERSION = "1.9.1"; // Academia & Ranking Correction v1.9.1

  // --- Custom Hooks: Auth, Data Sync, Firebase ---
  const auth = useAuth();
  const dataSync = useDataSync(auth.currentUser, auth.isLoggedIn);
  const firebase = useFirebaseMessaging(auth.currentUser, auth.isLoggedIn, dataSync.checkHeadlines);

  // Keep the auth hook's agents ref in sync with the latest fetched agents
  useEffect(() => { auth.agentsRef.current = dataSync.agents; }, [dataSync.agents]);

  // Destructure for convenience (backward compatible with existing render code)
  const {
    isLoggedIn, currentUser, loginId, loginPin, showPin, loginError,
    showForgotPassword, forgotPasswordStep, securityAnswerInput, resetError, revealedPin,
    isMustChangeFlow, newPinInput, confirmPinInput, newQuestionInput, newAnswerInput, isUpdatingPin,
    biometricAvailable, isAuthenticatingBio, isRegisteringBio,
    lastActiveTime, showSessionWarning, sessionIp,
    rememberedUser, showQuickLogin,
    setLoginId, setLoginPin, setShowPin, setLoginError,
    setShowForgotPassword, setForgotPasswordStep, setSecurityAnswerInput, setResetError, setRevealedPin,
    setIsMustChangeFlow, setNewPinInput, setConfirmPinInput, setNewQuestionInput, setNewAnswerInput, setIsUpdatingPin,
    setIsRegisteringBio, setRememberedUser,
    setCurrentUser, setIsLoggedIn, setShowSessionWarning, setShowQuickLogin,
    handleLogin, handleBiometricLogin, handleLogout, handleHardReset,
    resetSessionTimer, refreshCurrentUser,
  } = auth;

  const {
    agents, setAgents,
    isSyncing,
    visitorRadar, setVisitorRadar,
    activeEvents, setActiveEvents,
    badges, setBadges,
    headlines,
    unreadNotifications, setUnreadNotifications,
    syncData,
    checkHeadlines,
    userConfirmations, setUserConfirmations,
  } = dataSync;

  const { notificationPermission, setNotificationPermission, initFirebaseMessaging } = firebase;

  // --- Remaining local state (view-specific, not worth extracting) ---
  const [view, setView] = useState<AppView>(AppView.HOME);
  const [intelReport, setIntelReport] = useState<string>('SISTEMAS EN LÍNEA...');
  const [scanStatus, setScanStatus] = useState<'IDLE' | 'SCANNING' | 'SUCCESS'>('IDLE');
  const [scannedId, setScannedId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [foundAgent, setFoundAgent] = useState<Agent | null>(null);
  const [showExpedienteFor, setShowExpedienteFor] = useState<Agent | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [scannedAgentForPoints, setScannedAgentForPoints] = useState<Agent | null>(null);
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewingAsRole, setViewingAsRole] = useState<UserRole | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');
  const [showInbox, setShowInbox] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isConfirmingEvent, setIsConfirmingEvent] = useState<string | null>(null);
  const [dailyVerse, setDailyVerse] = useState<DailyVerseType | null>(null);
  const { showAlert } = useTacticalAlert();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- SISTEMA DE PURGA TÁCTICA (FORCE REFRESH ON UPDATE) ---
  useEffect(() => {
    const checkVersionAndPurge = async () => {
      const storedVersion = localStorage.getItem('app_version');
      if (storedVersion && storedVersion !== APP_VERSION) {
        console.warn(`🚀 NUEVA VERSIÓN DETECTADA (${storedVersion} -> ${APP_VERSION}). EJECUTANDO PURGA TÁCTICA...`);

        try {
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));
          }

          const lastId = localStorage.getItem('last_login_id');
          const remembered = localStorage.getItem('remembered_user');
          const notifBackup: Record<string, string> = {};
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('read_notifications_') || k.startsWith('deleted_notifications_'))) {
              notifBackup[k] = localStorage.getItem(k)!;
            }
          }

          localStorage.clear();
          if (lastId) localStorage.setItem('last_login_id', lastId);
          if (remembered) localStorage.setItem('remembered_user', remembered);
          Object.entries(notifBackup).forEach(([k, v]) => localStorage.setItem(k, v));
          localStorage.setItem('app_version', APP_VERSION);

          window.location.reload();
        } catch (e) {
          console.error("Fallo en purga:", e);
          localStorage.setItem('app_version', APP_VERSION);
          window.location.reload();
        }
      } else {
        localStorage.setItem('app_version', APP_VERSION);
      }
    };
    checkVersionAndPurge();
  }, []);

  const [isUpdatingAiProfile, setIsUpdatingAiProfile] = useState(false);

  const handleGlobalTestComplete = async (testAnswers: any, awardedXp: number) => {
    if (!currentUser) return;
    setIsUpdatingAiProfile(true);
    try {
      const { progress } = await fetchAcademyData(currentUser.id);
      const result = await generateTacticalProfile(currentUser, progress, testAnswers);
      if (result) {
        await updateAgentAiProfile(currentUser.id, result.stats, result.summary);
        // Clear pending flag if it was set
        await updateAgentAiPendingStatus(currentUser.id, false);

        // Award XP only if it was a required pending evaluation
        if (awardedXp > 0 && currentUser.isAiProfilePending) {
          await updateAgentPointsSupabase(currentUser.id, "XP", awardedXp);
        }

        const freshAgents = await syncData(); // Refrescar estado global
        if (freshAgents) refreshCurrentUser(freshAgents); // Sincronizar con datos frescos
      }
    } catch (err) {
      console.error("Fallo re-perfilado global", err);
      showAlert({ title: "FALLO TÉCNICO", message: "⚠️ ERROR TÉCNICO EN RE-PERFILADO. REINTENTE.", type: 'ERROR' });
    } finally {
      setIsUpdatingAiProfile(false);
    }
  };

  // Sincronizar currentUser automáticamente cuando la lista de agentes se actualiza
  useEffect(() => {
    if (isLoggedIn && agents.length > 0) {
      refreshCurrentUser(agents);

      // --- SINCRONIZACIÓN PARALELA A SUPABASE ---
      // Realizamos una sincronización en segundo plano con un pequeño retraso
      // para no saturar si hay actualizaciones seguidas.
      const timer = setTimeout(() => {
        syncAllAgentsToSupabase(agents);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [agents, isLoggedIn, refreshCurrentUser]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Init: Remote config, daily verse, PWA install (not extracted — App-specific) ---
  useEffect(() => {
    initRemoteConfig();

    fetchDailyVerse().then(res => {
      if (res.success && res.data) {
        setDailyVerse(res.data);
      } else {
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

    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (!isInstalled && !localStorage.getItem('pwa_banner_dismissed')) {
      setShowInstallBanner(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // --- Sync user data when syncData fetches new agents ---
  useEffect(() => {
    if (dataSync.agents.length > 0) {
      refreshCurrentUser(dataSync.agents);
    }
  }, [dataSync.agents, refreshCurrentUser]);

  // --- QR Scanner ---
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
          showAlert({ title: "FALLO DE SENSOR", message: "NO SE PUDO ACTIVAR LA CÁMARA.", type: 'ERROR' });
        }
      };
      startCamera();
      return () => {
        active = false;
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      };
    }
  }, [view, scanStatus]);

  // --- SECURITY: ANTI-SCREENSHOT FOR STUDENTS ---
  useEffect(() => {
    if (isLoggedIn && currentUser?.userRole === UserRole.STUDENT) {
      const handleContextMenu = (e: MouseEvent) => e.preventDefault();
      const handleBlur = () => { document.body.classList.add('tactical-blackout'); };
      const handleFocus = () => { document.body.classList.remove('tactical-blackout'); };

      document.addEventListener('contextmenu', handleContextMenu);
      window.addEventListener('blur', handleBlur);
      window.addEventListener('focus', handleFocus);
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';

      return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('focus', handleFocus);
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
      };
    }
  }, [isLoggedIn, currentUser]);


  const processScan = async (idToProcess?: string) => {
    const id = idToProcess || scannedId;
    if (!id || scanStatus === 'SUCCESS') return;
    setScanStatus('SCANNING');
    try {
      const result = await submitTransactionSupabase(id, 'ASISTENCIA', currentUser?.name);
      if (result.success) {
        setScanStatus('SUCCESS');
        const agent = agents.find(a => String(a.id) === String(id));
        if (agent) {
          setScannedAgentForPoints(agent);
        }
        setTimeout(() => { setScanStatus('IDLE'); setScannedId(''); syncData(true); }, 3000);
      } else {
        showAlert({ title: "FALLO DE SISTEMA", message: result.error || "Fallo en registro.", type: 'ERROR' });
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
      const res = await updateAgentPointsSupabase(scannedAgentForPoints.id, type, 10);
      if (res.success) {
        showAlert({ title: "PUNTOS ASIGNADOS", message: "✅ +10 PUNTOS REGISTRADOS EXITOSAMENTE", type: 'SUCCESS' });
        syncData();
      } else {
        showAlert({ title: "FALLO DE PROTOCOLO", message: "❌ ERROR AL REGISTRAR PUNTOS: " + (res.error || "Fallo en el protocolo."), type: 'ERROR' });
      }
    } catch (err: any) {
      showAlert({ title: "FALLO DE CONEXIÓN", message: "⚠️ FALLO DE CONEXIÓN CON EL NÚCLEO: " + (err.message || "Error desconocido."), type: 'ERROR' });
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

  const handleVerseQuizComplete = async () => {
    if (!currentUser) return;

    // Marcar la tarea de lectura como completada HOY (Zona Horaria Caracas)
    const localToday = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }); // format: YYYY-MM-DD
    const alreadyDone = localStorage.getItem('verse_completed_date') === localToday;
    if (alreadyDone) return;

    const updatedTasks = currentUser.weeklyTasks?.map(t =>
      t.id === 'bible' ? { ...t, completed: true } : t
    ) || [{ id: 'bible', title: 'Lectura diaria', completed: true }];

    // Incrementar racha inmediatamente en local (optimistic update)
    const optimisticStreak = (currentUser.streakCount || 0) + 1;
    const updatedUser = {
      ...currentUser,
      streakCount: optimisticStreak,
      weeklyTasks: updatedTasks
    };
    setCurrentUser(updatedUser);
    sessionStorage.setItem('consagrados_session', JSON.stringify(updatedUser));
    localStorage.setItem('verse_completed_date', localToday);

    try {
      console.log("🔥 Sincronizando racha...");
      const res = await updateAgentStreaks(currentUser.id, false, updatedTasks, currentUser.name);
      if (res.success && res.streak !== undefined) {
        // Siempre confiar en el valor del servidor (es la fuente de verdad)
        const serverUser = {
          ...updatedUser,
          streakCount: res.streak,
          lastStreakDate: res.lastStreakDate
        };
        setCurrentUser(serverUser);
        sessionStorage.setItem('consagrados_session', JSON.stringify(serverUser));
      }
    } catch (e) {
      console.error("Error sincronizando racha con servidor:", e);
      // El optimistic update ya se aplicó, así que el usuario ve su racha correctamente
    }
  };

  const handleConfirmDirectorAttendance = async () => {
    if (!currentUser || currentUser.userRole !== UserRole.DIRECTOR) return;

    try {
      const res = await confirmDirectorAttendance(currentUser.id, currentUser.name);
      if (res.alreadyDone) {
        showAlert({ title: "ESTATUS NOMINAL", message: "✅ YA HAS CONFIRMADO TU ASISTENCIA HOY.", type: 'INFO' });
      } else if (res.success) {
        showAlert({ title: "ASISTENCIA CONFIRMADA", message: "✅ ASISTENCIA CONFIRMADA TÁCTICAMENTE.", type: 'SUCCESS' });

        // Ofrecer añadir al calendario
        showAlert({
          title: "CALENDARIO TÁCTICO",
          message: "📅 ¿DESEAS AÑADIR ESTE EVENTO A TU CALENDARIO?",
          type: 'CONFIRM',
          onConfirm: () => {
            const event = {
              title: "REUNIÓN CONSAGRADOS 2026",
              description: "Confirmación de asistencia táctica como DIRECTOR.",
              startTime: new Date(),
              endTime: new Date(new Date().getTime() + 2 * 60 * 60 * 1000) // +2h
            };
            window.open(generateGoogleCalendarLink(event), '_blank');
          }
        });
      } else {
        showAlert({ title: "ERROR TÁCTICO", message: "❌ FALLO EN PROTOCOLO DE ASISTENCIA", type: 'ERROR' });
      }
    } catch (e) {
      showAlert({ title: "ERROR TÁCTICO", message: "❌ FALLO EN PROTOCOLO DE ASISTENCIA", type: 'ERROR' });
    }
  };

  const handleConfirmEventAttendance = async (event: any) => {
    if (!currentUser) return;
    setIsConfirmingEvent(event.id);
    try {
      const res = await confirmEventAttendanceService({
        agentId: currentUser.id,
        agentName: currentUser.name,
        eventId: event.id,
        eventTitle: event.titulo
      });

      if (res.success) {
        showAlert({
          title: "MISIÓN CONFIRMADA",
          message: `✅ Has sido registrado exitosamente para: ${event.titulo}`,
          type: 'SUCCESS'
        });

        // Ofrecer añadir al calendario
        showAlert({
          title: "CALENDARIO TÁCTICO",
          message: "📅 ¿DESEAS AÑADIR ESTE EVENTO A TU CALENDARIO?",
          type: 'CONFIRM',
          confirmText: "SÍ, AÑADIR",
          cancelText: "LUEGO",
          onConfirm: () => {
            try {
              const startDate = parseEventDate(event.fecha, event.hora);
              const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

              const calendarEvent = {
                title: event.titulo || 'Evento Consagrados',
                description: `Participación en el evento táctico: ${event.titulo}`,
                startTime: startDate,
                endTime: endDate
              };

              const calLink = generateGoogleCalendarLink(calendarEvent);
              if (calLink) {
                window.open(calLink, '_blank', 'noopener,noreferrer');
              } else {
                showAlert({ title: "ERROR", message: "No se pudo generar el enlace.", type: 'ERROR' });
              }
            } catch (calError) {
              console.error('Error creando enlace de calendario:', calError);
              showAlert({ title: "ERROR", message: "Error en protocolo de calendario.", type: 'ERROR' });
            }
          }
        });

        // Actualizar confirmaciones locales inmediatamente
        setUserConfirmations(prev => [...prev, String(event.titulo).trim()]);
        syncData(true);
      }
    } catch (e) {
      showAlert({ title: "FALLO DE SISTEMA", message: "❌ FALLO EN PROTOCOLO DE EVENTO", type: 'ERROR' });
    } finally {
      setIsConfirmingEvent(null);
    }
  };

  const renderContent = () => {
    switch (view) {
      case AppView.HOME:
        return (
          <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="home" className="h-full">
            <div className="p-5 md:p-8 space-y-6 pb-24 max-w-2xl mx-auto font-montserrat">
              {/* ENCABEZADO COMPACTO - Solo Nombre y Estatus (v3.1) */}
              <div className="flex items-center gap-4 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] text-[#ffb700] font-black uppercase tracking-[0.3em] font-montserrat opacity-60">Agente Activo</p>
                        {/* LED de Conexión Minimalista */}
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${isOnline && notificationPermission === 'granted' ? 'bg-[#ffb700] shadow-[0_0_8px_rgba(255,183,0,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'} animate-pulse`}
                          title={isOnline && notificationPermission === 'granted' ? 'CONECTADO' : 'DESCONECTADO'}
                        />
                      </div>
                      <p className="text-xl font-bebas text-white tracking-widest uppercase truncate leading-none mt-0.5">
                        {currentUser?.name
                          ? currentUser.name.split(' ').slice(0, 2).join(' ')
                          : 'Agente'}
                      </p>
                    </div>
                    {/* PROGRESO COMPACTO EN EL HEADER */}
                    {currentUser && (
                      <div className="hidden xs:block">
                        <PromotionProgressCard
                          agentId={currentUser.id}
                          currentRank={currentUser.rank}
                          compact={true}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[8px] text-white/40 font-black uppercase tracking-wider bg-white/5 px-3 py-1 rounded-full">{currentUser?.rank || 'RECLUTA'}</span>
                    {/* INSIGNIAS PROPIAS (Solo si tiene) */}
                    <div className="flex-1">
                      <BadgeShowcase
                        currentAgentId={currentUser?.id}
                        currentAgentName={currentUser?.name}
                        mode="profile"
                        compact={true}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTÓN DE ACTIVACIÓN SI ESTÁ OFFLINE */}
              {notificationPermission !== 'granted' && (
                <div className="mb-6">
                  <button
                    onClick={initFirebaseMessaging}
                    className="w-full py-3 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-600/30 transition-all active:scale-95 font-bebas flex items-center justify-center gap-3"
                  >
                    <Bell size={14} className="animate-swing" />
                    ACTIVAR CANAL TÁCTICO DE NOTIFICACIONES
                  </button>
                </div>
              )}

              <style>{`
              @keyframes ticker {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              .animate-swing { animation: swing 2s infinite ease-in-out; }
              @keyframes swing {
                0%, 100% { transform: rotate(0deg); }
                20% { transform: rotate(15deg); }
                40% { transform: rotate(-10deg); }
                60% { transform: rotate(5deg); }
                80% { transform: rotate(-5deg); }
              }
            `}</style>

              {/* BOTÓN EXPERIMENTAL DE COMANDO CENTRAL (SOLO DIRECTOR) */}
              {currentUser?.userRole === UserRole.DIRECTOR && (
                <div className="mb-6 animate-in slide-in-from-top-4 duration-700">
                  <button
                    onClick={() => setView(AppView.ADMIN)}
                    className="w-full py-4 bg-[#ffb700] text-[#001f3f] font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_0_30px_rgba(255,183,0,0.3)] hover:scale-[1.02] transform transition-all font-bebas flex items-center justify-center gap-3"
                  >
                    <ShieldCheck size={18} /> INICIAR COMANDO CENTRAL
                  </button>
                </div>
              )}

              <div className="w-full animate-in slide-in-from-top-4 duration-1000 mb-6">
                <DailyVerse
                  verse={dailyVerse ? { ...dailyVerse, lastStreakDate: currentUser?.lastStreakDate } : null}
                  streakCount={currentUser?.streakCount}
                  onQuizComplete={handleVerseQuizComplete}
                  agent={currentUser || undefined}
                />
              </div>

              {/* Intel Feed - Posición Primaria (v3.0) */}
              <IntelFeed headlines={headlines} agents={agents} />

              {/* RADAR DE DESERCIÓN RÁPIDO - HOME (PERSONALIZADO POR ROL) */}
              {(() => {
                const isCommandRole = currentUser?.userRole === UserRole.DIRECTOR || currentUser?.userRole === UserRole.LEADER;

                if (isCommandRole) {
                  // DIRECTOR/LÍDER: Ver alerta general de deserción con conteo
                  const dangerCount = agents.filter(a => {
                    if (!a.lastAttendance || a.lastAttendance === 'N/A') return false;
                    const lastDate = parseAttendanceDate(a.lastAttendance);
                    if (!lastDate) return false;
                    const diffDays = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
                    return diffDays >= 21;
                  }).length;

                  if (dangerCount === 0) return null;

                  return (
                    <div onClick={() => setView(AppView.VISITOR)} className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-2xl cursor-pointer animate-pulse hover:bg-red-500/20 transition-all">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="text-red-500" size={20} />
                        <div>
                          <p className="text-[10px] text-white font-black uppercase tracking-widest">COMANDO: ALERTA DE DESERCIÓN</p>
                          <p className="text-[8px] text-red-500/80 font-bold uppercase">{dangerCount} AGENTES EN PELIGRO CRÍTICO</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-red-500" />
                    </div>
                  );
                } else {
                  // ESTUDIANTE: Solo ver alerta personal si ELLOS están en riesgo
                  if (!currentUser?.lastAttendance || currentUser.lastAttendance === 'N/A') return null;
                  const myLastDate = parseAttendanceDate(currentUser.lastAttendance);
                  if (!myLastDate) return null;
                  const myDiffDays = Math.floor((new Date().getTime() - myLastDate.getTime()) / (1000 * 60 * 60 * 24));

                  if (myDiffDays < 14) return null; // No están en riesgo

                  return (
                    <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="text-amber-500" size={20} />
                        <div>
                          <p className="text-[10px] text-white font-black uppercase tracking-widest">⚠️ ALERTA PERSONAL</p>
                          <p className="text-[8px] text-amber-500/80 font-bold uppercase">LLEVAS {myDiffDays} DÍAS SIN ASISTIR. ¡NO TE RINDAS!</p>
                        </div>
                      </div>
                    </div>
                  );
                }
              })()}

              {/* EVENTOS ACTIVOS */}
              {activeEvents.length > 0 && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={14} className="text-[#ffb700] animate-pulse" />
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest font-bebas">Operaciones Próximas</span>
                  </div>
                  {activeEvents.map(evt => (
                    <div key={evt.id} className="bg-[#001833] border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Target size={60} className="text-[#ffb700]" />
                      </div>
                      <div className="relative z-10">
                        <h4 className="text-lg font-bebas font-black text-white uppercase tracking-wider">{evt.titulo}</h4>
                        <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-widest mb-3 opacity-80">{evt.fecha} @ {evt.hora || 'S/H'}</p>
                        {evt.descripcion && <p className="text-[9px] text-white/50 mb-4 leading-relaxed font-montserrat">{evt.descripcion}</p>}

                        <div className="flex flex-col gap-2">
                          {userConfirmations.includes(String(evt.titulo).trim()) ? (
                            <div className="w-full bg-green-500/10 border border-green-500/30 text-green-500 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 font-bebas">
                              <ShieldCheck size={14} /> Misión Confirmada
                            </div>
                          ) : (
                            <button
                              onClick={() => handleConfirmEventAttendance(evt)}
                              disabled={isConfirmingEvent === evt.id}
                              className="w-full bg-[#ffb700] text-[#001f3f] font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-[#ffb700]/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 font-bebas shadow-[0_10px_20px_rgba(255,183,0,0.2)]"
                            >
                              {isConfirmingEvent === evt.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                              Confirmar Mi Asistencia
                            </button>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                try {
                                  const startDate = parseEventDate(evt.fecha, evt.hora);
                                  const endDate = new Date(startDate.getTime() + 2 * 3600000);
                                  const calLink = generateGoogleCalendarLink({
                                    title: evt.titulo,
                                    description: evt.descripcion || '',
                                    startTime: startDate,
                                    endTime: endDate
                                  });
                                  if (calLink) {
                                    window.open(calLink, '_blank', 'noopener,noreferrer');
                                  } else {
                                    showAlert({ title: "ERROR", message: "No se pudo generar el enlace.", type: 'ERROR' });
                                  }
                                } catch (e) {
                                  showAlert({ title: "ERROR", message: "Fecha inválida.", type: 'ERROR' });
                                }
                              }}
                              className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-3 rounded-xl text-white/70 text-[8px] font-black uppercase tracking-widest hover:bg-[#ffb700]/20 hover:text-[#ffb700] transition-all"
                            >
                              <Calendar size={12} /> Google
                            </button>
                            <button
                              onClick={() => {
                                try {
                                  const startDate = parseEventDate(evt.fecha, evt.hora);
                                  const endDate = new Date(startDate.getTime() + 2 * 3600000);
                                  downloadIcsFile({
                                    title: evt.titulo,
                                    description: evt.descripcion || '',
                                    startTime: startDate,
                                    endTime: endDate
                                  });
                                } catch (e) {
                                  showAlert({ title: "ERROR", message: "Fecha inválida.", type: 'ERROR' });
                                }
                              }}
                              className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 py-3 rounded-xl text-white/70 text-[8px] font-black uppercase tracking-widest hover:bg-[#ffb700]/20 hover:text-[#ffb700] transition-all"
                            >
                              <Download size={12} /> Apple / Sistema
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 xs:grid-cols-3 gap-3">
                <button onClick={() => setView(AppView.RANKING)} className="p-4 glass-card border-white/10 rounded-3xl flex flex-col items-center gap-2 hover:bg-[#ffb700]/10 hover:border-[#ffb700]/40 transition-all active:scale-90 shadow-lg group">
                  <Trophy size={24} className="text-[#ffb700] group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,183,0,0.5)] transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest font-bebas text-white/60 group-hover:text-white transition-colors">Ranking</span>
                </button>
                {currentUser?.userRole !== UserRole.STUDENT && (
                  <button onClick={() => setView(AppView.ENROLLMENT)} className="p-4 glass-card border-white/10 rounded-3xl flex flex-col items-center gap-2 hover:bg-white/10 hover:border-white/20 transition-all active:scale-90 shadow-lg group">
                    <UserPlus size={24} className="text-[#ffb700] group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,183,0,0.5)] transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest font-bebas text-white/60 group-hover:text-white transition-colors">Reclutar</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div >
        );
      case AppView.SCANNER:
        return (
          <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="scanner" className="h-full">
            <div className="fixed inset-0 z-50 bg-[#001f3f] flex flex-col p-6">
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
                <div className="relative z-10 w-48 h-48 sm:w-64 sm:h-64 border-2 border-[#ffb700]/30 rounded-[2rem] flex flex-col items-center justify-center p-6 bg-black/40 backdrop-blur-md scanner-frame shadow-[0_0_30px_rgba(255,183,0,0.1)]">
                  {scanStatus === 'SCANNING' ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-b from-[#ffb700]/20 to-transparent animate-pulse rounded-[2rem]"></div>
                      <QrCode size={40} className="text-[#ffb700] animate-bounce mb-3" />
                      <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.2em] font-bebas">Buscando Agente...</p>
                    </>
                  ) : scanStatus === 'SUCCESS' ? (
                    <div className="flex flex-col items-center gap-2 animate-in zoom-in-50 duration-300">
                      <CheckCircle2 size={48} className="text-green-500" />
                      <p className="text-[12px] text-green-500 font-black uppercase tracking-widest font-bebas">Verificado</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setScanStatus('SCANNING'); }}
                      className="px-8 py-4 bg-[#ffb700] text-[#001f3f] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all font-bebas"
                    >
                      Reactivar Lente
                    </button>
                  )}
                </div>

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#001f3f] via-[#001f3f]/95 to-transparent p-6 sm:p-10 pb-[env(safe-area-inset-bottom,20px)]">
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

                {/* BOTÓN DE REFRESCO - ACCESIBLE EN MÓVIL */}
                <div className="absolute top-6 right-6 z-20">
                  <button
                    onClick={() => syncData()}
                    className="p-3 bg-[#001f3f]/80 backdrop-blur-md border border-white/10 rounded-2xl text-[#ffb700] hover:bg-[#ffb700]/10 transition-all shadow-xl active:scale-95"
                    title="Actualizar Radar"
                  >
                    <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        );
      case AppView.DIRECTORY:
        return (
          <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="directory" className="h-full">
            <div className="p-6 md:p-10 space-y-6 pb-24 max-w-4xl mx-auto">
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

                        {/* Badge Overlays */}
                        <div className="absolute top-1 right-1 flex flex-col gap-1 z-10">
                          {badges.filter(b => String(b.agentId) === String(a.id) || String(b.agentName) === String(a.name)).map((b, i) => (
                            <div key={i} className="w-4 h-4 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-[8px] animate-in zoom-in slide-in-from-right-1 shadow-lg" title={b.label}>
                              {b.emoji}
                            </div>
                          ))}
                        </div>

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
                          <Zap size={14} className="text-blue-400" />
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
          </motion.div>
        );
      case AppView.CIU:
        return (
          <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="ciu" className="h-full">
            {currentUser ? (
              <CIUModule
                agents={agents}
                currentUser={currentUser}
                onUpdateNeeded={() => syncData()}
                intelReport={intelReport}
                setView={setView}
                visitorCount={visitorRadar.length}
                onRefreshIntel={handleRefreshIntel}
                isRefreshingIntel={isRefreshingIntel}
                onAgentClick={(agent) => { setScannedAgentForPoints(agent); setView(AppView.HOME); }}
                userRole={effectiveRole}
                onActivateNotifications={initFirebaseMessaging}
              />
            ) : null}
          </motion.div>
        );
      case AppView.VISITOR:
        return (
          <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="visitor" className="h-full">
            <div className="p-6 md:p-10 space-y-8 pb-24 max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                  <h2 className="text-3xl font-bebas text-white tracking-widest uppercase">Radar de Inteligencia</h2>
                  <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.3em] font-montserrat opacity-60">SISTEMA DE ANÁLISIS DE SEÑALES TÁCTICAS</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      syncData();
                    }}
                    className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/40 border border-white/10"
                  >
                    <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                    ESCANEAR DESERCIONES
                  </button>
                  <button
                    onClick={() => setView(AppView.ENROLLMENT)}
                    className="bg-green-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-green-900/40 border border-white/10"
                  >
                    <UserPlus size={16} /> INSCRIPCIÓN DE AGENTE
                  </button>
                </div>
              </div>

              <div className="space-y-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                    <Activity size={18} className="text-red-500 animate-pulse" />
                    <h3 className="text-xl font-bebas text-white tracking-widest uppercase">RADAR DE DESERCIÓN</h3>
                  </div>
                  {(() => {
                    const riskAgents = agents.filter(a => {
                      const isStudent = (a.userRole === UserRole.STUDENT || !a.userRole);
                      if (!isStudent) return false;
                      if (!a.lastAttendance || a.lastAttendance === 'N/A') return true;
                      const lastDate = parseAttendanceDate(a.lastAttendance);
                      if (!lastDate) return true;
                      const diffDays = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
                      return diffDays >= 14;
                    }).sort((a, b) => {
                      const dateA = parseAttendanceDate(a.lastAttendance);
                      const dateB = parseAttendanceDate(b.lastAttendance);
                      if (!dateA) return -1;
                      if (!dateB) return 1;
                      return dateA.getTime() - dateB.getTime();
                    });

                    if (riskAgents.length === 0) return (
                      <div className="py-8 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                        <p className="text-[10px] text-white/30 font-black uppercase tracking-widest font-bebas">No se detectan agentes en riesgo crítico</p>
                      </div>
                    );

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {riskAgents.map(a => {
                          const lastDate = parseAttendanceDate(a.lastAttendance);
                          const diffDays = lastDate ? Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)) : 999;
                          const isDanger = diffDays >= 21;
                          return (
                            <div key={a.id} onClick={() => { setShowExpedienteFor(a); }} className={`group relative bg-[#001833] border rounded-[2.5rem] p-6 hover:border-[#ffb700]/30 transition-all cursor-pointer shadow-xl hover:-translate-y-1 ${isDanger ? 'border-red-500/30' : 'border-amber-500/20'}`}>
                              <div className="flex items-center gap-4">
                                <div className="relative w-16 h-16">
                                  <img src={formatDriveUrl(a.photoUrl)} className="w-full h-full rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all border border-white/10" />
                                  <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-[#001833] ${isDanger ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <p className="text-lg font-bebas text-white uppercase tracking-wider truncate">{a.name}</p>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${isDanger ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                      {diffDays >= 999 ? 'SIN REGISTRO' : `${diffDays} DÍAS AUSENTE`}
                                    </span>
                                  </div>
                                </div>
                                {currentUser?.userRole === UserRole.DIRECTOR && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!window.confirm(`⚠️ ¿ELIMINAR AL AGENTE ${a.name}?`)) return;
                                      if (!window.confirm(`🚨 CONFIRMACIÓN FINAL: Esta acción es IRREVERSIBLE. ¿Dar de baja a ${a.name} (${a.id})?`)) return;
                                      try {
                                        const res = await deleteAgentService(a.id);
                                        if (res.success) {
                                          alert(`✅ AGENTE ${a.name} ELIMINADO DEL SISTEMA.`);
                                          setAgents(prev => prev.filter(ag => ag.id !== a.id));
                                        } else {
                                          alert(`❌ ERROR: ${res.error}`);
                                        }
                                      } catch (err) {
                                        alert('❌ FALLO EN PROTOCOLO DE ELIMINACIÓN');
                                      }
                                    }}
                                    className="p-2 bg-red-500/10 border border-red-500/30 rounded-xl hover:bg-red-500/30 transition-all active:scale-90 z-10"
                                    title="Eliminar Agente"
                                  >
                                    <Trash2 size={16} className="text-red-500" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                    <Users size={18} className="text-[#ffb700]" />
                    <h3 className="text-xl font-bebas text-white tracking-widest uppercase">Señales Externas (Visitantes)</h3>
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
                        <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest font-bebas">Buscando señales externas tácticas...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      case AppView.ACADEMIA:
        return (
          <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="academia" className="h-full">
            <AcademyModule userRole={effectiveRole} agentId={currentUser?.id || ''} onActivity={resetSessionTimer} />
          </motion.div>
        );
      case AppView.ASCENSO:
      case AppView.CONTENT:
      case AppView.ADMIN:
        return (
          <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="admin" className="h-full">
            <AdminDashboard
              currentUser={currentUser}
              onClose={() => setView(AppView.HOME)}
              onRefreshGlobalData={() => syncData(false)}
            />
          </motion.div>
        );

      case AppView.TAREAS:
        return (
          <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="training" className="h-full">
            {currentUser ? (
              <TrainingCenter
                currentUser={currentUser}
                setView={setView}
                onUpdateNeeded={() => syncData()}
                initialTab={
                  view === AppView.CONTENT ? 'material' :
                    view === AppView.TAREAS ? 'misiones' : 'ascenso'
                }
              />
            ) : null}
          </motion.div>
        );
      case AppView.PROFILE:
        return (
          <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="profile" className="h-full">
            <div className="p-6 md:p-10 space-y-8 pb-32 max-w-2xl mx-auto font-montserrat flex flex-col items-center">
              <div className="w-full flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bebas text-white tracking-widest uppercase truncate">Expediente de Agente</h2>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                  <Target className="text-[#ffb700]" size={20} />
                </div>
              </div>

              {currentUser && <DigitalIdCard agent={currentUser} onClose={() => setView(AppView.HOME)} />}

              {currentUser?.userRole === UserRole.DIRECTOR && (
                <div className="w-full space-y-2 mt-6">
                  <p className="text-[8px] text-white/40 font-black uppercase tracking-widest text-center">Vista como rol</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setViewingAsRole(viewingAsRole === UserRole.STUDENT ? null : UserRole.STUDENT)} className={`py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 ${viewingAsRole === UserRole.STUDENT ? 'bg-[#ffb700] text-[#001f3f] border-[#ffb700]' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}>Estudiante</button>
                    <button onClick={() => setViewingAsRole(viewingAsRole === UserRole.LEADER ? null : UserRole.LEADER)} className={`py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 ${viewingAsRole === UserRole.LEADER ? 'bg-blue-500 text-white border-blue-500' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}>Líder</button>
                    <button onClick={() => setViewingAsRole(viewingAsRole === UserRole.DIRECTOR ? null : UserRole.DIRECTOR)} className={`py-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 ${(!viewingAsRole || viewingAsRole === UserRole.DIRECTOR) ? 'bg-[#ffb700] text-[#001f3f] border-[#ffb700]' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}>Director</button>
                  </div>
                </div>
              )}

              <div className="w-full grid grid-cols-1 gap-3 mt-6">
                <div className="w-full space-y-3">
                  <button
                    onClick={() => alert("MÓDULO DE SEGURIDAD.")}
                    className="w-full flex items-center justify-between px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all font-bebas"
                  >
                    <div className="flex items-center gap-3">
                      <Key size={18} className="text-[#ffb700]" />
                      Cambiar PIN de Acceso
                    </div>
                    <ChevronRight size={14} className="text-gray-500" />
                  </button>

                  {biometricAvailable ? (
                    <button
                      onClick={async () => {
                        if (!currentUser) return;
                        setIsRegisteringBio(true);
                        try {
                          const credentialId = await registerBiometric(currentUser.id, currentUser.name, currentUser.biometricCredential ? [currentUser.biometricCredential] : []);
                          if (credentialId) {
                            const res = await registerBiometrics(currentUser.id, credentialId);
                            if (res.success) {
                              alert("✅ BIOMETRÍA REGISTRADA EXITOSAMENTE.");
                              syncData();
                            }
                          }
                        } catch (err: any) {
                          alert(err.message || "FALLO EN REGISTRO BIOMÉTRICO.");
                        } finally {
                          setIsRegisteringBio(false);
                        }
                      }}
                      disabled={isRegisteringBio}
                      className="w-full flex items-center justify-between px-6 py-5 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600/20 transition-all font-bebas group"
                    >
                      <div className="flex items-center gap-3">
                        {isRegisteringBio ? <Loader2 size={18} className="text-blue-400 animate-spin" /> : <Fingerprint size={18} className="text-blue-400 group-hover:scale-110 transition-transform" />}
                        <div className="flex flex-col items-start">
                          <span>Configurar Biometría</span>
                          <span className="text-[7px] text-blue-400/60 font-black tracking-[0.2em]">Huella o FaceID</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[8px] ${currentUser?.biometricCredential ? 'text-green-400' : 'text-red-400'} font-black uppercase tracking-widest`}>
                          {currentUser?.biometricCredential ? 'ACTIVO' : 'PENDIENTE'}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${currentUser?.biometricCredential ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 pulse-red'}`} />
                      </div>
                    </button>
                  ) : (
                    <div className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl opacity-50">
                      <p className="text-[8px] text-white/40 font-black uppercase tracking-widest text-center">Biometría no soportada en este navegador</p>
                    </div>
                  )}
                </div>
                <div className="w-full grid grid-cols-1 gap-3 mt-6">
                  <button
                    onClick={() => handleLogout(false)}
                    className="flex items-center justify-center gap-3 px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all font-bebas shadow-lg active:scale-95"
                  >
                    <LogOut size={18} />
                    Cerrar Conexión
                  </button>
                  <button
                    onClick={() => {
                      showAlert({
                        title: "LIMPIEZA TÁCTICA",
                        message: "🚨 ¿CERRAR SESIÓN POR COMPLETO?\nEsto borrará tu acceso rápido de este dispositivo (ideal si el teléfono no es tuyo o es prestado).",
                        type: 'CONFIRM',
                        confirmText: "CERRAR Y BORRAR",
                        cancelText: "CANCELAR",
                        onConfirm: () => handleLogout(true)
                      });
                    }}
                    className="flex items-center justify-center gap-3 px-6 py-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-red-500/40 text-[9px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all font-bebas active:scale-95"
                  >
                    <Trash2 size={16} />
                    Limpiar Datos de Sesión y Salir
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        );
      case AppView.RANKING:
        return (
          <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="ranking" className="h-full">
            <div className="space-y-0 min-h-full">
              <div className="p-6">
                <TacticalRanking agents={agents} currentUser={currentUser} />
              </div>
            </div>
          </motion.div>
        );
      case AppView.ENROLLMENT:
        return (
          <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="enrollment" className="h-full">
            <EnrollmentForm onSuccess={() => { showAlert({ title: "ÉXITO", message: "Inscripción exitosa", type: 'SUCCESS' }); syncData(); setView(AppView.DIRECTORY); }} userRole={currentUser?.userRole} agents={agents} />
          </motion.div>
        );
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
              <img
                src={logoError ? '/logo_white.png' : formatDriveUrl(OFFICIAL_LOGO)}
                alt="Logo"
                className="h-24 mx-auto relative z-10 object-contain"
                onError={() => setLogoError(true)}
              />
              <div className="absolute inset-0 bg-[#ffb700] blur-2xl opacity-20 scale-150"></div>
            </div>
            <h1 className="text-4xl font-bebas font-bold text-white tracking-[0.2em] leading-none">CONSAGRADOS 2026</h1>
            <p className="text-[8px] text-[#ffb700] font-black uppercase tracking-[0.5em] opacity-80">Command Center Táctico</p>
          </div>

          {rememberedUser && showQuickLogin ? (
            <form
              onSubmit={(e) => handleLogin(e, rememberedUser.id)}
              className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
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
                    id="login-pin"
                    name="password"
                    type={showPin ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="INTRODUCE TU PIN"
                    value={loginPin}
                    onChange={(e) => {
                      setLoginPin(e.target.value);
                      if (loginError.message) setLoginError({ field: null, message: null });
                    }}
                    autoFocus
                    className={`w-full bg-white/5 border ${loginError.message ? 'border-red-500' : 'border-white/10'} rounded-2xl py-5 px-6 pr-16 text-white text-xs font-bold tracking-[0.5em] outline-none focus:border-[#ffb700] focus:bg-white/10 transition-all text-center`}
                  />
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); setShowPin(!showPin); }} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#ffb700]/50 hover:text-[#ffb700] transition-colors p-2">
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {loginError.message && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 animate-in fade-in zoom-in-95">
                    <AlertCircle className="text-red-500 shrink-0" size={14} />
                    <p className="text-red-500 text-[8px] font-black uppercase tracking-widest">{loginError.message}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="submit"
                    className="w-full bg-[#ffb700] py-6 rounded-2xl text-[#001f3f] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-[#ffb700]/90 active:scale-[0.98] transition-all font-bebas"
                  >
                    Acceder ahora
                  </button>

                  {biometricAvailable && (
                    <button
                      type="button"
                      onClick={() => {
                        handleBiometricLogin(rememberedUser.id);
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
                      setLoginError({ field: null, message: null });
                    }}
                    className="w-full py-4 text-white/30 hover:text-white/60 text-[8px] font-black uppercase tracking-widest transition-all"
                  >
                    Ingresar con otra credencial
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-4">
                <div className="relative group">
                  <input
                    id="login-id-field"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="ID DE AGENTE"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-xs font-bold tracking-widest outline-none focus:border-[#ffb700] focus:bg-white/10 transition-all group-hover:border-white/20 uppercase"
                  />
                  <Fingerprint size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#ffb700]/30 group-focus-within:text-[#ffb700] transition-colors" />
                </div>

                <div className="relative group">
                  <input
                    id="login-pin-field"
                    name="password"
                    type={showPin ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="PIN DE SEGURIDAD"
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 pr-16 text-white text-xs font-bold tracking-[0.5em] outline-none focus:border-[#ffb700] focus:bg-white/10 transition-all group-hover:border-white/20"
                  />
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); setShowPin(!showPin); }} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#ffb700]/50 hover:text-[#ffb700] transition-colors p-2">
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-[#ffb700] py-6 rounded-2xl text-[#001f3f] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-[#ffb700]/90 active:scale-[0.98] transition-all font-bebas"
                >
                  Ingresar al Sistema
                </button>

                {biometricAvailable && (
                  <button
                    type="button"
                    onClick={() => handleBiometricLogin()}
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

  // BLOQUEO GLOBAL DE SEGURIDAD (BIENVENIDA OBLIGATORIA) - DESACTIVADO TEMPORALMENTE POR SOLICITUD DEL USUARIO
  if (isLoggedIn && currentUser && currentUser.isAiProfilePending && currentUser.userRole === UserRole.STUDENT) {
    return (
      <div className="min-h-screen bg-[#000c19] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Radar Background Decorator */}
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-blue-500/20 rounded-full animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-blue-500/10 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-blue-500/5 rounded-full"></div>
        </div>

        <div className="relative z-10 w-full max-w-2xl">
          {isUpdatingAiProfile ? (
            <LoadingScreen message="PROCESANDO INTELIGENCIA TÁCTICA..." />
          ) : (
            <EliteRecruitmentTest
              agentName={currentUser.name}
              onComplete={handleGlobalTestComplete}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <Layout
        activeView={view}
        setView={(newView) => {
          trackEvent('view_change', { from: view, to: newView, agent_id: currentUser?.id });
          setView(newView);
        }}
        userRole={effectiveRole}
        userName={currentUser?.name || 'Agente'}
        onLogout={handleLogout}
        onHardReset={handleHardReset}
        notificationCount={unreadNotifications}
        onOpenInbox={() => setShowInbox(true)}
      >
        <div key={view} className="relative h-full overflow-y-auto no-scrollbar animate-view">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
      </Layout>

      {showInbox && (
        <NotificationInbox
          onClose={() => setShowInbox(false)}
          onTotalReadUpdate={setUnreadNotifications}
          onRequestPermission={initFirebaseMessaging}
          agentId={currentUser?.id}
          currentUser={currentUser}
        />
      )}

      {isChatOpen && currentUser && (
        <TacticalChat currentUser={currentUser} agents={agents} onClose={() => setIsChatOpen(false)} />
      )}

      {isLoggedIn && !isChatOpen && (
        <div className="fixed bottom-24 right-4 flex flex-col gap-3 z-[45]">
          <button
            onClick={() => setIsChatOpen(true)}
            className="p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-500 transition-all active:scale-95 animate-in fade-in"
            title="Chat Táctico"
          >
            <MessageSquare size={24} />
          </button>
        </div>
      )}

      {scannedAgentForPoints && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0a0a0a] border border-blue-500/30 rounded-[3rem] p-8 space-y-8 shadow-2xl">
            <div className="text-center space-y-2">
              <p className="text-white font-black uppercase tracking-widest">{scannedAgentForPoints.name}</p>
              <p className="text-[8px] text-green-400 font-black uppercase tracking-widest flex items-center justify-center gap-1"><CheckCircle2 size={10} /> +10 XP Asistencia Registrada</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest text-center">Registro Manual del Instructor</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <PointButton label="Biblia (+10)" onClick={() => handleIncrementPoints('BIBLIA')} disabled={isUpdatingPoints} icon={<Book size={16} />} />
              <PointButton label="Participación (+10)" onClick={() => handleIncrementPoints('APUNTES')} disabled={isUpdatingPoints} icon={<Star size={16} />} />
            </div>
            <button onClick={() => setScannedAgentForPoints(null)} className="w-full py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest">Cerrar</button>
          </div>
        </div>
      )}

      {foundAgent && (
        <div className="fixed inset-0 z-[500] bg-[#020617] flex flex-col items-center p-6 animate-in fade-in overflow-y-auto no-scrollbar pt-20 pb-10">
          <div className="flex flex-col items-center w-full animate-scale max-w-2xl relative">
            <button
              onClick={() => setFoundAgent(null)}
              className="absolute -top-16 right-0 p-3 bg-red-600/20 text-red-500 rounded-full border border-red-500/30 shadow-lg active:scale-90 transition-all"
            >
              <X size={20} />
            </button>
            <DigitalIdCard agent={foundAgent} onClose={() => setFoundAgent(null)} />
            <TacticalProfileDetail agent={foundAgent} />
          </div>
        </div>
      )}

      {showExpedienteFor && (
        <div className="fixed inset-0 z-[600]">
          <TacticalExpediente
            agent={showExpedienteFor}
            onClose={() => setShowExpedienteFor(null)}
          />
        </div>
      )}

      {showCertificate && currentUser && (
        <TacticalCertificate
          agent={currentUser}
          onClose={() => setShowCertificate(false)}
        />
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
    </>
  );
};

const AppWrapper: React.FC = () => (
  <TacticalAlertProvider>
    <App />
  </TacticalAlertProvider>
);

export default AppWrapper;
