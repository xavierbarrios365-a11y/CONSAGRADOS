importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCLHvs-M0WVnWwYSJ2tYVfhs6un9QzdQiA",
    authDomain: "consagrados-c2d78.firebaseapp.com",
    projectId: "consagrados-c2d78",
    storageBucket: "consagrados-c2d78.firebasestorage.app",
    messagingSenderId: "18154361983",
    appId: "1:18154361983:web:277d7541346229b9cdb48a",
    measurementId: "G-G4JMGL7HLL"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano:', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/favicon.ico'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
