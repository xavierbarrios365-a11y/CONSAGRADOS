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
        if (!res.ok && res.status === 401 && import.meta.env.DEV) {
            console.warn("⚠️ API de Notificaciones (Vercel) retornó 401. Ignorado en modo DEV.");
            return false;
        }
        return res.ok;
    } catch (e: any) {
        if (import.meta.env.DEV) {
            console.warn("⚠️ Fallo en API de Notificaciones (Local). Probablemente CORS o Servicio Apagado.");
            return false;
        }
        console.error("Error al enviar alerta Telegram", e);
        return false;
    }
}

export const sendPushBroadcast = async (title: string, message: string, targetToken?: string, type: string = 'general'): Promise<boolean> => {
    try {
        // Registrar en Supabase para el Inbox (siempre, para tener historial)
        await logNotificationSupabase(title, message, type);

        // Enviar Push vía Vercel
        const res = await fetch(`${getBaseUrl()}/api/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'push', title, message, targetToken })
        });

        if (!res.ok && res.status === 401 && import.meta.env.DEV) {
            console.warn("⚠️ API de Push retornó 401. Ignorado en modo DEV.");
            return true; // Retornamos true para no romper el flujo local
        }

        return res.ok;
    } catch (e: any) {
        if (import.meta.env.DEV) {
            console.warn("⚠️ Fallo en API de Push (Local). Probablemente CORS.");
            return true;
        }
        console.error("Error al enviar Push Broadcast", e);
        return false;
    }
}

export const subscribeToTopic = async (token: string): Promise<boolean> => {
    try {
        // En modo desarrollo local, no intentamos suscribir al tópico global de producción
        // para evitar el error 401 Unauthorized en la consola si el dominio no coincide.
        if (import.meta.env.DEV) {
            console.log("ℹ️ Modo DEV: Suscripción a tópicos de producción omitida localmente.");
            return true;
        }

        const res = await fetch(`${getBaseUrl()}/api/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'subscribe', targetToken: token })
        });

        return res.ok;
    } catch (e) {
        if (import.meta.env.DEV) return true;
        console.error("Error al suscribir a tópico", e);
        return false;
    }
}

/**
 * Guarda una notificación en la tabla notificaciones_push de Supabase
 * para que aparezca en el Inbox del usuario.
 */
export const logNotificationSupabase = async (title: string, message: string, type: string = 'general', emisor: string = 'Mando Central', agentId?: string) => {
    try {
        const { error } = await supabase.from('notificaciones_push').insert({
            titulo: title,
            mensaje: message,
            tipo: type,
            emisor: emisor,
            agent_id: agentId,
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
export const sendSocialNotification = async (
    type: 'MENTION' | 'LIKE' | 'DISLIKE' | 'TRENDING',
    targetAgentId: string,
    data: { senderName: string, messageSnippet?: string, threadId?: string, senderId?: string }
) => {
    try {
        // 0. EVITAR AUTO-NOTIFICACIÓN
        if (data.senderId && data.senderId === targetAgentId) {
            return true;
        }

        let title = "";
        let body = "";

        // 1. Definir Contenido según el Tipo
        switch (type) {
            case 'MENTION':
                title = "📍 HAS SIDO ETIQUETADO";
                body = `${data.senderName} te mencionó: "${data.messageSnippet}"`;
                break;
            case 'LIKE':
                title = "🔥 TU POST TIENE IMPACTO";
                body = `A ${data.senderName} le gusta tu publicación.`;
                break;
            case 'DISLIKE':
                title = "👎 REACCIÓN TÁCTICA";
                body = `A ${data.senderName} le disgusta tu publicación.`;
                break;
            case 'TRENDING':
                title = "🔥 HILO EN TENDENCIA";
                body = `¡Hay mucha actividad en este hilo! No te quedes fuera de la conversación.`;
                break;
        }

        // 2. LOGUEAR EN EL INBOX (SIEMPRE)
        await logNotificationSupabase(title, body, 'social', data.senderName, targetAgentId);

        // 3. ENVIAR A TELEGRAM (Para monitoreo del sistema)
        const telegramMsg = `🔔 [SOCIAL]: <b>${title}</b>\n${body}`;
        await sendTelegramAlert(telegramMsg);

        // 4. Obtener el push_token para el envío móvil (SI EXISTE)
        const { data: agent } = await supabase
            .from('agentes')
            .select('push_token')
            .eq('id', targetAgentId)
            .single();

        if (agent?.push_token) {
            return await sendPushBroadcast(title, body, agent.push_token, 'social');
        }

        return true;
    } catch (e) {
        console.error("Error en sendSocialNotification:", e);
    }
}
