const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx7d1GqCkxSDU1jbLUh2vyxP1jxgQGw_lwP4Z6vlIbc0-ZHmUweWMaLHweAGbJN8WNs/exec";

async function run() {
    try {
        console.log("Fetching from Google Sheets...");
        const response = await fetch(`${APPS_SCRIPT_URL}?timestamp=${new Date().getTime()}`);
        if (!response.ok) throw new Error(`HTTP ERROR: ${response.status}`);

        const result = await response.json();
        const rawContent = Array.isArray(result) ? result : (result.data || []);

        if (rawContent.length === 0) {
            console.log("No data found");
            return;
        }

        const isMatrix = Array.isArray(rawContent[0]);
        if (isMatrix) {
            console.log("HEADERS:", rawContent[0]);
            console.log("First Row Data:", rawContent[1]);
        } else {
            console.log("First Object Keys:", Object.keys(rawContent[0]));
            console.log("First Object:", rawContent[0]);
        }
    } catch (e) {
        console.error(e);
    }
}
run();
