import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');

const envConfig: Record<string, string> = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#]+?)=(.+)$/);
    if (match) {
        envConfig[match[1].trim()] = match[2].trim();
    }
});

const supaUrl = envConfig['VITE_SUPABASE_URL'];
const supaKey = envConfig['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supaUrl, supaKey);

async function repairAttendance() {
    console.log("🔍 Buscando agentes sin registro de asistencia...");

    // Obtenemos todos los agentes que tal vez no tengan last_attendance (vacio o null)
    // También re-sincronizamos a los que dicen SIN REGISTRO 
    const { data: agents, error } = await supabase
        .from('agentes')
        .select('id, nombre, last_attendance, joined_date, created_at');

    if (error || !agents) {
        console.error("❌ Fetch err", error);
        return;
    }

    let repaired = 0;
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

    for (const a of agents) {
        // Personas recién inscritas sin asistencia
        if (!a.last_attendance || String(a.last_attendance).trim() === '') {
            console.log(`🔨 Reparando asistencia para: ${a.nombre} (${a.id})`);

            // Usar joined_date o created_at o directamente HOY
            let baseDate = a.joined_date || a.created_at;
            let finalDate = todayStr;

            if (baseDate && baseDate !== 'N/A') {
                try {
                    const fallback = new Date(baseDate);
                    if (!isNaN(fallback.getTime())) {
                        finalDate = fallback.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
                    }
                } catch (e) { }
            }

            const { error: updErr } = await supabase
                .from('agentes')
                .update({ last_attendance: finalDate })
                .eq('id', a.id);

            if (updErr) {
                console.error(`❌ Error con ${a.id}:`, updErr.message);
            } else {
                repaired++;
            }
        }
    }

    console.log(`✅ Reparación completada. Se asignó asistencia a ${repaired} agentes nulos.`);
}

repairAttendance();
