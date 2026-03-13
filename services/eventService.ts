import { supabase } from './supabaseClient';
import { Visitor } from '../types';

/**
 * @description Obtiene el radar de visitantes (personas que no son agentes).
 */
export const fetchVisitorRadarSupabase = async (): Promise<Visitor[]> => {
    try {
        const { data, error } = await supabase
            .from('asistencia_visitas')
            .select('*')
            .is('tipo', null)
            .order('registrado_en', { ascending: false });
        if (error) throw error;
        return (data || []).map(v => ({
            id: v.id,
            name: v.agent_name,
            whatsapp: v.whatsapp,
            reason: v.motivo,
            date: v.registrado_en,
            status: 'VISITANTE'
        })) as unknown as Visitor[];
    } catch (e: any) {
        console.error('Error in fetchVisitorRadarSupabase:', e.message);
        return [];
    }
};

/**
 * @description Registra un nuevo visitante.
 */
export const registerVisitorSupabase = async (
    id: string,
    name: string,
    reporter?: string,
    referrerId?: string,
    referrerName?: string
) => {
    try {
        const { data, error } = await supabase.from('asistencia_visitas').insert({
            agent_name: name,
            whatsapp: 'NO_REGISTRADO',
            motivo: reporter || 'APP_VISITOR',
            registrado_en: new Date().toISOString()
        }).select().single();
        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Obtiene los eventos activos (misiones).
 */
export const fetchActiveEventsSupabase = async () => {
    try {
        const { data, error } = await supabase
            .from('eventos')
            .select('*')
            .eq('activo', true)
            .order('fecha', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (e: any) {
        console.error('Error in fetchActiveEventsSupabase:', e.message);
        return [];
    }
};

/**
 * @description Obtiene las confirmaciones de un usuario para eventos.
 */
export const fetchUserEventConfirmationsSupabase = async (agentId: string) => {
    try {
        const { data, error } = await supabase
            .from('asistencia_visitas')
            .select('*')
            .eq('agent_id', agentId)
            .ilike('detalle', 'Confirmación para evento:%')
            .order('registrado_en', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (e: any) {
        console.error('Error in fetchUserEventConfirmationsSupabase:', e.message);
        return [];
    }
};

/**
 * @description Confirma asistencia a un evento.
 */
export const confirmEventAttendanceSupabase = async (payload: { agentId: string, agentName: string, eventId: string, eventTitle: string }) => {
    try {
        const { data, error } = await supabase.from('asistencia_visitas').insert({
            agent_id: payload.agentId,
            agent_name: payload.agentName,
            tipo: 'EVENTO_CONFIRMADO',
            detalle: `Confirmación para evento: ${payload.eventTitle}`,
            registrado_en: new Date().toISOString()
        });
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Confirma asistencia del director.
 */
export const confirmDirectorAttendanceSupabase = async (agentId: string, agentName: string) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        // Verificar si ya confirmó hoy
        const { data: existing } = await supabase
            .from('asistencia_visitas')
            .select('id')
            .eq('agent_id', agentId)
            .ilike('detalle', 'Confirmación Director:%')
            .gte('registrado_en', today)
            .single();

        if (existing) {
            return { alreadyDone: true };
        }

        const { error } = await supabase.from('asistencia_visitas').insert({
            agent_id: agentId,
            agent_name: agentName,
            tipo: 'DIRECTOR_ASISTENCIA',
            detalle: `Confirmación Director: ${today}`,
            registrado_en: new Date().toISOString()
        });
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Registra una transacción/asistencia vía QR.
 */
export const submitTransactionSupabase = async (agentId: string, type: string, agentName?: string) => {
    try {
        const { error } = await supabase.from('asistencia_visitas').insert({
            agent_id: agentId,
            agent_name: agentName || 'Agente',
            tipo: 'QR_SCAN',
            detalle: `Escaneo QR: ${type}`,
            registrado_en: new Date().toISOString()
        });
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Aplica penalizaciones por inasistencia (Skeleton).
 */
export const applyAbsencePenaltiesSupabase = async () => {
    // Esta función suele llamar a un RPC complejo o manejar lógica de fechas.
    // Para no bloquear el dev server, retornamos éxito vacío si no tenemos el código exacto.
    try {
        const { data, error } = await supabase.rpc('apply_absence_penalties');
        if (error) throw error;
        return { success: true, agentsPenalized: data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};
/**
 * @description Crea un nuevo evento táctico.
 */
export const createEventSupabase = async (event: any) => {
    try {
        const { data, error } = await supabase.from('eventos').insert([{
            titulo: event.title,
            fecha: event.date,
            hora: event.time,
            descripcion: event.description,
            activo: true
        }]).select();
        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Elimina un evento.
 */
export const deleteEventSupabase = async (id: string) => {
    try {
        const { error } = await supabase.from('eventos').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};
