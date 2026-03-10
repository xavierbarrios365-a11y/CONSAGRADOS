import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function test() {
    const { data, error } = await supabase
        .from('agentes')
        .select('id, nombre, xp, rango, cargo, foto_url, status, talent, user_role, joined_date, bible, notes, leadership, streak_count, last_attendance, last_streak_date, weekly_tasks, pin, whatsapp, baptism_status, birthday, relationship_with_god, must_change_password, is_ai_profile_pending, tactical_stats, tactor_summary, iq_level')
        .limit(1);

    console.log("Error:", error);
}

test();
