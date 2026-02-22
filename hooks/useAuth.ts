import { useState, useCallback, useRef, useEffect } from 'react';
import { Agent, UserRole } from '../types';
import { resetPasswordWithAnswer, updateAgentPin, syncFcmToken } from '../services/sheetsService';
import { isBiometricAvailable, authenticateBiometric } from '../services/BiometricService';
import { trackEvent } from '../firebase-config';

export interface AuthState {
    isLoggedIn: boolean;
    currentUser: Agent | null;
    loginId: string;
    loginPin: string;
    showPin: boolean;
    loginError: { field: 'id' | 'pin' | 'both' | null; message: string | null };
    showForgotPassword: boolean;
    forgotPasswordStep: 'ID' | 'QUESTION' | 'SUCCESS';
    securityAnswerInput: string;
    resetError: string;
    revealedPin: string;
    isMustChangeFlow: boolean;
    newPinInput: string;
    confirmPinInput: string;
    newQuestionInput: string;
    newAnswerInput: string;
    isUpdatingPin: boolean;
    biometricAvailable: boolean;
    isAuthenticatingBio: boolean;
    lastActiveTime: number;
    showSessionWarning: boolean;
    sessionIp: string;
    rememberedUser: { id: string; name: string; photoUrl: string } | null;
    showQuickLogin: boolean;
    isRegisteringBio: boolean;
}

export function useAuth() {
    // --- Agents ref (updated externally to avoid re-creating the hook) ---
    const agentsRef = useRef<Agent[]>([]);

    // --- Core auth state ---
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState<Agent | null>(null);
    const [loginId, setLoginId] = useState(localStorage.getItem('last_login_id') || '');
    const [loginPin, setLoginPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [loginError, setLoginError] = useState<{ field: 'id' | 'pin' | 'both' | null; message: string | null }>({ field: null, message: null });

    // --- Session management ---
    const [lastActiveTime, setLastActiveTime] = useState<number>(Date.now());
    const [showSessionWarning, setShowSessionWarning] = useState(false);
    const [sessionIp, setSessionIp] = useState<string>(localStorage.getItem('consagrados_ip') || '');

    // --- Forgot password ---
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordStep, setForgotPasswordStep] = useState<'ID' | 'QUESTION' | 'SUCCESS'>('ID');
    const [securityAnswerInput, setSecurityAnswerInput] = useState('');
    const [resetError, setResetError] = useState('');
    const [revealedPin, setRevealedPin] = useState('');

    // --- PIN change ---
    const [isMustChangeFlow, setIsMustChangeFlow] = useState(false);
    const [newPinInput, setNewPinInput] = useState('');
    const [confirmPinInput, setConfirmPinInput] = useState('');
    const [newQuestionInput, setNewQuestionInput] = useState('');
    const [newAnswerInput, setNewAnswerInput] = useState('');
    const [isUpdatingPin, setIsUpdatingPin] = useState(false);

    // --- Biometrics ---
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [isAuthenticatingBio, setIsAuthenticatingBio] = useState(false);
    const [isRegisteringBio, setIsRegisteringBio] = useState(false);

    // --- Quick login ---
    const [rememberedUser, setRememberedUser] = useState<{ id: string; name: string; photoUrl: string } | null>(null);
    const [showQuickLogin, setShowQuickLogin] = useState(true);

    // --- Logout ---
    const handleLogout = useCallback((fullPurge = false) => {
        const backupKeys = fullPurge ? ['app_version', 'pwa_banner_dismissed'] : ['remembered_user', 'app_version', 'pwa_banner_dismissed', 'last_login_id'];
        const backup: Record<string, string> = {};

        backupKeys.forEach(k => {
            const v = localStorage.getItem(k);
            if (v) backup[k] = v;
        });

        if (!fullPurge) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('read_notifications_') || key.startsWith('deleted_notifications_'))) {
                    const v = localStorage.getItem(key);
                    if (v) backup[key] = v;
                }
            }
        }

        localStorage.clear();
        sessionStorage.clear();
        Object.entries(backup).forEach(([k, v]) => localStorage.setItem(k, v));

        setIsLoggedIn(false);
        setCurrentUser(null);
        setLoginId('');
        setLoginPin('');
        setShowSessionWarning(false);
        setIsMustChangeFlow(false);
        setShowForgotPassword(false);
        setShowQuickLogin(fullPurge ? false : true);

        setTimeout(() => {
            window.location.replace(window.location.origin + window.location.pathname + "?logout=" + (fullPurge ? 'full' : 'soft') + "_" + Date.now());
        }, 50);
    }, []);

    // --- Hard Reset ---
    const handleHardReset = useCallback(async () => {
        if (!window.confirm("⚠️ ¿EJECUTAR REINICIO MAESTRO TÁCTICO?\n\nEsto borrará TODA la memoria local, cachés y cerrará la sesión por completo.")) return;
        try {
            localStorage.clear();
            sessionStorage.clear();
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
            }
            window.location.href = window.location.origin + window.location.pathname + "?reset=" + Date.now();
        } catch (e) {
            console.error("Fallo en hard reset:", e);
            window.location.reload();
        }
    }, []);

    // --- Session timer ---
    const resetSessionTimer = useCallback(() => {
        if (isLoggedIn) {
            const now = Date.now();
            setLastActiveTime(now);
            localStorage.setItem('last_active_time', String(now));
            if (showSessionWarning) setShowSessionWarning(false);
        }
    }, [isLoggedIn, showSessionWarning]);

    // --- Login ---
    const handleLogin = useCallback((e?: React.FormEvent, overrideId?: string) => {
        if (e) e.preventDefault();
        const rawId = (overrideId || loginId).trim();
        const effectiveId = rawId.toUpperCase();
        const numericInput = rawId.replace(/[^0-9]/g, '');

        const agents = agentsRef.current;
        let user = agents.find(a => String(a.id).trim().toUpperCase() === effectiveId);
        if (!user && numericInput.length > 3) {
            user = agents.find(a => {
                const agentNumeric = String(a.id).replace(/[^0-9]/g, '');
                return agentNumeric.length > 0 && agentNumeric === numericInput;
            });
        }

        if (!user) {
            setLoginError({ field: 'id', message: 'ID DE AGENTE NO ENCONTRADO' });
            trackEvent('login_fail', { id: effectiveId, reason: 'id_not_found' });
            return;
        }

        if (String(user.pin).trim() === loginPin.trim()) {
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
            setLoginError({ field: null, message: null });
            setLoginPin('');
        } else {
            setLoginError({ field: 'pin', message: 'PIN DE SEGURIDAD INCORRECTO' });
            trackEvent('login_fail', { id: user.id, reason: 'wrong_pin' });
        }
    }, [loginId, loginPin]);

    // --- Biometric login ---
    const handleBiometricLogin = useCallback(async (overrideId?: string) => {
        const effectiveId = overrideId || loginId;
        if (!effectiveId) {
            alert("INGRESA TU ID PRIMERO");
            return;
        }
        const agents = agentsRef.current;
        const user = agents.find(a => String(a.id).replace(/[^0-9]/g, '') === effectiveId.replace(/[^0-9]/g, ''));
        if (!user || !user.biometricCredential) {
            alert("BIOMETRÍA NO CONFIGURADA PARA ESTE ID.\n\nPor favor, ingresa con tu PIN primero y regístrala en 'Mi Perfil'.");
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
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsAuthenticatingBio(false);
        }
    }, [loginId]);

    // --- Init: restore session, check biometrics, get IP ---
    useEffect(() => {
        const storedUser = sessionStorage.getItem('consagrados_session');
        const storedLastActive = localStorage.getItem('last_active_time');
        const isPwa = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

        if (storedUser) {
            try {
                const agent = JSON.parse(storedUser);
                const lastActive = storedLastActive ? parseInt(storedLastActive) : 0;
                const now = Date.now();
                if (!isPwa && now - lastActive > 1800000 && lastActive !== 0) {
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
            try { setRememberedUser(JSON.parse(storedRemembered)); } catch (e) { localStorage.removeItem('remembered_user'); }
        }
    }, [handleLogout]);

    // --- Session timeout ---
    useEffect(() => {
        if (isLoggedIn) {
            const isPwa = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
            const interval = setInterval(() => {
                const now = Date.now();
                const diff = now - lastActiveTime;
                if (!isPwa) {
                    if (diff >= 1800000) { handleLogout(); }
                    else if (diff >= 1500000) { setShowSessionWarning(true); }
                }
                if (!navigator.onLine) {
                    const offlineStart = parseInt(localStorage.getItem('offline_start_time') || '0');
                    if (offlineStart === 0) {
                        localStorage.setItem('offline_start_time', String(now));
                    } else if (now - offlineStart > 300000) { handleLogout(); }
                } else {
                    localStorage.removeItem('offline_start_time');
                }
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [isLoggedIn, lastActiveTime, handleLogout]);

    // --- Activity listener for session reset ---
    useEffect(() => {
        const handler = () => resetSessionTimer();
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, handler));
        return () => events.forEach(e => window.removeEventListener(e, handler));
    }, [resetSessionTimer]);

    // --- Sync notification preferences from cloud on login ---
    useEffect(() => {
        if (isLoggedIn && currentUser && currentUser.id) {
            const READ_KEY = `read_notifications_${currentUser.id}`;
            const DELETED_KEY = `deleted_notifications_${currentUser.id}`;
            if (currentUser.notifPrefs) {
                if (!localStorage.getItem(READ_KEY) && currentUser.notifPrefs.read?.length > 0) {
                    localStorage.setItem(READ_KEY, JSON.stringify(currentUser.notifPrefs.read));
                }
                if (!localStorage.getItem(DELETED_KEY) && currentUser.notifPrefs.deleted?.length > 0) {
                    localStorage.setItem(DELETED_KEY, JSON.stringify(currentUser.notifPrefs.deleted));
                }
            }
        }
    }, [isLoggedIn, currentUser]);

    /**
     * Updates currentUser from a fresh agents list (called by data sync).
     * Avoids circular dependencies by reading session directly.
     */
    const refreshCurrentUser = useCallback((freshAgents: Agent[]) => {
        const session = sessionStorage.getItem('consagrados_session');
        const sessionUser = session ? JSON.parse(session) : null;
        if (sessionUser) {
            const updatedSelf = freshAgents.find(a => String(a.id).toUpperCase() === String(sessionUser.id).toUpperCase());
            if (updatedSelf && JSON.stringify(updatedSelf) !== JSON.stringify(sessionUser)) {
                setCurrentUser(updatedSelf);
                sessionStorage.setItem('consagrados_session', JSON.stringify(updatedSelf));
            }
        }
    }, []);

    return {
        // State
        isLoggedIn, currentUser, loginId, loginPin, showPin, loginError,
        showForgotPassword, forgotPasswordStep, securityAnswerInput, resetError, revealedPin,
        isMustChangeFlow, newPinInput, confirmPinInput, newQuestionInput, newAnswerInput, isUpdatingPin,
        biometricAvailable, isAuthenticatingBio, isRegisteringBio,
        lastActiveTime, showSessionWarning, sessionIp,
        rememberedUser, showQuickLogin,

        // Setters (expose for UI bindings)
        setLoginId, setLoginPin, setShowPin, setLoginError,
        setShowForgotPassword, setForgotPasswordStep, setSecurityAnswerInput, setResetError, setRevealedPin,
        setIsMustChangeFlow, setNewPinInput, setConfirmPinInput, setNewQuestionInput, setNewAnswerInput, setIsUpdatingPin,
        setIsRegisteringBio, setRememberedUser,
        setCurrentUser, setIsLoggedIn, setShowSessionWarning, setShowQuickLogin,

        // Actions
        handleLogin, handleBiometricLogin, handleLogout, handleHardReset,
        resetSessionTimer, refreshCurrentUser,
        agentsRef,
    };
}
