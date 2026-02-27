import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = envContent.split('\n').reduce((acc: any, line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) acc[match[1].trim()] = match[2].trim().replace(/^'|'$/g, '').replace(/^"|"$/g, '');
    return acc;
}, {});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    const { data: agents } = await supabase.from('agentes').select('id, nombre').ilike('id', '%test%');
    console.log("Test agents:", agents);

    // forcefully assign them
    if (agents && agents.length >= 2) {
        console.log("Forcing assignment of", agents[0].id, "and", agents[1].id);
        const res = await supabase.from('bible_war_sessions').update({
            gladiator_a_id: agents[0].id,
            gladiator_b_id: agents[1].id
        }).eq('id', '00000000-0000-0000-0000-000000000001');
        console.log("Force assign result:", res);
    }
}
test();
