import { supabase } from './supabaseClient';

/**
 * @description Verifica el PIN de un agente.
 */
export const verifyAgentPinSupabase = async (agentId: string, pin: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase
            .from('agentes')
            .select('id')
            .eq('id', agentId)
            .eq('pin', pin)
            .maybeSingle();

        if (error) throw error;
        return !!data;
    } catch (e: any) {
        console.error('❌ Error verificando PIN:', e.message);
        return false;
    }
};

/**
 * @description Actualiza el PIN de un agente.
 */
export const updateAgentPinSupabase = async (agentId: string, newPin: string) => {
    try {
        const { error } = await supabase.from('agentes').update({ pin: newPin, must_change_password: false }).eq('id', agentId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Actualiza la credencial biométrica.
 */
export const updateBiometricSupabase = async (agentId: string, credentialString: string) => {
    try {
        const { error } = await supabase.from('agentes').update({ biometric_credential: credentialString }).eq('id', agentId);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Recupera el PIN mediante pregunta de seguridad.
 */
export const recoveryAgentPinSupabase = async (agentId: string, answer: string): Promise<string | null> => {
    try {
        const { data, error } = await supabase.rpc('recover_agent_pin', {
            p_agent_id: agentId,
            p_answer: answer
        });
        if (error) throw error;
        return data;
    } catch (e: any) {
        console.error('❌ Error recuperando PIN:', e.message);
        return null;
    }
};

/**
 * @description Obtiene la pregunta de seguridad de un agente.
 */
export const getSecurityQuestionSupabase = async (id: string): Promise<string | null> => {
    try {
        const { data, error } = await supabase.from('agentes').select('security_question').eq('id', id).single();
        if (error) throw error;
        return data?.security_question || null;
    } catch (e) {
        return null;
    }
};

/**
 * @description Resetea el PIN usando la respuesta de seguridad.
 */
export const resetPasswordWithAnswerSupabase = async (id: string, answer: string, newPin: string) => {
    try {
        const { error } = await supabase.rpc('reset_password_with_answer', {
            p_id: id,
            p_answer: answer,
            p_new_pin: newPin
        });
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

/**
 * @description Registra un nuevo agente desde el formulario de enrolamiento.
 */
export const enrollAgentSupabase = async (formData: any) => {
    try {
        // Generar ID
        const nameParts = formData.nombre.trim().split(' ');
        const firstLetter = nameParts[0]?.charAt(0).toUpperCase() || 'X';
        const secondLetter = nameParts.length > 1 ? nameParts[1]?.charAt(0).toUpperCase() : (nameParts[0]?.charAt(1)?.toUpperCase() || 'X');
        const randomNum = Math.floor(100 + Math.random() * 900);
        const generatedId = `${firstLetter}${secondLetter}${randomNum}`;

        // Generar PIN
        const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

        const { error } = await supabase.from('agentes').insert([{
            id: generatedId,
            nombre: formData.nombre,
            whatsapp: formData.whatsapp,
            pin: generatedPin,
            user_role: formData.nivel === 'DIRECTOR' ? 'DIRECTOR' : formData.nivel === 'LIDER' ? 'LEADER' : 'STUDENT',
            rango: 'RECLUTA',
            cargo: 'ESTUDIANTE',
            xp: 0,
            status: 'ACTIVO',
            joined_date: new Date().toISOString(),
            foto_url: formData.photoUrl || null,
            talent: formData.talento || null,
            baptism_status: formData.bautizado || 'NO',
            relationship_with_god: formData.relacion || null,
            birthday: formData.fechaNacimiento || null,
            security_question: formData.preguntaSeguridad || null,
            security_answer: formData.respuestaSeguridad || null
        }]);

        if (error) throw error;
        return { success: true, newId: generatedId, newPin: generatedPin };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
};

import { Agent } from '../types';
