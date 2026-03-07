
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseAnonKey = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
        .from('academy_lessons')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Academy Lessons (Keys):", Object.keys(data[0]));
    }

    const { data: prog, error: errP } = await supabase
        .from('student_progress')
        .select('*')
        .limit(1);

    if (errP) {
        console.error("Error Prog:", errP.message);
    } else if (prog && prog.length > 0) {
        console.log("Student Progress (Keys):", Object.keys(prog[0]));
    } else {
        console.log("Student Progress table is empty, cannot see keys this way.");
    }
}

run();
