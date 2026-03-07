import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseAnonKey = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdate(agentId) {
    console.log(`🔍 Testing update for Agent ID: ${agentId}...`);
    const { data, error } = await supabase.rpc('update_agent_admin', {
        p_id: agentId,
        p_nombre: 'DAVID JOEL MERCADO BARRIOS TEST',
        p_xp: 920,
        p_rango: 'REFERENTE',
        p_cargo: 'LÍDER',
        p_whatsapp: '123456789',
        p_pin: 'ANTO18',
        p_foto_url: ''
    });

    if (error) {
        console.error('❌ RPC Error:', error);
        return;
    }

    console.log('✅ Update successful:', data);
}

testUpdate('davidjmb99');
