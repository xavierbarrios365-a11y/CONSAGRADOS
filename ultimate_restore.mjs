import { createClient } from '@supabase/supabase-js';

const url = 'https://dnzrnpslfabowgtikora.supabase.co';
const key = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';
const supabase = createClient(url, key);

const SHEETS_URL = "https://script.google.com/macros/s/AKfycbx7d1GqCkxSDU1jbLUh2vyxP1jxgQGw_lwP4Z6vlIbc0-ZHmUweWMaLHweAGbJN8WNs/exec";

async function ultimateRestore() {
    console.log('🚀 INICIANDO MEGA-RESTAURACIÓN TÁCTICA 🚀');

    // 1. Obtener data de Google Sheets (Backup Histórico)
    console.log('📡 Fetching Google Sheets backup...');
    const sheetResp = await fetch(SHEETS_URL);
    const sheetData = await sheetResp.json();
    const rows = sheetData.data;
    const headers = rows[0];
    const idIndex = headers.indexOf('ID');
    const attendanceIndex = headers.indexOf('LAST_ATTENDANCE');

    const attendanceMap = new Map();

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const id = String(row[idIndex]).trim();
        const dateStr = String(row[attendanceIndex]).trim();
        if (id && dateStr) {
            attendanceMap.set(id, dateStr);
        }
    }
    console.log(`✅ ${attendanceMap.size} agentes con asistencia base desde Sheets.`);

    // 2. Obtener data de asistencia_visitas (Actividad Reciente)
    console.log('📡 Fetching recent activity from asistencia_visitas...');
    const { data: history, error: historyErr } = await supabase
        .from('asistencia_visitas')
        .select('agent_id, registrado_en')
        .eq('tipo', 'ASISTENCIA');

    if (historyErr) {
        console.error('Error historia:', historyErr.message);
    } else {
        history.forEach(h => {
            const id = String(h.agent_id).trim();
            const date = new Date(h.registrado_en);
            const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

            const existing = attendanceMap.get(id);
            if (!existing || dateStr > existing) {
                attendanceMap.set(id, dateStr);
            }
        });
    }
    console.log(`✅ Mapa final listo con ${attendanceMap.size} agentes.`);

    // 3. ACTUALIZAR SUPABASE
    console.log('⚡ Aplicando actualizaciones a Supabase...');
    let updated = 0;

    for (const [agentId, dateStr] of attendanceMap.entries()) {
        const { error } = await supabase
            .from('agentes')
            .update({ last_attendance: dateStr })
            .eq('id', agentId);

        if (!error) {
            updated++;
            if (updated % 50 === 0) console.log(`Progreso: ${updated}...`);
        }
    }

    console.log(`\n🎉 ÉXITO: Se restauró la asistencia de ${updated} agentes.`);
}

ultimateRestore();
