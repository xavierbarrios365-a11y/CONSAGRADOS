import { supabase } from './supabaseClient';
import { Agent } from '../types';
import { sendTelegramAlert, sendPushBroadcast } from './notifyService';

/**
 * @description Sincroniza un agente desde Google Sheets hacia Supabase.
 * Se puede llamar durante el login o una actualización de datos.
 */
export const syncAgentToSupabase = async (agent: Agent) => {
    try {
        const { error } = await supabase
            .from('agentes')
            .upsert({
                id: agent.id,
                nombre: agent.name,
                xp: agent.xp || 0,
                rango: agent.rank,
                cargo: agent.accessLevel || agent.role,
                whatsapp: agent.whatsapp,
                foto_url: agent.photoUrl,
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
            }, { onConflict: 'id' });

        if (error) {
            console.error('❌ Error sincronizando agente a Supabase:', error.message);
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
        const { data, error } = await supabase.from('agentes').select('*');
        if (error) {
            console.error('❌ Error obteniendo agentes de Supabase:', error);
            return [];
        }

        if (!data || data.length === 0) return [];

        return data.map((d: any) => ({
            id: d.id,
            name: d.nombre,
            xp: d.xp || 0,
            rank: d.rango || 'RECLUTA',
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
            userRole: String(d.nombre).toUpperCase().includes('SAHEL') ? 'DIRECTOR' : (d.user_role || (d.cargo === 'DIRECTOR' ? 'DIRECTOR' : d.cargo === 'LÍDER' ? 'LEADER' : 'STUDENT')),
            idSignature: `V37-SIG-${d.id}`,
            joinedDate: d.joined_date || '',
            birthday: d.birthday || '',
            relationshipWithGod: d.relationship_with_god || 'PENDIENTE',
            securityQuestion: d.security_question || '',
            securityAnswer: d.security_answer || '',
            mustChangePassword: d.must_change_password || false,
            biometricCredential: d.biometric_credential || '',
            streakCount: d.streak_count || 0,
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
 * @description Actualiza puntos específicos de un agente en Supabase (XP, Biblia, etc.)
 */
export const updateAgentPointsSupabase = async (agentId: string, type: 'BIBLIA' | 'APUNTES' | 'LIDERAZGO' | 'XP', amount: number = 10): Promise<{ success: boolean, error?: string }> => {
    try {
        // Primero, obtener valores actuales y racha
        const { data: currentData, error: fetchError } = await supabase
            .from('agentes')
            .select('xp, bible, notes, leadership, streak_count')
            .eq('id', agentId)
            .single();

        if (fetchError) throw fetchError;

        // Calcular Multiplicador Bidireccional (basado en streak_count)
        let multiplier = 1.0;
        const streak = currentData.streak_count || 0;
        if (streak >= 30) multiplier = 2.0;
        else if (streak >= 20) multiplier = 1.75;
        else if (streak >= 10) multiplier = 1.50;
        else if (streak >= 5) multiplier = 1.25;

        // Multiplicar el monto de XP
        const adjustedAmount = Math.round(amount * multiplier);

        // Actualizar el campo correspondiente y sumar/restar XP base
        // Evitamos que el XP global baje de 0
        const updates: any = { xp: Math.max(0, (currentData.xp || 0) + adjustedAmount) };

        // Agregar o restar a los contadores específicos según el signo del monto
        const counterChange = amount > 0 ? 1 : (amount < 0 ? -1 : 0);

        if (type === 'BIBLIA') updates.bible = Math.max(0, (currentData.bible || 0) + counterChange);
        if (type === 'APUNTES') updates.notes = Math.max(0, (currentData.notes || 0) + counterChange);
        if (type === 'LIDERAZGO') updates.leadership = Math.max(0, (currentData.leadership || 0) + counterChange);

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
 * @description Actualiza la racha de un agente en Supabase
 */
export const updateAgentStreaksSupabase = async (agentId: string, isWeekComplete: boolean, tasks: any[], agentName?: string, verseText?: string, verseRef?: string): Promise<{ success: boolean, streak?: number, lastStreakDate?: string, error?: string }> => {
    try {
        const { data: currentData, error: fetchError } = await supabase
            .from('agentes')
            .select('streak_count, last_streak_date, xp')
            .eq('id', agentId)
            .single();

        if (fetchError) throw fetchError;

        const now = new Date();
        const localToday = now.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

        // Calcular nueva racha
        const newStreak = (currentData.streak_count || 0) + 1;
        const newXp = (currentData.xp || 0) + 5; // Recompensa base por racha diaria

        const { error: updateError } = await supabase
            .from('agentes')
            .update({
                streak_count: newStreak,
                last_streak_date: now.toISOString(),
                weekly_tasks: tasks,
                xp: newXp
            })
            .eq('id', agentId);

        if (updateError) throw updateError;

        // Generar noticia de racha
        try {
            let detalle = `Ha alcanzado una racha de ${newStreak} días consecutivos.`;
            if (verseText) {
                detalle += ` [VERSE]: ${verseText}`;
                if (verseRef) detalle += ` [REF]: ${verseRef}`;
            }

            await supabase.from('asistencia_visitas').insert({
                id: `NEWS-${Date.now()}`,
                agent_id: agentId,
                agent_name: agentName || 'Agente',
                tipo: 'RACHA',
                detalle: detalle,
                registrado_en: now.toISOString()
            });
        } catch (e) {
            console.error("Error al publicar noticia de racha:", e);
        }

        return { success: true, streak: newStreak, lastStreakDate: now.toISOString() };
    } catch (error: any) {
        console.error('❌ Error actualizando racha en Supabase:', error.message);
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

        const currentXp = currentData.xp || 0;
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
            .like('detalle', `%${lastAttendanceDay}%`)
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
                id: `PEN-${Date.now()}`,
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
            const newXp = Math.max(0, (agent.xp || 0) - penaltyAmount);

            const { error: updateError } = await supabase
                .from('agentes')
                .update({ xp: newXp })
                .eq('id', agent.id);
            if (!updateError) count++;
        }

        // 5. Registrar ejecución de sanción global
        await supabase.from('asistencia_visitas').insert({
            id: `PEN-${Date.now()}`,
            agent_id: 'SISTEMA',
            tipo: 'SANCION_AUTOMATICA',
            detalle: `Evaluación de inasistencia para ${lastAttendanceDay}: ${count} agentes sancionados con -10 XP (base).`,
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
        const id = `EVT-${new Date().getTime()}`;

        // 1. Verificar duplicados
        const { data: duplicates } = await supabase
            .from('asistencia_visitas')
            .select('id')
            .eq('agent_id', data.agentId)
            .eq('tipo', 'EVENTO_CONFIRMADO')
            .like('detalle', `%${data.eventTitle}%`);

        if (duplicates && duplicates.length > 0) {
            return { success: false, error: "Ya estás confirmado para este evento." };
        }

        // 2. Insertar confirmación
        const { error } = await supabase.from('asistencia_visitas').insert({
            id,
            agent_id: data.agentId,
            agent_name: data.agentName,
            tipo: 'EVENTO_CONFIRMADO',
            detalle: `Confirmación para evento: ${data.eventTitle}`,
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
        const { data, error } = await supabase.from('tareas').select('*').order('fecha_creacion', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch { return []; }
};

/**
 * @description Las llamadas de Progreso de Tareas usan Sheets por ahora hasta que se acople la vista
 */
export const fetchTaskRecruitsSupabase = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase.from('progreso_tareas').select('*');
        if (error) throw error;
        return data || [];
    } catch { return []; }
};

/**
 * @description Crea una nueva tarea en Supabase
 */
export const createTaskSupabase = async (data: { title: string; description: string; area: string; requiredLevel: string; xpReward: number; maxSlots: number }): Promise<{ success: boolean, error?: string }> => {
    try {
        const { error } = await supabase.from('tareas').insert({
            titulo: data.title,
            descripcion: data.description,
            area: data.area,
            nivel_requerido: data.requiredLevel,
            xp_recompensa: data.xpReward,
            max_cupos: data.maxSlots
        });
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
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
            fecha_entrega: new Date().toISOString()
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
            fecha_verificacion: new Date().toISOString()
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
        const { error } = await supabase
            .from('agentes')
            .update({ pin: newPin })
            .eq('id', agentId);
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
                console.error(`❌ Fallo sincronizando curso ${course.id}:`, error.message);
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
                console.error(`❌ Fallo sincronizando lección ${lesson.id}:`, error.message);
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
                console.error(`❌ Fallo sincronizando tarea ${task.id}:`, error.message);
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
        const newId = `CON-${Math.floor(1000 + Math.random() * 9000)}`;
        const newPin = Math.floor(1000 + Math.random() * 9000).toString();

        const record = {
            id: newId,
            nombre: data.nombre || '',
            whatsapp: data.whatsapp || '',
            fecha_nacimiento: data.fechaNacimiento || '',
            talent: data.talento || '',
            baptism_status: data.bautizado || 'NO',
            relacion_con_dios: data.relacion || '',
            cargo: data.nivel || 'ESTUDIANTE',
            foto_url: data.photoUrl || '',
            pin: newPin,
            status: 'ACTIVO',
            rango: (data.nivel === 'LIDER' || data.nivel === 'DIRECTOR') ? 'ACTIVO' : 'RECLUTA',
            xp: 0,
            bible: 0,
            notes: 0,
            leadership: 0,
            fecha_ingreso: new Date().toISOString(),
            pregunta_seguridad: data.preguntaSeguridad || '¿Cuál es tu color favorito?',
            respuesta_seguridad: data.respuestaSeguridad || 'Azul',
            must_change_password: true,
            referido_por: data.referidoPor || ''
        };

        const { error } = await supabase
            .from('agentes')
            .insert({
                id: record.id,
                nombre: record.nombre,
                whatsapp: record.whatsapp,
                fecha_nacimiento: record.fecha_nacimiento,
                talent: record.talent,
                baptism_status: record.baptism_status,
                relacion_con_dios: record.relacion_con_dios,
                cargo: record.cargo,
                foto_url: record.foto_url,
                pin: record.pin,
                status: record.status,
                rango: record.rango,
                xp: record.xp,
                bible: record.bible,
                notes: record.notes,
                leadership: record.leadership,
                fecha_ingreso: record.fecha_ingreso,
                pregunta_seguridad: record.pregunta_seguridad,
                respuesta_seguridad: record.respuesta_seguridad,
                must_change_password: record.must_change_password
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
                id: `TX-${Date.now()}`,
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
                    id: `NEWS-${Date.now()}`,
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
                await sendTelegramAlert(`✅ <b>NUEVA ASISTENCIA</b>\n\nAgente: <b>${agentName}</b> [<code>${agentId}</code>]\nBono Evento: <b>${eventMultiplier}x</b>\nReportadx por: ${reporterName || 'SISTEMA'}`);
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
export const registerVisitorSupabase = async (visitorId: string, visitorName: string, reporterName?: string): Promise<{ success: boolean, error?: string }> => {
    try {
        const id = `VISIT-${new Date().getTime()}`;

        const { error } = await supabase.from('asistencia_visitas').insert({
            id,
            agent_id: visitorId,
            agent_name: visitorName,
            tipo: 'VISITANTE',
            detalle: `Ingreso de invitado. Pasa por: ${reporterName || 'Sistema'}`,
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
            .select('agent_id, agent_name')
            .eq('tipo', 'VISITANTE')
            .order('registrado_en', { ascending: false });

        if (error) throw error;

        // Agrupar por ID para contar visitas
        const visitorMap = new Map<string, { id: string, name: string, visits: number, status: string }>();

        if (data) {
            data.forEach((v: any) => {
                if (visitorMap.has(v.agent_id)) {
                    visitorMap.get(v.agent_id)!.visits += 1;
                } else {
                    visitorMap.set(v.agent_id, {
                        id: v.agent_id,
                        name: v.agent_name,
                        visits: 1,
                        status: 'NUEVO'
                    });
                }
            });
        }

        // Determinar status (ACTIVO > 5 visitas, RECURRENTE > 2, NUEVO = 1 o 2)
        const visitors = Array.from(visitorMap.values()).map(v => {
            if (v.visits > 5) v.status = 'ACTIVO';
            else if (v.visits > 2) v.status = 'RECURRENTE';
            return v;
        });

        return visitors;
    } catch { return []; }
};


/**
 * @description Obtiene el feed de noticias desde la tabla de actividad asistencia_visitas
 */
export const fetchNewsFeedSupabase = async (): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('asistencia_visitas')
            .select('*')
            .order('registrado_en', { ascending: false })
            .limit(50); // Traer las últimas 50 actividades

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

        if (winnerTeam === 'A') {
            newScoreA += totalAward;
            newScoreB -= totalAward;
            newPot = 0; // Se consume el pozo
        } else if (winnerTeam === 'B') {
            newScoreB += totalAward;
            newScoreA -= totalAward;
            newPot = 0; // Se consume el pozo
        } else if (winnerTeam === 'NONE') {
            newScoreA -= stakes;
            newScoreB -= stakes;
            newPot = 0; // Pierden y se pierde el pozo también o se puede mantener? Vamos a dejar que pierdan el pozo.
        } else if (winnerTeam === 'TIE') {
            // Empate: los stakes van al pot para la próxima. Nadie gana ni pierde ahora.
            newPot += stakes;
        }

        // 2. Actualizar sesión global
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

        // 3. TRANSFERENCIA INDIVIDUAL A GLADIADORES (v4.0)
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
                if (winnerTeam === 'A') amountA = totalAward;
                else if (winnerTeam === 'B' || winnerTeam === 'NONE') amountA = -stakes;

                if (amountA !== 0) {
                    const { data: agent } = await supabase.from('agentes').select('xp').eq('id', gadA).single();
                    if (agent) await supabase.from('agentes').update({ xp: (agent.xp || 0) + amountA }).eq('id', gadA);
                }
            }

            // Procesar Agente B
            if (gadB) {
                let amountB = 0;
                if (winnerTeam === 'B') amountB = totalAward;
                else if (winnerTeam === 'A' || winnerTeam === 'NONE') amountB = -stakes;

                if (amountB !== 0) {
                    const { data: agent } = await supabase.from('agentes').select('xp').eq('id', gadB).single();
                    if (agent) await supabase.from('agentes').update({ xp: (agent.xp || 0) + amountB }).eq('id', gadB);
                }
            }
        }

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
