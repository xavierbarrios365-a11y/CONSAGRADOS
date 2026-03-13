import { supabase } from './supabaseClient';
import { Agent, UserRole, Rank } from '../types';

/**
 * @description Sincroniza un agente desde Google Sheets hacia Supabase.
 */
export const syncAgentToSupabase = async (agent: Agent) => {
    try {
        const payload = {
            id: agent.id,
            nombre: agent.name,
            xp: agent.xp || 0,
            rango: agent.rank,
            cargo: agent.accessLevel || agent.role,
            whatsapp: agent.whatsapp,
            foto_url: (agent.photoUrl && (agent.photoUrl.includes('cloudinary.com') || agent.photoUrl.includes('supabase.co') || agent.photoUrl.includes('drive.google.com') || agent.photoUrl.includes('docs.google.com'))) ? agent.photoUrl : (agent.photoUrl || ''),
            pin: agent.pin,
            is_ai_profile_pending: agent.isAiProfilePending || false,
            tactical_stats: agent.tacticalStats || {},
            tactor_summary: agent.tacticalSummary || '',
            talent: agent.talent,
            baptism_status: agent.baptismStatus,
            status: agent.status,
            bible: agent.bible,
            notes: agent.notes,
            leadership: agent.leadership,
            user_role: agent.userRole,
            joined_date: agent.joinedDate,
            birthday: agent.birthday,
            relationship_with_god: agent.relationshipWithGod,
            security_question: agent.securityQuestion,
            security_answer: agent.securityAnswer,
            must_change_password: agent.mustChangePassword,
            biometric_credential: agent.biometricCredential,
            streak_count: agent.streakCount,
            last_streak_date: agent.lastStreakDate,
            last_attendance: agent.lastAttendance,
            weekly_tasks: agent.weeklyTasks || [],
            notif_prefs: agent.notifPrefs || { read: [], deleted: [] },
            last_course: agent.lastCourse
        };

        const { error } = await supabase.rpc('sync_agent_profile', { payload });

        if (error) {
            console.error('❌ Error sincronizando agente vía RPC:', error.message);
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (e: any) {
        console.error('❌ Fallo crítico en syncAgentToSupabase:', e.message);
        return { success: false, error: e.message };
    }
};

/**
 * @description Sincroniza la lista completa de agentes (uso para migración inicial).
 */
export const syncAllAgentsToSupabase = async (agents: Agent[]) => {
    console.log(`🔄 Iniciando sincronización masiva de ${agents.length} agentes...`);
    let failuresCount = 0;
    const syncedAgents: string[] = [];

    for (const agent of agents) {
        try {
            const result = await syncAgentToSupabase(agent);
            if (!result.success) {
                failuresCount++;
            } else {
                syncedAgents.push(agent.name);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
            failuresCount++;
        }
    }

    if (failuresCount > 0) {
        console.warn(`⚠️ Sincronización completada con ${failuresCount} fallos.`);
    } else {
        console.log('✅ Sincronización masiva exitosa.');
    }
    return { success: failuresCount === 0, count: agents.length - failuresCount };
};

/**
 * @description Obtiene la lista completa de agentes desde Supabase.
 */
export const fetchAgentsFromSupabase = async (): Promise<Agent[]> => {
    try {
        const { data, error } = await supabase
            .from('agentes')
            .select('id, nombre, xp, rango, cargo, foto_url, status, talent, user_role, joined_date, bible, notes, leadership, streak_count, last_attendance, last_streak_date, weekly_tasks, pin, whatsapp, baptism_status, birthday, relationship_with_god, must_change_password, is_ai_profile_pending, tactical_stats, tactor_summary, iq_level, biometric_credential, security_question, security_answer, notif_prefs, fcm_token');
        if (error) {
            console.error('❌ Error obteniendo agentes de Supabase:', error);
            return [];
        }

        if (!data || data.length === 0) return [];

        return data.filter((d: any) => d.id && d.id.trim() !== '').map((d: any) => ({
            id: d.id,
            name: d.nombre,
            xp: d.xp || 0,
            iqLevel: d.iq_level || 1,
            rank: (() => {
                const name = String(d.nombre || '').toUpperCase();
                const role = String(d.user_role || '').toUpperCase();
                const cargo = String(d.cargo || '').toUpperCase();
                const dbRank = (d.rango || 'RECLUTA').toUpperCase();

                const knownStaffNames = ['SAHEL', 'SOLISBETH', 'NAILETH', 'ANTONELLA', 'DAVID JOEL'];
                if (knownStaffNames.some(sn => name.includes(sn))) return Rank.LIDER;

                const staffKeywords = ['DIRECTOR', 'DIRECTORA', 'PASTORAL', 'IDENTIDAD', 'DINÁMICAS', 'EVIDENCIA', 'CENTRO DE OPERACIÓN', 'ADMINISTRADOR', 'ADMINISTRADORA'];
                if (staffKeywords.some(kw => cargo.includes(kw) || role.includes(kw))) {
                    return Rank.LIDER;
                }
                return dbRank;
            })(),
            role: d.cargo || 'ESTUDIANTE',
            whatsapp: d.whatsapp || '',
            photoUrl: d.foto_url || '',
            pin: d.pin || '',
            isAiProfilePending: d.is_ai_profile_pending || false,
            tacticalStats: d.tactical_stats || {},
            tacticalSummary: d.tactor_summary || '',
            talent: d.talent || 'PENDIENTE',
            baptismStatus: d.baptism_status || 'NO',
            status: d.status || 'ACTIVO',
            userRole: (() => {
                const name = String(d.nombre || '').toUpperCase();
                const role = String(d.user_role || '').toUpperCase();
                const cargo = String(d.cargo || '').toUpperCase();

                if (name.includes('SAHEL') || role === 'DIRECTOR' || cargo === 'DIRECTOR') return UserRole.DIRECTOR;

                const staffKeywords = ['LIDER', 'LÍDER', 'LEADER', 'PASTORAL', 'IDENTIDAD', 'DINÁMICAS', 'EVIDENCIA', 'ADMIN'];
                const isStaffKeyword = staffKeywords.some(kw => cargo.includes(kw) || role.includes(kw));
                const knownStaffNames = ['SOLISBETH', 'NAILETH', 'ANTONELLA', 'DAVID JOEL'];
                const isKnownStaff = knownStaffNames.some(sn => name.includes(sn));

                if (isStaffKeyword || isKnownStaff) return UserRole.LEADER;

                return UserRole.STUDENT;
            })(),
            idSignature: `V37-SIG-${d.id}`,
            joinedDate: d.joined_date || '',
            birthday: d.birthday || '',
            relationshipWithGod: d.relationship_with_god || 'PENDIENTE',
            mustChangePassword: d.must_change_password || false,
            streakCount: (() => {
                const raw = d.last_streak_date || '';
                if (!raw || (d.streak_count || 0) === 0) return 0;
                try {
                    const now = new Date();
                    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
                    const ts = Number(raw);
                    const lastDate = (!isNaN(ts) && ts > 1e12) ? new Date(ts) : new Date(raw);
                    const lastDateStr = lastDate.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
                    return (lastDateStr === todayStr || lastDateStr === yesterdayStr) ? (d.streak_count || 0) : 0;
                } catch { return 0; }
            })(),
            lastStreakDate: d.last_streak_date || '',
            lastAttendance: d.last_attendance || '',
            weekly_tasks: d.weekly_tasks || [],
            notif_prefs: d.notif_prefs || { read: [], deleted: [] },
            last_course: d.last_course || '',
            bible: d.bible || 0,
            notes: d.notes || 0,
            leadership: d.leadership || 0,
            // --- CAMPOS CRTICOS: Biometría y Seguridad ---
            biometricCredential: d.biometric_credential || null,
            securityQuestion: d.security_question || null,
            securityAnswer: d.security_answer || null,
            fcmToken: d.fcm_token || null,
            notifPrefs: d.notif_prefs || { read: [], deleted: [] }
        })) as unknown as Agent[];

    } catch (e: any) {
        console.error('❌ Fallo crítico en fetchAgentsFromSupabase:', e.message);
        return [];
    }
};

export const deleteAgentSupabase = async (agentId: string) => {
    try {
        const { error } = await supabase.from('agentes').delete().eq('id', agentId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const updateAgentPointsSupabase = async (agentId: string, type: 'BIBLIA' | 'APUNTES' | 'LIDERAZGO' | 'XP', amount: number, multiplier: number = 1.0, streakCount?: number) => {
    try {
        const { data, error } = await supabase.rpc('update_agent_points_secure', {
            p_agent_id: agentId,
            p_type: type,
            p_amount: Math.floor(amount * multiplier),
            p_streak_count: streakCount || 0
        });
        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const updateAgentStreaksSupabase = async (agentId: string, isWeekComplete: boolean, tasks: any[], agentName?: string, verseText?: string, verseRef?: string, currentStreak?: number, currentXp?: number) => {
    try {
        const { data, error } = await supabase.rpc('update_agent_streak_v2', {
            p_agent_id: agentId,
            p_tasks: tasks,
            p_is_week_complete: isWeekComplete,
            p_agent_name: agentName || 'Agente',
            p_verse_text: verseText || '',
            p_verse_ref: verseRef || ''
        });
        if (error) throw error;
        return { success: true, ...data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const updateAgentPhotoSupabase = async (agentId: string, photoUrl: string) => {
    try {
        const { error } = await supabase.from('agentes').update({ foto_url: photoUrl }).eq('id', agentId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const updateAgentAiProfileSupabase = async (agentId: string, stats: any, summary: string) => {
    try {
        const { error } = await supabase.from('agentes').update({ tactical_stats: stats, tactor_summary: summary }).eq('id', agentId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const updateAgentAiPendingStatusSupabase = async (agentId: string, isPending: boolean) => {
    try {
        const { error } = await supabase.from('agentes').update({ is_ai_profile_pending: isPending }).eq('id', agentId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Calcula los logros (insignias) de todos los agentes.
 */
export const computeBadgesSupabase = async (): Promise<Badge[]> => {
    try {
        const { data: agents, error } = await supabase.from('agentes').select('id, nombre, xp, rango');
        if (error) throw error;

        const badges: Badge[] = [];
        (agents || []).forEach(agent => {
            if (agent.xp >= 1000) {
                badges.push({
                    agentId: agent.id,
                    agentName: agent.nombre,
                    label: 'VETERANO',
                    value: agent.xp,
                    emoji: '🛡️',
                    type: 'ACADEMICO'
                });
            }
            if (agent.rango === 'CONSAGRADO') {
                badges.push({
                    agentId: agent.id,
                    agentName: agent.nombre,
                    label: 'CONSAGRADO',
                    value: 1,
                    emoji: '⭐',
                    type: 'MISIONERO_ELITE'
                });
            }
        });
        return badges;
    } catch (e: any) {
        console.error('Error computing badges:', e.message);
        return [];
    }
};

/**
 * @description Verifica cumpleaños y publica anuncios sociales si es necesario.
 */
export const checkAndPublishBirthdays = async (agents: Agent[]) => {
    try {
        const today = new Date();
        const mmdd = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

        for (const agent of agents) {
            if (agent.birthday && agent.birthday.includes(mmdd)) {
                // Evitar duplicados en el feed mediante lógica en socialService si fuera necesario
                // Por ahora solo logueamos la intención corporativa
                console.log(`🎂 CUMPLEAÑOS DETECTADO: ${agent.name}`);
            }
        }
    } catch (e: any) {
        console.error('Error in checkAndPublishBirthdays:', e.message);
    }
};

/**
 * @description Actualiza las estadísticas tácticas (psicométricas) del agente.
 */
export const updateAgentTacticalStatsSupabase = async (agentId: string, stats: any) => {
    try {
        const { error } = await supabase.from('agentes').update({ tactical_stats: stats }).eq('id', agentId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Deducción porcentual de puntos (Sanción/Expulsión).
 */
export const deductPercentagePointsSupabase = async (agentId: string, percentage: number) => {
    try {
        const { error } = await supabase.rpc('deduct_percentage_points', {
            p_agent_id: agentId,
            p_percentage: percentage
        });
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Reconciliación masiva de XP (basada en asistencia hoy).
 */
export const reconcileXPSupabase = async () => {
    try {
        const { data, error } = await supabase.rpc('reconcile_attendance_xp');
        if (error) throw error;
        return { success: true, count: data.updated_count, updatedNames: data.names || [], foundIds: data.ids || [] };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Obtiene el estado de ascenso de un agente.
 */
export const getPromotionStatusSupabase = async (agentId: string) => {
    try {
        const { data, error } = await supabase.rpc('get_promotion_status', { p_agent_id: agentId });
        if (error) throw error;
        return { success: true, ...data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Asciende a un agente a un nuevo rango.
 */
export const promoteAgentActionSupabase = async (agentId: string, newRank: string) => {
    try {
        const { error } = await supabase.from('agentes').update({ rango: newRank }).eq('id', agentId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Agrega XP a un visitante (Recompensa táctica).
 */
export const addVisitorXPSupabase = async (visitorId: string, visitorName: string, xp: number, reason: string) => {
    try {
        const { error } = await supabase.from('asistencia_visitas').insert({
            nombre: visitorName,
            detalle: `XP Táctica: +${xp} (${reason})`,
            id: visitorId, // Asumiendo que usamos el ID si existe
            created_at: new Date().toISOString()
        });
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Calcula el multiplicador basado en la racha del agente.
 */
export const getStreakMultiplier = (streak: number): number => {
    if (streak >= 14) return 2.0;
    if (streak >= 7) return 1.5;
    if (streak >= 3) return 1.2;
    return 1.0;
};

import { Badge } from '../types';
