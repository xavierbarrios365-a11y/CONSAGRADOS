const axios = require('axios');

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx7d1GqCkxSDU1jbLUh2vyxP1jxgQGw_lwP4Z6vlIbc0-ZHmUweWMaLHweAGbJN8WNs/exec";

async function debug() {
    try {
        console.log("Fetching from:", APPS_SCRIPT_URL);
        const response = await axios.get(APPS_SCRIPT_URL);
        const data = response.data;

        console.log("Data type:", typeof data);
        console.log("Is array:", Array.isArray(data));

        const items = Array.isArray(data) ? data : (data.data || []);
        console.log("Total items:", items.length);

        if (items.length > 0) {
            console.log("\nSample Item (full keys):");
            // Find Jaihelyer if possible
            const jai = items.find(it => String(it.nombre || it.name || '').includes('Jaihelyer')) || items[0];
            console.log(JSON.stringify(jai, null, 2));

            console.log("\nChecking for alternate XP columns:");
            const keys = Object.keys(jai);
            const xpKeys = keys.filter(k => k.toLowerCase().includes('xp') || k.toLowerCase().includes('puntos') || k.toLowerCase().includes('experiencia'));
            console.log("Found columns related to XP/Points:", xpKeys);

            xpKeys.forEach(k => {
                console.log(`- ${k}: ${jai[k]}`);
            });
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

debug();
