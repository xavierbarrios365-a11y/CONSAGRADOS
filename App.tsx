import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import { AppView, Agent, UserRole, Visitor, Guide, Badge } from './types';
import DigitalIdCard from './components/DigitalIdCard';
import { formatDriveUrl, compressImage } from './services/storageUtils';
import { uploadToCloudinary } from './services/cloudinaryService';
import IntelFeed from './components/IntelFeed';
import AcademyModule from './components/AcademyModule';
import CIUModule from './components/IntelligenceCenter';
import BibleWarDisplay from './components/BibleWar/BibleWarDisplay';
import BibleWarStudent from './components/BibleWar/BibleWarStudent';
import { EnrollmentForm } from './components/EnrollmentForm';
import DailyVerse from './components/DailyVerse';
import BibleReader from './components/BibleReader';
import EliteRecruitmentTest from './components/EliteRecruitmentTest';
import TacticalProfileDetail from './components/TacticalProfileDetail';
import TutorialOverlay from './components/TutorialOverlay';
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
import LandingInversion from './components/LandingInversion';
import PublicWebsite from './components/PublicWebsite';

// --- Modularized Views ---
import StudentView from './components/views/StudentView';
import DirectorView from './components/views/DirectorView';
import SharedView from './components/views/SharedView';

import { parseAttendanceDate } from './utils/dateUtils';
import {
  fetchAgentsFromSheets,
  uploadImage,
  reconstructDatabase,
  updateAgentPoints,

  fetchGuides,
  deductPercentagePoints,
  deleteGuide,
  fetchVisitorRadar,
  submitQuizResult,
  deleteAcademyLesson,
  deleteAcademyCourse,
  saveBulkAcademyData,
  updateAgentAiProfile,
  resetStudentAttempts,
  fetchDailyVerse,
  verifyBiometrics,
  updateAgentAiPendingStatus,
  deleteAgent as deleteAgentService,
} from './services/sheetsService';
import {
  fetchAgentsFromSupabase,
  updateAgentPointsSupabase,
  fetchUserEventConfirmationsSupabase as fetchUserEventConfirmations,
  fetchActiveEventsSupabase as fetchActiveEvents,
  confirmEventAttendanceSupabase as confirmEventAttendanceService,
  updateAgentPhotoSupabase,
  enrollAgentSupabase,
  submitTransactionSupabase,
  updateAgentStreaksSupabase,
  registerVisitorSupabase,
  applyAbsencePenaltiesSupabase,
  syncAllAgentsToSupabase,
  getSecurityQuestionSupabase as getSecurityQuestion,
  resetPasswordWithAnswerSupabase as resetPasswordWithAnswer,
  updateAgentPinSupabase as updateAgentPin,
  fetchNotificationsSupabase,
  updateBiometricSupabase,
  supabase
} from './services/supabaseService';
import { generateGoogleCalendarLink, downloadIcsFile, parseEventDate } from './services/calendarService';
import { requestForToken, onMessageListener, db, trackEvent } from './firebase-config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Search, QrCode, X, ChevronRight, ChevronUp, Activity, Target, Zap, Book, FileText, Star, RotateCcw, Trash2, Database, AlertCircle, RefreshCw, BookOpen, Eye, EyeOff, Plus, Fingerprint, Flame, CheckCircle2, Circle, Loader2, Bell, Crown, Medal, Trophy, AlertTriangle, LogOut, History, Users, UserPlus, Key, Settings, Sparkles, Download, MessageSquare, Calendar, Radio, GraduationCap, ClipboardList, Share2, ShieldCheck, Brain } from 'lucide-react';
import { generateTacticalProfile, getTacticalAnalysis } from './services/geminiService';
import jsQR from 'jsqr';
import { isBiometricAvailable, registerBiometric, authenticateBiometric } from './services/BiometricService';
import { initRemoteConfig } from './services/configService';
import STREAK_REMINDERS from './constants/streak_reminders.json';
import { sendPushBroadcast } from './services/notifyService';

// --- Custom Hooks ---
import { useAuth } from './hooks/useAuth';
import { useDataSync } from './hooks/useDataSync';
import { useFirebaseMessaging } from './hooks/useFirebaseMessaging';
import { useTacticalLogic } from './hooks/useTacticalLogic';

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
  const APP_VERSION = "2.0.0"; // Mega Actualización - Tutorial, Persistence & Likes

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
    handleForgotPasswordCheck, handleForgotPasswordAnswer,
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

  /*
  // --- AUTOMATIC ABSENCE PENALTIES (DISABLED TEMPORARILY DUE TO MASSIVE XP DEDUCTION BUG) ---
  useEffect(() => {
    if (isLoggedIn && (currentUser?.userRole === UserRole.DIRECTOR || currentUser?.userRole === UserRole.LEADER)) {
      applyAbsencePenaltiesSupabase().then(res => {
        if (res.success && res.agentsPenalized) {
          console.log(`[PENALTIES] Se aplicó sanción por inasistencia a ${res.agentsPenalized} agentes.`);
        }
      }).catch(console.error);
    }
  }, [isLoggedIn, currentUser]);
  */

  const { notificationPermission, setNotificationPermission, initFirebaseMessaging } = firebase;

  const { showAlert } = useTacticalAlert();

  const hasSession = !!localStorage.getItem('consagrados_session');
  const storedView = localStorage.getItem('current_view') as AppView | null;
  const [view, setView] = useState<AppView>(hasSession ? (storedView || AppView.HOME) : AppView.PUBLIC_WEB);
  const [lastStreakNotif, setLastStreakNotif] = useState<string | null>(() => localStorage.getItem('last_streak_notif'));

  useEffect(() => {
    localStorage.setItem('current_view', view);
  }, [view]);

  // --- STREAK REMINDERS SCHEDULER ---
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    const checkStreakReminders = () => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Encontrar si hay un recordatorio para este minuto
      const reminder = STREAK_REMINDERS.find(r => r.time === timeStr);

      if (reminder && lastStreakNotif !== timeStr) {
        // Verificar si el usuario ya registró racha hoy
        const today = new Date().toISOString().split('T')[0];
        const lastStreak = currentUser.lastStreakDate;

        if (lastStreak !== today) {
          const notifKey = `${today}_${timeStr}`;
          if (lastStreakNotif === notifKey) return;

          console.log(`[STREAK] Disparando recordatorio: ${reminder.message}`);
          setLastStreakNotif(notifKey);
          localStorage.setItem('last_streak_notif', notifKey);

          supabase.from('agentes').select('push_token').eq('id', currentUser.id).single().then(({ data }) => {
            if (data?.push_token) {
              sendPushBroadcast("🔥 OPERACIÓN SALVA TU RACHA", reminder.message, data.push_token, 'streak');
            }
          });
        }
      }
    };

    const interval = setInterval(checkStreakReminders, 60000); // Revisar cada minuto
    checkStreakReminders(); // Ejecución inicial

    return () => clearInterval(interval);
  }, [isLoggedIn, currentUser, lastStreakNotif]);

  const [searchQuery, setSearchQuery] = useState('');
  const [foundAgent, setFoundAgent] = useState<Agent | null>(null);
  const [showExpedienteFor, setShowExpedienteFor] = useState<Agent | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(() => {
    return localStorage.getItem('tutorial_completed') === 'true';
  });
  const [showCertificate, setShowCertificate] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewingAsRole, setViewingAsRole] = useState<UserRole | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');
  const [showInbox, setShowInbox] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Photo upload prompt state (must be before any conditional returns)
  const [showPhotoPrompt, setShowPhotoPrompt] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    try {
      const compressed = await compressImage(file);
      setPhotoPreview(compressed);
    } catch (err) {
      console.error('Error compressing:', err);
    }
  }, [currentUser]);

  const handlePhotoUpload = useCallback(async () => {
    if (!photoPreview || !currentUser) return;
    setPhotoUploading(true);
    try {
      const result = await uploadToCloudinary(photoPreview);
      if (result.success && result.url) {
        await updateAgentPhotoSupabase(currentUser.id, result.url);
        await syncData();
        setShowPhotoPrompt(false);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err: any) {
      alert('Error al subir foto: ' + err.message);
    } finally {
      setPhotoUploading(false);
    }
  }, [photoPreview, currentUser, syncData]);

  // --- Tactical Logic Hook ---
  const tactical = useTacticalLogic(
    currentUser,
    agents,
    syncData,
    refreshCurrentUser,
    showAlert,
    setView
  );

  const {
    scanStatus, setScanStatus, scannedId, setScannedId, processScan,
    scannedAgentForPoints, setScannedAgentForPoints, isUpdatingPoints, handleIncrementPoints,
    isUpdatingAiProfile, handleGlobalTestComplete, dailyVerse, setDailyVerse,
    handleVerseQuizComplete, isConfirmingEvent, handleConfirmEventAttendance,
    intelReport, isRefreshingIntel, handleRefreshIntel, handleConfirmDirectorAttendance,
    videoRef, streamRef
  } = tactical;


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

  // --- ROUTING VIA URL PARAMS ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'bible_war_display') {
      setView(AppView.BIBLE_WAR_DISPLAY);
    }
  }, []);

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

  // --- Tutorial Logic ---
  useEffect(() => {
    if (isLoggedIn && currentUser && currentUser.userRole === UserRole.STUDENT && !hasCompletedTutorial) {
      // Assuming `currentUser.isFirstLogin` is a property indicating a new student
      // This property would need to be set during the enrollment/login process.
      // For now, we'll use a placeholder or assume it's handled elsewhere.
      // If `isFirstLogin` is true, show the tutorial.
      // For this instruction, we'll trigger it if `hasCompletedTutorial` is false.
      setShowTutorial(true);
    }
  }, [isLoggedIn, currentUser, hasCompletedTutorial]);

  const handleTutorialComplete = useCallback(() => {
    setHasCompletedTutorial(true);
    localStorage.setItem('tutorial_completed', 'true');
    setShowTutorial(false);
  }, []);

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


  const effectiveRole = viewingAsRole || currentUser?.userRole || UserRole.STUDENT;

  const renderContent = () => {
    const effectiveRole = viewingAsRole || currentUser?.userRole || UserRole.STUDENT;

    // Student Views
    if ([AppView.HOME, AppView.CIU, AppView.ACADEMIA, AppView.ASCENSO, AppView.CONTENT, AppView.TAREAS].includes(view)) {
      return (
        <StudentView
          view={view}
          currentUser={currentUser}
          isOnline={isOnline}
          notificationPermission={notificationPermission}
          initFirebaseMessaging={initFirebaseMessaging}
          dailyVerse={dailyVerse}
          handleVerseQuizComplete={handleVerseQuizComplete}
          headlines={headlines}
          agents={agents}
          effectiveRole={effectiveRole}
          setView={setView}
          activeEvents={activeEvents}
          handleConfirmEventAttendance={handleConfirmEventAttendance}
          isConfirmingEvent={isConfirmingEvent}
          userConfirmations={userConfirmations}
          handleRefreshIntel={handleRefreshIntel}
          isRefreshingIntel={isRefreshingIntel}
          intelReport={intelReport}
          visitorRadar={visitorRadar}
          resetSessionTimer={resetSessionTimer}
          setScannedAgentForPoints={setScannedAgentForPoints}
          showAlert={showAlert}
          syncData={syncData}
        />
      );
    }

    // Director Views
    if ([AppView.SCANNER, AppView.VISITOR, AppView.ADMIN].includes(view)) {
      return (
        <DirectorView
          view={view}
          setView={setView}
          videoRef={videoRef}
          scanStatus={scanStatus}
          setScanStatus={setScanStatus}
          processScan={processScan}
          scannedId={scannedId}
          setScannedId={setScannedId}
          agents={agents}
          currentUser={currentUser}
          syncData={syncData}
          isSyncing={isSyncing}
          visitorRadar={visitorRadar}
          registerVisitorSupabase={registerVisitorSupabase}
          deleteAgentService={deleteAgentService}
          showAlert={showAlert}
          setShowExpedienteFor={setShowExpedienteFor}
        />
      );
    }

    // Shared Views
    if ([AppView.DIRECTORY, AppView.PROFILE, AppView.BIBLE_WAR_DISPLAY, AppView.RANKING, AppView.ENROLLMENT, AppView.BIBLE_WAR_ARENA, AppView.BIBLE_WAR_STUDENT, AppView.BIBLE].includes(view)) {
      if (view === AppView.BIBLE) {
        return (
          <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="bible" className="h-full">
            <BibleReader currentUser={currentUser} />
          </motion.div>
        );
      }
      if (view === AppView.RANKING) {
        return (
          <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="ranking" className="h-full">
            <div className="space-y-0 min-h-full">
              <div className="p-6">
                <TacticalRanking agents={agents} currentUser={currentUser} />
              </div>
            </div>
          </motion.div>
        );
      }
      if (view === AppView.ENROLLMENT) {
        return (
          <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="enrollment" className="h-full">
            <EnrollmentForm onSuccess={() => { showAlert({ title: "ÉXITO", message: "Inscripción exitosa", type: 'SUCCESS' }); syncData(); setView(AppView.DIRECTORY); }} userRole={currentUser?.userRole} agents={agents} />
          </motion.div>
        );
      }
      if (view === AppView.BIBLE_WAR_ARENA || view === AppView.BIBLE_WAR_STUDENT) {
        if (effectiveRole === UserRole.STUDENT && currentUser) {
          return (
            <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="student_arena" className="h-full">
              <BibleWarStudent currentUser={currentUser} onClose={() => setView(AppView.HOME)} />
            </motion.div>
          );
        }
        return (
          <motion.div variants={viewVariants} initial="initial" animate="animate" exit="exit" key="arena" className="h-full">
            <BibleWarDisplay isFullScreen={false} />
          </motion.div>
        );
      }

      return (
        <SharedView
          view={view}
          setView={setView}
          agents={agents}
          currentUser={currentUser}
          directorySearch={directorySearch}
          setDirectorySearch={setDirectorySearch}
          setFoundAgent={setFoundAgent}
          badges={badges}
          biometricAvailable={biometricAvailable}
          isRegisteringBio={isRegisteringBio}
          registerBiometric={registerBiometric}
          registerBiometrics={updateBiometricSupabase}
          handleLogout={handleLogout}
          showAlert={showAlert}
          syncData={syncData}
          viewingAsRole={viewingAsRole}
          setViewingAsRole={setViewingAsRole}
        />
      );
    }

    return null;
  };


  // VISTA PÚBLICA PRINCIPAL (ADN / ECOSISTEMA)
  if (view === AppView.PUBLIC_WEB) {
    return (
      <TacticalAlertProvider>
        <PublicWebsite
          onLoginClick={() => setView(AppView.HOME)}
          onInvestmentClick={() => setView(AppView.LANDING)}
        />
      </TacticalAlertProvider>
    );
  }

  // VISTA DE LANDING (PÚBLICA)
  if (view === AppView.LANDING) {
    return (
      <TacticalAlertProvider>
        <LandingInversion onBack={() => setView(AppView.PUBLIC_WEB)} />
      </TacticalAlertProvider>
    );
  }

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

          {showForgotPassword ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-[#ffb700] font-bebas text-2xl tracking-widest">Recuperación Táctica</h2>
                <p className="text-[10px] text-white/50 uppercase tracking-widest mt-1">
                  {forgotPasswordStep === 'ID' && "Ingresa tu ID de Agente"}
                  {forgotPasswordStep === 'QUESTION' && "Responde a tu pregunta de seguridad"}
                  {forgotPasswordStep === 'SUCCESS' && "Autorización Concedida"}
                </p>
              </div>

              {forgotPasswordStep === 'ID' && (
                <form onSubmit={handleForgotPasswordCheck} className="space-y-4">
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="ID DE AGENTE"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      autoFocus
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-xs font-bold tracking-widest outline-none focus:border-[#ffb700] focus:shadow-[0_0_15px_rgba(255,183,0,0.3)] transition-all uppercase text-center focus:bg-white/10"
                    />
                  </div>
                  {resetError && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center justify-center gap-2">
                      <AlertCircle size={14} className="text-red-500" />
                      <p className="text-red-500 text-[9px] font-black uppercase tracking-widest">{resetError}</p>
                    </motion.div>
                  )}
                  <button type="submit" className="w-full bg-[#ffb700] py-5 rounded-2xl text-[#001f3f] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-[#ffb700]/90 transition-all font-bebas hover:shadow-[0_0_20px_rgba(255,183,0,0.4)] active:scale-[0.98]">Verificar Identidad</button>
                  <button type="button" onClick={() => { setShowForgotPassword(false); setResetError(''); setForgotPasswordStep('ID'); }} className="w-full py-3 text-white/40 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all">Cancelar</button>
                </form>
              )}
              {forgotPasswordStep === 'QUESTION' && (
                <form onSubmit={handleForgotPasswordAnswer} className="space-y-4">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#ffb700]/10 border border-[#ffb700]/30 rounded-2xl p-4 text-center shadow-[0_0_15px_rgba(255,183,0,0.1)]">
                    <p className="text-[#ffb700] text-xs font-black tracking-widest uppercase mb-1">Pregunta de Seguridad</p>
                    <p className="text-white text-sm font-bold">{newQuestionInput}</p>
                  </motion.div>
                  <div className="relative group">
                    <input
                      type="text"
                      placeholder="INGRESA TU RESPUESTA SECRETA"
                      value={securityAnswerInput}
                      onChange={(e) => setSecurityAnswerInput(e.target.value)}
                      autoFocus
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-xs font-bold tracking-widest outline-none focus:border-[#ffb700] focus:shadow-[0_0_15px_rgba(255,183,0,0.3)] transition-all uppercase text-center focus:bg-white/10"
                    />
                  </div>
                  {resetError && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center justify-center gap-2">
                      <AlertCircle size={14} className="text-red-500" />
                      <p className="text-red-500 text-[9px] font-black uppercase tracking-widest">{resetError}</p>
                    </motion.div>
                  )}
                  <button type="submit" className="w-full bg-[#ffb700] py-5 rounded-2xl text-[#001f3f] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-[#ffb700]/90 transition-all font-bebas hover:shadow-[0_0_20px_rgba(255,183,0,0.4)] active:scale-[0.98]">Desencriptar Registro</button>
                  <button type="button" onClick={() => { setShowForgotPassword(false); setResetError(''); setForgotPasswordStep('ID'); }} className="w-full py-3 text-white/40 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all">Cancelar</button>
                </form>
              )}
              {forgotPasswordStep === 'SUCCESS' && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center">
                  <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,197,94,0.3)] relative">
                    <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
                    <ShieldCheck size={32} className="text-green-500 relative z-10" />
                  </div>
                  <div>
                    <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-2">TU PIN REVELADO ES:</p>
                    <p className="text-[#ffb700] font-bebas text-5xl tracking-widest drop-shadow-[0_0_10px_rgba(255,183,0,0.8)]">{revealedPin}</p>
                  </div>
                  <button type="button" onClick={() => { setShowForgotPassword(false); setResetError(''); setForgotPasswordStep('ID'); setRevealedPin(''); }} className="w-full bg-[#ffb700] py-5 rounded-2xl text-[#001f3f] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-[#ffb700]/90 transition-all font-bebas hover:shadow-[0_0_20px_rgba(255,183,0,0.4)] active:scale-[0.98]">Volver al Logotipo</button>
                </motion.div>
              )}
            </motion.div>
          ) : rememberedUser && showQuickLogin ? (
            <motion.form
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              onSubmit={(e) => handleLogin(e, rememberedUser.id)}
              className="space-y-6"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <img
                    src={formatDriveUrl(rememberedUser.photoUrl, rememberedUser.name)}
                    className="w-24 h-24 rounded-full object-cover border-4 border-[#ffb700] shadow-[0_0_20px_rgba(255,183,0,0.3)]"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      if (!target.src.includes('ui-avatars.com')) {
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(rememberedUser.name || 'Agente')}&background=1A1A1A&color=FFB700&size=200&bold=true`;
                      }
                    }}
                  />
                  <div className="absolute inset-0 rounded-full border border-[#ffb700]/30 animate-ping"></div>
                  <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-[#001f3f] shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                </div>
                <div className="text-center">
                  <p className="text-white font-black text-lg uppercase tracking-widest leading-none mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{rememberedUser.name}</p>
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
                    className={`w-full bg-white/5 border ${loginError.message ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-white/10'} rounded-2xl py-5 px-6 pr-16 text-white text-xs font-bold tracking-[0.5em] outline-none focus:border-[#ffb700] focus:shadow-[0_0_15px_rgba(255,183,0,0.3)] focus:bg-white/10 transition-all text-center`}
                  />
                  <button type="button" onClick={(e) => { e.preventDefault(); setShowPin(!showPin); }} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#ffb700]/50 hover:text-[#ffb700] transition-colors p-2">
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
                      onClick={() => handleBiometricLogin(rememberedUser.id)}
                      disabled={isAuthenticatingBio}
                      className="w-full relative overflow-hidden bg-blue-600/20 border border-blue-500/50 py-6 rounded-2xl text-blue-400 font-black uppercase text-[10px] tracking-[0.2em] shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:bg-blue-600/30 hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] hover:border-blue-400 active:scale-[0.98] transition-all font-bebas flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isAuthenticatingBio ? (
                        <>
                          <Loader2 size={24} className="animate-spin text-blue-300" />
                          <span>Verificando Identidad...</span>
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-x-0 h-1 bg-blue-400/30 top-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(59,130,246,0.5)] opacity-0 group-hover:opacity-100 group-hover:animate-scan"></div>
                          <Fingerprint size={24} className="text-blue-400" />
                          <span>Acceso Biométrico Extendido</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickLogin(false);
                      setRememberedUser(null);
                      // localStorage.removeItem('remembered_user'); // DO NOT WIPE IT
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
            </motion.form>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              onSubmit={handleLogin}
              className="space-y-4"
            >
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
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 pr-16 text-white text-xs font-bold tracking-[0.5em] outline-none focus:border-[#ffb700] focus:shadow-[0_0_15px_rgba(255,183,0,0.3)] transition-all group-hover:border-white/20 focus:bg-white/10"
                  />
                  <button type="button" onClick={(e) => { e.preventDefault(); setShowPin(!showPin); }} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#ffb700]/50 hover:text-[#ffb700] transition-colors p-2">
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
                    className="w-16 md:w-20 relative overflow-hidden bg-blue-600/10 border border-blue-500/40 rounded-2xl flex items-center justify-center text-blue-400 hover:bg-blue-600/20 hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all active:scale-[0.95] disabled:opacity-50 group"
                    title="Acceso Biométrico Múltiple"
                  >
                    {isAuthenticatingBio ? (
                      <Loader2 size={24} className="animate-spin text-blue-300" />
                    ) : (
                      <>
                        <div className="absolute inset-x-0 h-0.5 bg-blue-400/50 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:animate-scan"></div>
                        <Fingerprint size={28} className="drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]" />
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="pt-4 flex flex-col items-center gap-3">
                <button
                  type="button"
                  className="text-[8px] text-white/30 font-black uppercase tracking-widest hover:text-[#ffb700] transition-colors"
                  onClick={() => setShowForgotPassword(true)}
                >
                  ¿Olvidaste tu PIN de Seguridad?
                </button>
                <button
                  type="button"
                  className="text-[8px] text-red-500/70 font-black uppercase tracking-widest hover:text-red-400 transition-colors"
                  onClick={() => {
                    if (window.confirm("¿Seguro que deseas purgar la caché y recargar? Esto resolverá problemas de sincronización con la base de datos.")) {
                      if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then(regs => {
                          for (let reg of regs) { reg.unregister(); }
                        });
                      }
                      localStorage.clear();
                      sessionStorage.clear();
                      alert("Caché purgada. El sistema se reiniciará en modo limpio.");
                      setTimeout(() => { window.location.reload(); }, 500);
                    }
                  }}
                >
                  🚑 PULSAR AQUÍ EN CASO DE ERRORES 400 (PURGAR CACHÉ)
                </button>
              </div>

              <div className="pt-6 border-t border-white/5 mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setView(AppView.LANDING)}
                  className="w-full bg-[#ffb700]/5 border border-[#ffb700]/20 py-4 rounded-2xl text-[#ffb700] font-bebas text-xl tracking-widest hover:bg-[#ffb700]/10 transition-all flex items-center justify-center gap-3 group"
                >
                  <Target size={18} className="group-hover:scale-110 transition-transform" />
                  VER PLAN DE INVERSIÓN 2026
                </button>
                <button
                  type="button"
                  onClick={() => setView(AppView.PUBLIC_WEB)}
                  className="w-full py-2 text-white/20 hover:text-white/40 font-mono text-[8px] tracking-[0.3em] uppercase transition-all"
                >
                  ← VOLVER AL PORTAL PRINCIPAL
                </button>
              </div>
            </motion.form>
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

  // INTERCEPT: Prompt for photo upload if agent has no photo
  const needsPhoto = isLoggedIn && currentUser && (!currentUser.photoUrl || currentUser.photoUrl.trim() === '');

  if (needsPhoto && showPhotoPrompt) {
    return (
      <div className="min-h-screen bg-[#000c19] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Radar Background */}
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-amber-500/20 rounded-full animate-pulse" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-amber-500/10 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-amber-500/5 rounded-full" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-md text-center"
        >
          {/* Icon */}
          <div className="mx-auto w-28 h-28 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-700/20 border-2 border-amber-500/50 flex items-center justify-center mb-6 overflow-hidden">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            )}
          </div>

          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Conthrax, sans-serif' }}>
            FOTO DE PERFIL REQUERIDA
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Agente <span className="text-amber-400 font-bold">{currentUser?.name}</span>, tu expediente necesita una foto de identificación para completar tu perfil táctico.
          </p>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />

          {!photoPreview ? (
            <button
              onClick={() => photoInputRef.current?.click()}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-lg tracking-wider hover:from-amber-400 hover:to-amber-500 transition-all duration-300 shadow-lg shadow-amber-500/20 mb-4"
            >
              📷 TOMAR / SELECCIONAR FOTO
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handlePhotoUpload}
                disabled={photoUploading}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg tracking-wider hover:from-green-400 hover:to-emerald-500 transition-all duration-300 shadow-lg shadow-green-500/20 disabled:opacity-50"
              >
                {photoUploading ? '⏳ SUBIENDO...' : '✅ CONFIRMAR Y SUBIR'}
              </button>
              <button
                onClick={() => { setPhotoPreview(null); photoInputRef.current?.click(); }}
                className="w-full py-3 px-6 rounded-xl border border-gray-600 text-gray-400 text-sm hover:border-amber-500 hover:text-amber-400 transition-all"
              >
                🔄 ELEGIR OTRA FOTO
              </button>
            </div>
          )}

          <button
            onClick={() => setShowPhotoPrompt(false)}
            className="mt-6 text-gray-500 text-xs hover:text-gray-300 transition-colors underline"
          >
            OMITIR POR AHORA
          </button>
        </motion.div>
      </div>
    );
  }

  if (view === AppView.BIBLE_WAR_DISPLAY) {
    return (
      <TacticalAlertProvider>
        <BibleWarDisplay />
      </TacticalAlertProvider>
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
            currentUser={currentUser}
            userRole={currentUser?.userRole}
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
      {showTutorial && <TutorialOverlay onComplete={handleTutorialComplete} />}
    </>
  );
};

const AppWrapper: React.FC = () => (
  <TacticalAlertProvider>
    <App />
  </TacticalAlertProvider>
);

export default AppWrapper;
