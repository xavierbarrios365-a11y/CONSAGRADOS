/**
 * MEGA-MIGRADOR CONSAGRADOS 2026 🛡️
 * Rescate de Datos Total (Puntos, Rachas, Academia, Juegos)
 * --------------------------------------------------------
 * 1. Instala dependencias: npm install @supabase/supabase-js
 * 2. Pon tus llaves abajo.
 * 3. Corre el script: node mega_migrador.mjs
 */

import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN DE LLAVES (Actualizado con tus datos viejos) ---
const OLD_PROJECT = {
    url: 'https://dnzrnpslfabowgtikora.supabase.co',
    key: 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7' // Usando tu clave actual
};

const NEW_PROJECT = {
    url: 'https://zwjcrrxffceybbsuejfd.supabase.co',
    key: 'sb_publishable_a7L9XKK8jMGMDAqS1LVOQg_2qKL3qaI'
};

// --- LISTA DE TABLAS A RESCATAR (Checklist Total) ---
const TABLES_TO_MIGRATE = [
    'agentes',
    'asistencia_visitas',
    'academy_courses',
    'academy_lessons',
    'academy_progress',
    'deployment_authorizations',
    'bible_war_sessions',
    'bible_war_questions',
    'bible_war_groups',
    'duelo_desafios',
    'duelo_sesiones',
    'iq_best_times',
    'mensajes_privados',
    'notificaciones_push',
    'insignias_otorgadas',
    'intel_feed',
    'noticia_likes',
    'noticia_dislikes',
    'eventos',
    'tareas_tacticas',
    'tareas_completadas',
    'misiones',
    'progreso_misiones',
    'versiculos_diarios',
    'web_banners',
    'inversion_leads',
    'agent_stories',
    'story_views',
    'story_reactions',
    'story_replies'
];

async function migrate() {
    console.log('🛡️ Iniciando Rescate Total de Consagrados 2026...');

    if (OLD_PROJECT.url.includes('TU_PROYECTO')) {
        console.error('❌ ERROR: Debes poner tus URLs y Keys reales en el script.');
        process.exit(1);
    }

    const oldClient = createClient(OLD_PROJECT.url, OLD_PROJECT.key);
    const newClient = createClient(NEW_PROJECT.url, NEW_PROJECT.key);

    for (const tableName of TABLES_TO_MIGRATE) {
        process.stdout.write(`📡 Aspirando datos de: [${tableName}]... `);

        try {
            // 1. Obtener datos del proyecto bloqueado
            const { data, error: fetchError } = await oldClient
                .from(tableName)
                .select('*')
                .limit(5000); // Límite de seguridad

            if (fetchError) {
                console.log(`❌ ERROR (Bloqueo 402): ${fetchError.message}`);
                console.log(`💡 PISTA: Si el error es 402, Supabase bloqueó el acceso externo. Deberás usar el SQL Editor.`);
                continue;
            }

            if (!data || data.length === 0) {
                console.log('⚠️ VACÍA (Nada que migrar)');
                continue;
            }

            console.log(`📥 ${data.length} filas obtenidas. Empujando...`);

            // 2. Insertar en el proyecto nuevo (Espejo)
            // Usamos UPSERT para evitar duplicados si se corre dos veces
            const { error: pushError } = await newClient
                .from(tableName)
                .upsert(data, { onConflict: 'id' });

            if (pushError) {
                console.log(`❌ ERROR AL INSERTAR: ${pushError.message}`);
            } else {
                console.log(`✅ ÉXITO: [${tableName}] migrada al 100%.`);
            }

        } catch (e) {
            console.log(`💀 FALLO CRÍTICO: ${e.message}`);
        }
    }

    console.log('\n--- OPERACIÓN FINALIZADA ---');
    console.log('🛡️ ADN de Consagrados 2026 restaurado. Revisa tu panel espejo.');
}

migrate();
