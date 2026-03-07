
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseAnonKey = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.from('agentes').select('xp').eq('id', 'CON-1004').maybeSingle();
    if (error) {
        console.error(error);
    } else {
        console.log("Jaihelyer XP in Supabase:", data?.xp);
    }
}

run();
