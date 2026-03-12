import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in env.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
    console.log('Deleting verse for date:', today);

    const { error } = await supabase
        .from('versiculos_diarios')
        .delete()
        .eq('fecha', today);

    if (error) {
        console.error('Error deleting verse:', error);
    } else {
        console.log('Successfully deleted today verse to force a refresh.');
    }
}

run();
