/**
 * Servicio para conectarse al backend Vercel (api/notify) 
 * Manda alertas de Push y Telegram sin usar Google Sheets
 */
import { supabase } from './supabaseService';

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

export const sendPushBroadcast = async (title: string, message: string, targetToken?: string, type: string = 'general'): Promise<boolean> => {
    try {
        // Enviar Push vía Vercel
        const res = await fetch(`${getBaseUrl()}/api/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'push', title, message, targetToken })
        });

        // Registrar en Supabase para el Inbox (siempre, para tener historial)
        await logNotificationSupabase(title, message, type);

        return res.ok;
    } catch (e) {
        console.error("Error al enviar Push Broadcast", e);
        return false;
    }
}

export const subscribeToTopic = async (token: string): Promise<boolean> => {
    try {
        const res = await fetch(`${getBaseUrl()}/api/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'subscribe', targetToken: token })
        });
        return res.ok;
    } catch (e) {
        console.error("Error al suscribir a tópico", e);
        return false;
    }
}

/**
 * Guarda una notificación en la tabla notificaciones_push de Supabase
 * para que aparezca en el Inbox del usuario.
 */
export const logNotificationSupabase = async (title: string, message: string, type: string = 'general', emisor: string = 'Mando Central') => {
    try {
        const { error } = await supabase.from('notificaciones_push').insert({
            titulo: title,
            mensaje: message,
            tipo: type,
            emisor: emisor,
            created_at: new Date().toISOString()
        });
        if (error) throw error;
        return true;
    } catch (e) {
        console.error("Error logueando notificación en Supabase:", e);
        return false;
    }
}
