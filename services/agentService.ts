import { supabase } from './supabaseClient';
import { Agent, UserRole, Rank, Badge } from '../types';

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

export const mapSupabaseAgentToModel = (d: any): Agent => ({
    id: d.id,
    name: d.nombre,
    cedula: d.cedula || d.tactical_stats?.cedula || '',
    email: d.email || d.tactical_stats?.email || '',
    whatsapp: d.whatsapp || '',
    telegram: d.telegram || d.tactical_stats?.telegram || '',
    redesSociales: d.redes_sociales || d.tactical_stats?.redes_sociales || '',
    xp: d.xp || 0,
    iqLevel: d.iq_level || 1,
    rank: (d.rango || 'RECLUTA').toUpperCase(),
    role: d.cargo || 'ESTUDIANTE',
    photoUrl: d.foto_url || '',
    pin: d.pin || '',
    isAiProfilePending: d.is_ai_profile_pending || false,
    tacticalStats: d.tactical_stats || {},
    tacticalSummary: d.tactor_summary || '',
    talent: d.talent || 'PENDIENTE',
    baptismStatus: d.baptism_status || 'NO',
    status: d.status || 'ACTIVO',
    sedeId: d.sede_id || 'SEDE-JESUS-ES-EL-CENTRO',
    userRole: (() => {
        const role = String(d.user_role || '').toUpperCase();
        const cargo = String(d.cargo || '').toUpperCase();
        if (role === 'DIRECTOR_GENERAL' || cargo === 'DIRECTOR_GENERAL' || role === 'DIRECTOR GENERAL' || cargo === 'DIRECTOR GENERAL' || d.id === 'CON-1011') return UserRole.DIRECTOR_GENERAL;
        if (role === 'DIRECTOR' || cargo === 'DIRECTOR') return UserRole.DIRECTOR;
        if (role === 'LEADER' || role === 'LIDER' || role === 'LÍDER' || cargo === 'LIDER' || cargo === 'LÍDER') return UserRole.LEADER;
        return UserRole.STUDENT;
    })(),
    idSignature: `V37-SIG-${d.id}`,
    joinedDate: d.joined_date || '',
    birthday: d.birthday || '',
    relationshipWithGod: d.relationship_with_god || 'PENDIENTE',
    mustChangePassword: d.must_change_password || false,
    streakCount: d.streak_count || 0,
    rachaProteccion: d.racha_proteccion || 0,
    isStreakActive: (() => {
        const raw = d.last_streak_date || '';
        if (!raw || (d.streak_count || 0) === 0) return false;
        try {
            const today = new Date();
            const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

            let lastDateStr = '';
            if (raw.match(/^\d+$/)) {
                lastDateStr = new Date(parseInt(raw, 10)).toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
            } else {
                lastDateStr = raw.split(' ')[0];
            }
            return (lastDateStr === todayStr || lastDateStr === yesterdayStr);
        } catch { return false; }
    })(),
    lastStreakDate: d.last_streak_date || '',
    lastAttendance: d.last_attendance || '',
    weekly_tasks: d.weekly_tasks || [],
    notif_prefs: d.notif_prefs || { read: [], deleted: [] },
    last_course: d.last_course || '',
    bible: d.bible || 0,
    notes: d.notes || 0,
    leadership: d.leadership || 0,
    biometricCredential: d.biometric_credential || null,
    securityQuestion: d.security_question || null,
    securityAnswer: d.security_answer || null,
    fcmToken: d.fcm_token || null,
    notifPrefs: d.notif_prefs || { read: [], deleted: [] }
}) as unknown as Agent;

/**
 * @description Obtiene la lista completa de agentes desde Supabase. Filtrando los ocultos por defecto.
 */
export const fetchAgentsFromSupabase = async (includeHidden = false, callerRole?: string): Promise<Agent[]> => {
    try {
        const STUDENT_COLS = 'id, nombre, xp, rango, cargo, foto_url, status, talent, user_role, bible, notes, leadership, streak_count, last_streak_date, pin, baptism_status, iq_level, notif_prefs, fcm_token, sede_id, whatsapp, joined_date, birthday, tactical_stats';
        const LEADER_COLS = STUDENT_COLS + ', last_attendance, tactor_summary, must_change_password, is_ai_profile_pending';
        const DIRECTOR_COLS = LEADER_COLS + ', weekly_tasks, relationship_with_god, biometric_credential, security_question, security_answer';

        const role = (callerRole || '').toUpperCase();
        const cols = role === 'DIRECTOR' ? DIRECTOR_COLS : role === 'LEADER' ? LEADER_COLS : STUDENT_COLS;

        const { data, error } = await supabase
            .from('agentes')
            .select(cols);
        if (error) {
            console.error('❌ Error obteniendo agentes de Supabase:', error);
            return [];
        }

        if (!data || data.length === 0) return [];

        const filteredData = includeHidden ? data : data.filter((d: any) => d.status !== 'OCULTO' && String(d.nombre || '').toUpperCase() !== 'TEST');

        return filteredData.filter((d: any) => d.id && d.id.trim() !== '').map(mapSupabaseAgentToModel);

    } catch (e: any) {
        console.error('❌ Fallo crítico en fetchAgentsFromSupabase:', e.message);
        return [];
    }
};

/**
 * @description Obtiene un agente específico por ID desde Supabase con búsqueda flexible.
 */
export const fetchAgentByIdSupabase = async (agentId: string): Promise<Agent | null> => {
    try {
        const cleanId = (agentId || '').trim().toUpperCase();
        if (!cleanId) return null;

        const numeric = cleanId.replace(/[^0-9]/g, '');

        // 1. Búsqueda exacta por ID o Cédula
        let { data, error } = await supabase
            .from('agentes')
            .select('*')
            .or(`id.ilike.${cleanId},cedula.eq.${cleanId}`)
            .limit(1)
            .maybeSingle();

        // 2. Búsqueda flexible por número si no se encontró
        if (!data && numeric.length >= 3) {
            const { data: numData } = await supabase
                .from('agentes')
                .select('*')
                .or(`id.ilike.%${numeric}%,cedula.ilike.%${numeric}%`)
                .limit(1)
                .maybeSingle();
            data = numData;
        }

        if (data) {
            return mapSupabaseAgentToModel(data);
        }
        return null;
    } catch (e: any) {
        console.error('❌ Error obteniendo agente por ID:', e.message);
        return null;
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
            p_amount: amount,
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
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

        // Consultar estado actual del agente
        const { data: agent } = await supabase.from('agentes').select('streak_count, last_streak_date, xp, racha_proteccion').eq('id', agentId).single();

        let newStreak = 1;
        let shieldsLeft = agent?.racha_proteccion || 0;
        let shieldUsed = false;
        const lastDate = agent?.last_streak_date || '';

        if (lastDate === todayStr) {
            return {
                success: true,
                newStreak: agent?.streak_count || 1,
                shieldUsed: false,
                shieldsLeft,
                alreadyDone: true
            };
        }

        if (lastDate === yesterdayStr) {
            newStreak = (agent?.streak_count || 0) + 1;
        } else if (lastDate !== '' && shieldsLeft > 0) {
            shieldUsed = true;
            shieldsLeft -= 1;
            newStreak = (agent?.streak_count || 0) + 1;
        } else {
            newStreak = 1;
        }

        // Regla: 1 punto de XP exacto por día de racha
        const currentTotalXp = (agent?.xp || 0) + 1;

        // Actualizar agente en Supabase
        await supabase.from('agentes').update({
            streak_count: newStreak,
            last_streak_date: todayStr,
            xp: currentTotalXp,
            weekly_tasks: tasks,
            racha_proteccion: shieldsLeft
        }).eq('id', agentId);

        // Publicar automáticamente al Feed Social / Transmisión
        try {
            await supabase.from('historias').insert([{
                agent_id: agentId,
                agent_name: agentName || 'Agente',
                tipo: 'LOGRO',
                contenido: `🔥 ¡Completó su devocional diario! Racha activa de ${newStreak} día(s) (+1 XP)`,
                created_at: new Date().toISOString()
            }]);
        } catch (feedErr) {
            console.warn('⚠️ No se pudo publicar al feed:', feedErr);
        }

        return {
            success: true,
            newStreak,
            shieldUsed,
            shieldsLeft,
            alreadyDone: false
        };
    } catch (err: any) {
        return { success: false, error: err.message };
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

export const updateAgentAttendanceSupabase = async (agentId: string, dateStr: string) => {
    try {
        const { error } = await supabase.from('agentes').update({ last_attendance: dateStr }).eq('id', agentId);
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

// Bloqueo de sesión para evitar ejecuciones concurrentes de cumpleaños
let isBirthdayCheckInProgress = false;

/**
 * @description Verifica cumpleaños y publica anuncios sociales si es necesario.
 */
export const checkAndPublishBirthdays = async (agents: Agent[]) => {
    if (isBirthdayCheckInProgress) return;
    isBirthdayCheckInProgress = true;
    // [PROX-TS-VERIFY-0711]
    try {
        const { publishNewsSupabase } = await import('./socialService');
        const today = new Date();

        // Determinar fecha en Caracas para precisión
        const caracasTime = today.toLocaleString('en-US', { timeZone: 'America/Caracas' });
        const caracasDate = new Date(caracasTime);

        const currentMonth = caracasDate.getMonth() + 1;
        const currentDay = caracasDate.getDate();
        const todayFull = caracasDate.toISOString().split('T')[0];

        console.log(`🔍 [COMMAND CENTER] Iniciando verificación de aniversario: Mes ${currentMonth}, Día ${currentDay}`);

        for (const agent of agents) {
            if (!agent.birthday) continue;

            let isBirthday = false;
            // Limpieza agresiva de la cadena de fecha
            const bdayStr = agent.birthday.trim().replace(/\s/g, '');

            // Analizador Táctico de Fechas
            // Caso 1: ISO o Guiones (YYYY-MM-DD o MM-DD o DD-MM-YYYY)
            if (bdayStr.includes('-')) {
                const parts = bdayStr.split('-');
                if (parts.length === 3) {
                    if (parts[0].length === 4) { // YYYY-MM-DD
                        if (parseInt(parts[1]) === currentMonth && parseInt(parts[2]) === currentDay) isBirthday = true;
                    } else { // DD-MM-YYYY
                        if (parseInt(parts[1]) === currentMonth && parseInt(parts[0]) === currentDay) isBirthday = true;
                    }
                } else if (parts.length === 2) { // MM-DD
                    if (parseInt(parts[0]) === currentMonth && parseInt(parts[1]) === currentDay) isBirthday = true;
                }
            }
            // Caso 2: Slashes (DD/MM/YYYY o DD/MM)
            else if (bdayStr.includes('/')) {
                const parts = bdayStr.split('/');
                if (parts.length >= 2) {
                    // DD/MM/YYYY -> [0]=DD, [1]=MM
                    if (parseInt(parts[1]) === currentMonth && parseInt(parts[0]) === currentDay) isBirthday = true;
                }
            }

            // Caso 3: Fallback por inclusión (Seguridad redundante)
            if (!isBirthday) {
                const mmdd = `${currentMonth.toString().padStart(2, '0')}-${currentDay.toString().padStart(2, '0')}`;
                const ddmm = `${currentDay.toString().padStart(2, '0')}/${currentMonth.toString().padStart(2, '0')}`;
                if (bdayStr.includes(mmdd) || bdayStr.includes(ddmm)) isBirthday = true;
            }

            if (isBirthday) {
                console.log(`🎂 ¡CUMPLEAÑOS DETECTADO HOY! -> ${agent.name} (${agent.birthday})`);

                // 1. Verificar si ya se publicó hoy para este agente
                const { data: existingPost } = await supabase
                    .from('asistencia_visitas')
                    .select('id')
                    .eq('agent_id', agent.id)
                    .eq('tipo', 'CUMPLEAÑOS')
                    .gte('registrado_en', `${todayFull}T00:00:00`)
                    .lte('registrado_en', `${todayFull}T23:59:59`)
                    .maybeSingle();

                if (!existingPost) {
                    console.log(`📢 Emitiendo comunicado oficial para ${agent.name}...`);

                    // 1. Publicar en el Intel Feed (Tono Premium)
                    await publishNewsSupabase(
                        agent.id,
                        agent.name,
                        'CUMPLEAÑOS',
                        `🎖️ **COMUNICADO OFICIAL: ANIVERSARIO TÁCTICO** 🎖️\n\nHoy el Mando Central reconoce el nacimiento y servicio del Agente **${agent.name.toUpperCase()}**. Su lealtad y compromiso fortalecen nuestra unidad operativa. ¡Felicidades en este nuevo ciclo de operación! 🎂`
                    );

                    // 2. Notificación PERSONALIZADA (Tono Premium)
                    const { logNotificationSupabase, sendPushBroadcast, sendTelegramAlert } = await import('./notifyService');
                    await logNotificationSupabase(
                        "🎂 ANIVERSARIO RECONOCIDO",
                        `Felicidades Agente ${agent.name}. El Mando Central celebra tu vida y tu lealtad. Tu misión: Disfrutar este día de victoria personal. 🎖️`,
                        'ALERTA',
                        'Mando Central',
                        agent.id
                    );

                    // 3. Notificación GLOBAL (Broadcast)
                    await sendPushBroadcast(
                        "🎖️ CELEBRACIÓN EN FILAS",
                        `Hoy es el aniversario del Agente ${agent.name}. Reportarse al Intel Feed para honrar su servicio. 🎂`
                    );

                    // 4. Alerta Telegram
                    await sendTelegramAlert(
                        `🎖️ <b>COMUNICADO TÁCTICO: ANIVERSARIO</b>\n\nReconocemos el servicio y vida del Agente: <b>${agent.name.toUpperCase()}</b>\n\n<i>"La lealtad no tiene fecha de caducidad."</i>\n\nFelicitaciones activas en el Intel Feed.`
                    );
                } else {
                    console.log(`✅ [SECURITY] Ya existe registro de aniversario activo para ${agent.name}.`);
                }
            }
        }
    } catch (e: any) {
        console.error('❌ Error en el proceso de aniversario:', e.message);
    } finally {
        isBirthdayCheckInProgress = false;
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
 * @description Obtiene el estado de ascenso de un agente con fallback robusto a la tabla.
 */
export const getPromotionStatusSupabase = async (agentId: string) => {
    try {
        // 1. Intentar RPC
        const { data, error } = await supabase.rpc('get_promotion_status', { p_agent_id: agentId });
        if (!error && data) return { success: true, ...data };

        // 2. Fallback directo consultando la tabla agentes
        const { data: agent, error: agentError } = await supabase
            .from('agentes')
            .select('id, xp, rango, weekly_tasks')
            .eq('id', agentId)
            .single();

        if (agentError || !agent) throw new Error("Agente no encontrado");

        const { count: certCount } = await supabase
            .from('academy_progress')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agentId)
            .eq('passed', true);

        return {
            success: true,
            rank: agent.rango || 'RECLUTA',
            xp: agent.xp || 0,
            certificates: certCount || 0,
            tasksCompleted: Array.isArray(agent.weekly_tasks) ? agent.weekly_tasks.filter((t: any) => t.completed).length : 0,
            promotionHistory: []
        };
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
            agent_id: visitorId,
            registrado_en: new Date().toISOString()
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
export const getStreakMultiplier = (streak: number, active: boolean = true): number => {
    if (!active) return 1.0;
    if (streak >= 30) return 2.0;
    if (streak >= 20) return 1.75;
    if (streak >= 10) return 1.5;
    if (streak >= 5) return 1.25;
    return 1.0;
};

/**
 * @description Obtiene el listado y resumen de todas las sedes / iglesias.
 */
export const fetchSedesSupabase = async () => {
    try {
        const { data: tableData, error: tableError } = await supabase
            .from('sedes')
            .select('*')
            .order('is_active', { ascending: false });
        if (tableError) throw tableError;
        if (tableData && tableData.length > 0) {
            return tableData.map((s: any) => ({
                id: s.id,
                nombre: s.nombre,
                ciudad: s.ciudad,
                pais: s.pais,
                responsableId: s.responsable_id,
                responsableNombre: s.responsable_nombre,
                isActive: s.is_active !== false,
                is_active: s.is_active !== false
            }));
        }
        return [{
            id: 'SEDE-JESUS-ES-EL-CENTRO',
            nombre: 'JESÚS ES EL CENTRO',
            ciudad: 'Caracas',
            pais: 'Venezuela',
            responsableNombre: 'DIRECCIÓN GENERAL',
            isActive: true,
            is_active: true
        }];
    } catch (e: any) {
        console.warn('Fallback sedes default:', e.message);
        return [{
            id: 'SEDE-JESUS-ES-EL-CENTRO',
            nombre: 'JESÚS ES EL CENTRO',
            ciudad: 'Caracas',
            pais: 'Venezuela',
            responsableNombre: 'DIRECCIÓN GENERAL',
            isActive: true,
            is_active: true
        }];
    }
};

/**
 * @description Crea o actualiza una sede / iglesia y asigna a su responsable.
 */
export const createOrUpdateSedeSupabase = async (params: {
    id?: string;
    nombre: string;
    ciudad?: string;
    pais?: string;
    responsableId?: string;
    responsableNombre?: string;
}) => {
    try {
        const { data, error } = await supabase.rpc('create_or_update_sede', {
            p_id: params.id || null,
            p_nombre: params.nombre,
            p_ciudad: params.ciudad || 'Caracas',
            p_pais: params.pais || 'Venezuela',
            p_responsable_id: params.responsableId || null,
            p_responsable_nombre: params.responsableNombre || null
        });
        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        // Fallback directo
        try {
            const sedeId = params.id || `SEDE-${params.nombre.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`;
            const { error: insError } = await supabase.from('sedes').upsert({
                id: sedeId,
                nombre: params.nombre,
                ciudad: params.ciudad || 'Caracas',
                pais: params.pais || 'Venezuela',
                responsable_id: params.responsableId || null,
                responsable_nombre: params.responsableNombre || null,
                updated_at: new Date().toISOString()
            });
            if (insError) throw insError;
            return { success: true, data: { sede_id: sedeId } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
};

/**
 * @description Reasigna a un agente a una sede específica a 1 clic.
 */
export const assignAgentSedeSupabase = async (agentId: string, sedeId: string) => {
    try {
        const { data, error } = await supabase.rpc('assign_agent_sede', {
            p_agent_id: agentId,
            p_sede_id: sedeId
        });
        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        try {
            const { error: updErr } = await supabase.from('agentes').update({ sede_id: sedeId }).eq('id', agentId);
            if (updErr) throw updErr;
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
};

