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
 * @description Registra un nuevo agente desde el formulario de enrolamiento con prevención de duplicados por Cédula, Email y Teléfono.
 */
export const enrollAgentSupabase = async (formData: any) => {
    try {
        const cleanCedula = (formData.cedula || '').trim().toUpperCase().replace(/\s+/g, '');
        const cleanEmail = (formData.email || '').trim().toLowerCase();
        const cleanWhatsapp = (formData.whatsapp || '').trim();

        // 1. Verificación de Cédula Duplicada
        if (cleanCedula) {
            const { data: existingByCedula } = await supabase
                .from('agentes')
                .select('id, nombre, tactical_stats')
                .filter('tactical_stats->>cedula', 'eq', cleanCedula)
                .maybeSingle();

            if (existingByCedula) {
                return {
                    success: false,
                    error: `⚠️ Esta Cédula (${cleanCedula}) ya está registrada a nombre de ${existingByCedula.nombre} (ID: ${existingByCedula.id}). Si olvidaste tu PIN, regresa al inicio y selecciona "¿Olvidaste tu PIN?".`
                };
            }
        }

        // 2. Verificación de Teléfono / WhatsApp Duplicado
        if (cleanWhatsapp) {
            const { data: existingByPhone } = await supabase
                .from('agentes')
                .select('id, nombre, whatsapp')
                .eq('whatsapp', cleanWhatsapp)
                .maybeSingle();

            if (existingByPhone) {
                return {
                    success: false,
                    error: `⚠️ Este número de WhatsApp (${cleanWhatsapp}) ya pertenece a ${existingByPhone.nombre} (ID: ${existingByPhone.id}).`
                };
            }
        }

        // 3. Verificación de Correo Electrónico Duplicado
        if (cleanEmail) {
            const { data: existingByEmail } = await supabase
                .from('agentes')
                .select('id, nombre, tactical_stats')
                .filter('tactical_stats->>email', 'eq', cleanEmail)
                .maybeSingle();

            if (existingByEmail) {
                return {
                    success: false,
                    error: `⚠️ Este correo electrónico (${cleanEmail}) ya está registrado a nombre de ${existingByEmail.nombre} (ID: ${existingByEmail.id}).`
                };
            }
        }

        const generatedPin = (formData.pin && formData.pin.trim()) ? formData.pin.trim() : Math.floor(1000 + Math.random() * 9000).toString();
        const role = formData.userRole || (formData.nivel === 'DIRECTOR_GENERAL' ? 'DIRECTOR_GENERAL' : formData.nivel === 'DIRECTOR' ? 'DIRECTOR' : formData.nivel === 'LIDER' ? 'LEADER' : 'STUDENT');

        const tacticalStatsData = {
            cedula: cleanCedula || null,
            email: cleanEmail || null,
            telegram: (formData.telegram || '').trim() || null,
            redes_sociales: (formData.redesSociales || formData.instagram || '').trim() || null,
            referido_por: (formData.referidoPor || '').trim() || null
        };

        let attempts = 0;
        let lastError: any = null;

        while (attempts < 3) {
            attempts++;
            const generatedId = (formData.id && formData.id.trim()) ? formData.id.trim().toUpperCase() : `CON-${Math.floor(1000 + Math.random() * 9000)}`;

            const payload: any = {
                id: generatedId,
                nombre: formData.nombre.trim().toUpperCase(),
                whatsapp: cleanWhatsapp,
                pin: generatedPin,
                user_role: role,
                rango: formData.rango || (role === 'DIRECTOR_GENERAL' ? 'DIRECTOR GENERAL' : role === 'DIRECTOR' ? 'DIRECTOR' : role === 'LEADER' ? 'LÍDER TÁCTICO' : 'RECLUTA'),
                cargo: formData.cargo || (role === 'DIRECTOR_GENERAL' ? 'DIRECCIÓN SUPREMA' : role === 'DIRECTOR' ? 'DIRECCIÓN DE SEDE' : role === 'LEADER' ? 'LIDERAZGO' : 'ESTUDIANTE'),
                xp: 0,
                status: 'ACTIVO',
                joined_date: new Date().toISOString(),
                foto_url: formData.photoUrl || null,
                talent: formData.talento || formData.talent || null,
                baptism_status: formData.bautizado || formData.baptismStatus || 'NO',
                relationship_with_god: formData.relacion || formData.relationshipWithGod || null,
                birthday: formData.fechaNacimiento || formData.birthday || null,
                security_question: formData.preguntaSeguridad || formData.securityQuestion || null,
                security_answer: formData.respuestaSeguridad || formData.securityAnswer || null,
                sede_id: formData.sedeId || formData.sede_id || 'SEDE-JESUS-ES-EL-CENTRO',
                tactical_stats: tacticalStatsData
            };

            const { data, error } = await supabase.from('agentes').insert([payload]).select();

            if (!error && data && data.length > 0) {
                return { success: true, newId: generatedId, newPin: generatedPin, agent: data[0] };
            }

            lastError = error;
            // Si el error no es clave duplicada, salir
            if (error && !error.message?.includes('duplicate key') && !error.message?.includes('agentes_pkey')) {
                break;
            }
        }

        return { success: false, error: lastError?.message || 'Error al registrar el agente en el servidor.' };
    } catch (e: any) {
        return { success: false, error: e.message || 'Error de conexión.' };
    }
};

import { Agent } from '../types';
