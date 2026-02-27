import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseKey = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // 1. Fetch all agents matching Sahel or Admin
    const { data: agents, error } = await supabase
        .from('agentes')
        .select('id, nombre, rango, user_role, xp, streak_count')
        .or('id.ilike.%20389331%,nombre.ilike.%ADMIN%');

    if (error) {
        console.error("Error fetching:", error);
        return;
    }

    console.log("Found agents:", JSON.stringify(agents, null, 2));

    // 2. We need to fix Sahel's main account (20389331) to be DIRECTOR
    const sahelMain = agents.find(a => a.id === '20389331');
    if (sahelMain) {
        console.log(`Fixing ${sahelMain.id} to DIRECTOR...`);
        const { error: updateError } = await supabase
            .from('agentes')
            .update({ rango: '⭐ DIRECTOR', user_role: 'DIRECTOR' })
            .eq('id', '20389331');
        if (updateError) console.error("Error updating sahel:", updateError);
        else console.log("Sahel updated successfully.");
    }

    // 3. Delete the V-20389331 (ADMIN DIRECTOR) account
    const sahelDup = agents.find(a => a.id === 'V-20389331' || (a.nombre && a.nombre.includes('ADMIN DIRECTOR')));
    if (sahelDup) {
        console.log(`Deleting duplicate account ${sahelDup.id}...`);
        const { error: delError } = await supabase
            .from('agentes')
            .delete()
            .eq('id', sahelDup.id);
        if (delError) console.error("Error deleting dup:", delError);
        else console.log("Duplicate deleted successfully.");
    }
}

main();
