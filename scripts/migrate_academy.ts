// 1. Cargar credenciales desde .env.local
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
const scriptUrl = "https://script.google.com/macros/s/AKfycbx7d1GqCkxSDU1jbLUh2vyxP1jxgQGw_lwP4Z6vlIbc0-ZHmUweWMaLHweAGbJN8WNs/exec";

if (!supaUrl || !supaKey) {
    console.error("❌ Credenciales de Supabase no encontradas en .env.local");
    process.exit(1);
}

const supabase = createClient(supaUrl, supaKey);

async function migrateAcademy() {
    console.log("🚀 Iniciando migración de LA ACADEMIA...");

    try {
        console.log("📥 Obteniendo datos desde Google Sheets...");
        const response = await fetch(scriptUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_academy_data', data: { userRole: 'DIRECTOR' } }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        const resJson = typeof text === 'string' ? JSON.parse(text) : text;

        if (!resJson || !resJson.success) {
            console.log("⚠️ Error al obtener academia desde sheets:", resJson);
            return;
        }

        const data = resJson.data || resJson;

        const courses = data.courses || [];
        const lessons = data.lessons || [];
        const progress = data.progress || [];

        console.log(`✅ ${courses.length} cursos, ${lessons.length} lecciones y ${progress.length} registros de progreso obtenidos.`);

        // 1. Migrar Cursos
        console.log("\n🔄 Migrando Cursos...");
        for (const c of courses) {
            const { error } = await supabase.from('academy_courses').upsert({
                id: c.id,
                title: c.title,
                description: c.description || '',
                badge_reward: c.requiredLevel || 'ESTUDIANTE',
                image_url: c.imageUrl,
                is_active: true
            }, { onConflict: 'id' });
            if (error) console.error(`❌ Error curso ${c.id}:`, error.message);
        }

        // 2. Migrar Lecciones
        console.log("🔄 Migrando Lecciones...");
        for (const l of lessons) {
            const { error } = await supabase.from('academy_lessons').upsert({
                id: l.id,
                course_id: l.courseId,
                title: l.title,
                embed_url: l.videoUrl,
                content: l.content,
                questions_json: {
                    questions: l.questions || [],
                    xpReward: l.xpReward || 0,
                    resultAlgorithm: l.resultAlgorithm || 'NONE',
                    resultMappings: l.resultMappings || []
                }
            }, { onConflict: 'id' });
            if (error) console.error(`❌ Error leccion ${l.id}:`, error.message);
        }

        // 3. Migrar Progreso
        console.log("🔄 Migrando Progreso...");
        let progOk = 0;
        let progErr = 0;

        // El progreso puede venir un poco diferente desde sheets, agrupado.
        for (const p of progress) {
            const { error } = await supabase.from('academy_progress').upsert({
                // Generamos un ID manual o dejamos que use default (si agregamos reqs)
                // Pero como usamos upsert con UNIQUE(agent_id, lesson_id), no pasamos el id (si lo pasamos y choca, se actualiza)
                agent_id: p.agentId,
                lesson_id: p.lessonId,
                course_id: p.courseId || lessons.find((l: any) => l.id === p.lessonId)?.courseId,
                is_completed: p.status === 'COMPLETADO',
                score: p.score || 0,
                attempts: p.attempts || 1,
                completed_at: p.date ? new Date(p.date).toISOString() : new Date().toISOString()
            }, { onConflict: 'agent_id, lesson_id' });

            if (error) {
                // If it fails because missing the unique constraint in schema, we fallback to plain insert
                const { error: insertErr } = await supabase.from('academy_progress').insert({
                    agent_id: p.agentId,
                    lesson_id: p.lessonId,
                    course_id: p.courseId || lessons.find((l: any) => l.id === p.lessonId)?.courseId,
                    is_completed: p.status === 'COMPLETADO',
                    score: p.score || 0,
                    attempts: p.attempts || 1,
                    completed_at: p.date ? new Date(p.date).toISOString() : new Date().toISOString()
                });
                if (insertErr) {
                    progErr++;
                } else {
                    progOk++;
                }
            } else {
                progOk++;
            }
        }

        console.log("\n==================================");
        console.log("🎯 MIGRACIÓN FINALIZADA");
        console.log(`✅ Cursos migradas: ${courses.length}`);
        console.log(`✅ Lecciones migradas: ${lessons.length}`);
        console.log(`✅ Progresos exitosos: ${progOk} / Fallidos: ${progErr}`);
        console.log("==================================");

    } catch (e: any) {
        console.error("❌ Ocurrió un error crítico durante la migración:", e);
    }
}

migrateAcademy();
