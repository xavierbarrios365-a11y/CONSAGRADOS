import { supabase } from './supabaseClient';

/**
 * @description Obtiene los recursos tácticos (PDFs, Enlaces, etc).
 */
export const fetchTacticalResourcesSupabase = async () => {
    try {
        const { data, error } = await supabase
            .from('recursos_tacticos')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (e: any) {
        console.error('Error fetching resources:', e.message);
        return [];
    }
};

/**
 * @description Agrega un nuevo recurso táctico.
 */
export const addTacticalResourceSupabase = async (resource: any) => {
    try {
        const { data, error } = await supabase.from('recursos_tacticos').insert([resource]).select();
        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Elimina un recurso táctico.
 */
export const deleteTacticalResourceSupabase = async (id: string) => {
    try {
        const { error } = await supabase.from('recursos_tacticos').delete().eq('id', id);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};
