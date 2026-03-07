async function inspectSheet() {
    const SHEETS_URL = "https://script.google.com/macros/s/AKfycbx7d1GqCkxSDU1jbLUh2vyxP1jxgQGw_lwP4Z6vlIbc0-ZHmUweWMaLHweAGbJN8WNs/exec";
    console.log('--- Inspecting Sheets Data ---');
    try {
        const resp = await fetch(SHEETS_URL);
        const sheetData = await resp.json();
        const rows = sheetData.data;

        if (rows.length < 2) {
            console.log('Not enough data.');
            return;
        }

        const headers = rows[0];
        console.log('Headers:', headers);

        const idIndex = headers.indexOf('ID');
        const nameIndex = headers.indexOf('NOMBRE');
        const attendanceIndex = headers.indexOf('LAST_ATTENDANCE');

        console.log(`Indices: ID=${idIndex}, NOMBRE=${nameIndex}, ATTENDANCE=${attendanceIndex}`);

        for (let i = 1; i < Math.min(rows.length, 20); i++) {
            const row = rows[i];
            console.log(`- ${row[nameIndex]} (${row[idIndex]}): "${row[attendanceIndex]}"`);
        }

        // Search for Sahel
        const sahel = rows.find(r => String(r[idIndex]).includes('20389331'));
        if (sahel) {
            console.log('\n--- Sahel Data ---');
            console.log(`ID: ${sahel[idIndex]}`);
            console.log(`Name: ${sahel[nameIndex]}`);
            console.log(`Attendance: "${sahel[attendanceIndex]}"`);
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

inspectSheet();
