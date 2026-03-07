
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseAnonKey = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.from('academy_lessons').select('id, title, questions_json');
    if (error) {
        console.error(error);
        return;
    }
    console.log("Supabase Lessons Sample:");
    data.slice(0, 5).forEach(l => {
        console.log(`- ID: ${l.id} | Title: ${l.title} | XP: ${l.questions_json?.xpReward || 0}`);
    });

    // Check specific IDs seen in Sheets
    const idsToCheck = ['leccion_templo_blindado_01', 'CLASE_06_FASE1', '14F_EVALUATION'];
    const matching = data.filter(l => idsToCheck.includes(l.id));
    console.log("\nMatching Lessons found in Supabase:", matching.map(m => m.id));
}
run();
