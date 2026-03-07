import { createClient } from '@supabase/supabase-js';

const url = 'https://dnzrnpslfabowgtikora.supabase.co';
const key = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';
const supabase = createClient(url, key);

async function restoreAttendance() {
    console.log('--- RESTAURACIÓN TÁCTICA DE ASISTENCIA ---');

    // 1. Obtener todos los registros de asistencia históricos
    const { data: history, error: historyErr } = await supabase
        .from('asistencia_visitas')
        .select('agent_id, registrado_en')
        .eq('tipo', 'ASISTENCIA')
        .order('registrado_en', { ascending: false });

    if (historyErr) {
        console.error('Error al obtener historial:', historyErr.message);
        return;
    }

    console.log(`Leídos ${history.length} registros de historial.`);

    // 2. Mapear última fecha por agente
    const latestAttendanceMap = new Map();
    history.forEach(h => {
        if (!latestAttendanceMap.has(h.agent_id)) {
            // Formatear a YYYY-MM-DD
            const date = new Date(h.registrado_en);
            const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
            latestAttendanceMap.set(h.agent_id, dateStr);
        }
    });

    console.log(`Detectados ${latestAttendanceMap.size} agentes con historial de asistencia.`);

    // 3. Actualizar tabla de agentes
    let updated = 0;
    let errors = 0;

    for (const [agentId, dateStr] of latestAttendanceMap.entries()) {
        const { error } = await supabase
            .from('agentes')
            .update({ last_attendance: dateStr })
            .eq('id', agentId);

        if (error) {
            console.error(`Fallo al actualizar agente ${agentId}:`, error.message);
            errors++;
        } else {
            updated++;
            if (updated % 10 === 0) console.log(`Progreso: ${updated} agentes restaurados...`);
        }
    }

    console.log(`\n--- OPERACIÓN COMPLETADA ---`);
    console.log(`Agentes actualizados: ${updated}`);
    console.log(`Fallos: ${errors}`);
}

restoreAttendance();
