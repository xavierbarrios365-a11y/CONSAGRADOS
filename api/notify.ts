export const config = {
    runtime: 'nodejs', // Requiere NodeJS para usar el modulo `crypto`
};

import crypto from 'crypto';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8514450878:AAElk5X4n2YvnHEiK7K1ZlmmtoekIlQ-IhA';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1009537014';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'consagrados-c2d78';
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || '';
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY || '';
const OFFICIAL_LOGO_ID = '1DYDTGzou08o0NIPuCPH9JvYtaNFf2X5f';

async function sendTelegramNotification(message: string) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        const missing = [];
        if (!TELEGRAM_BOT_TOKEN) missing.push('TELEGRAM_BOT_TOKEN');
        if (!TELEGRAM_CHAT_ID) missing.push('TELEGRAM_CHAT_ID');
        console.error(`❌ Variables de entorno faltantes: ${missing.join(', ')}`);
        throw new Error(`Telegram no configurado: faltan ${missing.join(', ')} en Vercel Dashboard > Settings > Environment Variables`);
    }

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
        const errBody = await response.text();
        console.error(`❌ Telegram API Error [${response.status}]:`, errBody);
        throw new Error(`Telegram respondió ${response.status}: ${errBody}`);
    }

    const result = await response.json();
    console.log('✅ Telegram enviado OK, message_id:', result?.result?.message_id);
    return result;
}

async function getFcmAccessToken() {
    const header = JSON.stringify({ alg: "RS256", typ: "JWT" });
    const now = Math.floor(Date.now() / 1000);
    const claim = JSON.stringify({
        iss: FIREBASE_CLIENT_EMAIL,
        scope: "https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/cloud-platform",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now
    });

    const base64Encode = (str: string) => Buffer.from(str).toString('base64url');

    const signatureInput = `${base64Encode(header)}.${base64Encode(claim)}`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    sign.end();

    const normalizedKey = FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!normalizedKey || !normalizedKey.includes('PRIVATE KEY')) {
        console.error("❌ ERROR: FIREBASE_PRIVATE_KEY is missing or invalid in Vercel Env Vars.");
        throw new Error("Credencial de Firebase (Private Key) no configurada en Vercel Dashboard.");
    }

    try {
        const signature = sign.sign(normalizedKey, 'base64url');
        const jwt = `${signatureInput}.${signature}`;

        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`FCM Token Auth Failed: ${response.status} - ${errBody}`);
        }

        const data = await response.json();
        return data.access_token;
    } catch (e: any) {
        throw new Error(`Error signing/fetching FCM access token: ${e.message}`);
    }
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
                android: {
                    notification: {
                        sound: "default"
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: "default"
                        }
                    }
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
        console.warn(`Method Not Allowed: ${req.method}`);
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // En Vercel Serverless para NodeJS, el body ya viene parseado si el Content-Type es application/json
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        console.log("Request body:", JSON.stringify(body));
        const { action, title, message, targetToken } = body || {};

        if (action === 'telegram') {
            console.log("Action: telegram");
            if (!message) {
                console.warn("Missing message for telegram action.");
                return res.status(400).json({ error: 'Missing message' });
            }
            await sendTelegramNotification(message);
        } else if (action === 'subscribe') {
            if (!targetToken) return res.status(400).json({ error: 'Missing targetToken' });

            const accessToken = await getFcmAccessToken();
            const iidUrl = `https://iid.googleapis.com/iid/v1/${targetToken}/rel/topics/all_agents`;

            const response = await fetch(iidUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Content-Length': '0'
                },
                body: "" // Ciertas APIs de IID requieren un body aunque sea vacío
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error("FCM Subscribe Error:", errText);
                // No retornamos error HTTP para no ensuciar la consola del cliente, 
                // sino un éxito parcial con el error detallado para que el código siga fluyendo.
                return res.status(200).json({
                    success: false,
                    error: 'Subscription failed',
                    code: response.status
                });
            }
            console.log("Token subscribed to all_agents:", targetToken.substring(0, 10) + "...");
        } else if (action === 'push') {
            if (!message) return res.status(400).json({ error: 'Missing message' });
            await sendPushNotification(title || "CONSAGRADOS 2026", message, targetToken);
            await sendTelegramNotification(`📢 <b>${(title || "MANDO CENTRAL").toUpperCase()}</b>\n\n${message}`);
        } else {
            return res.status(400).json({ error: 'Invalid action', receivedAction: action });
        }

        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error("Notify Endpoint Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
}
