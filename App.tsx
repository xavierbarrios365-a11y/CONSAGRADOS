
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import { AppView, Agent, UserRole, Visitor, Guide } from './types';
import { INITIAL_AGENTS } from './mockData';
import DigitalIdCard, { formatDriveUrl } from './components/DigitalIdCard';
import ContentModule from './components/ContentModule';
import AcademyModule from './components/AcademyModule';
import CIUModule from './components/IntelligenceCenter';
import { EnrollmentForm } from './components/EnrollmentForm';
import DailyVerse from './components/DailyVerse';
import { DailyVerse as DailyVerseType, InboxNotification } from './types';
import NotificationInbox from './components/NotificationInbox';
import TacticalChat from './components/TacticalChat';
import {
  fetchAgentsFromSheets,
  updateAgentPoints,
  submitTransaction,
  resetPasswordWithAnswer,
  updateAgentPin,
  fetchVisitorRadar,
  fetchDailyVerse,
  updateAgentStreaks,
  registerBiometrics,
  verifyBiometrics,
  fetchNotifications,
  syncFcmToken,
  confirmDirectorAttendance,
  fetchActiveEvents,
  confirmEventAttendance as confirmEventAttendanceService,
  deleteAgent as deleteAgentService
} from './services/sheetsService';
import { generateGoogleCalendarLink } from './services/calendarService';
import { requestForToken, onMessageListener, db, trackEvent } from './firebase-config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Search, QrCode, X, ChevronRight, Activity, Target, Zap, Book, FileText, Star, RotateCcw, Trash2, Database, AlertCircle, RefreshCw, BookOpen, Eye, EyeOff, Plus, Fingerprint, Flame, CheckCircle2, Circle, Loader2, Bell, Crown, Medal, Trophy, AlertTriangle, LogOut, History, Users, Key, Settings, Sparkles, Download, MessageSquare, Calendar, Radio } from 'lucide-react';
import { getTacticalAnalysis } from './services/geminiService';
import jsQR from 'jsqr';
import TacticalRanking from './components/TacticalRanking';
import { isBiometricAvailable, registerBiometric, authenticateBiometric } from './services/BiometricService';
// SpiritualAdvisor removed per user request
import { initRemoteConfig } from './services/configService';

const OFFICIAL_LOGO = "1DYDTGzou08o0NIPuCPH9JvYtaNFf2X5f"; // ID Real de Consagrados 2026

const LoadingScreen = ({ message }: { message: string }) => (
  <div className="min-h-screen bg-[#001f3f] flex flex-col items-center justify-center p-6 space-y-6 animate-in fade-in">
    <div className="w-24 h-24 flex items-center justify-center relative">
      <div className="absolute inset-0 bg-[#ffb700]/10 rounded-full animate-ping opacity-20"></div>
      <img
        src={formatDriveUrl(OFFICIAL_LOGO)}
        alt="Consagrados Logo"
        className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(255,183,0,0.3)] animate-pulse"
      />
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

/**
 * Robust date parser for Google Sheets data.
 * Handles: serial numbers (46067), DD/MM/YYYY strings, ISO strings, Date objects.
 * Returns a valid Date or null.
 */
const parseAttendanceDate = (value: any): Date | null => {
  if (!value || value === 'N/A' || value === '') return null;

  // 0. Handle native Date object (if passed directly)
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // 1. Google Sheets serial number (e.g., 46067 = days since 1899-12-30)
  const numVal = typeof value === 'number' ? value : parseFloat(String(value));
  if (!isNaN(numVal) && numVal > 1000 && numVal < 100000 && !String(value).includes('/') && !String(value).includes('-')) {
    // Google Sheets epoch: Dec 30, 1899
    const sheetsEpoch = new Date(1899, 11, 30);
    const result = new Date(sheetsEpoch.getTime() + numVal * 86400000);
    if (!isNaN(result.getTime()) && result.getFullYear() >= 2020 && result.getFullYear() <= 2030) return result;
  }

  const strVal = String(value).trim();

  // 2. DD/MM/YYYY or DD-MM-YYYY format
  const parts = strVal.split(/[\/\-]/);
  if (parts.length === 3) {
    const [p1, p2, p3] = parts.map(p => parseInt(p, 10));
    // Determine if DD/MM/YYYY or MM/DD/YYYY (assume DD/MM/YYYY if day > 12)
    let d: Date;
    if (p1 > 12) {
      d = new Date(p3, p2 - 1, p1); // DD/MM/YYYY
    } else if (p2 > 12) {
      d = new Date(p3, p1 - 1, p2); // MM/DD/YYYY
    } else {
      d = new Date(p3, p2 - 1, p1); // Default DD/MM/YYYY
    }
    if (!isNaN(d.getTime()) && d.getFullYear() >= 2020) return d;
  }

  // 3. Robust parsing for strings with potential extra text (regex extraction)
  // Extracts YYYY-MM-DD or DD/MM/YYYY even if there's trash around it
  const dateMatch = strVal.match(/(\d{4}-\d{1,2}-\d{1,2})|(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
  if (dateMatch) {
    const rawMatch = dateMatch[0];
    const fallback = new Date(rawMatch);
    if (!isNaN(fallback.getTime()) && fallback.getFullYear() >= 2020 && fallback.getFullYear() <= 2030) return fallback;

    // If simple new Date fails, try our custom slash parser on the match
    const parts = rawMatch.split(/[\/\-]/);
    if (parts.length === 3) {
      const [p1, p2, p3] = parts.map(p => parseInt(p, 10));
      let d: Date;
      if (p1 > 2000) d = new Date(p1, p2 - 1, p3); // YYYY-MM-DD
      else if (p3 > 2000) d = new Date(p3, p2 - 1, p1); // DD/MM/YYYY
      else d = new Date(rawMatch);

      if (!isNaN(d.getTime()) && d.getFullYear() >= 2020) return d;
    }
  }

  // 4. ISO string or other parseable format (original fallback)
  const fallback = new Date(strVal);
  if (!isNaN(fallback.getTime()) && fallback.getFullYear() >= 2020 && fallback.getFullYear() <= 2030) return fallback;

  return null;
};

/**
 * Indicador de Conexión "Faro de Consagrados"
 * Estética Premium con animaciones de haz de luz rotativo.
 */
const LighthouseIndicator: React.FC<{ status: 'online' | 'offline' }> = ({ status }) => {
  const isOnline = status === 'online';
  const color = isOnline ? '#ffb700' : '#ef4444';

  return (
    <div className="relative w-44 h-44 flex items-center justify-center">
      {/* 
        DISEÑO DE AUTOR: RÉPLICA EXACTA DEL LOGO CONSAGRADOS
        Este SVG calca la geometría del archivo logo_white.png proporcionado por el Director.
      */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-[0_0_15px_rgba(255,183,0,0.3)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <radialGradient id="centerGlow" cx="50%" cy="45%" r="40%">
            <stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* --- LUZ 1: Resplandor del Medio (Glow Central) --- */}
        {isOnline && (
          <circle
            cx="50" cy="45" r="30"
            fill="url(#centerGlow)"
            className="animate-pulse opacity-50"
          />
        )}

        {/* --- ESCUDO ESTARCIDO (HEXAGONAL STENCIL) --- */}
        <path
          d="M50 8 L85 22 V55 L50 85 L15 55 V22 L50 8Z"
          stroke={color}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray="18 4"
          className={isOnline ? "animate-[pulse_3s_ease-in-out_infinite]" : "opacity-60"}
        />

        {/* --- EL FARO (SILUETA OFICIAL) --- */}
        <g className={isOnline ? "" : "opacity-40"}>
          {/* Cuerpo y Base */}
          <path
            d="M50 85 L38 85 L44 42 L56 42 L62 85 Z"
            fill={color}
            className="opacity-20"
          />
          {/* Franjas Diagonales de Autor */}
          <path d="M41.5 70 L58.5 70 L60.5 85 L39.5 85 Z" fill={color} />
          <path d="M45.5 50 L54.5 50 L56.5 62 L43.5 62 Z" fill={color} />

          {/* Cúpula y Linterna */}
          <path d="M44 42 L56 42 L53 38 L47 38 Z" fill={color} />
          <path d="M47 38 L53 38 L53 30 L47 30 Z" fill={color} />
          <path d="M42 30 L58 30 L50 20 Z" fill={color} />
          <circle cx="50" cy="18" r="1.5" fill={color} />
        </g>

        {/* --- LUZ 2: Haz del Faro (Triángulos de Protección) --- */}
        {isOnline && (
          <g className="animate-[pulse_1.5s_ease-in-out_infinite]">
            {/* Haz Principal a la Derecha (Como el Logo) */}
            <path
              d="M53 32 L85 24 V40 L53 32 Z"
              fill={color}
              className="opacity-60"
              filter="url(#glow)"
            />
            {/* Haz Sutil a la Izquierda (Balance Táctico) */}
            <path
              d="M47 32 L15 24 V40 L47 32 Z"
              fill={color}
              className="opacity-20"
            />
          </g>
        )}
      </svg>

      {/* Partículas de Datos (Aura Digital) */}
      {isOnline && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full animate-ping"
              style={{
                backgroundColor: color,
                left: `${Math.random() * 60 + 20}%`,
                top: `${Math.random() * 60 + 20}%`,
                animationDelay: `${i * 0.5}s`,
                opacity: 0.3
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const APP_VERSION = "1.8.7"; // Logo-accurate Faro & Operation Center v2.1
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
  const [dailyVerse, setDailyVerse] = useState<DailyVerseType | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRegisteringBio, setIsRegisteringBio] = useState(false);
  const [rememberedUser, setRememberedUser] = useState<{ id: string; name: string; photoUrl: string } | null>(null);
  const [viewingAsRole, setViewingAsRole] = useState<UserRole | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showQuickLogin, setShowQuickLogin] = useState(true);
  const [directorySearch, setDirectorySearch] = useState('');
  const [showInbox, setShowInbox] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  // Consejero táctico eliminado
  const [activeEvents, setActiveEvents] = useState<any[]>([]);
  const [isConfirmingEvent, setIsConfirmingEvent] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [headlines, setHeadlines] = useState<string[]>([]);

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

  // --- BOOSTER DE PERSISTENCIA (SINCRONIZAR PREFS DESDE NUBE AL LOGUEAR) ---
  useEffect(() => {
    if (isLoggedIn && currentUser && currentUser.id) {
      const agentId = currentUser.id;
      const READ_KEY = `read_notifications_${agentId}`;
      const DELETED_KEY = `deleted_notifications_${agentId}`;

      // Si local está vacío pero nube tiene data, hidratar
      if (currentUser.notifPrefs) {
        const localRead = localStorage.getItem(READ_KEY);
        const localDeleted = localStorage.getItem(DELETED_KEY);

        if (!localRead && currentUser.notifPrefs.read?.length > 0) {
          localStorage.setItem(READ_KEY, JSON.stringify(currentUser.notifPrefs.read));
        }
        if (!localDeleted && currentUser.notifPrefs.deleted?.length > 0) {
          localStorage.setItem(DELETED_KEY, JSON.stringify(currentUser.notifPrefs.deleted));
        }
      }
    }
  }, [isLoggedIn, currentUser]);

  const handleLogout = useCallback(() => {
    // Preserve important keys for quick re-entry
    const backupKeys = ['remembered_user', 'app_version', 'pwa_banner_dismissed', 'last_login_id'];
    const backup: Record<string, string> = {};

    backupKeys.forEach(k => {
      const v = localStorage.getItem(k);
      if (v) backup[k] = v;
    });

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('read_notifications_') || key.startsWith('deleted_notifications_'))) {
        const v = localStorage.getItem(key);
        if (v) backup[key] = v;
      }
    }

    localStorage.clear();
    sessionStorage.clear();

    // Restore backups (Legacy behavior, for standard logout)
    Object.entries(backup).forEach(([k, v]) => localStorage.setItem(k, v));

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

  const handleHardReset = useCallback(async () => {
    if (!window.confirm("⚠️ ¿EJECUTAR REINICIO MAESTRO TÁCTICO?\n\nEsto borrará TODA la memoria local, cachés y cerrará la sesión por completo. Úsalo si no ves las actualizaciones o tienes errores persistentes.")) return;

    try {
      // 1. Clear Storage
      localStorage.clear();
      sessionStorage.clear();

      // 2. Clear Caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // 3. Unregister SWs
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      // 4. Force Reload
      window.location.href = window.location.origin + window.location.pathname + "?reset=" + Date.now();
    } catch (e) {
      console.error("Fallo en hard reset:", e);
      window.location.reload();
    }
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
    initRemoteConfig();
    const storedUser = sessionStorage.getItem('consagrados_session');
    const storedLastActive = localStorage.getItem('last_active_time');

    if (storedUser) {
      try {
        const agent = JSON.parse(storedUser);
        const lastActive = storedLastActive ? parseInt(storedLastActive) : 0;
        const now = Date.now();

        // Timeout reducido a 30 minutos (1800000 ms)
        if (now - lastActive > 1800000 && lastActive !== 0) {
          handleLogout();
        } else {
          setIsLoggedIn(true);
          setCurrentUser(agent);
          setLastActiveTime(now);
        }
      } catch (e) {
        sessionStorage.removeItem('consagrados_session');
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
        // 30 Minutos (1800000 ms)
        if (diff >= 1800000) {
          handleLogout();
        } else if (diff >= 1500000) { // Aviso a los 25 min
          setShowSessionWarning(true);
        }

        // Detección de offline prolongado
        if (!navigator.onLine) {
          const offlineStart = parseInt(localStorage.getItem('offline_start_time') || '0');
          if (offlineStart === 0) {
            localStorage.setItem('offline_start_time', String(now));
          } else if (now - offlineStart > 300000) { // 5 minutos offline
            handleLogout();
          }
        } else {
          localStorage.removeItem('offline_start_time');
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

  // Firebase Cloud Messaging Integration
  const initFirebaseMessaging = useCallback(async () => {
    try {
      const token = await requestForToken();
      if (token) {
        console.log("FCM Token listo para sincronización:", token);
        if (currentUser) {
          syncFcmToken(currentUser.id, token).then(res => {
            if (res.success) console.log("Token sincronizado con el mando central.");
          });
        }
      }

      onMessageListener().then((payload: any) => {
        console.log("Notificación recibida en primer plano:", payload);

        // --- DISPARADOR DE ALERTA DE SISTEMA (SUEÑA Y MUESTRA BANNER) ---
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const title = payload.notification?.title || '📢 CENTRO DE OPERACIÓN';
          const options = {
            body: payload.notification?.body || 'Nuevo despliegue táctico disponible.',
            icon: 'https://lh3.googleusercontent.com/d/1DYDTGzou08o0NIPuCPH9JvYtaNFf2X5f',
            badge: 'https://lh3.googleusercontent.com/d/1DYDTGzou08o0NIPuCPH9JvYtaNFf2X5f',
            silent: false, // Asegurar sonoridad
            tag: 'foreground-push'
          };
          new Notification(title, options);
        }

        setNotificationPermission(typeof Notification !== 'undefined' ? Notification.permission : 'default');
        // Actualizamos contador de inbox para forzar refresco visual
        fetchNotifications().then(notifs => {
          const agentId = currentUser?.id;
          const READ_KEY = agentId ? `read_notifications_${agentId}` : 'read_notifications';
          const DELETED_KEY = agentId ? `deleted_notifications_${agentId}` : 'deleted_notifications';

          const readIds = JSON.parse(localStorage.getItem(READ_KEY) || '[]');
          const delIds = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');

          const unreadNotifs = notifs.filter(n => !readIds.includes(n.id) && !delIds.includes(n.id));
          setUnreadNotifications(unreadNotifs.length);
          setHeadlines(unreadNotifs.slice(0, 5).map(n => n.titulo));
        });
      });
    } catch (e) {
      console.error("Error inicializando Firebase:", e);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isLoggedIn) {
      initFirebaseMessaging();
    }
  }, [isLoggedIn, initFirebaseMessaging]);

  useEffect(() => {
    // --- SISTEMA DE PRESENCIA (FIRESTORE) ---
    if (currentUser && isLoggedIn) {
      const updatePresence = async (status: 'online' | 'offline') => {
        try {
          await setDoc(doc(db, 'presence', currentUser.id), {
            status,
            lastSeen: serverTimestamp(),
            agentName: currentUser.name
          }, { merge: true });
        } catch (e) {
          console.error("Error actualizando presencia:", e);
        }
      };

      updatePresence('online');

      // Limpieza al cerrar o cambiar de usuario
      const handleBeforeUnload = () => updatePresence('offline');
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        updatePresence('offline');
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [currentUser, isLoggedIn]);

  useEffect(() => {
    // Verificación periódica de notificaciones internas
    const checkNotifications = async () => {
      try {
        const notifs = await fetchNotifications();
        const agentId = currentUser?.id;
        const READ_KEY = agentId ? `read_notifications_${agentId}` : 'read_notifications';
        const DELETED_KEY = agentId ? `deleted_notifications_${agentId}` : 'deleted_notifications';

        const readIds = JSON.parse(localStorage.getItem(READ_KEY) || '[]');
        const delIds = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');

        const unreadNotifs = notifs.filter(n => !readIds.includes(n.id) && !delIds.includes(n.id));
        setUnreadNotifications(unreadNotifs.length);
        setHeadlines(unreadNotifs.slice(0, 5).map(n => n.titulo));
        setNotificationPermission(typeof Notification !== 'undefined' ? Notification.permission : 'default');
      } catch (e) {
        console.error("Error en pulso de notificaciones:", e);
      }
    };

    if (isLoggedIn) {
      checkNotifications();
      const interval = setInterval(checkNotifications, 120000); // Cada 2 minutos
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

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

  // --- SECURITY: ANTI-SCREENSHOT FOR STUDENTS ---
  useEffect(() => {
    if (isLoggedIn && currentUser?.userRole === UserRole.STUDENT) {
      const handleContextMenu = (e: MouseEvent) => e.preventDefault();
      const handleBlur = () => {
        document.body.classList.add('tactical-blackout');
      };
      const handleFocus = () => {
        document.body.classList.remove('tactical-blackout');
      };

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
            sessionStorage.setItem('consagrados_session', JSON.stringify(updatedSelf));
          }
        }
      }
      const radar = await fetchVisitorRadar();
      setVisitorRadar(radar || []);

      const events = await fetchActiveEvents();
      setActiveEvents(events || []);
    } catch (err) { } finally {
      if (!isSilent) setIsSyncing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    syncData();
    const interval = setInterval(() => syncData(true), 60000);
    return () => clearInterval(interval);
  }, [syncData]);

  const handleLogin = (e?: React.FormEvent, overrideId?: string) => {
    if (e) e.preventDefault();
    const effectiveId = overrideId || loginId;
    const user = agents.find(a => String(a.id).replace(/[^0-9]/g, '') === effectiveId.replace(/[^0-9]/g, ''));
    if (user && String(user.pin).trim() === loginPin.trim()) {
      sessionStorage.setItem('consagrados_session', JSON.stringify(user));
      localStorage.setItem('last_login_id', user.id);
      const now = Date.now();
      localStorage.setItem('last_active_time', String(now));

      const summary = { id: user.id, name: user.name, photoUrl: user.photoUrl };
      localStorage.setItem('remembered_user', JSON.stringify(summary));
      setRememberedUser(summary);

      setLastActiveTime(now);
      setCurrentUser(user);
      setIsLoggedIn(true);
      trackEvent('login_success', { agent_id: user.id, role: user.userRole, method: 'password' });
      setView(AppView.HOME);
    } else {
      setLoginError({ field: 'both', message: 'CREDENCIALES INVÁLIDAS' });
    }
  };

  const handleBiometricLogin = async (overrideId?: string) => {
    const effectiveId = overrideId || loginId;
    if (!effectiveId) {
      alert("INGRESA TU ID PRIMERO");
      return;
    }
    const user = agents.find(a => String(a.id).replace(/[^0-9]/g, '') === effectiveId.replace(/[^0-9]/g, ''));
    if (!user || !user.biometricCredential) {
      alert("BIOMETRÍA NO CONFIGURADA PARA ESTE ID");
      return;
    }

    setIsAuthenticatingBio(true);
    try {
      const success = await authenticateBiometric(user.biometricCredential);
      if (success) {
        sessionStorage.setItem('consagrados_session', JSON.stringify(user));
        localStorage.setItem('last_login_id', user.id);
        const now = Date.now();
        localStorage.setItem('last_active_time', String(now));

        const summary = { id: user.id, name: user.name, photoUrl: user.photoUrl };
        localStorage.setItem('remembered_user', JSON.stringify(summary));
        setRememberedUser(summary);

        setLastActiveTime(now);
        setCurrentUser(user);
        setIsLoggedIn(true);
        trackEvent('login_success', { agent_id: user.id, role: user.userRole, method: 'biometric' });
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
        if (agent) {
          setScannedAgentForPoints(agent);
          // Auto-award +10 XP for attendance
          try {
            await updateAgentPoints(agent.id, 'LIDERAZGO', 10);
          } catch (e) {
            console.error('Error auto-awarding attendance XP:', e);
          }
        }
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

  const handleVerseQuizComplete = async () => {
    if (!currentUser) return;

    // Marcar la tarea de lectura como completada HOY
    const today = new Date().toISOString().split('T')[0];
    const alreadyDone = localStorage.getItem('verse_completed_date') === today;
    if (alreadyDone) return; // Ya se completó hoy, no duplicar

    const updatedTasks = currentUser.weeklyTasks?.map(t =>
      t.id === 'bible' ? { ...t, completed: true } : t
    ) || [{ id: 'bible', title: 'Lectura diaria', completed: true }];

    // Incrementar racha inmediatamente en local (optimistic update)
    const newStreak = (currentUser.streakCount || 0) + 1;
    const updatedUser = {
      ...currentUser,
      streakCount: newStreak,
      weeklyTasks: updatedTasks
    };
    setCurrentUser(updatedUser);
    sessionStorage.setItem('consagrados_session', JSON.stringify(updatedUser));
    localStorage.setItem('verse_completed_date', today);

    try {
      console.log("🔥 Sincronizando racha...");
      const res = await updateAgentStreaks(currentUser.id, false, updatedTasks);
      if (res.success && res.streak !== undefined) {
        // Sincronizar con el valor del servidor si está disponible
        const serverUser = {
          ...updatedUser,
          streakCount: res.streak
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
        alert("✅ YA HAS CONFIRMADO TU ASISTENCIA HOY.");
      } else if (res.success) {
        alert("✅ ASISTENCIA CONFIRMADA TÁCTICAMENTE.");

        // Ofrecer añadir al calendario
        if (window.confirm("📅 ¿DESEAS AÑADIR ESTE EVENTO A TU CALENDARIO?")) {
          const event = {
            title: "REUNIÓN CONSAGRADOS 2026",
            description: "Confirmación de asistencia táctica como DIRECTOR.",
            startTime: new Date(),
            endTime: new Date(new Date().getTime() + 2 * 60 * 60 * 1000) // +2h
          };
          window.open(generateGoogleCalendarLink(event), '_blank');
        }
      } else {
        alert("❌ FALLO EN PROTOCOLO DE ASISTENCIA");
      }
    } catch (e) {
      alert("❌ FALLO EN PROTOCOLO DE ASISTENCIA");
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
        alert(`✅ ASISTENCIA CONFIRMADA PARA: ${event.titulo}`);

        // Ofrecer añadir al calendario
        if (window.confirm("📅 ¿DESEAS AÑADIR ESTE EVENTO A TU CALENDARIO?")) {
          try {
            const hora = (event.hora || '08:00').replace(/[^0-9:]/g, '');
            const startStr = `${event.fecha}T${hora.length >= 5 ? hora : '08:00'}:00`;
            let startDate = new Date(startStr);
            if (isNaN(startDate.getTime())) startDate = new Date(); // fallback a hoy
            const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

            const calendarEvent = {
              title: event.titulo || 'Evento Consagrados',
              description: `Participación en el evento táctico: ${event.titulo}`,
              startTime: startDate,
              endTime: endDate
            };

            const calLink = generateGoogleCalendarLink(calendarEvent);
            window.open(calLink, '_blank', 'noopener,noreferrer');
          } catch (calError) {
            console.error('Error creando enlace de calendario:', calError);
            alert('No se pudo crear el enlace al calendario. Intenta de nuevo.');
          }
        }
        syncData(true);
      }
    } catch (e) {
      alert("❌ FALLO EN PROTOCOLO DE EVENTO");
    } finally {
      setIsConfirmingEvent(null);
    }
  };

  const renderContent = () => {
    switch (view) {
      case AppView.HOME:
        return (
          <div className="p-5 md:p-8 space-y-6 animate-in fade-in pb-24 max-w-2xl mx-auto font-montserrat">
            {/* ENCABEZADO PREMIUM CENTRO DE OPERACIÓN */}
            <div className="flex flex-col items-center space-y-4 mb-6">

              {/* Indicador de Faro Táctico */}
              <LighthouseIndicator status={notificationPermission === 'granted' ? 'online' : 'offline'} />

              <div className="text-center">
                <h2 className="text-3xl font-bebas font-black text-white tracking-[0.2em] leading-none mb-1">CENTRO DE OPERACIÓN</h2>
                <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.4em] mb-3">{currentUser?.name}</p>

                {/* News Ticker de Titulares */}
                {headlines.length > 0 && (
                  <div className="w-full max-w-[300px] overflow-hidden bg-[#ffb700]/5 border border-[#ffb700]/20 rounded-lg py-1 px-4 mb-2 shadow-inner">
                    <div className="animate-[ticker_20s_linear_infinite] whitespace-nowrap flex items-center gap-8">
                      {headlines.map((h, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Radio size={10} className="text-[#ffb700] animate-pulse" />
                          <span className="text-[8px] font-black text-[#ffb700] uppercase tracking-widest leading-none">{h}</span>
                        </div>
                      ))}
                      {/* Repetir para el loop infinito */}
                      {headlines.map((h, i) => (
                        <div key={`dup-${i}`} className="flex items-center gap-2">
                          <Radio size={10} className="text-[#ffb700] animate-pulse" />
                          <span className="text-[8px] font-black text-[#ffb700] uppercase tracking-widest leading-none">{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botón de Activación Directa si está desconectado */}
                {notificationPermission !== 'granted' && (
                  <button
                    onClick={initFirebaseMessaging}
                    className="mt-2 px-8 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/40 active:scale-95 font-bebas flex items-center gap-3 border border-white/20"
                  >
                    <Bell size={14} className="animate-swing" />
                    ACTIVAR CANAL TÁCTICO
                  </button>
                )}
              </div>
            </div>

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

            <div className="w-full animate-in slide-in-from-top-4 duration-1000 mb-6">
              <DailyVerse
                verse={dailyVerse || { verse: 'Cargando versículo del día...', reference: '' }}
                onQuizComplete={handleVerseQuizComplete}
              />
            </div>

            <div className="flex flex-col gap-4">

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
            </div>

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

                      <button
                        onClick={() => handleConfirmEventAttendance(evt)}
                        disabled={isConfirmingEvent === evt.id}
                        className="w-full bg-[#ffb700] text-[#001f3f] font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-[#ffb700]/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 font-bebas"
                      >
                        {isConfirmingEvent === evt.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Confirmar Mi Asistencia
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
        );
      case AppView.CIU:
        return currentUser ? (
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
        ) : null;
      case AppView.VISITOR:
        return (
          <div className="p-6 md:p-10 space-y-8 animate-in fade-in pb-24 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                <h2 className="text-3xl font-bebas text-white tracking-widest uppercase">Radar de Inteligencia</h2>
                <p className="text-[10px] text-[#ffb700] font-black uppercase tracking-[0.3em] font-montserrat opacity-60">SISTEMA DE ANÁLISIS DE SEÑALES TÁCTICAS</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsSyncing(true);
                    syncData().finally(() => setIsSyncing(false));
                  }}
                  className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/40 border border-white/10"
                >
                  <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                  ESCANEAR DESERCIONES
                </button>
                <button
                  onClick={() => {
                    const name = prompt("INGRESAR NOMBRE DEL VISITANTE:");
                    if (name) {
                      processScan(name.trim().toUpperCase());
                    }
                  }}
                  className="bg-[#ffb700] text-[#001f3f] px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-[#ffb700]/20 border border-white/20"
                >
                  <Plus size={16} /> REGISTRO DE VISITA
                </button>
              </div>
            </div>

            <div className="space-y-12">
              {/* SECCIÓN 1: AGENTES EN RIESGO (INTELIGENCIA INTERNA) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <Activity size={18} className="text-red-500 animate-pulse" />
                  <h3 className="text-xl font-bebas text-white tracking-widest uppercase">RADAR DE DESERCIÓN</h3>
                </div>
                {(() => {
                  const riskAgents = agents.filter(a => {
                    // Solo estudiantes que realmente no han asistido
                    const isStudent = (a.userRole === UserRole.STUDENT || !a.userRole);
                    if (!isStudent) return false;

                    if (!a.lastAttendance || a.lastAttendance === 'N/A') return true; // Nunca han asistido

                    const lastDate = parseAttendanceDate(a.lastAttendance);
                    if (!lastDate) return true; // Fecha no parseable = riesgo

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
                          <div key={a.id} onClick={() => { setFoundAgent(a); }} className={`group relative bg-[#001833] border rounded-[2.5rem] p-6 hover:border-[#ffb700]/30 transition-all cursor-pointer shadow-xl hover:-translate-y-1 ${isDanger ? 'border-red-500/30' : 'border-amber-500/20'}`}>
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
                              {/* Delete button - Director only */}
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

              {/* SECCIÓN 2: SEÑALES EXTERNAS (VISITANTES) */}
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
        );
      case AppView.ACADEMIA: return <AcademyModule userRole={effectiveRole} agentId={currentUser?.id || ''} onActivity={resetSessionTimer} />;
      case AppView.CONTENT: return <ContentModule userRole={effectiveRole} />;
      case AppView.PROFILE:
        return (
          <div className="p-6 md:p-10 space-y-8 animate-in fade-in pb-32 max-w-2xl mx-auto font-montserrat flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-4">
              <h2 className="text-3xl font-bebas text-white tracking-widest uppercase truncate">Expediente de Agente</h2>
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <Target className="text-[#ffb700]" size={20} />
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
              </div>
            )}

            <div className="w-full grid grid-cols-1 gap-3 mt-6">
              <button onClick={() => alert("MÓDULO DE SEGURIDAD.")} className="flex items-center justify-between px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all font-bebas">
                <div className="flex items-center gap-3">
                  <Key size={18} className="text-[#ffb700]" />
                  Cambiar PIN de Acceso
                </div>
                <ChevronRight size={14} className="text-gray-500" />
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
                    type="password"
                    placeholder="INTRODUCE TU PIN"
                    value={loginPin}
                    onChange={(e) => {
                      setLoginPin(e.target.value);
                      if (loginError.message) setLoginError({ field: null, message: null });
                    }}
                    autoFocus
                    className={`w-full bg-white/5 border ${loginError.message ? 'border-red-500' : 'border-white/10'} rounded-2xl py-5 px-6 text-white text-xs font-bold tracking-[0.5em] outline-none focus:border-[#ffb700] focus:bg-white/10 transition-all text-center`}
                  />
                  <Key size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#ffb700]/30" />
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
                    type="text"
                    placeholder="ID DE AGENTE"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white text-xs font-bold tracking-widest outline-none focus:border-[#ffb700] focus:bg-white/10 transition-all group-hover:border-white/20 uppercase"
                  />
                  <Fingerprint size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#ffb700]/30 group-focus-within:text-[#ffb700] transition-colors" />
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

  return (
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
        {renderContent()}
      </div>

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
