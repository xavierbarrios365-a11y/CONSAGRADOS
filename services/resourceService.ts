import { supabase } from './supabaseClient';

/**
 * @description Obtiene los recursos tácticos (PDFs, Enlaces, Google Drive, etc) con soporte multi-sede y compatibilidad.
 */
export const fetchTacticalResourcesSupabase = async (sedeId?: string) => {
    try {
        let query = supabase.from('tactical_resources').select('*');
        if (sedeId && sedeId !== 'GLOBAL') {
            query = query.or(`sede_id.eq.${sedeId},sede_id.is.null,sede_id.eq.GLOBAL`);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
            return data.map((r: any) => ({
                id: r.id,
                title: r.title,
                name: r.title,
                type: r.type,
                driveUrl: r.drive_url || r.driveUrl,
                url: r.drive_url || r.driveUrl,
                sedeId: r.sede_id || 'GLOBAL',
                createdAt: r.created_at
            }));
        }

        // Fallback a 'recursos_tacticos'
        const fb = await supabase.from('recursos_tacticos').select('*').order('created_at', { ascending: false });
        return (fb.data || []).map((r: any) => ({
            id: r.id,
            title: r.title || r.name,
            name: r.title || r.name,
            type: r.type,
            driveUrl: r.driveUrl || r.drive_url || r.url,
            url: r.driveUrl || r.drive_url || r.url,
            sedeId: r.sede_id || 'GLOBAL',
            createdAt: r.created_at || r.createdAt
        }));
    } catch (e: any) {
        console.error('Error fetching resources:', e.message);
        return [];
    }
};

/**
 * @description Agrega un nuevo recurso táctico (PDF, Enlace de Drive, etc).
 */
export const addTacticalResourceSupabase = async (resource: any) => {
    try {
        const payload = {
            id: resource.id || `REC_${Date.now()}`,
            title: resource.title || resource.name,
            type: resource.type || 'ESTUDIANTE',
            drive_file_id: resource.driveFileId || resource.drive_file_id || 'manual_entry',
            drive_url: resource.driveUrl || resource.drive_url || resource.url,
            sede_id: resource.sedeId || resource.sede_id || 'GLOBAL',
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase.from('tactical_resources').insert([payload]).select();
        if (!error && data) return { success: true, data: data[0] };

        // Fallback a recursos_tacticos
        const fb = await supabase.from('recursos_tacticos').insert([resource]).select();
        if (fb.error) throw fb.error;
        return { success: true, data: fb.data[0] };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Elimina un recurso táctico.
 */
export const deleteTacticalResourceSupabase = async (id: string) => {
    try {
        await supabase.from('tactical_resources').delete().eq('id', id);
        await supabase.from('recursos_tacticos').delete().eq('id', id);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};
