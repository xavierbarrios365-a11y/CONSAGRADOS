import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseAnonKey = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEmptyPin(agentId) {
    console.log(`🔍 Testing if PIN is empty for Agent ID: ${agentId}...`);
    const { data, error } = await supabase.rpc('verify_agent_pin', {
        p_id: agentId,
        p_pin: ''
    });

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    console.log(`   Is PIN empty? ${data}`);
}

testEmptyPin('davidjmb99');
