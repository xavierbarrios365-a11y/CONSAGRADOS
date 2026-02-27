/**
 * Servicio para conectarse al backend Vercel (api/notify) 
 * Manda alertas de Push y Telegram sin usar Google Sheets
 */

const getBaseUrl = () => {
    return import.meta.env.DEV ? 'https://consagrados.vercel.app' : '';
};

export const sendTelegramAlert = async (message: string): Promise<boolean> => {
    try {
        const res = await fetch(`${getBaseUrl()}/api/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'telegram', message })
        });
        return res.ok;
    } catch (e) {
        console.error("Error al enviar alerta Telegram", e);
        return false;
    }
}

export const sendPushBroadcast = async (title: string, message: string, targetToken?: string): Promise<boolean> => {
    try {
        const res = await fetch(`${getBaseUrl()}/api/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'push', title, message, targetToken })
        });
        return res.ok;
    } catch (e) {
        console.error("Error al enviar Push Broadcast", e);
        return false;
    }
}
