
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


async function findTestPlayers() {
    let output = "🔍 Investigando Guerra Bíblica...\n";

    // 1. Ver grupos de guerra bíblica
    const { data: groups, error: groupError } = await supabase
        .from('bible_war_groups')
        .select('agent_id, team');

    if (groupError) {
        output += `❌ Error fetching groups: ${groupError.message}\n`;
    } else {
        output += `📋 Grupos asignados (${groups.length}):\n`;
        for (const g of groups) {
            const { data: agent } = await supabase.from('agentes').select('id, nombre').eq('id', g.agent_id).single();
            output += `ID: ${g.agent_id} | Team: ${g.team} | Nombre: ${agent ? agent.nombre : 'DESCONOCIDO'}\n`;
        }
    }

    // 2. Ver sesión actual (gladiadores seleccionados)
    const { data: session, error: sessError } = await supabase
        .from('bible_war_sessions')
        .select('gladiator_a_id, gladiator_b_id')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

    if (sessError) {
        output += `❌ Error fetching session: ${sessError.message}\n`;
    } else if (session) {
        output += `\n🎯 Gladiadores actuales:\n`;
        const { data: a1 } = await supabase.from('agentes').select('nombre').eq('id', session.gladiator_a_id).single();
        const { data: a2 } = await supabase.from('agentes').select('nombre').eq('id', session.gladiator_b_id).single();
        output += `Gladiador A: ${session.gladiator_a_id} (${a1 ? a1.nombre : '???'})\n`;
        output += `Gladiador B: ${session.gladiator_b_id} (${a2 ? a2.nombre : '???'})\n`;
    }

    fs.writeFileSync('c:\\Users\\sahel\\Downloads\\consagrados-2026\\scripts\\test_players_final.txt', output);
    console.log("✅ Resultados FINALIZADOS en scripts/test_players_final.txt");
}


findTestPlayers();
