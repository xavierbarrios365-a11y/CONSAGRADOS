import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const s = createClient(
    'https://dnzrnpslfabowgtikora.supabase.co',
    'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7'
);

async function main() {
    const { data: all, error } = await s.from('agentes')
        .select('id, nombre, streak_count, last_attendance')
        .order('streak_count', { ascending: false });

    if (error) {
        writeFileSync('streak_audit.txt', 'ERROR: ' + error.message);
        process.exit(1);
    }

    let out = '=== AUDITORIA DE RACHAS (' + new Date().toISOString() + ') ===\n';
    out += 'Total agentes: ' + all.length + '\n\n';

    out += 'CON RACHA > 0:\n';
    for (const a of all) {
        if ((a.streak_count || 0) > 0) {
            out += '  ' + a.streak_count + ' dias - ' + a.nombre + '\n';
        }
    }

    out += '\nSIN RACHA (0):\n';
    for (const a of all) {
        if ((a.streak_count || 0) === 0) {
            out += '  0 dias - ' + a.nombre + '\n';
        }
    }

    writeFileSync('streak_audit.txt', out);
    console.log('Resultados guardados en streak_audit.txt');
    process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
