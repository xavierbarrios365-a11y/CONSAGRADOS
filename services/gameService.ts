import { supabase } from './supabaseClient';
import { BibleWarSession, IQLevel, Agent } from '../types';

/**
 * @description Envía un desafío de duelo.
 */
export const sendDuelChallenge = async (challengerId: string, opponentId: string) => {
    try {
        const { data, error } = await supabase.from('duelo_desafios').insert([{
            retador_id: challengerId,
            oponente_id: opponentId,
            status: 'PENDIENTE'
        }]).select();
        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Registra la completitud de un nivel de IQ.
 */
export const submitIQLevelComplete = async (agentId: string, level: number, timeTakenSecs: number = 0) => {
    try {
        const { data, error } = await supabase.rpc('process_iq_level_complete', {
            p_agent_id_input: agentId,
            p_level_achieved: level,
            p_time_taken_secs: timeTakenSecs
        });
        if (error) throw error;
        return { success: data.success, error: data.error };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Obtiene datos de la academia.
 */
export const fetchAcademyDataSupabase = async (agentId: string) => {
    try {
        const { data: coursesRaw } = await supabase.from('academy_courses').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(50);
        const { data: lessonsRaw } = await supabase.from('academy_lessons').select('*').order('order_index').limit(200);
        const { data: progressRaw } = await supabase.from('academy_progress').select('*').eq('agent_id', agentId).limit(100);

        // Mapeo de DB -> Frontend (Cursos)
        const mappedCourses = (coursesRaw || []).map((c: any) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            imageUrl: c.image_url,
            requiredLevel: c.required_level,
            orderIndex: c.order_index
        }));

        // Mapeo de DB -> Frontend (Lecciones)
        const mappedLessons = (lessonsRaw || []).map((l: any) => {
            let parsedQ = [];
            let parsedJsonObj = null;

            if (typeof l.questions_json === 'string' && l.questions_json.trim()) {
                try {
                    parsedJsonObj = JSON.parse(l.questions_json);
                } catch (e) { }
            } else if (l.questions_json && typeof l.questions_json === 'object') {
                parsedJsonObj = l.questions_json;
            } else if (typeof l.questions === 'string' && l.questions.trim()) {
                try { parsedJsonObj = JSON.parse(l.questions); } catch (e) { }
            } else if (l.questions && typeof l.questions === 'object') {
                parsedJsonObj = l.questions;
            }

            // Extract array from parsed object
            if (Array.isArray(parsedJsonObj)) {
                parsedQ = parsedJsonObj;
            } else if (parsedJsonObj && Array.isArray(parsedJsonObj.questions)) {
                parsedQ = parsedJsonObj.questions;
            }

            return {
                id: l.id,
                courseId: l.course_id,
                order: l.order_index,
                title: l.title,
                videoUrl: l.video_url,
                content: l.content,
                questions: parsedQ,
                xpReward: l.xp_reward || (parsedJsonObj?.xpReward) || 0,
                startTime: l.start_time,
                endTime: l.end_time,
                resultAlgorithm: l.result_algorithm || (parsedJsonObj?.resultAlgorithm) || null,
                resultMappings: l.result_mappings || (parsedJsonObj?.resultMappings) || null
            };
        });

        // Mapeo de DB -> Frontend (Progreso)
        const mappedProgress = (progressRaw || []).map((p: any) => ({
            lessonId: p.lesson_id,
            status: p.is_completed ? 'COMPLETADO' : 'FALLIDO',
            score: p.score || 0,
            date: p.completed_at || '',
            attempts: p.attempts || 0
        }));

        return { courses: mappedCourses, lessons: mappedLessons, progress: mappedProgress };
    } catch (e: any) {
        console.error('❌ Error academy:', e.message);
        return { courses: [], lessons: [], progress: [] };
    }
};
/**
 * @description Obtiene los desafíos de duelo del usuario.
 */
export const fetchMyChallenges = async (agentId: string) => {
    try {
        const { data, error } = await supabase
            .from('duelo_desafios')
            .select('*')
            .or(`retador_id.eq.${agentId},oponente_id.eq.${agentId}`)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (e: any) {
        return [];
    }
};

/**
 * @description Acepta un desafío de duelo.
 */
export const acceptDuelChallenge = async (challengeId: string, retadorId?: string, oponenteId?: string) => {
    try {
        const { error } = await supabase.from('duelo_desafios').update({ status: 'ACEPTADO' }).eq('id', challengeId);
        if (error) throw error;

        // Asumimos que la BDD crea la sesión vía trigger, buscamos la sesión generada.
        const { data: session } = await supabase
            .from('duelo_sesiones')
            .select('id')
            .or(`gladiator_a_id.eq.${retadorId},gladiator_b_id.eq.${retadorId}`)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        return { success: true, sessionId: session?.id };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Obtiene preguntas para Bible War.
 */
export const fetchBibleWarQuestions = async (category?: string) => {
    try {
        let query = supabase.from('bible_war_questions').select('*');
        if (category && category !== 'ALL') {
            query = query.eq('category', category);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (e: any) {
        console.error('❌ Error fetching Bible War questions:', e.message);
        return [];
    }
};

/**
 * --- TASKS LOGIC ---
 */

export const fetchTasksSupabase = async () => {
    try {
        const { data, error } = await supabase.from('tareas_tacticas').select('*').order('created_at', { ascending: false }).limit(50);
        if (error) throw error;
        return data || [];
    } catch (e: any) {
        return [];
    }
};

export const createTaskSupabase = async (task: any) => {
    try {
        const { data, error } = await supabase.from('tareas_tacticas').insert([task]).select();
        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const deleteTaskSupabase = async (taskId: string) => {
    try {
        const { error } = await supabase.from('tareas_tacticas').delete().eq('id', taskId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const submitTaskCompletionSupabase = async (taskId: string, agentId: string, proofUrl?: string) => {
    try {
        const { error } = await supabase.from('tareas_completadas').insert([{
            tarea_id: taskId,
            agent_id: agentId,
            completado: true,
            evidencia_url: proofUrl || null
        }]);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const verifyTaskSupabase = async (params: { taskId: string, agentId: string, agentName?: string, verifiedBy?: string, xpReward?: number, taskTitle?: string }) => {
    try {
        const { error } = await supabase.from('tareas_completadas').update({ status: 'VERIFICADO', verificado: true }).eq('tarea_id', params.taskId).eq('agent_id', params.agentId);
        if (error) throw error;
        // Si hay que sumar XP, sería otro rpc o update
        try {
            if (params.xpReward) {
                await supabase.rpc('add_xp', { p_agent_id: params.agentId, p_amount: params.xpReward });
            }
        } catch (e) { }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const fetchTaskRecruitsSupabase = async (taskId?: string) => {
    try {
        let query = supabase.from('tareas_completadas').select('*, agentId:agent_id, taskId:tarea_id');
        if (taskId) query = query.eq('tarea_id', taskId);

        const { data, error } = await query;
        if (error) throw error;

        return data.map(d => ({
            ...d,
            agentId: d.agentId || d.agent_id,
            taskId: d.taskId || d.tarea_id,
            agentName: d.agent_name || 'Agente',
            status: d.status || (d.verificado ? 'VERIFICADO' : 'PENDIENTE')
        })) || [];
    } catch (e: any) {
        return [];
    }
};

export const removeRecruitFromTaskSupabase = async (taskId: string, agentId: string) => {
    try {
        const { error } = await supabase.from('tareas_completadas').delete().eq('tarea_id', taskId).eq('agent_id', agentId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const updateTaskStatusSupabase = async (params: { taskId: string, agentId: string, status: string }) => {
    try {
        const { error } = await supabase.from('tareas_completadas').update({ status: params.status }).eq('tarea_id', params.taskId).eq('agent_id', params.agentId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const assignAgentToBibleWarGroup = async (agentId: string, groupId: string) => {
    try {
        const { error } = await supabase.from('agentes').update({ bible_war_group: groupId }).eq('id', agentId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * --- ACADEMY MANAGEMENT ---
 */

export const saveBulkAcademyDataSupabase = async (data: { courses: any[], lessons: any[] }) => {
    try {
        if (data.courses.length > 0) {
            const mappedCourses = data.courses.map(c => ({
                id: c.id,
                title: c.title,
                description: c.description,
                image_url: c.imageUrl || c.image_url,
                required_level: c.requiredLevel || c.required_level,
                order_index: c.orderIndex || c.order_index || c.order || 1,
                is_active: c.isActive !== undefined ? c.isActive : (c.is_active !== undefined ? c.is_active : true)
            }));
            const { error: err1 } = await supabase.from('academy_courses').upsert(mappedCourses);
            if (err1) throw err1;
        }
        if (data.lessons.length > 0) {
            const mappedLessons = data.lessons.map(l => ({
                id: l.id,
                course_id: l.courseId || l.course_id,
                order_index: l.order || l.orderIndex || l.order_index || 1,
                title: l.title,
                video_url: l.videoUrl || l.video_url || '',
                content: l.content || '',
                questions_json: l.questions || l.questions_json || [],
                xp_reward: l.xpReward || l.xp_reward || 0,
                start_time: l.startTime || l.start_time || null,
                end_time: l.endTime || l.end_time || null,
                result_algorithm: l.resultAlgorithm || l.result_algorithm || null,
                result_mappings: l.resultMappings || l.result_mappings || null
            }));
            const { error: err2 } = await supabase.from('academy_lessons').upsert(mappedLessons);
            if (err2) throw err2;
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const deleteAcademyCourseSupabase = async (courseId: string) => {
    try {
        const { error } = await supabase.from('academy_courses').delete().eq('id', courseId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const deleteAcademyLessonSupabase = async (lessonId: string) => {
    try {
        const { error } = await supabase.from('academy_lessons').delete().eq('id', lessonId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const submitQuizResultSupabase = async (
    agentId: string,
    lessonId: string,
    courseId: string,
    score: number,
    passed: boolean,
    attempts: number = 1
) => {
    try {
        const { error } = await supabase.from('academy_progress').upsert({
            agent_id: agentId,
            lesson_id: lessonId,
            course_id: courseId,
            score: score,
            is_completed: passed,
            attempts: attempts,
            completed_at: new Date().toISOString()
        });
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const resetStudentAttemptsSupabase = async (agentId: string, lessonId: string) => {
    try {
        const { error } = await supabase.from('academy_progress').delete().eq('agent_id', agentId).eq('lesson_id', lessonId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Limpia todas las preguntas de Bible War.
 */
export const clearBibleWarQuestions = async () => {
    try {
        const { error } = await supabase.from('bible_war_questions').delete().neq('category', 'DO_NOT_DELETE');
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Alias para compatibilidad con GeminiCommandCenter.
 */
export const syncAcademyToSupabase = saveBulkAcademyDataSupabase;

/**
 * --- BIBLE WAR LOGIC ---
 */

export const fetchBibleWarSession = async (): Promise<BibleWarSession | null> => {
    try {
        const { data, error } = await supabase.from('bible_war_sessions').select('*').single();
        if (error) throw error;
        return data;
    } catch (e: any) {
        console.error('❌ Error fetching Bible War session:', e.message);
        return null;
    }
};

export const updateBibleWarSession = async (updates: Partial<BibleWarSession>) => {
    try {
        // Intentar obtener el ID desde updates, o buscar el único id existente
        let sessionId = (updates as any).id;

        if (!sessionId) {
            const { data: current } = await supabase.from('bible_war_sessions').select('id').limit(1).single();
            sessionId = current?.id || '00000000-0000-0000-0000-000000000001';
        }

        const { error } = await supabase.from('bible_war_sessions').update(updates).eq('id', sessionId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error('❌ Error updating Bible War session:', e.message);
        return { success: false, error: e.message };
    }
};

export const transferBibleWarXP = async (winner: 'A' | 'B' | 'NONE' | 'TIE', amount: number) => {
    try {
        const { data, error } = await supabase.rpc('transfer_bible_war_xp', {
            p_winner: winner,
            p_amount: amount
        });
        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const fetchBibleWarGroups = async () => {
    try {
        const { data, error } = await supabase.from('bible_war_groups').select('*');
        if (error) throw error;
        return data || [];
    } catch (e: any) {
        return [];
    }
};

export const submitBibleWarAnswer = async (agentId: string, answer: string, team: 'A' | 'B') => {
    try {
        const column = team === 'A' ? 'answer_a' : 'answer_b';
        const { error } = await supabase.from('bible_war_sessions').update({ [column]: answer }).eq('status', 'ACTIVE');
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

export const importBibleWarQuestions = async (questions: any[]) => {
    try {
        // Primero limpiar (opcional, según lógica original)
        // await supabase.from('bible_war_questions').delete().neq('categoria', 'DO_NOT_DELETE');
        const { error } = await supabase.from('bible_war_questions').insert(questions);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * --- IQ LEVELS LOGIC ---
 */

export const fetchLevelConfigs = async (): Promise<IQLevel[]> => {
    try {
        const { data, error } = await supabase.from('iq_levels').select('*').order('level');
        if (error) throw error;
        return data || [];
    } catch (e: any) {
        return [];
    }
};
