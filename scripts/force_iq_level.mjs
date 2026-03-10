import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking agents...");
    // Find user whose name or email matches or who has highest IQ
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

    // Intentar forzar el update manualmente para todos los que estén en nivel 3
    const agentsAtLevel3 = agents.filter(a => a.iq_level === 3);
    for (const agent of agentsAtLevel3) {
        console.log(`Forcing level 4 for agent: ${agent.nombre} (${agent.id})`);
        const { error: updErr } = await supabase.from('agentes').update({ iq_level: 4 }).eq('id', agent.id);
        if (updErr) console.error("Update error:", updErr);
        else console.log("Success updating level 4 directly.");
    }

    // Let's also check if our RPC function is there by doing a call
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
