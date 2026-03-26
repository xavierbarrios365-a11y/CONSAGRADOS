import { supabase } from './supabaseClient';
import { NewsFeedItem } from '../types';
import { FALLBACK_VERSES as STATIC_VERSES } from '../utils/versesFallback';

/**
 * @description Obtiene el feed de noticias desde Supabase.
 */
export const fetchNewsFeedSupabase = async (): Promise<NewsFeedItem[]> => {
    try {
        const { data, error } = await supabase
            .from('asistencia_visitas')
            .select('*')
            .not('tipo', 'in', '("ASISTENCIA","BIBLIA","APUNTES","LIDERAZGO","CONDUCTA","RECOMPENSA_VISITA","VISITANTE","EVENTO_CONFIRMADO","DIRECTOR_ASISTENCIA","SANCION_AUTOMATICA")')
            .order('registrado_en', { ascending: false })
            .limit(100);
        if (error) throw error;
        return data || [];
    } catch (e: any) {
        console.error('❌ Error obteniendo feed:', e.message);
        return [];
    }
};

/**
 * @description Publica una noticia o post social en Supabase.
 */
export const publishNewsSupabase = async (agentId: string, agentName: string, type: string, message: string, parentId?: string) => {
    try {
        const { error } = await supabase.from('asistencia_visitas').insert({
            agent_id: agentId || 'SISTEMA',
            agent_name: agentName || 'Sistema',
            tipo: type,
            detalle: message,
            parent_id: parentId || null,
            registrado_en: new Date().toISOString()
        });
        if (error) throw error;

        // Notificación a Telegram
        if (type === 'SOCIAL' && !parentId) {
            try {
                const { sendTelegramAlert } = await import('./notifyService');
                const cleanMsg = message.split(' [MEDIA]: ')[0].split(' [VIDEO]: ')[0];
                await sendTelegramAlert(`💬 <b>NUEVA PUBLICACIÓN</b>\n👤 ${agentName}\n📝 ${cleanMsg}\n\n🔗 Intel Feed.`);
            } catch { /* no-op */ }
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Elimina un item del feed.
 */
export const deleteNewsItemSupabase = async (itemId: string) => {
    try {
        const { error } = await supabase.from('asistencia_visitas').delete().eq('id', itemId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Toggle like en un post.
 */
export const toggleLikeSupabase = async (noticiaId: string, agentId: string, agentName?: string): Promise<{ success: boolean; liked?: boolean; error?: string }> => {
    try {
        const { data, error: fetchError } = await supabase
            .from('noticia_likes')
            .select('id')
            .eq('noticia_id', noticiaId)
            .eq('agent_id', agentId)
            .maybeSingle();
        if (fetchError) throw fetchError;

        if (data) {
            const { error: delErr } = await supabase.from('noticia_likes').delete().eq('id', data.id);
            if (delErr) throw delErr;
            return { success: true, liked: false };
        } else {
            const { error: insErr } = await supabase.from('noticia_likes').insert({ noticia_id: noticiaId, agent_id: agentId });
            if (insErr) throw insErr;
            return { success: true, liked: true };
        }
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

// --- STORIES LOGIC ---

/**
 * @description Obtiene las historias activas (últimas 24h) junto con sus visualizaciones.
 */
export const fetchActiveStoriesSupabase = async () => {
    try {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // 1. Obtener historias activas
        const { data: stories, error: storiesError } = await supabase
            .from('agent_stories')
            .select('*')
            .gt('created_at', yesterday)
            .order('created_at', { ascending: false });

        if (storiesError) throw storiesError;
        if (!stories || stories.length === 0) return [];

        // 2. Obtener vistas de estas historias
        const storyIds = stories.map(s => s.id);
        const { data: views, error: viewsError } = await supabase
            .from('story_views')
            .select('story_id, agent_id')
            .in('story_id', storyIds);

        // Si falla obtener vistas, retornamos historias sin vistas pero no bloqueamos todo
        if (viewsError) {
            console.warn('⚠️ No se pudieron cargar las vistas de las historias:', viewsError.message);
            return stories.map(s => ({ ...s, vistas: [] }));
        }

        // 3. Mapear vistas a historias
        return stories.map(s => ({
            ...s,
            vistas: (views || []).filter(v => v.story_id === s.id).map(v => v.agent_id)
        }));
    } catch (e: any) {
        console.error('❌ Error fetching stories:', e.message);
        return [];
    }
};

/**
 * @description Crea una nueva historia.
 */
export const createStorySupabase = async (agentId: string, mediaUrl: string, content?: string, agentName?: string) => {
    try {
        const { data, error } = await supabase.from('agent_stories').insert([{
            agent_id: agentId,
            agent_name: agentName || 'Agente', // Añadido para cumplir constraint NOT NULL
            media_url: mediaUrl,
            content: content || null,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }]).select();
        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Elimina una historia.
 */
export const deleteStorySupabase = async (storyId: string) => {
    try {
        const { error } = await supabase.from('agent_stories').delete().eq('id', storyId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Reacciona a una historia.
 */
export const reactToStorySupabase = async (storyId: string, targetAgentId: string, senderId: string, senderName: string, reaction: string) => {
    try {
        const { error } = await supabase.from('story_reactions').upsert([{
            story_id: storyId,
            agent_id: senderId,
            reaction: reaction
        }]);

        // El nombre y targetAgentId seguro eran para mandar notificaciones antes, o se usaban en RPC
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Responde a una historia.
 */
export const sendStoryReplySupabase = async (targetAgentId: string, targetAgentName: string, senderId: string, senderName: string, message: string, storyId: string, storyImageUrl: string) => {
    try {
        const { error } = await supabase.from('story_replies').insert([{
            story_id: storyId,
            sender_id: senderId,
            mensaje: message
        }]);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Marca una historia como vista.
 */
export const markStoryAsSeenSupabase = async (storyId: string, agentId: string) => {
    try {
        await supabase.from('story_views').upsert([{
            story_id: storyId,
            agent_id: agentId
        }]);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};


// Ampliación del pool de fallback a unos 300+ si es posible combinando manuales o usando el utilitario
const FALLBACK_VERSES = STATIC_VERSES.map(v => ({
    verse: v.text,
    reference: `${v.book} ${v.chapter}:${v.verse}`
}));

/**
 * @description Obtiene el versículo diario. Rota cada 3 horas automáticamente si la BD no se actualiza o para mayor dinamismo.
 */
/**
 * @description Obtiene el versículo diario con rotación dinámica y alta entropía para evitar repeticiones.
 */
export const fetchDailyVerseSupabase = async (): Promise<any | null> => {
    try {
        const { data, error } = await supabase
            .from('versiculos_diarios')
            .select('texto, cita, fecha')
            .order('fecha', { ascending: false })
            .limit(1000);

        const pool = (data && data.length > 0) ? data : FALLBACK_VERSES.map(v => ({ texto: v.verse, cita: v.reference, fecha: new Date().toISOString() }));

        // Generar una semilla diaria estable pero variada
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 0);
        const diff = now.getTime() - startOfYear.getTime();
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

        // Cada 6 horas cambiamos el versículo (4 veces al día)
        const period6h = Math.floor(now.getHours() / 6);

        // Algoritmo de mezcla determinista para el índice
        // Usamos una combinación de día, año y periodo para que no sea una secuencia lineal simple
        const deterministicIndex = ((dayOfYear * 31) + (period6h * 7) + now.getFullYear()) % pool.length;

        const selected = pool[deterministicIndex];
        return {
            verse: selected.texto,
            reference: selected.cita,
            fecha: selected.fecha || now.toISOString()
        };
    } catch (e: any) {
        console.warn("⚠️ Fallo en Versículo Táctico:", e.message);
        const day = new Date().getDate();
        return FALLBACK_VERSES[day % FALLBACK_VERSES.length];
    }
};

/**
 * @description Obtiene los likes de una noticia.
 */
export const fetchNewsLikesSupabase = async (noticiaIds: string[]): Promise<Record<string, number>> => {
    try {
        if (!noticiaIds || noticiaIds.length === 0) return {};
        const { data, error } = await supabase.from('noticia_likes').select('noticia_id').in('noticia_id', noticiaIds);
        if (error) throw error;
        const counts: Record<string, number> = {};
        data.forEach((d: any) => { counts[d.noticia_id] = (counts[d.noticia_id] || 0) + 1; });
        return counts;
    } catch (e: any) {
        return {};
    }
};

/**
 * @description Obtiene los likes de un usuario.
 */
export const fetchUserLikesSupabase = async (agentId: string) => {
    try {
        const { data, error } = await supabase.from('noticia_likes').select('noticia_id').eq('agent_id', agentId);
        if (error) throw error;
        return data.map((d: any) => d.noticia_id);
    } catch (e: any) {
        return [];
    }
};

/**
 * @description Obtiene el agente con más likes.
 */
export const getMostLikedAgentSupabase = async (): Promise<{ agentId: string; likes: number } | null> => {
    try {
        const { data: likesData, error: likesError } = await supabase.from('noticia_likes').select('noticia_id');
        if (likesError) throw likesError;
        if (!likesData || likesData.length === 0) return null;

        const noticiaLikeCounts: Record<string, number> = {};
        likesData.forEach((l: any) => { noticiaLikeCounts[l.noticia_id] = (noticiaLikeCounts[l.noticia_id] || 0) + 1; });

        const topNoticiaIds = Object.keys(noticiaLikeCounts);
        const { data: noticias, error: noticiasError } = await supabase
            .from('asistencia_visitas')
            .select('id, agent_id')
            .in('id', topNoticiaIds);
        if (noticiasError) throw noticiasError;

        const agentLikes: Record<string, number> = {};
        (noticias || []).forEach((n: any) => {
            if (n.agent_id && n.agent_id !== 'SISTEMA') {
                agentLikes[n.agent_id] = (agentLikes[n.agent_id] || 0) + (noticiaLikeCounts[n.id] || 0);
            }
        });

        if (Object.keys(agentLikes).length === 0) return null;
        const agentId = Object.entries(agentLikes).sort((a, b) => b[1] - a[1])[0][0];
        return { agentId, likes: agentLikes[agentId] };
    } catch (e: any) {
        return null;
    }
};

/**
 * @description Toggle dislike.
 */
export const toggleDislikeSupabase = async (agentId: string, noticiaId: string): Promise<{ success: boolean; disliked?: boolean; error?: string }> => {
    try {
        const { data, error: fetchError } = await supabase
            .from('noticia_dislikes')
            .select('id')
            .eq('noticia_id', noticiaId)
            .eq('agent_id', agentId)
            .maybeSingle();
        if (fetchError) throw fetchError;

        if (data) {
            const { error: delErr } = await supabase.from('noticia_dislikes').delete().eq('id', data.id);
            if (delErr) throw delErr;
            return { success: true, disliked: false };
        } else {
            const { error: insErr } = await supabase.from('noticia_dislikes').insert({ noticia_id: noticiaId, agent_id: agentId });
            if (insErr) throw insErr;
            return { success: true, disliked: true };
        }
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Obtiene todos los banners.
 */
export const fetchAllBannersSupabase = async () => {
    try {
        const { data, error } = await supabase.from('web_banners').select('*').order('created_at', { ascending: false });
        return data || [];
    } catch (e: any) {
        console.warn('⚠️ No se pudieron obtener todos los banners (posible tabla faltante):', e.message);
        return [];
    }
};

/**
 * @description Obtiene banners activos.
 */
export const fetchActiveBannersSupabase = async () => {
    try {
        const { data, error } = await supabase.from('web_banners').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (e: any) {
        console.warn('⚠️ No se pudieron obtener banners activos:', e.message);
        return [];
    }
};

/**
 * @description Crea un banner.
 */
export const createBannerSupabase = async (banner: any) => {
    try {
        const { data, error } = await supabase.from('web_banners').insert([banner]).select();
        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Toggle banner status.
 */
export const toggleBannerStatusSupabase = async (id: string, active: boolean) => {
    try {
        const { error } = await supabase.from('web_banners').update({ is_active: active }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Elimina un banner.
 */
export const deleteBannerSupabase = async (id: string) => {
    try {
        const { error } = await supabase.from('web_banners').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Valida si el contenido tiene palabras censuradas.
 */
export const validateContent = (text: string) => {
    const censored = [
        'PUTA', 'PUTO', 'MAMAGUEVO', 'MAMAGUEBO', 'GUEVO', 'GUEBO', 'COÑO', 'MALDITA', 'MALDITO',
        'GUEVON', 'GUEBON', 'MADRE', 'HIJO DE PUTA', 'HDP', 'MARICO', 'MARICA', 'MARICON',
        'MALPARIDO', 'MALPARIDA', 'CARETABLA', 'LADRON', 'CHABESTIA', 'ESCUALIDO'
    ];
    const upperText = text.toUpperCase();
    for (const word of censored) {
        if (upperText.includes(word)) {
            return { valid: false, word };
        }
    }
    return { valid: true };
};

/**
 * @description Parsea el mensaje del feed para extraer metadatos (Versículos, Media, etc).
 */
export const parseNewsMessage = (detalle: string) => {
    if (!detalle) return { message: '', verse: undefined, reference: undefined, mediaUrl: undefined, mediaType: undefined };

    let message = detalle;
    let verse = undefined;
    let reference = undefined;
    let mediaUrl = undefined;
    let mediaType: 'IMAGE' | 'VIDEO' | undefined = undefined;

    // 1. Extraer Versículo: 📖 Texto (Referencia) | Mensaje
    if (detalle.startsWith('📖')) {
        const pipeIdx = detalle.indexOf('|');
        if (pipeIdx !== -1) {
            const versePart = detalle.substring(0, pipeIdx).trim();
            message = detalle.substring(pipeIdx + 1).trim();

            const lastOpenParen = versePart.lastIndexOf('(');
            const lastCloseParen = versePart.lastIndexOf(')');
            if (lastOpenParen !== -1 && lastCloseParen !== -1) {
                verse = versePart.substring(2, lastOpenParen).trim();
                reference = versePart.substring(lastOpenParen + 1, lastCloseParen).trim();
            }
        }
    }

    // 2. Extraer Media: [MEDIA]: URL o [VIDEO]: URL
    // Mejorar Regex para soportar espacios, linebreaks u otros artefactos
    const mediaRegex = /\[(MEDIA|VIDEO)\]:\s*([^\s]+)/i;
    const match = message.match(mediaRegex);
    if (match) {
        mediaType = match[1].toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE';
        mediaUrl = match[2];
        message = message.replace(match[0], '').trim();
    }

    return { message, verse, reference, mediaUrl, mediaType };
};

/**
 * @description Registra un lead de inversión desde el landing page.
 */
export const submitInversionLead = async (lead: any) => {
    try {
        const { error } = await supabase.from('inversion_leads').insert([lead]);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};
