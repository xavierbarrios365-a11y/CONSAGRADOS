import fetch from 'node-fetch';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx7d1GqCkxSDU1jbLUh2vyxP1jxgQGw_lwP4Z6vlIbc0-ZHmUweWMaLHweAGbJN8WNs/exec';

async function test() {
    console.log("📡 Fetching FULL academy data from Sheets...");
    try {
        const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'get_academy_data', data: {} })
        });
        const json = await res.json();
        if (json.success && json.data) {
            console.log(`✅ SUCCESS: Found ${json.data.courses.length} courses and ${json.data.lessons.length} lessons.`);
            console.log(JSON.stringify(json.data, null, 2));
        } else {
            console.log("❌ FAILED:", json);
        }
    } catch (e) {
        console.error("💀 ERROR:", e);
    }
}

test();
