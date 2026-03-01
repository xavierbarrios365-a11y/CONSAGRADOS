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

async function migrateResources() {
    console.log("🚀 Iniciando migración de Recursos Tácticos desde Google Sheets a Supabase...");

    try {
        console.log("📥 Obteniendo recursos desde Google Sheets...");
        const response = await fetch(scriptUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'get_guides', data: { userRole: 'DIRECTOR' } }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        const resJson = JSON.parse(text);

        if (!resJson || !resJson.success || !Array.isArray(resJson.data)) {
            console.log("⚠️ No se encontraron recursos válidos o hubo un error:", resJson);
            return;
        }

        const data = resJson.data;
        console.log(`✅ ${data.length} recursos obtenidos. Comenzando copia...`);

        let insertedCount = 0;
        let errorCount = 0;

        for (const guide of data) {
            /* 
              Guide format from Sheets:
              {
                id: string,
                name: string,
                type: 'ESTUDIANTE' | 'LIDER',
                url: string,
                date: string
              }
            */
            const resourceId = guide.id || `REC_MIGRATE_${Date.now()}_${Math.random().toString().substring(2, 6)}`;

            const { error } = await supabase
                .from('recursos_tacticos')
                .upsert([{
                    id: resourceId,
                    title: guide.name || 'Sin Título',
                    description: 'Migrado desde Google Sheets',
                    drive_file_id: 'migrated_link',
                    drive_url: guide.url || '',
                    type: guide.type || 'ESTUDIANTE',
                    category: 'GENERAL',
                    is_active: true,
                    created_at: new Date(guide.date || Date.now()).toISOString()
                }], { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error al migrar recurso "${guide.name}":`, error.message);
                errorCount++;
            } else {
                insertedCount++;
                console.log(`✔️ Migrado [${insertedCount}/${data.length}]: ${guide.name}`);
            }
        }

        console.log("\n==================================");
        console.log("🎯 MIGRACIÓN FINALIZADA");
        console.log(`✅ Exitosos: ${insertedCount}`);
        console.log(`❌ Fallidos: ${errorCount}`);
        console.log("==================================");

    } catch (e: any) {
        console.error("❌ Ocurrió un error crítico durante la migración:", e);
    }
}

migrateResources();
