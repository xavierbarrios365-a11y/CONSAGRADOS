
import fetch from 'node-fetch';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx7d1GqCkxSDU1jbLUh2vyxP1jxgQGw_lwP4Z6vlIbc0-ZHmUweWMaLHweAGbJN8WNs/exec';

async function test() {
    console.log("Testing get_academy_data without agentId...");
    const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'get_academy_data', data: {} })
    });
    const json = await res.json();
    console.log("Success:", json.success);
    if (json.data && json.data.progress) {
        console.log("Progress entries count:", json.data.progress.length);
        if (json.data.progress.length > 0) {
            console.log("Sample progress:", json.data.progress[0]);
        }
    } else {
        console.log("No progress data returned for empty agentId.");
    }
}

test();
