export const config = {
    runtime: 'nodejs', // Requiere NodeJS para usar el modulo `crypto`
};

import crypto from 'crypto';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8514450878:AAElk5X4n2YvnHEiK7K1ZlmmtoekIlQ-IhA';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1009537014';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'consagrados-c2d78';
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@consagrados-c2d78.iam.gserviceaccount.com';
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDmAuEFgVoH56H2\nl4RsBF6PM3th0Psw/mkvNb3yeXEc+p81TgoD1aiY4P980jiegalIcq/trZmi5FRD\ntv+OPlJYesaU8bVcHRiGTGmhLeo3cYHgvDNESInUHk4zWsO+RI4Upx/jo1mxTkhA\nxd53mTe0HOPK/FWjhYh9LWkc89VWgpodmLAABjaltTfGEuFITZA3SiV7qHrSXuj7\ngR206GrfwiM4G4zTcx/Ov7SB9zZlcAdzldsGvxlpiYntiFFW8wu8EdtM1pi3shMM\nKKGNPnb5VopMSr5cWdEKxV1n1OK/IGc/vZF1i0c/nb4odhptCKdrdZFyM1mKlsGr\nqf6BDfj/AgMBAAECggEABQFdXeN4OZbP/qVCc5/5YiVifc5F68WFispLxWSLfRrJ\nGdMGbcSZrtCqo/qRJ9s2JgZKOiJefF3P+vSXBW8+wdUo0CHzFTuUMTalenqcz7MP\nz/utzpfDhBMFbExWg86gcZDyJTUvT6fz85Dla/XbcUx1pTuuLhOgVOpcO2M6VRpn\nkubCNPt+L4FH37Inkxk6msoh109DDQXi6AxJaClxkm7pGrlHHEEIAxh303ZCL3Rw\ntlf9IzbkdxHSUjzmvcXSw1p4oheb4J/rqoUfjL5S44QPQejFrWsVqer1Qj4VqPwf\nNtSosw0Kv5NtMFEOCu0RXAziQDzQBrLtStFLYqwiBQKBgQD7+8HGYSMoIZ5muq3i\nBY7eXfSqNQ8Emr9Zc4DGXRkOj9Cmue1ZM1cfO2DhWAUHIzRKBSUjjbTA/lKaiucx\n5EboKl9nY7WyJf2nibpXi6Qr0i2hNhWXg2dXKc5+ZVotq3MZ1+kkBQAvONI4lXRg\nODyac90PrtnVHoTFHrXwIA2kWwKBgQDprXZhfB4Nh3IlJTzcF7rE33RNdA4LJyZ4\nHjXATRi8KJsE80RXEkb5pF3pWE1gC4XBLg18OwRcE1OlJoQbaGY3Zv5LezrQcs6L\nj7EkIBS4YP+qaonUz4k+QPI7cnyjtmemU9aL09q9NQuWInHxBIVlK9jVkZ29l22v\nDTErjdBPLQKBgAm/MDyjLz/zJPRmTimK+37AdaFL0hvkfHhSTm3d1gVJLNH2KScl\nJD6SBmpRBEjFZNVkI46fgZlhfQJ7UvwMD24VjYErSzDr5UbgvfN69Eu5oog01lr4\n+ztU46bh9r4Dfr1GK7937gzljsQfi9PY+Qckai2cHtLujkYtrO3v33c3AoGALcvd\nI4XbrfMZn8YIg2nzJJpWhMd16SGnHGtvRVzWuCmNGA9FGXtvhYV9EjpID8ayVAXe\nhrZaSGFRR1ChG23+emUo+UoRYMDfUeK7aMUQyoHYGWH/2UFDOHwp/RSW8M7SyXos\n1gKTH/nBZ48gnYexTP6m5FRBgeKnkGMZe9uzM5ECgYEAmkbl6gfBi8bs1p29xFng\n7zax4GU8sLovre2FEdZ0o5r9NA8WyqT9jqX6N+tGto6xdsuVet06bVL+0cPQO1Dq\nuoDtAqC9+K88n5zFFR7ABeq1a6Mp4u0xQOTGhhi7ECy8Sk5jra5VOiewU8NhnaC0\nb8nRN8/Ed2fExIbS3FETDIk=\n-----END PRIVATE KEY-----\n';
const OFFICIAL_LOGO_ID = '1DYDTGzou08o0NIPuCPH9JvYtaNFf2X5f';

async function sendTelegramNotification(message: string) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        console.error(`Telegram Error: ${await response.text()}`);
    }
}

async function getFcmAccessToken() {
    const header = JSON.stringify({ alg: "RS256", typ: "JWT" });
    const now = Math.floor(Date.now() / 1000);
    const claim = JSON.stringify({
        iss: FIREBASE_CLIENT_EMAIL,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now
    });

    const base64Encode = (str: string) => Buffer.from(str).toString('base64url');

    const signatureInput = `${base64Encode(header)}.${base64Encode(claim)}`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    sign.end();
    const signature = sign.sign(FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), 'base64url');

    const jwt = `${signatureInput}.${signature}`;

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    if (!response.ok) {
        throw new Error(`Failed to get FCM token: ${await response.text()}`);
    }

    const data = await response.json();
    return data.access_token;
}

async function sendPushNotification(title: string, message: string, targetToken?: string) {
    try {
        const accessToken = await getFcmAccessToken();
        const url = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`;

        const payload: any = {
            message: {
                notification: {
                    title: `📢 ${title.toUpperCase()}`,
                    body: message
                },
                webpush: {
                    notification: {
                        icon: "https://lh3.googleusercontent.com/d/" + OFFICIAL_LOGO_ID,
                        click_action: "https://consagrados.vercel.app"
                    }
                }
            }
        };

        if (targetToken) {
            payload.message.token = targetToken;
        } else {
            payload.message.topic = "all_agents";
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }
    } catch (error: any) {
        console.error("FCM Error:", error);
        // Fallback a Telegram
        await sendTelegramNotification(`⚠️ <b>FALLO PUSH:</b>\n<b>${title}</b>\n${message}\n\n<i>${error.message}</i>`);
    }
}

export default async function handler(req: any, res: any) {
    // Definir cabeceras CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // En Vercel Serverless para NodeJS, el body ya viene parseado si el Content-Type es application/json
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { action, title, message, targetToken } = body || {};

        if (!message) {
            return res.status(400).json({ error: 'Missing message' });
        }

        if (action === 'telegram') {
            await sendTelegramNotification(message);
        } else if (action === 'push') {
            await sendPushNotification(title || "CONSAGRADOS 2026", message, targetToken);
            // Notificar a Telegram como backup de la notificación Push global
            await sendTelegramNotification(`📢 <b>${(title || "MANDO CENTRAL").toUpperCase()}</b>\n\n${message}`);
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error("Notify Endpoint Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
}
