
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseAnonKey = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
        .from('academy_lessons')
        .select('id, xp_reward');

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.table(data);
    }
}

run();
