import { createClient } from '@supabase/supabase-js';

const url = 'https://dnzrnpslfabowgtikora.supabase.co';
const key = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';
const supabase = createClient(url, key);

async function checkAttendance() {
    console.log('--- Checking asistencia_visitas ---');
    const { data, error } = await supabase
        .from('asistencia_visitas')
        .select('*')
        .eq('tipo', 'ASISTENCIA')
        .order('registrado_en', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('❌ No record found in asistencia_visitas.');
    } else {
        console.log(`✅ Found ${data.length} recent attendance records.`);
        data.forEach(d => {
            console.log(`- [${d.registrado_en}] ${d.agent_name} (${d.agent_id})`);
        });
    }

    console.log('\n--- Checking agents last_attendance field ---');
    const { data: agents, error: agentsErr } = await supabase
        .from('agentes')
        .select('id, nombre, last_attendance')
        .limit(5);

    if (agentsErr) {
        console.error('Error:', agentsErr.message);
    } else {
        agents.forEach(a => {
            console.log(`- Agent: ${a.nombre}, last_attendance: "${a.last_attendance}"`);
        });
    }
}

checkAttendance();
