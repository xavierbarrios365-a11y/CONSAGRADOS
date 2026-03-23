
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseAnonKey = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

async function fixRank() {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Fixing rank for CON-1004 (JAIHELYER)...");

    // Set rango to 'ACTIVO' - The column is 'rango' in Supabase
    const { data, error } = await supabase
        .from('agentes')
        .update({ rango: 'ACTIVO' })
        .eq('id', 'CON-1004')
        .select();

    if (error) {
        console.error("❌ Error updating rank:", error);
    } else {
        console.log("✅ Rank updated successfully for Jaihelyer:", data);
    }
}

fixRank();
