
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Cargar credenciales desde .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
    console.error("❌ .env.local no encontrado");
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = envContent.split('\n').reduce((acc: any, line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) acc[match[1].trim()] = match[2].trim().replace(/^'|'$/g, '').replace(/^"|"$/g, '');
    return acc;
}, {});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Credenciales de Supabase no encontradas");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log("🛠️  Creando Jugador 1 y Jugador 2...");

    const p1 = {
        id: 'CON-TEST1',
        nombre: 'Jugador 1 Test',
        xp: 150,
        rango: 'RECLUTA',
        cargo: 'ESTUDIANTE',
        foto_url: 'https://i.pravatar.cc/150?u=jugador1',
        pin: '1234',
        status: 'ACTIVO',
    };
    const p2 = {
        id: 'CON-TEST2',
        nombre: 'Jugador 2 Test',
        xp: 150,
        rango: 'RECLUTA',
        cargo: 'ESTUDIANTE',
        foto_url: 'https://i.pravatar.cc/150?u=jugador2',
        pin: '1234',
        status: 'ACTIVO',
    };

    const { error } = await supabase.from('agentes').upsert([p1, p2]);

    if (error) {
        console.error("❌ Error al crear jugadores:", error.message);
    } else {
        console.log("✅ Jugadores creados con éxito.");
        console.log("📱 Credenciales Jugador 1:");
        console.log("  - Cédula/ID: CON-TEST1");
        console.log("  - PIN: 1234\n");
        console.log("📱 Credenciales Jugador 2:");
        console.log("  - Cédula/ID: CON-TEST2");
        console.log("  - PIN: 1234");
    }
}

run();
