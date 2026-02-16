import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getFirestore } from "firebase/firestore";
import { getRemoteConfig } from "firebase/remote-config";
// App Check DESACTIVADO temporalmente — reCAPTCHA no tiene el dominio consagrados.vercel.app
// Para reactivar: agregar consagrados.vercel.app en https://www.google.com/recaptcha/admin
// import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAnalytics, logEvent } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyCEHve-MQVlm3wyESB2tYVfhbf6n9Q6dQA",
    authDomain: "consagrados-c2d78.firebaseapp.com",
    projectId: "consagrados-c2d78",
    storageBucket: "consagrados-c2d78.firebasestorage.app",
    messagingSenderId: "18154361983",
    appId: "1:18154361983:web:227d7541346229096cdb4a",
    measurementId: "G-S4JW8LTFLE"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// App Check desactivado hasta configurar reCAPTCHA con dominio correcto
// if (typeof window !== 'undefined') {
//     initializeAppCheck(app, {
//         provider: new ReCaptchaV3Provider('6LeUXG8aAAAAAKs_ClbCd338ODEZqpdtzxszLZ'),
//         isTokenAutoRefreshEnabled: true
//     });
// }

let messaging: ReturnType<typeof getMessaging> | null = null;
try {
    messaging = getMessaging(app);
} catch (e) {
    console.warn('⚠️ Firebase Messaging no disponible en este entorno.');
}
const db = getFirestore(app);
const remoteConfig = getRemoteConfig(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// --- FILTRO GLOBAL: Silenciar errores internos del SDK de Firebase ---
if (typeof window !== 'undefined') {
    const originalError = console.error;
    const originalWarn = console.warn;
    const firebaseNoise = /quota|backoff|resource.exhausted|firestore.*exceeded|overloading/i;
    const isNoise = (args: any[]) => args.some(a => {
        const s = typeof a === 'string' ? a : (a instanceof Error ? a.message : String(a));
        return firebaseNoise.test(s);
    });
    console.error = (...args: any[]) => { if (!isNoise(args)) originalError.apply(console, args); };
    console.warn = (...args: any[]) => { if (!isNoise(args)) originalWarn.apply(console, args); };
}

export const trackEvent = (eventName: string, params?: object) => {
    if (analytics) {
        logEvent(analytics, eventName, params);
    }
};

const VAPID_KEY = "BAqOH8w5wQ2AJ8fVpLVrg-ougvrgWAuoRVwahCsE9pO31-PfEUN_0xr2GumoRMyTmY31ccv3Uv4k2jP1aePppwE";

export const requestForToken = async () => {
    if (!messaging) {
        console.warn('⚠️ Messaging no inicializado, omitiendo token.');
        return null;
    }
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('⚠️ Permiso de notificaciones denegado.');
            return null;
        }

        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (currentToken) {
            console.log('✅ FCM Token obtenido:', currentToken.substring(0, 20) + '...');
            return currentToken;
        } else {
            console.warn('⚠️ No se pudo obtener token FCM.');
            return null;
        }
    } catch (err: any) {
        // Silenciar errores comunes de service worker en localhost
        const msg = err?.message || '';
        if (msg.includes('service-worker') || msg.includes('register') || msg.includes('default')) {
            console.warn('⚠️ FCM no disponible (service worker no registrado en este entorno).');
        } else {
            console.warn('⚠️ Error FCM:', msg);
        }
        return null;
    }
};

export const onMessageListener = () => {
    if (!messaging) return new Promise(() => { }); // Never resolves if no messaging
    return new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            console.log('📩 Notificación recibida:', payload?.notification?.title || 'Sin título');
            resolve(payload);
        });
    });
};

export { messaging, db, remoteConfig, analytics };
