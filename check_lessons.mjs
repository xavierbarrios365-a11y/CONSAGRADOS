import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
let sUrl = '';
let sKey = '';
envFile.split('\n').forEach(line => {
    if (line.trim().startsWith('VITE_SUPABASE_URL=')) sUrl = line.split('=')[1].trim();
    if (line.trim().startsWith('VITE_SUPABASE_ANON_KEY=')) sKey = line.split('=')[1].trim();
});

const supabase = createClient(sUrl, sKey);

async function check() {
    const { data, error } = await supabase.from('academy_lessons').select('*').limit(2);
    if (error) {
        console.error("DB Error:", error);
    } else {
        console.log("Got lessons:", data.length);
        console.dir(data, { depth: null });
    }
}
check();
