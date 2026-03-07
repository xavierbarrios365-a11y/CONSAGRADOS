
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseAnonKey = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

async function run() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Check academy_courses, academy_lessons, academy_progress
    const tables = ['agentes', 'academy_courses', 'academy_lessons', 'student_progress', 'notificaciones'];

    for (const t of tables) {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`Table ${t}: Error - ${error.message}`);
        } else {
            console.log(`Table ${t}: ${count} rows`);
        }
    }

    // Specially check student_progress for Jaihelyer (CON-1004)
    const { data: prog, error: errP } = await supabase
        .from('student_progress')
        .select('*')
        .eq('agent_id', 'CON-1004');

    console.log("\nStudent Progress for Jaihelyer (CON-1004):", prog);
}

run();
