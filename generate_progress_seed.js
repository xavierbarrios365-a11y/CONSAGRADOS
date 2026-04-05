const fs = require('fs');

try {
    const jsonPath = 'c:\\Users\\sahel\\Downloads\\consagrados-2026\\academy_full_response_utf8.json';
    const content = fs.readFileSync(jsonPath, 'utf8');
    const start = content.indexOf('{"courses":');
    const end = content.lastIndexOf('}');

    if (start === -1 || end === -1) {
        throw new Error("Could not find JSON data in file");
    }

    const data = JSON.parse(content.substring(start, end + 1));

    if (!data.progress || !Array.isArray(data.progress)) {
        throw new Error("Progress data not found in JSON");
    }

    console.log(`Processing ${data.progress.length} progress entries...`);

    let sql = `-- RESTORATION OF ACADEMY PROGRESS\n`;
    sql += `INSERT INTO public.academy_progress (agent_id, lesson_id, status, score, attempts, completed_at)\nVALUES\n`;

    const entries = data.progress.map(p => {
        const agentId = p.agentId || 'S/D';
        const lessonId = p.lessonId || 'S/D';
        const status = p.status || 'INICIADO';
        const score = p.score || 0;
        const attempts = p.attempts || 1;
        const completedAt = p.date || new Date().toISOString();

        return `('${agentId}', '${lessonId}', '${status}', ${score}, ${attempts}, '${completedAt}')`;
    });

    sql += entries.join(',\n') + `\nON CONFLICT (agent_id, lesson_id) DO UPDATE SET \n`;
    sql += `status = EXCLUDED.status, score = EXCLUDED.score, attempts = EXCLUDED.attempts, completed_at = EXCLUDED.completed_at;`;

    fs.writeFileSync('c:\\Users\\sahel\\Downloads\\consagrados-2026\\seed_academy_progress.sql', sql);
    console.log('SUCCESS: seed_academy_progress.sql created.');
} catch (err) {
    console.error('ERROR:', err.message);
}
