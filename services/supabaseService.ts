import { supabase } from './supabaseClient';
import { Agent } from '../types';

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
        // Primero, obtener valores actuales
        const { data: currentData, error: fetchError } = await supabase
            .from('agentes')
            .select('xp, bible, notes, leadership')
            .eq('id', agentId)
            .single();

        if (fetchError) throw fetchError;

        // Actualizar el campo correspondiente y sumar XP base
        const updates: any = { xp: (currentData.xp || 0) + amount };
        if (type === 'BIBLIA') updates.bible = (currentData.bible || 0) + 1;
        if (type === 'APUNTES') updates.notes = (currentData.notes || 0) + 1;
        if (type === 'LIDERAZGO') updates.leadership = (currentData.leadership || 0) + 1;

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
 * @description Aplica penalizaciones de 5 XP a todos los agentes con >14 días inactivos
 */
export const applyAbsencePenaltiesSupabase = async (): Promise<{ success: boolean, agentsPenalized?: number, error?: string }> => {
    try {
        const { data: agents, error: fetchError } = await supabase
            .from('agentes')
            .select('id, xp, last_attendance');

        if (fetchError) throw fetchError;

        const now = new Date();
        const agentsToUpdate = agents.filter((a: any) => {
            if (!a.last_attendance || a.last_attendance === 'N/A') return false;
            let lastDate = new Date(a.last_attendance);
            if (a.last_attendance.includes('/')) {
                const parts = a.last_attendance.split('/');
                if (parts.length === 3) lastDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
            if (isNaN(lastDate.getTime())) return false;
            const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays >= 14;
        });

        if (agentsToUpdate.length === 0) return { success: true, agentsPenalized: 0 };

        let count = 0;
        for (const agent of agentsToUpdate) {
            const newXp = Math.max(0, (agent.xp || 0) - 5);
            const { error: updateError } = await supabase
                .from('agentes')
                .update({ xp: newXp })
                .eq('id', agent.id);
            if (!updateError) count++;
        }

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
        const { data, error } = await supabase.from('asistencia_visitas').select('*').eq('agent_id', agentId);
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

        const { error } = await supabase.from('asistencia_visitas').insert({
            id,
            agent_id: data.agentId,
            agent_name: data.agentName,
            tipo_visitante: 'AGENTE',
            fecha_visita: new Date().toISOString()
        });
        if (error) throw error;

        // Sumar XP por asistir
        await updateAgentPointsSupabase(data.agentId, 'LIDERAZGO', 30);

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
            referido_por: data.referidoPor || '' // Custom field not in DB schema but let's pass it if added
        };

        // Note: We might get an error if column doesn't exist, we will clean it up:
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

export const submitTransactionSupabase = async (rawString: string, type: 'ASISTENCIA' | 'SALIDA' | 'IDENTIFICACION' = 'IDENTIFICACION', referidoPor?: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const { error } = await supabase
            .from('asistencia_visitas')
            .insert({
                agent_id: rawString,
                type: type,
                location: 'CORE_V37_NODE',
                timestamp: new Date().toISOString(),
                referido_por: referidoPor || null
            });

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('Error recording transaction in Supabase:', error);
        return { success: false, error: error.message };
    }
};
