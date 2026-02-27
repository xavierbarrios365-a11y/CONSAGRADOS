import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Cargar credenciales desde .env.local de forma segura sin depender de Vite
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
    console.error("❌ Credenciales de Supabase no encontradas en .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx7d1GqCkxSDU1jbLUh2vyxP1jxgQGw_lwP4Z6vlIbc0-ZHmUweWMaLHweAGbJN8WNs/exec";

// Los mismos mapeos probados del SheetsService original
const MAPPINGS: any = {
    'ID': ['id', 'id cédula', 'cedula', 'identificación', 'id cedula'],
    'NOMBRE': ['name', 'nombre', 'nombre completo', 'nombre_completo'],
    'STATS': ['tacticalstats', 'stats_json', 'stats'],
    'SUMMARY': ['tacticalsummary', 'tactor_summary', 'summary'],
    'BIOMETRIC': ['biometric_credential', 'biometric'],
    'STREAK': ['streak_count', 'streak'],
    'TASKS': ['tasks_json', 'tasks'],
    'LAST_COURSE': ['last_course', 'último curso'],
    'LAST_STREAK_DATE': ['last_completed_date', 'laststreakdate', 'racha_fecha'],
    'NOTIF_PREFS': ['notif_prefs', 'notif_prefs_json', 'preferencias_notif', 'notif_prefs']
};

async function migrateMissingData() {
    console.log("🚀 INICIANDO RESCATE DE DATOS FASE 3.5 (RACHAS Y METADATOS)...");

    try {
        console.log("1. Descargando base de datos legacy de Google Sheets...");
        const response = await fetch(`${APPS_SCRIPT_URL}?timestamp=${new Date().getTime()}`);
        if (!response.ok) throw new Error(`HTTP ERROR: ${response.status}`);

        let result = await response.json();
        const rawContent = Array.isArray(result) ? result : (result.data || []);

        if (!Array.isArray(rawContent) || rawContent.length < 2) {
            console.error("❌ No se encontraron datos válidos en Google Sheets.");
            return;
        }

        const rawHeaders = rawContent[0].map((h: any) => String(h).trim().toLowerCase());
        const rows = rawContent.slice(1);

        console.log(`✅ Obtenidos ${rows.length} agentes de Sheets. Comenzando parcheo en Supabase...`);

        let successCount = 0;
        let failCount = 0;

        for (const row of rows) {
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

            // Extraer específicamente los campos faltantes, con parseos seguros
            const streakCount = parseInt(getV('STREAK')) || 0;
            const lastStreakDate = getV('LAST_STREAK_DATE') || '';
            const tactorSummary = getV('SUMMARY') || '';
            const biometric = getV('BIOMETRIC') || '';
            const lastCourse = getV('LAST_COURSE') || '';

            let tacticalStats = {};
            try { const s = getV('STATS'); if (s) tacticalStats = JSON.parse(s); } catch (e) { }

            let weeklyTasks = [];
            try { const t = getV('TASKS'); if (t) weeklyTasks = JSON.parse(t); } catch (e) { }

            let notifPrefs = { read: [], deleted: [] };
            try { const p = getV('NOTIF_PREFS'); if (p) notifPrefs = JSON.parse(p); } catch (e) { }

            // Efectuar el parche únicamente para las columnas objetivo (sin afectar nombre, xp, etc)
            const { error } = await supabase
                .from('agentes')
                .update({
                    streak_count: streakCount,
                    last_streak_date: lastStreakDate,
                    tactor_summary: tactorSummary,
                    biometric_credential: biometric,
                    last_course: lastCourse,
                    tactical_stats: tacticalStats,
                    weekly_tasks: weeklyTasks,
                    notif_prefs: notifPrefs
                })
                .eq('id', idVal);

            if (error) {
                console.error(`❌ Falló ${idVal} (${getV('NOMBRE')}):`, error.message);
                failCount++;
            } else {
                process.stdout.write('.'); // progress indicator
                successCount++;
            }
            // Pequeña pausa para no abrumar a Supabase
            await new Promise(r => setTimeout(r, 50));
        }

        console.log(`\n\n🎯 MIGRACIÓN FINALIZADA`);
        console.log(`✔️ Agentes parcheados exitosamente: ${successCount}`);
        console.log(`⚠️ Errores: ${failCount}`);

    } catch (e) {
        console.error("❌ Fallo crítico durante la migración:", e);
    }
}

migrateMissingData();
