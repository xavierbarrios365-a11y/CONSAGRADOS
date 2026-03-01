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

async function testUpdate() {
    console.log("Testing fetch agents...");
    const { data: agents, error: fetchErr } = await supabase.from('agentes').select('id, nombre, last_attendance').limit(1);
    if (fetchErr) {
        console.error("Fetch err", fetchErr);
        return;
    }
    if (!agents || agents.length === 0) {
        console.log("No agents found");
        return;
    }
    const a = agents[0];
    console.log("Found agent:", a.nombre, "Current attendance:", a.last_attendance);

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
    console.log("Attempting to update last_attendance to", today);

    const { data, error } = await supabase.from('agentes').update({ last_attendance: today }).eq('id', a.id).select();

    if (error) {
        console.error("Update error:", error);
    } else {
        console.log("Update success. Data returned:", data);
    }
}

testUpdate();
