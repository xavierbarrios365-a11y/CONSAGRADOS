import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://dnzrnpslfabowgtikora.supabase.co', 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7');

async function run() {
    console.log("Fetching agentes...");
    const { data: agData, error: agErr } = await supabase.from('agentes').select('*').limit(1);
    console.log("Agentes result:", agErr ? JSON.stringify(agErr) : "SUCCESS");

    console.log("Inserting asistencia...");
    const { data: asData, error: asErr } = await supabase.from('asistencia_visitas').insert({
        id: `TEST-${Date.now()}`,
        agent_id: "test",
        agent_name: "test",
        tipo: "ASISTENCIA",
        detalle: "test",
        registrado_en: new Date().toISOString()
    });
    console.log("Asistencia result:", asErr ? JSON.stringify(asErr) : "SUCCESS");
}

run();
