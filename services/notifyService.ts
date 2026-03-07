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

/**
 * @description Envía una notificación social específica (mención, like, trending)
 */
export const sendSocialNotification = async (type: 'MENTION' | 'LIKE' | 'TRENDING', targetAgentId: string, data: { senderName: string, messageSnippet?: string, threadId?: string }) => {
    try {
        let title = "";
        let body = "";

        // Obtener el push_token del destinatario
        const { data: agent } = await supabase
            .from('agentes')
            .select('push_token, nombre')
            .eq('id', targetAgentId)
            .single();

        if (!agent?.push_token) return;

        switch (type) {
            case 'MENTION':
                title = "📍 HAS SIDO ETIQUETADO";
                body = `${data.senderName} te mencionó: "${data.messageSnippet}"`;
                break;
            case 'LIKE':
                title = "🔥 TU POST TIENE IMPACTO";
                body = `A ${data.senderName} le gusta tu publicación.`;
                break;
            case 'TRENDING':
                title = "🔥 HILO EN TENDENCIA";
                body = `¡Hay mucha actividad en este hilo! No te quedes fuera de la conversación.`;
                break;
        }

        return await sendPushBroadcast(title, body, agent.push_token, 'social');
    } catch (e) {
        console.error("Error en sendSocialNotification:", e);
    }
}
