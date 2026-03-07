
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseAnonKey = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { count, error } = await supabase.from('academy_progress').select('*', { count: 'exact', head: true });
    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Academy Progress records now in Supabase:", count);
    }
}

run();
