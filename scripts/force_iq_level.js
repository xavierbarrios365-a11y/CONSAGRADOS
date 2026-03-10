const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuenJucHNsZmFib3dndGlrb3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQ1ODIyNTcsImV4cCI6MjAzNTgyMzQ5M30.xxx'; // Wait, let me just pass it from the env using process.env or just require dotenv.
// Let's do this: 
require('dotenv').config({ path: '.env.local' });
const sUrl = process.env.VITE_SUPABASE_URL;
const sKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(sUrl, sKey);

async function check() {
    console.log("Checking agents...");
    const { data: agents, error: err } = await supabase
        .from('agentes')
        .select('id, nombre, email, iq_level')
        .order('iq_level', { ascending: false })
        .limit(10);

    if (err) {
        console.error("Error reading agents:", err);
        return;
    }

    console.log("Top Agents by IQ:");
    console.table(agents);

    const agentsAtLevel3 = agents.filter(a => a.iq_level === 3);
    for (const agent of agentsAtLevel3) {
        console.log(`Forcing level 4 for agent: ${agent.nombre} (${agent.id})`);
        const { error: updErr } = await supabase.from('agentes').update({ iq_level: 4 }).eq('id', agent.id);
        if (updErr) console.error("Update error:", updErr);
        else console.log("Success updating level 4 directly.");
    }

    if (agents.length > 0) {
        console.log("Testing RPC for agent:", agents[0].id, "to level", agents[0].iq_level + 1);
        const { data: rpcData, error: rpcErr } = await supabase.rpc('process_iq_level_complete', {
            p_agent_id_input: agents[0].id,
            p_level_achieved: agents[0].iq_level,
            p_time_taken_secs: 10
        });
        console.log("RPC Result:", rpcData);
        console.log("RPC Error:", rpcErr);
    }
}

check();
