importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCEHve-MQVlm3wyESB2tYVfhbf6n9Q6dQA",
    authDomain: "consagrados-c2d78.firebaseapp.com",
    projectId: "consagrados-c2d78",
    storageBucket: "consagrados-c2d78.firebasestorage.app",
    messagingSenderId: "18154361983",
    appId: "1:18154361983:web:227d7541346229096cdb4a",
    measurementId: "G-S4JW8LTFLE"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano:', payload);

    // Extract data even if notification object is missing (data-only messages)
    const notificationTitle = payload.notification?.title || payload.data?.title || '📢 ALERTA TÁCTICA';
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'Nuevo despliegue en el Centro de Operación.',
        icon: 'https://lh3.googleusercontent.com/d/1DYDTGzou08o0NIPuCPH9JvYtaNFf2X5f',
        badge: 'https://lh3.googleusercontent.com/d/1DYDTGzou08o0NIPuCPH9JvYtaNFf2X5f',
        tag: 'tactical-alert',
        data: {
            url: '/'
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus();
            }
            return clients.openWindow('/');
        })
    );
});
