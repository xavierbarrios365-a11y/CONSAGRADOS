
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    console.log("🛠️  Creando Agente de Prueba...");

    const testAgent = {
        id: 'test-123',
        nombre: 'Agente de Prueba IQ',
        xp: 0,
        rango: 'RECLUTA',
        cargo: 'ESTUDIANTE',
        foto_url: 'https://i.pravatar.cc/150?u=test123',
        pin: '1234',
        status: 'ACTIVO',
        iq_level: 0
    };

    const { error } = await supabase.from('agentes').upsert([testAgent]);

    if (error) {
        console.error("❌ Error al crear agente:", error.message);
    } else {
        console.log("✅ Agente 'test-123' creado con éxito.");
        console.log("  - PIN: 1234");
    }
}

run();
