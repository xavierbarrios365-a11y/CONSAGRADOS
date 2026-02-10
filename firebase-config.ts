import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCLHvs-M0WVnWwYSJ2tYVfhs6un9QzdQiA",
    authDomain: "consagrados-c2d78.firebaseapp.com",
    projectId: "consagrados-c2d78",
    storageBucket: "consagrados-c2d78.firebasestorage.app",
    messagingSenderId: "18154361983",
    appId: "1:18154361983:web:277d7541346229b9cdb48a",
    measurementId: "G-G4JMGL7HLL"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const db = getFirestore(app);

const VAPID_KEY = "BAqCHHlwSwZQA-8fvpuYvg-augargWAuRXwahCaF9pO31-PfEUN_Oxf2GumcRMvTmY31ovGuv4kj1FlaoPopwE";

export const requestForToken = async () => {
    try {
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (currentToken) {
            console.log('Firebase Token:', currentToken);
            return currentToken;
        } else {
            console.warn('No se pudo obtener el token de registro. Revisa los permisos.');
            return null;
        }
    } catch (err) {
        console.error('Error al obtener el token de FCM:', err);
        return null;
    }
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            console.log("Mensaje recibido en primer plano:", payload);
            resolve(payload);
        });
    });

export { messaging, db };
