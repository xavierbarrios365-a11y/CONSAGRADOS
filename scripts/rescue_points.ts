
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load credentials from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = envContent.split('\n').reduce((acc: any, line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) acc[match[1].trim()] = match[2].trim();
    return acc;
}, {});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Supabase credentials not found in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx7d1GqCkxSDU1jbLUh2vyxP1jxgQGw_lwP4Z6vlIbc0-ZHmUweWMaLHweAGbJN8WNs/exec";

// Mappings from sheetsService.ts
const MAPPINGS: any = {
    'ID': ['id', 'id cédula', 'cedula', 'identificación', 'id cedula'],
    'NOMBRE': ['name', 'nombre', 'nombre completo', 'nombre_completo'],
    'BIBLIA': ['puntos biblia', 'bible', 'biblia', 'puntos_biblia'],
    'APUNTES': ['puntos apuntes', 'notes', 'apuntes', 'puntos_apuntes', 'libretas'],
    'LIDERAZGO': ['puntos liderazgo', 'leadership', 'liderazgo', 'puntos_liderazgo'],
};

async function rescuePoints() {
    console.log("🚀 STARTING POINT & PROGRESS RESCUE MISSION...");

    try {
        // 1. Fetch Lessons from Supabase to get XP rewards
        console.log("1. Fetching academy lessons from Supabase...");
        const { data: lessons, error: lErr } = await supabase.from('academy_lessons').select('id, course_id, questions_json');
        if (lErr) throw lErr;

        const lessonMap = new Map();
        lessons.forEach(l => {
            lessonMap.set(l.id, {
                courseId: l.course_id,
                xp: l.questions_json?.xpReward || 0
            });
        });
        console.log(`✅ Loaded ${lessonMap.size} lessons with XP rewards.`);

        // 2. Fetch Agents from Sheets (Church Points)
        console.log("2. Fetching legacy agents from Google Sheets...");
        const agentsRes = await fetch(`${APPS_SCRIPT_URL}?timestamp=${Date.now()}`);
        const agentsData = await agentsRes.json();
        const rawAgents = Array.isArray(agentsData) ? agentsData : (agentsData.data || []);

        const rawHeaders = rawAgents[0].map((h: any) => String(h).trim().toLowerCase());
        const agentRows = rawAgents.slice(1);
        console.log(`✅ Found ${agentRows.length} agents in legacy system.`);

        // 3. Fetch Academy Progress from Sheets (Bulk)
        console.log("3. Fetching bulk academy progress from Google Sheets...");
        const progRes = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'get_academy_data', data: {} })
        });
        const progJson = await progRes.json();
        const legacyProgress = progJson.data?.progress || [];
        console.log(`✅ Found ${legacyProgress.length} academy progress entries in legacy system.`);

        // 4. Processing and Restoration
        console.log("4. Starting restoration logic...");
        let successCount = 0;
        let progRestored = 0;

        for (const row of agentRows) {
            const getV = (key: string) => {
                const variants = [...(MAPPINGS[key] || []), key.toLowerCase(), key];
                for (const v of variants) {
                    const idx = rawHeaders.indexOf(v.toLowerCase());
                    if (idx !== -1 && row[idx] !== undefined) return row[idx];
                }
                return '';
            };

            const idVal = String(getV('ID'));
            if (!idVal || idVal === "undefined" || idVal === "null" || idVal === "") continue;

            const name = getV('NOMBRE');
            const bible = parseInt(getV('BIBLIA')) || 0;
            const notes = parseInt(getV('APUNTES')) || 0;
            const leadership = parseInt(getV('LIDERAZGO')) || 0;

            // Find progress for this agent
            const agentProgress = legacyProgress.filter((p: any) => p.agentId === idVal && p.status === 'COMPLETADO');
            let academyXp = 0;

            // Restore academy progress records
            for (const p of agentProgress) {
                const lessonInfo = lessonMap.get(p.lessonId);
                if (lessonInfo) {
                    academyXp += lessonInfo.xp;

                    // Upsert into academy_progress
                    const { error: apErr } = await supabase
                        .from('academy_progress')
                        .upsert([{
                            agent_id: idVal,
                            lesson_id: p.lessonId,
                            course_id: lessonInfo.courseId,
                            score: p.score,
                            is_completed: true,
                            attempts: p.attempts,
                            completed_at: p.date
                        }], { onConflict: 'agent_id, lesson_id' });

                    if (!apErr) progRestored++;
                }
            }

            const totalXp = bible + notes + leadership + academyXp;

            // Sync agent profile with recalculated points
            // This will use the "blindage" RPC logic in Supabase (GREATEST)
            const payload = {
                id: idVal,
                nombre: name,
                xp: totalXp,
                bible: bible,
                notes: notes,
                leadership: leadership
                // We keep it minimal to only update points/progress-critical fields
            };

            const { error: syncErr } = await supabase.rpc('sync_agent_profile', { payload });
            if (!syncErr) {
                successCount++;
                console.log(`[OK] ${name}: ${totalXp} XP (Church: ${bible + notes + leadership}, Academy: ${academyXp})`);
            } else {
                console.error(`[FAIL] ${name}: ${syncErr.message}`);
            }

            // Small delay to avoid rate limits
            await new Promise(r => setTimeout(r, 20));
        }

        console.log(`\n\n🎯 MISSION ACCOMPLISHED`);
        console.log(`✔️ Agents Synced: ${successCount}`);
        console.log(`📚 Progress Records Restored: ${progRestored}`);

    } catch (e) {
        console.error("❌ CRITICAL FAILURE:", e);
    }
}

rescuePoints();
