import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseAnonKey = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAgent(name) {
    console.log(`🔍 Checking agent: ${name}...`);
    // NOTE: Selecting only ALLOWED columns to avoid "permission denied"
    const { data, error } = await supabase
        .from('agentes')
        .select('id, nombre, status, cargo, xp, rango')
        .ilike('nombre', `%${name}%`);

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log('⚠️ No agent found with that name (maybe not ACTIVO or RLS filter).');
        return;
    }

    data.forEach(agent => {
        console.log(`✅ Found: ${agent.nombre} (ID: ${agent.id})`);
        console.log(`   Status: ${agent.status}`);
        console.log(`   Cargo: ${agent.cargo}`);
        console.log(`   Rank: ${agent.rango}`);
        console.log(`   XP: ${agent.xp}`);
    });
}

checkAgent('David Joel Mercado');
