
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuenJucHNsZmFib3dndGlrb3JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzgxNTAwMDAsImV4cCI6MjAwMTc2NjAwMH0.YOUR_KEY_HERE'; // I need to be careful with the key

// Wait, the key in .env.local was truncated or masked in my previous view? 
// 3: VITE_SUPABASE_ANON_KEY=sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7
// This looks like a public key for something else (sb_publishable?). 
// Standard Supabase anon keys start with eyJ...

async function run() {
    const supabase = createClient(supabaseUrl, 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7'); // Let's try what was in .env.local

    const { data, error } = await supabase
        .from('agentes')
        .select('id, nombre, xp')
        .order('xp', { ascending: false });

    if (error) {
        console.error("Supabase Error:", error.message);
        return;
    }

    console.log("Supabase Points (Top 10):");
    console.table(data.slice(0, 10));

    const sahel = data.find(a => a.nombre.includes('SAHEL'));
    if (sahel) {
        console.log("\nSahel in Supabase:", sahel);
    }
}

run();
