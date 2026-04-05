import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const OLD_PROJECT = {
    url: 'https://dnzrnpslfabowgtikora.supabase.co',
    key: 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7'
};

const supabase = createClient(OLD_PROJECT.url, OLD_PROJECT.key);

async function res() {
    console.log('📡 Fetching courses...');
    const { data: c, error: ce } = await supabase.from('academy_courses').select('*');
    if (ce) console.error('Course Error:', ce);

    console.log('📡 Fetching lessons...');
    const { data: l, error: le } = await supabase.from('academy_lessons').select('*');
    if (le) console.error('Lesson Error:', le);

    const output = {
        courses: c || [],
        lessons: l || []
    };

    fs.writeFileSync('./academy_rescue_data.json', JSON.stringify(output, null, 2));
    console.log(`✅ Saved ${output.courses.length} courses and ${output.lessons.length} lessons to academy_rescue_data.json`);
}

res();
