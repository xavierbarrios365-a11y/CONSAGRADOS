import { useState, useCallback, useEffect, useRef } from 'react';
import { Agent } from '../types';
import { syncFcmTokenSupabase as syncFcmToken } from '../services/supabaseService';
import { subscribeToTopic } from '../services/notifyService';
import { requestForToken, onMessageListener, db } from '../firebase-config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export function useFirebaseMessaging(
    currentUser: Agent | null,
    isLoggedIn: boolean,
    onPushReceived?: () => void
) {
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );

    // --- FCM init (once per session) ---
    const fcmInitialized = useRef(false);

    const initFirebaseMessaging = useCallback(async () => {
        if (fcmInitialized.current) return;
        fcmInitialized.current = true;
        try {
            const token = await requestForToken();
            if (token) {
                console.log("✅ FCM Token sincronizado.");
                setNotificationPermission('granted');
                const session = localStorage.getItem('consagrados_session');
                const userId = session ? JSON.parse(session).id : null;
                if (userId) {
                    syncFcmToken(userId, token).then(res => {
                        if (res.success) console.log("✅ Token registrado en servidor.");
                    });
                }

                // Suscripción al tópico global all_agents
                subscribeToTopic(token).then(success => {
                    if (success) console.log("✅ Suscrito a anuncios globales.");
                });
            }

            onMessageListener((payload: any) => {
                console.log("📩 Push recibido:", payload?.notification?.title);

                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    const title = payload.notification?.title || '📢 CENTRO DE OPERACIÓN';
                    const options = {
                        body: payload.notification?.body || 'Nuevo despliegue táctico disponible.',
                        icon: 'https://lh3.googleusercontent.com/d/1DYDTGzou08o0NIPuCPH9JvYtaNFf2X5f',
                        badge: 'https://lh3.googleusercontent.com/d/1DYDTGzou08o0NIPuCPH9JvYtaNFf2X5f',
                        silent: false,
                        tag: 'foreground-push'
                    };
                    new Notification(title, options);
                }

                setNotificationPermission(typeof Notification !== 'undefined' ? Notification.permission : 'default');
                onPushReceived?.();
            });
        } catch (e) {
            console.warn("⚠️ Firebase Messaging no inicializado.");
            fcmInitialized.current = false;
        }
    }, [onPushReceived]);

    useEffect(() => {
        if (isLoggedIn) {
            initFirebaseMessaging();
        } else {
            fcmInitialized.current = false;
        }
    }, [isLoggedIn, initFirebaseMessaging]);

    // --- Presence tracking (Firestore) ---
    const lastPresenceUpdate = useRef<number>(0);
    const lastPresenceStatus = useRef<string>('');

    useEffect(() => {
        if (currentUser && isLoggedIn) {
            const updatePresence = async (status: 'online' | 'offline') => {
                const now = Date.now();
                if (status === 'online' && lastPresenceStatus.current === 'online' && (now - lastPresenceUpdate.current < 300000)) {
                    return;
                }
                try {
                    await setDoc(doc(db, 'presence', currentUser.id), {
                        status,
                        lastSeen: serverTimestamp(),
                        agentName: currentUser.name
                    }, { merge: true });
                    lastPresenceUpdate.current = now;
                    lastPresenceStatus.current = status;
                } catch (e) {
                    // Silence Firestore backoff errors
                }
            };

            updatePresence('online');
            const handleBeforeUnload = () => updatePresence('offline');
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => {
                updatePresence('offline');
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        }
    }, [currentUser?.id, isLoggedIn]);

    return {
        notificationPermission,
        setNotificationPermission,
        initFirebaseMessaging,
    };
}
