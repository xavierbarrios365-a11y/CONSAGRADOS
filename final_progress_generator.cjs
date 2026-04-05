const fs = require('fs');

try {
    const jsonPath = 'c:\\Users\\sahel\\Downloads\\consagrados-2026\\academy_full_response_utf8.json';
    const content = fs.readFileSync(jsonPath, 'utf8');
    const coursesIdx = content.indexOf('"courses":');
    const start = content.lastIndexOf('{', coursesIdx);
    const end = content.lastIndexOf('}');

    if (start === -1 || end === -1) {
        throw new Error("Could not find JSON data in file");
    }

    const data = JSON.parse(content.substring(start, end + 1));

    if (!data.progress || !Array.isArray(data.progress)) {
        throw new Error("Progress data not found in JSON");
    }

    // Build map lessonId -> courseId
    const lessonToCourse = {};
    if (data.lessons && Array.isArray(data.lessons)) {
        data.lessons.forEach(l => {
            lessonToCourse[l.id] = l.courseId;
        });
    }

    let sql = `-- RESTORATION OF ACADEMY PROGRESS (ROBUST VERSION)\n`;
    sql += `INSERT INTO public.academy_progress (agent_id, lesson_id, course_id, is_completed, score, attempts, completed_at)\n`;
    sql += `SELECT t.agent_id, t.lesson_id, t.course_id, t.is_completed, t.score, t.attempts, t.completed_at\n`;
    sql += `FROM (VALUES\n`;

    const entries = data.progress.map(p => {
        const agentId = p.agentId || 'S/D';
        const lessonId = p.lessonId || 'S/D';
        const isCompleted = p.status === 'COMPLETADO';
        const courseId = p.courseId || lessonToCourse[lessonId] || 'S/D';
        const score = p.score || 0;
        const attempts = p.attempts || 1;
        const completedAt = p.date || new Date().toISOString();

        return `('${agentId}', '${lessonId}', '${courseId}', ${isCompleted}, ${score}, ${attempts}, '${completedAt}'::timestamp with time zone)`;
    });

    sql += entries.join(',\n') + `\n) AS t(agent_id, lesson_id, course_id, is_completed, score, attempts, completed_at)\n`;
    sql += `INNER JOIN public.agentes a ON a.id = t.agent_id\n`; // Only existing agents
    sql += `ON CONFLICT (agent_id, lesson_id) DO UPDATE SET \n`;
    sql += `is_completed = EXCLUDED.is_completed, score = EXCLUDED.score, attempts = EXCLUDED.attempts, completed_at = EXCLUDED.completed_at, course_id = EXCLUDED.course_id;`;

    fs.writeFileSync('c:\\Users\\sahel\\Downloads\\consagrados-2026\\seed_academy_progress_final.sql', sql);
    console.log('SUCCESS: Generated robust seed_academy_progress_final.sql with ' + entries.length + ' entries.');
} catch (err) {
    console.error('ERROR:', err.message);
}
