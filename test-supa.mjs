import { createClient } from '@supabase/supabase-js';

const url = 'https://dnzrnpslfabowgtikora.supabase.co';
const key = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';
const supabase = createClient(url, key);

const SHEETS_URL = "https://script.google.com/macros/s/AKfycbx7d1GqCkxSDU1jbLUh2vyxP1jxgQGw_lwP4Z6vlIbc0-ZHmUweWMaLHweAGbJN8WNs/exec";

async function restorePINs() {
    console.log('--- Fetching agents from Google Sheets ---');
    const resp = await fetch(SHEETS_URL);
    const sheetData = await resp.json();

    const rows = sheetData.data;
    console.log(`Got ${rows.length} rows from Sheets.`);

    // Skip header row (first row)
    let restored = 0;
    let skipped = 0;

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const id = String(row['0'] || '').trim();
        const pin = String(row['4'] || '').trim();

        if (!id || !pin) {
            skipped++;
            continue;
        }

        const { error } = await supabase.rpc('update_agent_pin', { p_id: id, p_pin: pin });
        if (error) {
            console.error(`FAIL ${id}:`, error.message);
        } else {
            restored++;
            console.log(`✅ ${id} -> PIN restored`);
        }
    }

    console.log(`\n--- DONE: Restored ${restored} PINs, skipped ${skipped} ---`);

    // Verify Sahel's PIN
    const test = await supabase.rpc('verify_agent_pin', { p_id: '20389331', p_pin: '' });
    console.log(`\nSahel empty PIN test: ${test.data} (should be false now)`);
}

restorePINs();
