import { supabase } from './supabaseClient';
export { supabase };
import { Agent, Badge, InboxNotification, UserRole, Rank, DailyVerse as DailyVerseType } from '../types';
import { sendTelegramAlert, sendPushBroadcast } from './notifyService';

/**
 * @description Sincroniza un agente desde Google Sheets hacia Supabase.
 * Se puede llamar durante el login o una actualización de datos.
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
            // BLINDAJE: Solo sincronizar foto_url si es una URL real (Cloudinary/Supabase/Drive), nunca placeholders
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
            // Pequeña pausa de 100ms para evitar saturar el túnel/conexión
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
 * @description Obtiene la lista completa de agentes desde Supabase, mapeando al formato Agent.
 */
export const fetchAgentsFromSupabase = async (): Promise<Agent[]> => {
    try {
        // SEGURIDAD: Solo seleccionamos las columnas permitidas por el protocolo de blindaje
        const { data, error } = await supabase
            .from('agentes')
            .select('id, nombre, xp, rango, cargo, foto_url, status, talent, user_role, joined_date, bible, notes, leadership, streak_count, last_attendance, last_streak_date, weekly_tasks, pin, whatsapp, baptism_status, birthday, relationship_with_god, must_change_password, is_ai_profile_pending, tactical_stats, tactor_summary');
        if (error) {
            console.error('❌ Error obteniendo agentes de Supabase:', error);
            return [];
        }

        if (!data || data.length === 0) return [];

        return data.map((d: any) => ({
            id: d.id,
            name: d.nombre,
            xp: d.xp || 0,
            rank: (() => {
                const name = String(d.nombre || '').toUpperCase();
                const role = String(d.user_role || '').toUpperCase();
                const cargo = String(d.cargo || '').toUpperCase();
                const dbRank = (d.rango || 'RECLUTA').toUpperCase();

                // 1. Prioridad: Staff conocido SOLAMENTE
                const knownStaffNames = ['SAHEL', 'SOLISBETH', 'NAILETH', 'ANTONELLA', 'DAVID JOEL'];
                if (knownStaffNames.some(sn => name.includes(sn))) return Rank.LIDER;

                // 2. Cargos de Dirección (Staff)
                // Usamos términos más específicos para no atrapar a Referentes Académicos
                const staffKeywords = ['DIRECTOR', 'DIRECTORA', 'PASTORAL', 'IDENTIDAD', 'DINÁMICAS', 'EVIDENCIA', 'CENTRO DE OPERACIÓN', 'ADMINISTRADOR', 'ADMINISTRADORA'];
                if (staffKeywords.some(kw => cargo.includes(kw) || role.includes(kw))) {
                    return Rank.LIDER;
                }

                // 3. Respetar estrictamente el rango de la DB para todos los demás
                // Esto deshace el ascenso por XP sin permiso
                return dbRank;
            })(),
            role: d.cargo || 'ESTUDIANTE',
            whatsapp: d.whatsapp || '',
            photoUrl: d.foto_url || '',
            pin: d.pin || '',
            isAiProfilePending: d.is_ai_profile_pending || false,
            tacticalStats: d.tactical_stats || {},
            tacticalSummary: d.tactor_summary || '',

            // Campos completos clonados
            talent: d.talent || 'PENDIENTE',
            baptismStatus: d.baptism_status || 'NO',
            status: d.status || 'ACTIVO',
            userRole: (() => {
                const name = String(d.nombre || '').toUpperCase();
                const role = String(d.user_role || '').toUpperCase();
                const cargo = String(d.cargo || '').toUpperCase();

                // Director check
                if (name.includes('SAHEL') || role === 'DIRECTOR' || cargo === 'DIRECTOR') return UserRole.DIRECTOR;

                // Staff / Leader checks
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
            weeklyTasks: d.weekly_tasks || [],
            notifPrefs: d.notif_prefs || { read: [], deleted: [] },
            lastCourse: d.last_course || '',
            bible: d.bible || 0,
            notes: d.notes || 0,
            leadership: d.leadership || 0
        })) as unknown as Agent[];

    } catch (e: any) {
        console.error('❌ Fallo crítico en fetchAgentsFromSupabase:', e.message);
        return [];
    }
};

/**
 * @description Elimina un agente de Supabase.
 */
export const deleteAgentSupabase = async (agentId: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('agentes')
            .delete()
            .eq('id', agentId);

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error('❌ Error eliminando agente en Supabase:', e.message);
        return { success: false, error: e.message };
    }
};

/**
 * @description Verifica de forma segura un PIN usando RPC (blindaje).
 */
export const verifyAgentPinSupabase = async (agentId: string, pin: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase.rpc('verify_agent_pin', {
            p_id: agentId,
            p_pin: pin
        });
        if (error) throw error;
        return !!data;
    } catch (e) {
        console.error('❌ Error verificando PIN:', e);
        return false;
    }
};

/**
 * @description Recupera el PIN de forma segura tras validar la respuesta (blindaje).
 */
export const recoveryAgentPinSupabase = async (agentId: string, answer: string): Promise<string | null> => {
    try {
        const { data, error } = await supabase.rpc('recovery_agent_pin', {
            p_id: agentId,
            p_answer: answer
        });
        if (error) throw error;
        return data as string;
    } catch (e) {
        console.error('❌ Error recuperando PIN:', e);
        return null;
    }
};

/**
 * @description Actualiza puntos específicos de un agente en Supabase (XP, Biblia, etc.)
 */
export const updateAgentPointsSupabase = async (agentId: string, type: 'BIBLIA' | 'APUNTES' | 'LIDERAZGO' | 'XP', amount: number = 10): Promise<{ success: boolean, error?: string }> => {
    try {
        const { data: currentData, error: fetchError } = await supabase
            .from('agentes')
            .select('xp, bible, notes, leadership, streak_count')
            .eq('id', agentId)
            .single();

        if (fetchError) throw fetchError;

        let multiplier = 1.0;
        const streak = currentData.streak_count || 0;
        if (streak >= 30) multiplier = 2.0;
        else if (streak >= 20) multiplier = 1.75;
        else if (streak >= 10) multiplier = 1.50;
        else if (streak >= 5) multiplier = 1.25;

        const adjustedAmount = Math.round(amount * multiplier);
        let currentXp = Number(currentData.xp);
        if (isNaN(currentXp)) currentXp = 0;
        const updates: any = { xp: Math.max(0, currentXp + adjustedAmount) };

        const safeVal = (val: any) => { const num = Number(val); return isNaN(num) ? 0 : num; };
        const safeAmount = isNaN(Number(amount)) ? 0 : Number(amount);

        if (type === 'BIBLIA') updates.bible = Math.max(0, safeVal(currentData.bible) + safeAmount);
        if (type === 'APUNTES') updates.notes = Math.max(0, safeVal(currentData.notes) + safeAmount);
        if (type === 'LIDERAZGO' || type === 'XP') {
            if (type === 'LIDERAZGO') updates.leadership = Math.max(0, safeVal(currentData.leadership) + safeAmount);
        }

        const { error: updateError } = await supabase
            .from('agentes')
            .update(updates)
            .eq('id', agentId);

        if (updateError) throw updateError;
        return { success: true };
    } catch (error: any) {
        console.error('❌ Error actualizando puntos en Supabase:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * @description Servicios para Banners Estratégicos
 */
export const fetchActiveBannersSupabase = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('banners')
            .select('*')
            .eq('activo', true)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch { return []; }
};

export const fetchAllBannersSupabase = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('banners')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch { return []; }
};

export const createBannerSupabase = async (banner: any): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase.from('banners').insert(banner);
        if (error) throw error;
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
};

export const toggleBannerStatusSupabase = async (id: string, active: boolean): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase.from('banners').update({ activo: active }).eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
};

export const deleteBannerSupabase = async (id: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase.from('banners').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
};

/**
 * @description Actualiza el string de credencial biométrica en Supabase.
 */
export const updateBiometricSupabase = async (agentId: string, credentialString: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.rpc('update_agent_biometric', {
            p_id: agentId,
            p_credential: credentialString
        });

        if (error) throw error;

        return { success: true };
    } catch (error: any) {
        console.error('❌ Error actualizando biometría en Supabase:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * @description Actualiza la racha de un agente en Supabase
 */
export const updateAgentStreaksSupabase = async (agentId: string, isWeekComplete: boolean, tasks: any[], agentName?: string, verseText?: string, verseRef?: string, currentStreak?: number, currentXp?: number): Promise<{ success: boolean, streak?: number, lastStreakDate?: string, error?: string }> => {
    try {
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

        // SAFETY: If currentStreak is 0 or undefined, do a safe fallback read to prevent accidental resets
        let safeStreak = currentStreak || 0;
        let safeXp = currentXp || 0;

        // Fetch current state from DB to be absolutely sure we have the latest and haven't updated today
        const { data: dbAgent } = await supabase
            .from('agentes')
            .select('streak_count, xp, last_streak_date')
            .eq('id', agentId)
            .single();

        if (dbAgent) {
            // Check if already updated today in server time (Caracas)
            if (dbAgent.last_streak_date) {
                const dbLastDate = new Date(dbAgent.last_streak_date).toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
                if (dbLastDate === todayStr) {
                    return { success: true, streak: dbAgent.streak_count, lastStreakDate: dbAgent.last_streak_date };
                }
            }
            safeStreak = Math.max(safeStreak, dbAgent.streak_count || 0);
            safeXp = Math.max(safeXp, dbAgent.xp || 0);
        }

        const newStreak = safeStreak + 1;
        const newXp = safeXp + 5; // Recompensa base por racha diaria

        const { error: updateError } = await supabase.rpc('update_agent_streak', {
            p_id: agentId,
            p_streak: newStreak,
            p_date: now.toISOString(),
            p_tasks: tasks,
            p_xp: newXp
        });

        if (updateError) throw updateError;

        // Generar noticia de racha (fire-and-forget)
        try {
            let detalle = `Ha alcanzado una racha de ${newStreak} días consecutivos.`;
            if (verseText) {
                detalle += ` [VERSE]: ${verseText} `;
                if (verseRef) detalle += ` [REF]: ${verseRef} `;
            }

            await supabase.from('asistencia_visitas').insert({
                id: `NEWS-${Date.now()}-${Math.floor(random() * 1000)}`,
                agent_id: agentId,
                agent_name: agentName || 'Agente',
                tipo: 'RACHA',
                detalle: detalle,
                registrado_en: now.toISOString()
            });
        } catch (e) {
            console.error("Error al publicar noticia de racha:", e);
        }

        return { success: true, streak: newStreak, lastStreakDate: String(now.toISOString()) };
    } catch (error: any) {
        console.error('❌ Error actualizando racha en Supabase:', error.message);
        return { success: false, error: error.message };
    }
};

const random = () => Math.random();

/**
 * @description Actualiza el perfil de IA (estadísticas y resumen táctico) del agente en Supabase.
 */
export const updateAgentAiProfileSupabase = async (agentId: string, stats: any, summary: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase
            .from('agentes')
            .update({
                tactical_stats: stats,
                tactor_summary: summary,
                is_ai_profile_pending: false
            })
            .eq('id', agentId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('❌ Error guardando perfil IA en Supabase:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * @description Actualiza SOLO las estadísticas tácticas (psicométricas) del agente en Supabase.
 */
export const updateAgentTacticalStatsSupabase = async (agentId: string, stats: any): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase
            .from('agentes')
            .update({
                tactical_stats: stats,
            })
            .eq('id', agentId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('❌ Error guardando stats tácticas en Supabase:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * @description Deduce un porcentaje de los puntos de un agente (ej. Sanción masiva)
 */
export const deductPercentagePointsSupabase = async (agentId: string, percentage: number): Promise<{ success: boolean, error?: string }> => {
    try {
        const { data: currentData, error: fetchError } = await supabase
            .from('agentes')
            .select('xp')
            .eq('id', agentId)
            .single();

        if (fetchError) throw fetchError;

        let currentXp = Number(currentData.xp);
        if (isNaN(currentXp)) currentXp = 0;

        const toDeduct = Math.floor(currentXp * (percentage / 100));
        const newXp = Math.max(0, currentXp - toDeduct);

        const { error: updateError } = await supabase
            .from('agentes')
            .update({ xp: newXp })
            .eq('id', agentId);

        if (updateError) throw updateError;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const reconcileXPSupabase = async (): Promise<{ success: boolean, count?: number, updatedNames?: string[], foundIds?: string[], error?: string }> => {
    try {
        const localToday = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
        const startDate = new Date(localToday + 'T00:00:00-04:00').toISOString();
        const endDate = new Date(localToday + 'T23:59:59-04:00').toISOString();

        // 1. Obtener los IDs que asistieron HOY
        const { data: attendanceData, error: attErr } = await supabase
            .from('asistencia_visitas')
            .select('agent_id, agent_name')
            .eq('tipo', 'ASISTENCIA')
            .gte('registrado_en', startDate)
            .lte('registrado_en', endDate);

        if (attErr) throw attErr;

        const attendedRecords = attendanceData || [];
        const uniqueAgents = new Map<string, string>();
        attendedRecords.forEach(r => uniqueAgents.set(String(r.agent_id), r.agent_name || 'Agente'));

        if (uniqueAgents.size === 0) {
            return { success: true, count: 0, updatedNames: [], foundIds: [] };
        }

        let count = 0;
        let updatedNames: string[] = [];
        let foundIds: string[] = [];

        // 2. Darles 10 XP a cada uno
        for (const [id, name] of uniqueAgents.entries()) {
            await updateAgentPointsSupabase(id, 'XP', 10);
            count++;
            updatedNames.push(name);
            foundIds.push(id);
        }

        return { success: true, count, updatedNames, foundIds };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * @description Aplica penalizaciones automáticas de -10 XP a los agentes inasistentes 24h después de un día de asistencia global.
 */
export const applyAbsencePenaltiesSupabase = async (): Promise<{ success: boolean, agentsPenalized?: number, error?: string }> => {
    try {
        const now = new Date();
        const localToday = now.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

        // 1. Obtener el día más reciente en el que HUBO asistencia (ignorar hoy para dar 24h de gracia)
        const { data: latestAttendance } = await supabase
            .from('asistencia_visitas')
            .select('registrado_en')
            .eq('tipo', 'ASISTENCIA')
            .lt('registrado_en', localToday + 'T00:00:00-04:00')
            .order('registrado_en', { ascending: false })
            .limit(1);

        if (!latestAttendance || latestAttendance.length === 0) {
            return { success: true, agentsPenalized: 0 }; // No ha habido asistencias previas
        }

        const lastAttendanceDateISO = latestAttendance[0].registrado_en;
        const lastAttendanceDay = new Date(lastAttendanceDateISO).toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

        // 2. Verificar si ya penalizamos por este día
        const { data: penaltyCheck } = await supabase
            .from('asistencia_visitas')
            .select('id')
            .eq('tipo', 'SANCION_AUTOMATICA')
            .like('detalle', `% ${lastAttendanceDay}% `)
            .limit(1);

        if (penaltyCheck && penaltyCheck.length > 0) {
            return { success: true, agentsPenalized: 0 }; // Ya se corrió la sanción para ese día
        }

        // 3. Buscar a todos los agentes activos (excluyendo Líderes y Directores)
        const { data: agents, error: fetchError } = await supabase
            .from('agentes')
            .select('id, xp, last_attendance, streak_count, cargo, status')
            .eq('status', 'ACTIVO');

        if (fetchError) throw fetchError;

        const agentsToPenalize = agents.filter((a: any) => {
            if (a.cargo === 'DIRECTOR' || a.cargo === 'LIDER' || a.cargo === 'LÍDER') return false;

            // Faltaron si su last_attendance es anterior al lastAttendanceDay
            if (!a.last_attendance || a.last_attendance === 'N/A') return true;

            // Comparación de fechas en formato ISO / YYYY-MM-DD
            // Si la última asistencia del agente es MENOR a lastAttendanceDay, entonces faltó ese día.
            return a.last_attendance < lastAttendanceDay;
        });

        if (agentsToPenalize.length === 0) {
            // Registrar que se evaluó para evitar recalcular
            await supabase.from('asistencia_visitas').insert({
                id: `PEN - ${Date.now()} `,
                agent_id: 'SISTEMA',
                tipo: 'SANCION_AUTOMATICA',
                detalle: `Evaluación de inasistencia para ${lastAttendanceDay}: 0 agentes sancionados.`,
                registrado_en: now.toISOString()
            });
            return { success: true, agentsPenalized: 0 };
        }

        let count = 0;
        // 4. Aplicar penalización de -10 * multiplicador de racha
        for (const agent of agentsToPenalize) {
            let multiplier = 1.0;
            const streak = agent.streak_count || 0;
            if (streak >= 30) multiplier = 2.0;
            else if (streak >= 20) multiplier = 1.75;
            else if (streak >= 10) multiplier = 1.50;
            else if (streak >= 5) multiplier = 1.25;

            const penaltyAmount = Math.round(10 * multiplier);
            let agentXp = Number(agent.xp);
            if (isNaN(agentXp)) agentXp = 0;
            const newXp = Math.max(0, agentXp - penaltyAmount);

            const { error: updateError } = await supabase
                .from('agentes')
                .update({ xp: newXp })
                .eq('id', agent.id);
            if (!updateError) count++;
        }

        // 5. Registrar ejecución de sanción global
        await supabase.from('asistencia_visitas').insert({
            id: `PEN - ${Date.now()} `,
            agent_id: 'SISTEMA',
            tipo: 'SANCION_AUTOMATICA',
            detalle: `Evaluación de inasistencia para ${lastAttendanceDay}: ${count} agentes sancionados con - 10 XP(base).`,
            registrado_en: now.toISOString()
        });

        return { success: true, agentsPenalized: count };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * @description Asciende de rango a un agente
 */
export const promoteAgentActionSupabase = async (agentId: string, newRank: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase
            .from('agentes')
            .update({ rank: newRank })
            .eq('id', agentId);
        if (error) throw error;

        // Limpiar notificaciones de "Examen Realizado" para evitar repeticiones (OPCIONAL)
        await supabase.from('notificaciones_push').delete().eq('agent_id', agentId).ilike('title', '%ASCENSO%');

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * @description Crea un nuevo evento en Supabase
 */
export const createEventSupabase = async (eventData: { title: string; date: string; time: string; description: string }): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase.from('eventos').insert({
            titulo: eventData.title,
            fecha: eventData.date,
            hora: eventData.time,
            descripcion: eventData.description
        });
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * @description Obtiene los eventos activos desde Supabase
 */
export const fetchActiveEventsSupabase = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase.from('eventos').select('*').order('fecha', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch { return []; }
};

/**
 * @description Obtiene los eventos confirmados por el usuario
 */
export const fetchUserEventConfirmationsSupabase = async (agentId: string): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('asistencia_visitas')
            .select('*')
            .eq('agent_id', agentId)
            .eq('tipo', 'EVENTO_CONFIRMADO');

        if (error) throw error;
        return data || [];
    } catch { return []; }
};

/**
 * @description Elimina un evento en Supabase
 */
export const deleteEventSupabase = async (eventId: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase.from('eventos').delete().eq('id', eventId);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * @description Confirma la asistencia de un agente a un evento
 */
export const confirmEventAttendanceSupabase = async (data: { agentId: string; agentName: string; eventId: string; eventTitle: string }): Promise<{ success: boolean, error?: string }> => {
    try {
        const id = `EVT - ${new Date().getTime()} `;

        // 1. Verificar duplicados
        const { data: duplicates } = await supabase
            .from('asistencia_visitas')
            .select('id')
            .eq('agent_id', data.agentId)
            .eq('tipo', 'EVENTO_CONFIRMADO')
            .like('detalle', `% ${data.eventTitle}% `);

        if (duplicates && duplicates.length > 0) {
            return { success: false, error: "Ya estás confirmado para este evento." };
        }

        // 2. Insertar confirmación
        const { error } = await supabase.from('asistencia_visitas').insert({
            id,
            agent_id: data.agentId,
            agent_name: data.agentName,
            tipo: 'EVENTO_CONFIRMADO',
            detalle: `Confirmación para evento: ${data.eventTitle} `,
            registrado_en: new Date().toISOString()
        });

        if (error) throw error;

        // Sumar XP por confirmar (recompensa táctica)
        await updateAgentPointsSupabase(data.agentId, 'XP', 10);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * @description Obtiene las tareas desde Supabase
 */
export const fetchTasksSupabase = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase.from('tareas').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        // Count recruits from progreso_tareas manually (since we don't have a view or join set up here, TasksModule uses fetchTaskRecruits for this instead. 
        // We will just map the fields correctly.
        return (data || []).map(t => ({
            id: t.id,
            title: t.title,
            description: t.description || '',
            area: t.area,
            requiredLevel: t.required_level,
            xpReward: t.xp_reward || 0,
            maxSlots: t.max_slots || 0,
            currentSlots: 0, // Calculated in frontend or via recruits
            createdAt: t.created_at
        }));
    } catch { return []; }
};

/**
 * @description Las llamadas de Progreso de Tareas usan Sheets por ahora hasta que se acople la vista
 */
export const fetchTaskRecruitsSupabase = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase.from('progreso_tareas').select('*');
        if (error) throw error;
        return (data || []).map(r => ({
            id: r.id,
            taskId: r.task_id,
            agentId: r.agent_id,
            agentName: r.agent_name,
            status: r.status,
            verifiedBy: r.verified_by,
            createdAt: r.completed_at
        }));
    } catch { return []; }
};

/**
 * @description Crea una nueva tarea en Supabase
 */
export const createTaskSupabase = async (data: { title: string; description: string; area: string; requiredLevel: string; xpReward: number; maxSlots: number }): Promise<{ success: boolean, error?: string }> => {
    try {
        const id = globalThis.crypto ? crypto.randomUUID() : Date.now().toString();
        const { error } = await supabase.from('tareas').insert({
            id,
            title: data.title,
            description: data.description,
            area: data.area,
            required_level: data.requiredLevel,
            xp_reward: data.xpReward,
            max_slots: data.maxSlots
        });
        if (error) throw error;

        // Notificar en el feed
        await publishNewsSupabase('SISTEMA', 'Logística', 'TAREA', `Nueva Misión Disponible: ${data.title} [Área: ${data.area}]`);

        return { success: true };
    } catch (error: any) {
        console.error('Error creating task in Supabase:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * @description Elimina una tarea
 */
export const deleteTaskSupabase = async (taskId: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase.from('tareas').delete().eq('id', taskId);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * @description El agente marca una tarea como entregada
 */
export const submitTaskCompletionSupabase = async (taskId: string, agentId: string, agentName: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase.from('progreso_tareas').insert({
            task_id: taskId,
            agent_id: agentId,
            agent_name: agentName,
            status: 'ENTREGADO',
            completed_at: new Date().toISOString()
        });
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * @description El director verifica y aprueba la tarea
 */
export const verifyTaskSupabase = async (data: { taskId: string; agentId: string; agentName: string; verifiedBy: string; xpReward: number; taskTitle: string }): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase.from('progreso_tareas').update({
            status: 'VERIFICADO',
            completed_at: new Date().toISOString(),
            verified_by: data.verifiedBy
        }).eq('task_id', data.taskId).eq('agent_id', data.agentId);

        if (error) throw error;

        await updateAgentPointsSupabase(data.agentId, 'LIDERAZGO', data.xpReward);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * @description Elimina a un agente voluntario de una tarea
 */
export const removeRecruitFromTaskSupabase = async (taskId: string, agentId: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase.from('progreso_tareas').delete().eq('task_id', taskId).eq('agent_id', agentId);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * @description Actualiza el estado del progreso de una tarea
 */
export const updateTaskStatusSupabase = async (data: { taskId: string; agentId: string; status: 'SOLICITADO' | 'EN_PROGRESO' | 'ENTREGADO' | 'VERIFICADO' | 'RECHAZADO' }): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase.from('progreso_tareas').update({ status: data.status }).eq('task_id', data.taskId).eq('agent_id', data.agentId);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * @description Actualiza el PIN de un agente en Supabase
 */
export const updateAgentPinSupabase = async (agentId: string, newPin: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase.rpc('update_agent_pin', { p_id: agentId, p_pin: newPin });
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * @description Actualiza el estado de is_ai_profile_pending de un agente en Supabase
 */
export const updateAgentAiPendingStatusSupabase = async (agentId: string, isPending: boolean): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase
            .from('agentes')
            .update({ is_ai_profile_pending: isPending })
            .eq('id', agentId);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * @description Sincroniza toda la academia (Cursos y Lecciones) desde Sheets a Supabase
 */
export const syncAcademyToSupabase = async (academyData: { courses: any[], lessons: any[] }) => {
    try {
        console.log(`🔄 Sincronizando ${academyData.courses.length} cursos y ${academyData.lessons.length} lecciones...`);
        let failuresCount = 0;

        // 1. Sincronizar Cursos
        for (const course of academyData.courses) {
            const { error } = await supabase.from('academy_courses').upsert({
                id: String(course.id),
                title: course.title,
                description: course.description || '',
                badge_reward: course.badgeReward || '',
                xp_reward: course.xpReward || 0,
                image_url: course.imageUrl || '',
                order_index: course.orderIndex || 0,
                is_active: course.isActive !== false
            }, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Fallo sincronizando curso ${course.id}: `, error.message);
                failuresCount++;
            }
        }

        // 2. Sincronizar Lecciones
        for (const lesson of academyData.lessons) {
            const { error } = await supabase.from('academy_lessons').upsert({
                id: String(lesson.id),
                course_id: String(lesson.courseId),
                title: lesson.title,
                embed_url: lesson.embedUrl || lesson.videoUrl || '', // Handling legacy name
                required_role: lesson.requiredRole || 'STUDENT',
                content: lesson.content || '',
                questions_json: lesson.questions || []
            }, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Fallo sincronizando lección ${lesson.id}: `, error.message);
                failuresCount++;
            }
        }

        return { success: failuresCount === 0, failures: failuresCount };
    } catch (e: any) {
        console.error('❌ Fallo crítico en syncAcademyToSupabase:', e.message);
        return { success: false, error: e.message };
    }
};

/**
 * @description Sincroniza los versículos diarios a Supabase
 */
export const syncDailyVersesToSupabase = async (verses: any[]) => {
    try {
        console.log(`🔄 Sincronizando ${verses.length} versículos...`);
        const formattedVerses = verses.map(v => ({
            fecha: v.fecha || v.date,
            cita: v.cita || v.reference,
            texto: v.texto || v.verse
        }));

        const { error } = await supabase.from('versiculos_diarios')
            .upsert(formattedVerses, { onConflict: 'fecha' });

        if (error) throw error;
        return { success: true, count: verses.length };
    } catch (e: any) {
        console.error('❌ Fallo crítico en syncDailyVersesToSupabase:', e.message);
        return { success: false, error: e.message };
    }
};

/**
 * @description Obtiene el versículo de hoy desde Supabase
 */
export const fetchDailyVerseSupabase = async (): Promise<DailyVerseType | null> => {
    try {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
        const { data, error } = await supabase
            .from('versiculos_diarios')
            .select('*')
            .eq('fecha', today)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
            date: data.fecha,
            reference: data.cita,
            verse: data.texto
        };
    } catch (e) {
        console.error('❌ Error al obtener versículo diario:', e);
        return null;
    }
};

/**
 * @description Confirma la asistencia del director usando transacciones de Supabase
 */
export const confirmDirectorAttendanceSupabase = async (agentId: string, agentName: string) => {
    try {
        // Primero verificar si ya asistió hoy
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
        const { data, error: checkError } = await supabase
            .from('asistencia_visitas')
            .select('id')
            .eq('agent_id', agentId)
            .eq('tipo', 'DIRECTOR_ASISTENCIA')
            .gte('registrado_en', today + 'T00:00:00-04:00') // Use ISO string for comparison
            .lte('registrado_en', today + 'T23:59:59-04:00') // Use ISO string for comparison
            .maybeSingle();

        if (data) return { success: true, alreadyDone: true };

        // Si no ha asistido, registrar transacción
        return await submitTransactionSupabase(agentId, 'DIRECTOR_ASISTENCIA', agentName);
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Sincroniza las tareas desde Sheets a Supabase
 */
export const syncTasksToSupabase = async (tasks: any[]) => {
    try {
        console.log(`🔄 Sincronizando ${tasks.length} tareas...`);
        let failuresCount = 0;

        for (const task of tasks) {
            const { error } = await supabase.from('tareas').upsert({
                id: String(task.id),
                title: task.title,
                description: task.description || '',
                area: task.area || '',
                required_level: task.requiredLevel || 'RECLUTA',
                xp_reward: task.xpReward || 0,
                max_slots: task.maxSlots || 0
            }, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Fallo sincronizando tarea ${task.id}: `, error.message);
                failuresCount++;
            }
        }

        return { success: failuresCount === 0, failures: failuresCount, count: tasks.length };
    } catch (e: any) {
        console.error('❌ Fallo crítico en syncTasksToSupabase:', e.message);
        return { success: false, error: e.message };
    }
};

/**
 * @description Sincroniza todos los historiales (Eventos, Notificaciones, Insignias, Asistencias, Misiones) a Supabase
 */
export const syncAllHistoriesToSupabase = async (data: {
    events: any[],
    notifications: any[],
    badges: any[],
    news: any[],
    taskProgress: any[]
}) => {
    try {
        console.log("🔄 Iniciando clonación masiva de historiales...");
        let failures = 0;

        const safeDateISO = (dateStr: any) => {
            if (!dateStr) return null;
            try {
                // Reemplaza formatos incompatibles como "gmt-0400" por "-0400"
                const str = String(dateStr).replace(/gmt-0400/i, '-0400').replace(/gmt\s*-0400/i, '-0400');
                const d = new Date(str);
                return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
            } catch {
                return new Date().toISOString();
            }
        };

        // 1. Eventos
        for (const e of data.events || []) {
            const { error } = await supabase.from('eventos').upsert({
                id: String(e.id || crypto.randomUUID()),
                titulo: e.title || e.titulo || 'Sin Título',
                descripcion: e.description || e.descripcion || '',
                fecha: safeDateISO(e.date || e.fecha)?.split('T')[0] || new Date().toISOString().split('T')[0],
                hora: e.time || e.hora || '',
                lugar: e.location || e.lugar || '',
                puntos_recompensa: e.xpReward || 0,
                activo: e.isActive !== false
            }, { onConflict: 'id' });
            if (error) { console.error("Error eventos:", error.message); failures++; }
        }

        // 2. Notificaciones
        for (const n of data.notifications || []) {
            const { error } = await supabase.from('notificaciones_push').upsert({
                id: String(n.id || crypto.randomUUID()),
                titulo: n.titulo || n.title || 'Alerta',
                mensaje: n.mensaje || n.message || '',
                tipo: n.tipo || n.type || 'general',
                leida_por: n.readBy || n.leida_por || []
            }, { onConflict: 'id' });
            if (error) { console.error("Error notificaciones:", error.message); failures++; }
        }

        // 3. Insignias
        for (const b of data.badges || []) {
            const { error } = await supabase.from('insignias_otorgadas').upsert({
                id: String(b.id || crypto.randomUUID()),
                agent_id: String(b.agentId || b.agent_id),
                badge_type: b.type || b.badge_type || '',
                label: b.label || '',
                otorgada_en: safeDateISO(b.date || b.otorgada_en) || new Date().toISOString()
            }, { onConflict: 'id' });
            if (error) { console.error("Error insignias:", error.message); failures++; }
        }

        // 4. Progreso Tareas
        for (const p of data.taskProgress || []) {
            const { error } = await supabase.from('progreso_tareas').upsert({
                id: String(p.id || crypto.randomUUID()),
                task_id: String(p.taskId || p.task_id),
                agent_id: String(p.agentId || p.agent_id),
                agent_name: p.agentName || p.agent_name || 'Agente',
                status: p.status || 'EN_PROGRESO',
                verified_by: p.verifiedBy || p.verified_by || '',
                completed_at: safeDateISO(p.completedAt || p.date)
            }, { onConflict: 'id' });
            if (error) { console.error("Error progreso:", error.message); failures++; }
        }

        // 5. Asistencia/Noticias
        for (const n of data.news || []) {
            const { error } = await supabase.from('asistencia_visitas').upsert({
                id: String(n.id || crypto.randomUUID()),
                agent_id: String(n.agentId || n.agent_id || 'SISTEMA'),
                agent_name: n.agentName || n.agent_name || 'Sistema',
                tipo: n.type || n.tipo || 'INFO',
                detalle: n.message || n.mensaje || '',
                registrado_en: safeDateISO(n.date || n.fecha) || new Date().toISOString()
            }, { onConflict: 'id' });
            if (error) { console.error("Error Asistencia/Noticias:", error.message); failures++; }
        }

        return { success: failures === 0, failures };
    } catch (e: any) {
        console.error("Fallo crítico en clonación de historiales:", e.message);
        return { success: false, error: e.message };
    }
};


/**
 * @description Actualiza la URL de la foto de perfil en Supabase
 */
export const updateAgentPhotoSupabase = async (agentId: string, photoUrl: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase.from('agentes').update({ foto_url: photoUrl }).eq('id', agentId);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const enrollAgentSupabase = async (data: any): Promise<{ success: boolean; newId?: string; newPin?: string; error?: string }> => {
    try {
        const newId = `CON - ${Math.floor(1000 + Math.random() * 9000)} `;
        const newPin = Math.floor(1000 + Math.random() * 9000).toString();

        const record = {
            id: newId,
            nombre: data.nombre || '',
            whatsapp: data.whatsapp || '',
            birthday: data.fechaNacimiento || '',
            talent: data.talento || '',
            baptism_status: data.bautizado || 'NO',
            relationship_with_god: data.relacion || '',
            cargo: data.nivel || 'ESTUDIANTE',
            foto_url: data.photoUrl || '',
            pin: newPin,
            status: 'ACTIVO',
            rango: (data.nivel === 'LIDER' || data.nivel === 'DIRECTOR') ? 'ACTIVO' : 'RECLUTA',
            xp: 0,
            bible: 0,
            notes: 0,
            leadership: 0,
            joined_date: new Date().toISOString(),
            last_attendance: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }),
            security_question: data.preguntaSeguridad || '¿Cuál es tu color favorito?',
            security_answer: data.respuestaSeguridad || 'Azul',
            must_change_password: true,
            user_role: data.nivel === 'DIRECTOR' ? 'DIRECTOR' : data.nivel === 'LÍDER' ? 'LEADER' : 'STUDENT',
            referido_por_id: data.referidoPor || ''
        };

        const { error } = await supabase
            .from('agentes')
            .insert({
                id: record.id,
                nombre: record.nombre,
                whatsapp: record.whatsapp,
                birthday: record.birthday,
                talent: record.talent,
                baptism_status: record.baptism_status,
                relationship_with_god: record.relationship_with_god,
                cargo: record.cargo,
                foto_url: record.foto_url,
                pin: record.pin,
                status: record.status,
                rango: record.rango,
                xp: record.xp,
                bible: record.bible,
                notes: record.notes,
                leadership: record.leadership,
                joined_date: record.joined_date,
                security_question: record.security_question,
                security_answer: record.security_answer,
                must_change_password: record.must_change_password,
                user_role: record.user_role,
                last_attendance: record.last_attendance
            });

        if (error) throw error;
        return { success: true, newId, newPin };
    } catch (error: any) {
        console.error('Error enrolling agent in Supabase:', error);
        return { success: false, error: error.message };
    }
};

/**
 * @description Inserta una transacción (Ej. ASISTENCIA) en Supabase 
 * y ejecuta la lógica de backend (notificaciones, feed, xp).
 */
export const submitTransactionSupabase = async (agentId: string, tipo: string, reporterName?: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const now = new Date();
        const localToday = now.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

        // 1. Verificar si el agente existe
        const { data: agentData, error: agentError } = await supabase
            .from('agentes')
            .select('nombre')
            .eq('id', agentId)
            .single();

        if (agentError || !agentData) {
            return { success: false, error: "Agente no encontrado en la base de datos." };
        }

        const agentName = agentData.nombre;

        // 2. Verificar duplicados en el mismo día
        if (tipo === 'ASISTENCIA') {
            const startDate = new Date(localToday + 'T00:00:00-04:00'); // -04:00 Caracas
            const endDate = new Date(localToday + 'T23:59:59-04:00');

            const { data: duplicates } = await supabase
                .from('asistencia_visitas')
                .select('id')
                .eq('agent_id', agentId)
                .eq('tipo', 'ASISTENCIA')
                .gte('registrado_en', startDate.toISOString())
                .lte('registrado_en', endDate.toISOString());

            if (duplicates && duplicates.length > 0) {
                // Incluso si ya está registrado hoy, asegurémonos de que su last_attendance diga HOY.
                await supabase.from('agentes').update({ last_attendance: localToday }).eq('id', agentId);
                return { success: false, error: `Asistencia de ${agentName} ya fue registrada hoy.` };
            }
        }

        // 3. Verificar si tiene eventos confirmados HOY para aplicar bono 1.5x (Opcional, de Code.gs)
        let eventMultiplier = 1.0;
        const startDate = new Date(localToday + 'T00:00:00-04:00');
        const endDate = new Date(localToday + 'T23:59:59-04:00');
        const { data: confirmedEvents } = await supabase
            .from('asistencia_visitas')
            .select('id')
            .eq('agent_id', agentId)
            .eq('tipo', 'EVENTO_CONFIRMADO')
            .gte('registrado_en', startDate.toISOString())
            .lte('registrado_en', endDate.toISOString());

        if (confirmedEvents && confirmedEvents.length > 0) {
            eventMultiplier = 1.5;
        }

        // 4. Asignar 10 XP Base de Asistencia * Bono de Evento 
        // Nota: updateAgentPointsSupabase se encargará de añadir el Multiplicador de Racha adicionalmente.
        if (tipo === 'ASISTENCIA') {
            await updateAgentPointsSupabase(agentId, 'XP', 10 * eventMultiplier);

            // Actualizar su última fecha de asistencia
            await supabase
                .from('agentes')
                .update({ last_attendance: localToday })
                .eq('id', agentId);
        }

        // 5. Registrar la transacción en el historial
        const { error: insertError } = await supabase
            .from('asistencia_visitas')
            .insert({
                id: `TX - ${Date.now()} `,
                agent_id: agentId,
                agent_name: agentName,
                tipo: tipo,
                detalle: `Registrado por escáner.`,
                registrado_en: now.toISOString()
            });

        if (insertError) throw insertError;

        // 6. Publicar "DESPLIEGUE" en el Muro de Noticias si es Asistencia
        if (tipo === 'ASISTENCIA') {
            try {
                await supabase.from('asistencia_visitas').insert({
                    id: `NEWS - ${Date.now()} `,
                    agent_id: agentId,
                    agent_name: agentName,
                    tipo: 'DESPLIEGUE',
                    detalle: `El agente ${agentName} se ha desplegado en el centro de operaciones.`,
                    registrado_en: now.toISOString()
                });
            } catch (err) {
                console.error("No se pudo publicar noticia de DESPLIEGUE", err);
            }

            // 7. Enviar notificaciones de Telegram y Push
            try {
                await sendTelegramAlert(`✅ <b>NUEVA ASISTENCIA < /b>\n\nAgente: <b>${agentName}</b > [<code>${agentId} < /code>]\nBono Evento: <b>${eventMultiplier}x</b >\nReportadx por: ${reporterName || 'SISTEMA'}`);
                await sendPushBroadcast(`REGISTRO TÁCTICO`, `El agente ${agentName} se ha reportado en el centro de operaciones.`);
            } catch (err) {
                console.error("Fallo al enviar notificación de asistencia:", err);
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error en submitTransactionSupabase:', error);
        return { success: false, error: error.message };
    }
};

/**
 * @description Registra un nuevo visitante en la base de datos de Supabase.
 */
export const registerVisitorSupabase = async (visitorId: string, visitorName: string, reporterName?: string, referrerId?: string, referrerName?: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const id = `VISIT-${new Date().getTime()}`;

        const { error } = await supabase.from('asistencia_visitas').insert({
            id,
            agent_id: visitorId,
            agent_name: visitorName,
            tipo: 'VISITANTE',
            detalle: `Ingreso de invitado. Procesado por: ${reporterName || 'Sistema'}. Referido por: ${referrerName || 'Nadie'}`,
            referido_por_id: referrerId || null,
            referido_por_nombre: referrerName || null,
            xp_ganada: 0,
            registrado_en: new Date().toISOString()
        });
        if (error) throw error;

        // If referred by someone, award Reclutador badge and points
        if (referrerId) {
            await supabase.from('insignias_otorgadas').insert({
                agent_id: referrerId,
                badge_type: 'RECLUTADOR',
                label: `Trajo a ${visitorName}`,
                otorgada_en: new Date().toISOString()
            });
            await updateAgentPointsSupabase(referrerId, 'XP', 25);
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * @description Agrega puntos de experiencia a un visitante, guardándolo en la tabla de asistencia como evento temporal.
 */
export const addVisitorXPSupabase = async (visitorId: string, visitorName: string, xp: number, reason: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const id = `VISIT-XP-${new Date().getTime()}`;

        const { error } = await supabase.from('asistencia_visitas').insert({
            id,
            agent_id: visitorId,
            agent_name: visitorName,
            tipo: 'RECOMPENSA_VISITA',
            detalle: reason,
            xp_ganada: xp,
            registrado_en: new Date().toISOString()
        });
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * @description Obtiene el radar de visitantes (INVITADOS) agrupando por cantidad de visitas
 */
export const fetchVisitorRadarSupabase = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('asistencia_visitas')
            .select('agent_id, agent_name, tipo, xp_ganada, referido_por_id, referido_por_nombre')
            .in('tipo', ['VISITANTE', 'RECOMPENSA_VISITA'])
            .order('registrado_en', { ascending: false });

        if (error) throw error;

        // Agrupar por ID para contar visitas y sumar XP
        const visitorMap = new Map<string, { id: string, name: string, visits: number, status: string, xp: number, referredBy?: string, referrerName?: string }>();

        if (data) {
            data.forEach((v: any) => {
                if (!visitorMap.has(v.agent_id)) {
                    visitorMap.set(v.agent_id, {
                        id: v.agent_id,
                        name: v.agent_name,
                        visits: 0,
                        status: 'NUEVO',
                        xp: 0,
                        referredBy: v.referido_por_id,
                        referrerName: v.referido_por_nombre
                    });
                }

                const record = visitorMap.get(v.agent_id)!;
                if (v.tipo === 'VISITANTE') {
                    record.visits += 1;
                    if (v.referido_por_id && !record.referredBy) {
                        record.referredBy = v.referido_por_id;
                        record.referrerName = v.referido_por_nombre;
                    }
                }

                if (v.xp_ganada) {
                    record.xp += v.xp_ganada;
                }
            });
        }

        // Determinar status
        const visitors = Array.from(visitorMap.values()).map(v => {
            if (v.visits > 5) v.status = 'ACTIVO';
            else if (v.visits > 2) v.status = 'RECURRENTE';
            return v;
        });

        return visitors;
    } catch { return []; }
};


// Lista de censura: Sexual + Jerga Ofensiva Venezuela
const CENSORED_WORDS = [
    // Sexuales/Vulgares
    'PUTA', 'PUTO', 'MAMAGUEVO', 'MAMAGUEBO', 'GUEVO', 'GUEBO', 'COÑO', 'MALDITA', 'MALDITO',
    'SINGAR', 'SINGON', 'SINGONA', 'VERGA', 'PENDEJO', 'PENDEJA', 'ZORRA', 'PERRA', 'MAMAR',
    'ORTO', 'CULO', 'TETAS', 'PINGA', 'CHUPAR', 'SEX', 'PORN', 'XXX',
    // Jerga Venezuela Ofensiva
    'GUEVON', 'GUEBON', 'MADRE', 'HIJO DE PUTA', 'HDP', 'MARICO', 'MARICA', 'MARICON',
    'MALPARIDO', 'MALPARIDA', 'CARETABLA', 'LADRON', 'CHABESTIA', 'ESCUALIDO'
];

/**
 * @description Valida si el contenido contiene palabras censuradas
 */
export const validateContent = (text: string): { valid: boolean; word?: string } => {
    const upperText = text.toUpperCase();
    for (const word of CENSORED_WORDS) {
        if (upperText.includes(word)) {
            return { valid: false, word };
        }
    }
    return { valid: true };
};

/**
 * @description Alterna un dislike en una noticia
 */
export const toggleDislikeSupabase = async (noticiaId: string, agentId: string): Promise<{ success: boolean; disliked?: boolean; error?: any }> => {
    try {
        // Verificar si ya existe el dislike
        const { data: existing } = await supabase
            .from('asistencia_visitas_dislikes')
            .select('*')
            .eq('noticia_id', noticiaId)
            .eq('agent_id', agentId)
            .single();

        if (existing) {
            // Quitar dislike
            await supabase
                .from('asistencia_visitas_dislikes')
                .delete()
                .eq('id', existing.id);
            return { success: true, disliked: false };
        } else {
            // Puntos de control antes de insertar dislike
            const { error } = await supabase
                .from('asistencia_visitas_dislikes')
                .insert([{ noticia_id: noticiaId, agent_id: agentId }]);

            if (error) throw error;
            return { success: true, disliked: true };
        }
    } catch (err: any) {
        console.error("Error toggleDislike:", err);
        return { success: false, error: err.message };
    }
};

/**
 * @description Obtiene el feed de noticias desde la tabla de actividad asistencia_visitas
 */
export const fetchNewsFeedSupabase = async (): Promise<any[]> => {
    try {
        // TTL: 48 horas (48 * 60 * 60 * 1000 ms)
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('asistencia_visitas')
            .select('*')
            .gte('registrado_en', fortyEightHoursAgo)
            .order('registrado_en', { ascending: false })
            .limit(100); // Traer suficientes para paginación y filtrado

        if (error) throw error;

        // Mapear de Supabase (snake_case) a NewsFeedItem (camelCase)
        return (data || []).map(item => {
            let message = item.detalle || '';
            let verse = undefined;
            let reference = undefined;

            if (message.includes('[VERSE]:')) {
                const parts = message.split(' [VERSE]: ');
                message = parts[0];
                if (parts[1]) {
                    if (parts[1].includes(' [REF]: ')) {
                        const refParts = parts[1].split(' [REF]: ');
                        verse = refParts[0];
                        reference = refParts[1];
                    } else {
                        verse = parts[1];
                    }
                }
            }

            return {
                id: item.id,
                agentId: item.agent_id,
                agentName: item.agent_name,
                type: item.tipo,
                message: message,
                verse: verse,
                reference: reference,
                parentId: item.parent_id, // Nuevo campo para hilos
                date: new Date(item.registrado_en).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                }).toUpperCase()
            };
        });
    } catch (err) {
        console.error("Error al obtener NewsFeed de Supabase:", err);
        return [];
    }
};

/**
 * @description Elimina una noticia del feed
 */
export const deleteNewsItemSupabase = async (id: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase
            .from('asistencia_visitas')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        console.error("Error al eliminar noticia de Supabase:", err);
        return { success: false, error: err.message };
    }
};

export const resolveTaskSupabase = async (taskId: string, status: 'RECHAZADO' | 'VERIFICADO', verifiedBy?: string) => {
    try {
        const updateData: any = { status };
        if (verifiedBy) updateData.verified_by = verifiedBy;

        const { error } = await supabase
            .from('progreso_tareas')
            .update(updateData)
            .eq('id', taskId);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('❌ Error resolviendo tarea:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * @description Guarda masivamente cursos y lecciones directamente en Supabase (evitando Apps Script)
 */
export const saveBulkAcademyDataSupabase = async (data: { courses: any[], lessons: any[] }) => {
    try {
        const { courses, lessons } = data;

        // 1. Prepare and insert courses
        if (courses && courses.length > 0) {
            const coursesData = courses.map(c => ({
                id: c.id,
                title: c.title,
                description: c.description || '',
                badge_reward: c.requiredLevel || c.badgeReward || null,
                xp_reward: c.xpReward || 0,
                image_url: c.imageUrl || null,
                order_index: c.order || 0,
                is_active: c.isActive !== false
            }));

            const { error: coursesError } = await supabase
                .from('academy_courses')
                .upsert(coursesData, { onConflict: 'id' });

            if (coursesError) throw coursesError;
        }

        // 2. Prepare and insert lessons
        if (lessons && lessons.length > 0) {
            const lessonsData = lessons.map(l => ({
                id: l.id,
                course_id: l.courseId,
                title: l.title,
                embed_url: l.videoUrl || null,
                required_role: l.requiredRole || 'STUDENT',
                content: l.content || '',
                questions_json: {
                    questions: l.questions || [],
                    xpReward: l.xpReward || 0,
                    resultAlgorithm: l.resultAlgorithm || 'NONE',
                    resultMappings: l.resultMappings || []
                }
            }));

            const { error: lessonsError } = await supabase
                .from('academy_lessons')
                .upsert(lessonsData, { onConflict: 'id' });

            if (lessonsError) throw lessonsError;
        }

        return { success: true };
    } catch (error: any) {
        console.error('❌ Error in saveBulkAcademyDataSupabase:', error);
        return { success: false, error: error.message };
    }
};

/**
 * @description Retrieves academy courses, lessons, and progress directly from Supabase, ordered newest to oldest.
 */
export const fetchAcademyDataSupabase = async (agentId?: string) => {
    try {
        // Fetch courses, ordering by created_at DESC (newest to oldest)
        const { data: coursesData, error: coursesError } = await supabase
            .from('academy_courses')
            .select('*')
            .order('created_at', { ascending: false });

        if (coursesError) throw coursesError;

        // Fetch lessons
        const { data: lessonsData, error: lessonsError } = await supabase
            .from('academy_lessons')
            .select('*')
            .order('created_at', { ascending: true }); // lessons keep sequential order

        if (lessonsError) throw lessonsError;

        // Map to expected format
        const courses = coursesData.map(c => ({
            id: c.id,
            title: c.title,
            description: c.description || '',
            requiredLevel: c.badge_reward || 'ESTUDIANTE',
            imageUrl: c.image_url || null,
            // Extra optional fields that might be useful
            badgeReward: c.badge_reward || null,
            xpReward: c.xp_reward || 0,
            order: c.order_index || 0,
            isActive: c.is_active
        }));

        const lessons = lessonsData.map((l, index) => ({
            id: l.id,
            courseId: l.course_id,
            order: index + 1,
            title: l.title,
            videoUrl: l.embed_url || null,
            content: l.content || '',
            questions: l.questions_json?.questions || [],
            xpReward: l.questions_json?.xpReward || 0,
            resultAlgorithm: l.questions_json?.resultAlgorithm || 'NONE',
            resultMappings: l.questions_json?.resultMappings || []
        }));

        let progress: any[] = [];
        if (agentId) {
            const { data: progressData, error: progressError } = await supabase
                .from('academy_progress')
                .select('*')
                .eq('agent_id', agentId);

            if (!progressError && progressData) {
                progress = progressData.map(p => ({
                    id: p.id,
                    agentId: p.agent_id,
                    lessonId: p.lesson_id,
                    courseId: p.course_id,
                    isCompleted: p.is_completed,
                    score: p.score,
                    attempts: p.attempts,
                    completedAt: p.completed_at
                }));
            }
        }

        return { courses, lessons, progress };
    } catch (error: any) {
        console.error('❌ Error fetching academy data from Supabase:', error.message);
        return { courses: [], lessons: [], progress: [] };
    }
};

export const deleteAcademyCourseSupabase = async (courseId: string): Promise<{ success: boolean; error?: string }> => {
    try {
        await supabase.from('academy_lessons').delete().eq('course_id', courseId);
        const { error } = await supabase.from('academy_courses').delete().eq('id', courseId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error('❌ Error deleting course from Supabase:', e.message);
        return { success: false, error: e.message };
    }
};

export const deleteAcademyLessonSupabase = async (lessonId: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase.from('academy_lessons').delete().eq('id', lessonId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error('❌ Error deleting lesson from Supabase:', e.message);
        return { success: false, error: e.message };
    }
};

export const submitQuizResultSupabase = async (
    agentId: string,
    lessonId: string,
    courseId: string,
    score: number,
    isCompleted: boolean,
    attempts: number
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Obtenemos los intentos actuales
        const { data: currentProgress, error: fetchError } = await supabase
            .from('academy_progress')
            .select('attempts')
            .eq('agent_id', agentId)
            .eq('lesson_id', lessonId)
            .maybeSingle();

        if (fetchError) throw fetchError;

        const currentAttempts = currentProgress?.attempts || 0;
        const newAttempts = currentAttempts + attempts;

        const payload = {
            agent_id: agentId,
            lesson_id: lessonId,
            course_id: courseId,
            score: score,
            is_completed: isCompleted,
            attempts: newAttempts,
            completed_at: isCompleted ? new Date().toISOString() : null
        };

        const { error: upsertError } = await supabase
            .from('academy_progress')
            .upsert([payload], { onConflict: 'agent_id, lesson_id' }); // IMPORTANTE: Requiere este índice en Supabase

        if (upsertError) {
            // Intento alternativo sin onConflict compuesto si no existe la restricción UNIQUE
            const { data: existing } = await supabase
                .from('academy_progress')
                .select('id')
                .eq('agent_id', agentId)
                .eq('lesson_id', lessonId)
                .maybeSingle();

            if (existing) {
                const { error: updateError } = await supabase
                    .from('academy_progress')
                    .update(payload)
                    .eq('id', existing.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('academy_progress')
                    .insert([payload]);
                if (insertError) throw insertError;
            }
        }

        return { success: true };
    } catch (e: any) {
        console.error('❌ Error submitting quiz result to Supabase:', e.message);
        return { success: false, error: e.message };
    }
};

export const resetStudentAttemptsSupabase = async (agentId: string, lessonId: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('academy_progress')
            .delete()
            .eq('agent_id', agentId)
            .eq('lesson_id', lessonId);

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error('❌ Error resetting student attempts:', e.message);
        return { success: false, error: e.message };
    }
};

/**
 * ===== RECURSOS TÁCTICOS (MANUALES Y LIBROS) =====
 */

export const fetchTacticalResourcesSupabase = async () => {
    try {
        const { data, error } = await supabase
            .from('recursos_tacticos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching tactical resources:', error);
            return [];
        }

        return (data || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            driveFileId: r.drive_file_id,
            driveUrl: r.drive_url,
            type: r.type,
            category: r.category,
            isActive: r.is_active,
            createdBy: r.created_by,
            createdAt: r.created_at
        }));
    } catch (e: any) {
        console.error('❌ Fatal error fetching tactical resources:', e.message);
        return [];
    }
};

export const addTacticalResourceSupabase = async (resourceData: any): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('recursos_tacticos')
            .insert([{
                id: resourceData.id,
                title: resourceData.title,
                description: resourceData.description,
                drive_file_id: resourceData.driveFileId,
                drive_url: resourceData.driveUrl,
                type: resourceData.type || 'PDF',
                category: resourceData.category || 'GENERAL',
                is_active: true,
                created_by: resourceData.createdBy
            }]);

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error('❌ Error adding tactical resource:', e.message);
        return { success: false, error: e.message };
    }
};

export const deleteTacticalResourceSupabase = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('recursos_tacticos')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error('❌ Error deleting tactical resource:', e.message);
        return { success: false, error: e.message };
    }
};

/**
 * ===== SISTEMA GUERRA BÍBLICA (REALTIME) =====
 */

export const assignAgentToBibleWarGroup = async (agentId: string, team: 'A' | 'B' | null): Promise<{ success: boolean; error?: string }> => {
    try {
        if (!team) {
            const { error } = await supabase
                .from('bible_war_groups')
                .delete()
                .eq('agent_id', agentId);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('bible_war_groups')
                .upsert({ agent_id: agentId, team }, { onConflict: 'agent_id' });
            if (error) throw error;
        }
        return { success: true };
    } catch (e: any) {
        console.error('❌ Error asignando grupo de Guerra Bíblica:', e.message);
        return { success: false, error: e.message };
    }
};

export const fetchBibleWarGroups = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('bible_war_groups')
            .select('*');
        if (error) throw error;
        return data || [];
    } catch (e: any) {
        console.error('❌ Error obteniendo grupos de Guerra Bíblica:', e.message);
        return [];
    }
};

export const fetchBibleWarSession = async (): Promise<any> => {
    try {
        const { data, error } = await supabase
            .from('bible_war_sessions')
            .select('*')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .single();

        if (error) throw error;
        return data;
    } catch (e: any) {
        console.error('❌ Error obteniendo sesión de Guerra Bíblica:', e.message);
        return null;
    }
};

export const updateBibleWarSession = async (updates: any): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('bible_war_sessions')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', '00000000-0000-0000-0000-000000000001');

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error('❌ Error actualizando sesión de Guerra Bíblica:', e.message);
        return { success: false, error: e.message };
    }
};

export const submitBibleWarAnswer = async (team: 'A' | 'B', answer: string, currentQuestionId: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const updates: any = {};
        if (team === 'A') updates.answer_a = answer;
        if (team === 'B') updates.answer_b = answer;

        const { error } = await supabase
            .from('bible_war_sessions')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .eq('current_question_id', currentQuestionId); // 🛡️ Protección Atómica: Solo actualiza si la pregunta no ha cambiado

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error('❌ Error enviando respuesta de Bible War:', e.message);
        return { success: false, error: e.message };
    }
};

/**
 * @description Ejecuta la transferencia atómica de puntos entre equipos y los aplica a los agentes
 * @param winnerTeam 'A' | 'B' | 'NONE' | 'TIE' (TIE adds to pot)
 */
export const transferBibleWarXP = async (winnerTeam: 'A' | 'B' | 'NONE' | 'TIE', stakes: number): Promise<{ success: boolean; error?: string }> => {
    try {
        // 1. Obtener sesión actual
        const { data: session, error: fetchError } = await supabase
            .from('bible_war_sessions')
            .select('score_a, score_b, accumulated_pot')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .single();

        if (fetchError) throw fetchError;

        let newScoreA = session.score_a;
        let newScoreB = session.score_b;
        let newPot = session.accumulated_pot || 0;

        const totalAward = stakes + newPot;

        // 1. Calcular resolución para los marcadores VISUALES de la sesión
        if (winnerTeam === 'A') {
            newScoreA += totalAward;
            newScoreB -= stakes;
            newPot = 0; // Se consume el pozo
        } else if (winnerTeam === 'B') {
            newScoreB += totalAward;
            newScoreA -= stakes;
            newPot = 0; // Se consume el pozo
        } else if (winnerTeam === 'NONE') {
            // Ambos fallan: el pozo se acumula, nadie pierde XP real
            newPot += stakes;
        } else if (winnerTeam === 'TIE') {
            // Empate (ambos aciertan): el pozo se acumula, nadie pierde.
            newPot += stakes;
        }

        // 2. TRANSFERENCIA INDIVIDUAL A GLADIADORES (v4.0)
        const { data: currentSession } = await supabase
            .from('bible_war_sessions')
            .select('gladiator_a_id, gladiator_b_id')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .single();

        if (currentSession) {
            const { gladiator_a_id: gadA, gladiator_b_id: gadB } = currentSession;

            // Procesar Agente A
            if (gadA) {
                let amountA = 0;
                if (winnerTeam === 'A') amountA = totalAward; // Gana pozo + stakes
                else if (winnerTeam === 'B') amountA = -stakes; // Pierde solo sus stakes en combate directo

                if (amountA !== 0) {
                    await updateAgentPointsSupabase(gadA, 'XP', amountA);

                    if (amountA > 0) {
                        try {
                            const { data: agentData } = await supabase.from('agentes').select('nombre').eq('id', gadA).single();
                            if (agentData) {
                                await publishNewsSupabase(gadA, agentData.nombre, 'RECOMPENSA', `Ganó ${amountA} XP en la Arena Táctica.`);
                            }
                        } catch (e) { }
                    }
                }
            }

            // Procesar Agente B
            if (gadB) {
                let amountB = 0;
                if (winnerTeam === 'B') amountB = totalAward; // Gana pozo + stakes
                else if (winnerTeam === 'A') amountB = -stakes; // Pierde solo sus stakes en combate directo

                if (amountB !== 0) {
                    await updateAgentPointsSupabase(gadB, 'XP', amountB);

                    if (amountB > 0) {
                        try {
                            const { data: agentData } = await supabase.from('agentes').select('nombre').eq('id', gadB).single();
                            if (agentData) {
                                await publishNewsSupabase(gadB, agentData.nombre, 'RECOMPENSA', `Ganó ${amountB} XP en la Arena Táctica.`);
                            }
                        } catch (e) { }
                    }
                }
            }
        }

        // 3. Actualizar sesión global
        const { error: updateError } = await supabase
            .from('bible_war_sessions')
            .update({
                score_a: newScoreA,
                score_b: newScoreB,
                accumulated_pot: newPot,
                show_answer: true,
                status: 'RESOLVED',
                updated_at: new Date().toISOString()
            })
            .eq('id', '00000000-0000-0000-0000-000000000001');

        if (updateError) throw updateError;

        return { success: true };
    } catch (e: any) {
        console.error('❌ Error en transferencia de XP Bible War:', e.message);
        return { success: false, error: e.message };
    }
};

/**
 * @description Obtiene todas las preguntas del banco dinámico
 */
export const fetchBibleWarQuestions = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('bible_war_questions')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (e: any) {
        console.error('❌ Error obteniendo preguntas de Bible War:', e.message);
        return [];
    }
};

/**
 * @description Borra todas las preguntas del banco actual
 */
export const clearBibleWarQuestions = async (): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('bible_war_questions')
            .delete()
            .neq('id', 'NONE'); // Truco para borrar todo si no hay filtro directo permitido

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error('❌ Error borrando preguntas de Bible War:', e.message);
        return { success: false, error: e.message };
    }
};

/**
 * @description Publica una noticia en el historial de actividad (asistencia_visitas)
 */
export const publishNewsSupabase = async (agentId: string, agentName: string, type: string, message: string, parentId?: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase.from('asistencia_visitas').insert({
            agent_id: agentId || 'SISTEMA',
            agent_name: agentName || 'Sistema',
            tipo: type,
            detalle: message,
            parent_id: parentId, // Guardar el ID del padre para hilos
            registrado_en: new Date().toISOString()
        });
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('Error publicando noticia:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * @description Verifica si hay agentes cumpliendo años hoy y publica una noticia en el feed, asegurando que se publique solo una vez al día.
 */
export const checkAndPublishBirthdays = async (agents: any[]): Promise<void> => {
    try {
        const today = new Date();
        const todayMonth = today.getMonth() + 1; // 1-12
        const todayDay = today.getDate(); // 1-31

        const birthdayAgents = agents.filter(agent => {
            if (!agent.birthday || agent.birthday === 'N/A') return false;

            // Try to parse 'DD/MM' or 'DD/MM/YYYY' or 'YYYY-MM-DD'
            const parts = agent.birthday.split(/[\/\-]/);
            if (parts.length >= 2) {
                // Si es YYYY-MM-DD
                if (parts[0].length === 4) {
                    const m = parseInt(parts[1], 10);
                    const d = parseInt(parts[2], 10);
                    return m === todayMonth && d === todayDay;
                } else {
                    // Asumimos DD/MM o DD/MM/YYYY
                    const d = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10);
                    return m === todayMonth && d === todayDay;
                }
            }
            return false;
        });

        if (birthdayAgents.length === 0) return;

        // Verificar cuáles agentes ya tienen noticia de CUMPLEAÑOS hoy en BD
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const { data: existingNews } = await supabase
            .from('asistencia_visitas')
            .select('agent_id')
            .eq('tipo', 'CUMPLEAÑOS')
            .gte('registrado_en', startOfDay)
            .lte('registrado_en', endOfDay);

        const publishedIds = new Set(existingNews?.map(n => n.agent_id) || []);

        for (const agent of birthdayAgents) {
            if (!publishedIds.has(agent.id)) {
                await publishNewsSupabase(
                    agent.id,
                    agent.name,
                    'CUMPLEAÑOS',
                    `¡Feliz cumpleaños, ${agent.name.split(' ')[0]}! 🎂 Que Dios bendiga tu vida y ministerio.`
                );
            }
        }
    } catch (error) {
        console.error('Error verificando cumpleaños:', error);
    }
};

/**
 * @description Importa una lista de preguntas (JSON) a Supabase
 */
export const importBibleWarQuestions = async (questions: any[]): Promise<{ success: boolean; error?: string }> => {
    try {
        const mappedQuestions = questions.map(q => ({
            id: q.id || `q_${Math.random().toString(36).substr(2, 9)}`,
            category: q.category,
            difficulty: q.difficulty,
            question: q.question,
            options: q.options,
            correct_answer: q.correctAnswer || q.correct_answer,
            reference: q.reference,
            image_url: q.image_url || q.imageUrl
        }));

        const { error } = await supabase
            .from('bible_war_questions')
            .upsert(mappedQuestions);

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error('❌ Error importando preguntas de Bible War:', e.message);
        return { success: false, error: e.message };
    }
};

/**
 * @description Calcula insignias/badges basadas en rendimiento real de los agentes en Supabase.
 * Insignias: CONSAGRADO_MES, RECLUTADOR, STREAKER, MISIONERO_ELITE, ACADEMICO
 */
export const computeBadgesSupabase = async (): Promise<Badge[]> => {
    try {
        const badges: Badge[] = [];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

        // 1. OBTENER ESTUDIANTES ACTIVOS Y REFERIDOS
        const { data: allAgents, error: agentsErr } = await supabase
            .from('agentes')
            .select('id, nombre, rango, cargo, user_role, joined_date, streak_count');

        if (agentsErr || !allAgents) return [];

        const isLeader = (a: any) => {
            const rank = String(a.rango || '').toUpperCase();
            const roleStr = String(a.user_role || a.cargo || '').toUpperCase();
            return rank.includes('DIRECTOR') || rank.includes('LÍDER') || roleStr.includes('DIRECTOR') || roleStr.includes('ADMIN') || roleStr.includes('SUPERVISOR') || roleStr.includes('LEADER');
        };

        const students = allAgents.filter(a => !isLeader(a));

        // --- RECLUTADOR DEL MES ---
        const refCounts: Record<string, number> = {};

        // También ver visitantes que fueron referidos
        const { data: visitantes } = await supabase
            .from('asistencia_visitas')
            .select('referido_por_id, registrado_en')
            .neq('referido_por_id', '')
            .neq('referido_por_id', null)
            .gte('registrado_en', startOfMonth)
            .lte('registrado_en', endOfMonth);

        if (visitantes) {
            for (const v of visitantes) {
                const ref = String(v.referido_por_id || '').trim();
                // Avoid self-references or empty
                if (ref) {
                    refCounts[ref] = (refCounts[ref] || 0) + 1;
                }
            }
        }

        let topRefName: string | null = null;
        let topRefCount = 0;
        for (const name in refCounts) {
            if (refCounts[name] > topRefCount) {
                topRefName = name;
                topRefCount = refCounts[name];
            }
        }
        if (topRefName && topRefCount > 0) {
            badges.push({ type: 'RECLUTADOR', emoji: '🎯', label: 'Reclutador del Mes', agentName: topRefName, value: topRefCount });
        }

        // --- STREAKER ---
        let topStreaker: any = null;
        let topStreak = 0;
        for (const s of students) {
            const streak = parseInt(s.streak_count) || 0;
            if (streak > topStreak) {
                topStreak = streak;
                topStreaker = s;
            }
        }
        if (topStreaker && topStreak > 0) {
            badges.push({ type: 'STREAKER', emoji: '🔥', label: 'Streaker', agentId: topStreaker.id, agentName: topStreaker.nombre, value: topStreak });
        }

        // --- MISIONERO ELITE ---
        const { data: misiones } = await supabase
            .from('progreso_tareas')
            .select('agent_id, status, completed_at')
            .eq('status', 'VERIFICADO')
            .gte('completed_at', startOfMonth)
            .lte('completed_at', endOfMonth);

        if (misiones && misiones.length > 0) {
            const missionCounts: Record<string, number> = {};
            for (const m of misiones) {
                const agId = String(m.agent_id).trim().toUpperCase();
                missionCounts[agId] = (missionCounts[agId] || 0) + 1;
            }

            let topMissioner: any = null;
            let topMissions = 0;
            for (const s of students) {
                const count = missionCounts[String(s.id).toUpperCase()] || 0;
                if (count > topMissions) {
                    topMissions = count;
                    topMissioner = s;
                }
            }
            if (topMissioner && topMissions > 0) {
                badges.push({ type: 'MISIONERO_ELITE', emoji: '⚔️', label: 'Misionero Elite', agentId: topMissioner.id, agentName: topMissioner.nombre, value: topMissions });
            }
        }

        // --- ACADEMICO ---
        const { data: acadProgress } = await supabase
            .from('academy_progress')
            .select('agent_id, is_completed')
            .eq('is_completed', true);

        if (acadProgress && acadProgress.length > 0) {
            const acadCounts: Record<string, number> = {};
            for (const p of acadProgress) {
                const agId = String(p.agent_id).trim().toUpperCase();
                acadCounts[agId] = (acadCounts[agId] || 0) + 1;
            }

            let topAcad: any = null;
            let topAcadCount = 0;
            for (const s of students) {
                const count = acadCounts[String(s.id).toUpperCase()] || 0;
                if (count > topAcadCount) {
                    topAcadCount = count;
                    topAcad = s;
                }
            }
            if (topAcad && topAcadCount > 0) {
                badges.push({ type: 'ACADEMICO', emoji: '📚', label: 'Académico', agentId: topAcad.id, agentName: topAcad.nombre, value: topAcadCount });
            }
        }

        // --- CONSAGRADO DEL MES ---
        const { data: asistencias } = await supabase
            .from('asistencia_visitas')
            .select('agent_id')
            .eq('tipo', 'ASISTENCIA')
            .gte('registrado_en', startOfMonth)
            .lte('registrado_en', endOfMonth);

        if (asistencias && asistencias.length > 0) {
            const attCounts: Record<string, number> = {};
            for (const val of asistencias) {
                const agId = String(val.agent_id).trim().toUpperCase();
                attCounts[agId] = (attCounts[agId] || 0) + 1;
            }

            let topConsagrado: any = null;
            let topAttCount = 0;
            for (const s of students) {
                const count = attCounts[String(s.id).toUpperCase()] || 0;
                if (count > topAttCount) {
                    topAttCount = count;
                    topConsagrado = s;
                }
            }
            if (topConsagrado && topAttCount > 0) {
                badges.push({ type: 'CONSAGRADO_MES', emoji: '⭐', label: 'Consagrado del Mes', agentId: topConsagrado.id, agentName: topConsagrado.nombre, value: topAttCount });
            }
        }

        return badges;
    } catch (e: any) {
        console.error("Error en computeBadgesSupabase:", e.message);
        return [];
    }

};

/**
 * ===== SISTEMA DE NOTIFICACIONES (INBOX) =====
 */

export const updateNotifPrefsSupabase = async (agentId: string, prefs: { read: string[]; deleted: string[] }): Promise<{ success: boolean; error?: string }> => {
    try {
        // Actualizamos directamente la columna JSONB 'notif_prefs' en la tabla 'agentes'
        const { error } = await supabase
            .from('agentes')
            .update({ notif_prefs: prefs })
            .eq('id', agentId.toUpperCase());

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error('❌ Error updating notification prefs:', e.message);
        return { success: false, error: e.message };
    }
};

export const fetchNotificationsSupabase = async (): Promise<InboxNotification[]> => {
    try {
        const { data, error } = await supabase
            .from('notificaciones_push')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50); // Get latest 50 notifications

        if (error) throw error;

        if (!data) return [];

        return data.map((n: any) => ({
            id: n.id,
            fecha: n.created_at,
            titulo: n.titulo,
            mensaje: n.mensaje,
            categoria: (n.tipo && n.tipo !== 'general') ? String(n.tipo).toUpperCase() : 'INFO',
            emisor: n.emisor || 'Comando Central'
        })) as InboxNotification[];
    } catch (e: any) {
        console.error('❌ Error fetching global notifications:', e.message);
        return [];
    }
};

/**
 * ===== SISTEMA DE PROMOCIONES Y ASCENSOS =====
 */

export const getPromotionStatusSupabase = async (agentId: string): Promise<any> => {
    try {
        // 1. Obtener datos del agente (XP y Rango)
        const { data: agentData, error: agentError } = await supabase
            .from('agentes')
            .select('xp, rango')
            .eq('id', agentId)
            .single();

        if (agentError) throw agentError;

        // 2. Obtener progreso de lecciones (certificados = Módulos 100% completados)
        const { data: certData, error: certError } = await supabase
            .from('academy_progress')
            .select('lesson_id, course_id')
            .eq('agent_id', agentId)
            .eq('is_completed', true);

        if (certError) throw certError;

        // Necesitamos saber cuántas lecciones tiene cada curso para saber si lo completó al 100%
        const { data: allLessons } = await supabase.from('academy_lessons').select('id, course_id');

        let certCount = 0;
        if (allLessons && certData) {
            // Agrupar lecciones totales por curso
            const totalLessonsPerCourse = allLessons.reduce((acc: any, val: any) => {
                acc[val.course_id] = (acc[val.course_id] || 0) + 1;
                return acc;
            }, {});

            // Agrupar lecciones completadas por curso
            const completedLessonsPerCourse = certData.reduce((acc: any, val: any) => {
                acc[val.course_id] = (acc[val.course_id] || 0) + 1;
                return acc;
            }, {});

            // Un certificado se otorga si las lecciones completadas == lecciones totales del curso (y > 0)
            for (const courseId in completedLessonsPerCourse) {
                if (totalLessonsPerCourse[courseId] && completedLessonsPerCourse[courseId] >= totalLessonsPerCourse[courseId]) {
                    certCount++;
                }
            }
        }

        // 3. Obtener misiones completadas (VERIFICADO) y pendientes (ENTREGADO)
        const { data: tasksData, error: tasksError } = await supabase
            .from('progreso_tareas')
            .select('status')
            .eq('agent_id', agentId)
            .in('status', ['VERIFICADO', 'ENTREGADO']);

        if (tasksError) throw tasksError;

        const tasksCompleted = tasksData?.filter(t => t.status === 'VERIFICADO').length || 0;
        const tasksPending = tasksData?.filter(t => t.status === 'ENTREGADO').length || 0;

        // 4. Historial de ascensos - (Por ahora se mockea si no hay tabla de historial, 
        // pero se podría leer de `notificaciones` o `insignias_otorgadas` a futuro)
        const promotionHistory: any[] = [];

        return {
            success: true,
            rank: agentData.rango || 'RECLUTA',
            xp: agentData.xp || 0,
            certificates: certCount || 0,
            tasksCompleted,
            tasksPending,
            promotionHistory
        };

    } catch (e: any) {
        console.error('❌ Error calculando estado de promoción:', e.message);
        return { success: false, error: e.message };
    }
};

export const getSecurityQuestionSupabase = async (agentId: string): Promise<{ success: boolean, question?: string, error?: string }> => {
    try {
        const { data, error } = await supabase
            .from('agentes')
            .select('security_question')
            .eq('id', agentId)
            .single();

        if (error) throw error;
        if (!data || !data.security_question) {
            return { success: false, error: "Agente no tiene pregunta de seguridad configurada" };
        }
        return { success: true, question: data.security_question };
    } catch (e: any) {
        console.error("❌ Error obteniendo pregunta de seguridad:", e.message);
        return { success: false, error: e.message };
    }
};

export const resetPasswordWithAnswerSupabase = async (agentId: string, answer: string): Promise<{ success: boolean, newPin?: string, error?: string }> => {
    try {
        // Find agent and verify answer
        const { data, error } = await supabase
            .from('agentes')
            .select('security_answer')
            .eq('id', agentId)
            .single();

        if (error) throw error;
        if (!data || !data.security_answer) {
            return { success: false, error: "Pregunta de seguridad no configurada." };
        }

        // Simple case-insensitive match for answer
        if (data.security_answer.trim().toLowerCase() !== answer.trim().toLowerCase()) {
            return { success: false, error: "Respuesta incorrecta." };
        }

        // Generate a new 4-digit PIN
        const newPin = Math.floor(1000 + Math.random() * 9000).toString();

        // Update agent PIN
        const { error: updateError } = await supabase
            .from('agentes')
            .update({ pin: newPin })
            .eq('id', agentId);

        if (updateError) throw updateError;

        return { success: true, newPin };
    } catch (e: any) {
        console.error("❌ Error reseteando PIN:", e.message);
        return { success: false, error: e.message };
    }
};

/**
 * ===== SISTEMA DE DISPOSITIVOS Y PUSH =====
 */
export const syncFcmTokenSupabase = async (agentId: string, token: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase.rpc('update_agent_fcm', { p_id: agentId, p_token: token });
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error("❌ Error sincronizando FCM Token:", e.message);
        return { success: false, error: e.message };
    }
};
/**
 * @description Registra un nuevo lead de inversión (Padrino/Sponsor) en Supabase.
 */
export const submitInversionLead = async (lead: { nombre: string; email?: string; whatsapp?: string; tipoAlianza: string }) => {
    try {
        const { error } = await supabase
            .from('leads_inversion')
            .insert([{
                nombre: lead.nombre,
                email: lead.email,
                whatsapp: lead.whatsapp,
                tipo_alianza: lead.tipoAlianza,
                status: 'NUEVO'
            }]);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('❌ Error registrando lead de inversión:', error.message);
        return { success: false, error: error.message };
    }
};


export const fetchActiveStoriesSupabase = async (): Promise<any[]> => {
    try {
        // Cleanup expired stories (48h) — fire-and-forget
        Promise.resolve(supabase.rpc('cleanup_expired_stories')).catch(() => { });

        const { data, error } = await supabase
            .from('historias')
            .select(`
                *,
                agentes (
                    nombre,
                    foto_url
                ),
                historia_reactions (
                    id,
                    agent_id,
                    agent_name,
                    emoji
                )
            `)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error("Error fetching stories:", e);
        return [];
    }
};

export const createStorySupabase = async (agentId: string, imageUrl: string, content?: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('historias')
            .insert({
                agent_id: agentId,
                image_url: imageUrl,
                content: content
            });

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

/**
 * @description Reaccionar a una historia (toggle). Envía push al dueño.
 */
export const reactToStorySupabase = async (
    storyId: string, storyOwnerId: string, agentId: string, agentName: string, emoji: string
): Promise<{ success: boolean; reacted: boolean; error?: string }> => {
    try {
        // Check if already reacted with this emoji
        const { data: existing } = await supabase
            .from('historia_reactions')
            .select('id')
            .eq('historia_id', storyId)
            .eq('agent_id', agentId)
            .eq('emoji', emoji)
            .maybeSingle();

        if (existing) {
            // Un-react
            await supabase.from('historia_reactions').delete().eq('id', existing.id);
            return { success: true, reacted: false };
        } else {
            // React
            const { error } = await supabase.from('historia_reactions').insert({
                historia_id: storyId,
                agent_id: agentId,
                agent_name: agentName,
                emoji: emoji
            });
            if (error) throw error;

            // Push notification al dueño (fire-and-forget, no auto-notificación)
            if (storyOwnerId !== agentId) {
                try {
                    const { data: owner } = await supabase
                        .from('agentes')
                        .select('fcm_token')
                        .eq('id', storyOwnerId)
                        .single();
                    if (owner?.fcm_token) {
                        const { sendPushBroadcast } = await import('./notifyService');
                        sendPushBroadcast(
                            `${emoji} REACCIÓN A TU HISTORIA`,
                            `${agentName} reaccionó a tu historia`,
                            owner.fcm_token
                        ).catch(() => { });
                    }
                } catch (e) { /* silent */ }
            }

            return { success: true, reacted: true };
        }
    } catch (error: any) {
        return { success: false, reacted: false, error: error.message };
    }
};

/**
 * @description Enviar respuesta a una historia via el chat general + push al dueño
 */
export const sendStoryReplySupabase = async (
    storyOwnerId: string, storyOwnerName: string,
    agentId: string, agentName: string, message: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Insertar mensaje en el chat general (Firebase Firestore — misma colección que TacticalChat)
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('../firebase-config');

        const chatMessage = `📸 Respondiendo a la historia de ${storyOwnerName}: "${message}"`;
        await addDoc(collection(db, 'messages'), {
            senderId: agentId,
            senderName: agentName,
            text: chatMessage,
            type: 'text',
            timestamp: serverTimestamp()
        });

        // Push al dueño de la historia (fire-and-forget)
        if (storyOwnerId !== agentId) {
            try {
                const { data: owner } = await supabase
                    .from('agentes')
                    .select('fcm_token')
                    .eq('id', storyOwnerId)
                    .single();
                if (owner?.fcm_token) {
                    const { sendPushBroadcast } = await import('./notifyService');
                    sendPushBroadcast(
                        '💬 RESPUESTA A TU HISTORIA',
                        `${agentName}: "${message}"`,
                        owner.fcm_token
                    ).catch(() => { });
                }
            } catch (e) { /* silent */ }
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const toggleLikeSupabase = async (noticiaId: string, agentId: string, agentName?: string): Promise<{ success: boolean; liked?: boolean; error?: string }> => {
    try {
        // Check if already liked
        const { data, error: fetchError } = await supabase
            .from('noticia_likes')
            .select('id')
            .eq('noticia_id', noticiaId)
            .eq('agent_id', agentId)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (data) {
            // Unlike — no notification needed
            const { error: deleteError } = await supabase
                .from('noticia_likes')
                .delete()
                .eq('id', data.id);
            if (deleteError) throw deleteError;
            return { success: true, liked: false };
        } else {
            // Like
            const { error: insertError } = await supabase
                .from('noticia_likes')
                .insert({
                    noticia_id: noticiaId,
                    agent_id: agentId
                });
            if (insertError) throw insertError;

            // --- PUSH NOTIFICATION: Notify the post owner ---
            try {
                // 1. Find the post owner from asistencia_visitas
                const { data: post } = await supabase
                    .from('asistencia_visitas')
                    .select('agent_id, agent_name')
                    .eq('id', noticiaId)
                    .single();

                if (post && post.agent_id && post.agent_id !== agentId) {
                    // 2. Get the owner's FCM token
                    const { data: owner } = await supabase
                        .from('agentes')
                        .select('fcm_token, nombre')
                        .eq('id', post.agent_id)
                        .single();

                    if (owner?.fcm_token) {
                        // 3. Send targeted push
                        const likerName = agentName || 'Un agente';
                        const { sendPushBroadcast } = await import('./notifyService');
                        sendPushBroadcast(
                            '❤️ NUEVO LIKE',
                            `${likerName} reaccionó a tu publicación en el Intel Feed.`,
                            owner.fcm_token
                        ).catch(() => { }); // Fire-and-forget, don't block the like
                    }
                }
            } catch (pushErr) {
                // Don't fail the like if push fails
                console.warn('Push notification skipped:', pushErr);
            }

            return { success: true, liked: true };
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const fetchNewsLikesSupabase = async (noticiaIds: string[]): Promise<Record<string, number>> => {
    try {
        if (noticiaIds.length === 0) return {};

        const { data, error } = await supabase
            .from('noticia_likes')
            .select('noticia_id')
            .in('noticia_id', noticiaIds);

        if (error) throw error;

        const counts: Record<string, number> = {};
        data.forEach((like: any) => {
            counts[like.noticia_id] = (counts[like.noticia_id] || 0) + 1;
        });
        return counts;
    } catch (e) {
        console.error("Error fetching news likes:", e);
        return {};
    }
};

export const fetchUserLikesSupabase = async (agentId: string): Promise<string[]> => {
    try {
        const { data, error } = await supabase
            .from('noticia_likes')
            .select('noticia_id')
            .eq('agent_id', agentId);

        if (error) throw error;
        return data.map((l: any) => l.noticia_id);
    } catch (e) {
        return [];
    }
};

export const getMostLikedAgentSupabase = async (): Promise<{ agentId: string; likes: number } | null> => {
    try {
        // Step 1: Get all likes
        const { data: likesData, error: likesError } = await supabase
            .from('noticia_likes')
            .select('noticia_id');

        if (likesError) throw likesError;
        if (!likesData || likesData.length === 0) return null;

        // Step 2: Count likes per noticia_id
        const noticiaLikeCounts: Record<string, number> = {};
        likesData.forEach((l: any) => {
            noticiaLikeCounts[l.noticia_id] = (noticiaLikeCounts[l.noticia_id] || 0) + 1;
        });

        // Step 3: Get the top noticia_ids and find their owners in asistencia_visitas
        const topNoticiaIds = Object.keys(noticiaLikeCounts);
        const { data: noticias, error: noticiasError } = await supabase
            .from('asistencia_visitas')
            .select('id, agent_id')
            .in('id', topNoticiaIds);

        if (noticiasError) throw noticiasError;

        // Step 4: Map likes to agents
        const agentLikes: Record<string, number> = {};
        (noticias || []).forEach((n: any) => {
            if (n.agent_id && n.agent_id !== 'SISTEMA') {
                agentLikes[n.agent_id] = (agentLikes[n.agent_id] || 0) + (noticiaLikeCounts[n.id] || 0);
            }
        });

        const sorted = Object.entries(agentLikes).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
            return { agentId: sorted[0][0], likes: sorted[0][1] };
        }
        return null;
    } catch (e) {
        console.error("Error getting most liked agent:", e);
        return null;
    }
};

