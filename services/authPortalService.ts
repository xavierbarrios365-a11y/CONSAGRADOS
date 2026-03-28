import { supabase } from './supabaseClient';

export interface DeploymentAuthorizationData {
    id?: string;
    agent_id: string;
    agent_name: string;
    representative_name: string;
    representative_id: string;
    phone: string;
    signature_data: string;
    tutor_name?: string;
    created_at?: string;
}

/**
 * @description Envía una nueva autorización de despliegue a Supabase.
 */
export const submitAuthorizationSupabase = async (data: DeploymentAuthorizationData) => {
    try {
        const { error } = await supabase
            .from('deployment_authorizations')
            .insert([data]);

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error('❌ Error enviando autorización:', e.message);
        return { success: false, error: e.message };
    }
};

/**
 * @description Obtiene todas las autorizaciones registradas.
 */
export const fetchAuthorizationsSupabase = async (): Promise<DeploymentAuthorizationData[]> => {
    try {
        const { data, error } = await supabase
            .from('deployment_authorizations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (e: any) {
        console.error('❌ Error obteniendo autorizaciones:', e.message);
        return [];
    }
};

/**
 * @description Elimina una autorización.
 */
export const deleteAuthorizationSupabase = async (id: string) => {
    try {
        const { error } = await supabase
            .from('deployment_authorizations')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};
