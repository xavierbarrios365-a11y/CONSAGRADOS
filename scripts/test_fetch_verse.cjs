require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchDailyVerseSupabase() {
    try {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
        const { data, error } = await supabase
            .from('versiculos_diarios')
            .select('*')
            .eq('fecha', today)
            .maybeSingle();

        let needsNewVerse = false;

        console.log('DB Data:', data);

        if (data && !error) {
            const createdAtMs = new Date(data.created_at).getTime();
            const nowMs = Date.now();
            const twoHoursMs = 2 * 60 * 60 * 1000;

            if (nowMs - createdAtMs >= twoHoursMs) {
                needsNewVerse = true;
                console.log('Verse older than 2 hours. Needs new verse.');
            } else {
                console.log('Verse is fresh. Returning:', {
                    date: data.fecha,
                    reference: data.cita,
                    verse: data.texto
                });
                return;
            }
        } else {
            needsNewVerse = true;
            console.log('No verse found for today or error. Needs new verse.');
        }

        if (needsNewVerse) {
            try {
                console.log('Fetching from API...');
                const apiRes = await fetch('https://bible-api.deno.dev/api/read/rv1960/random');
                const apiData = await apiRes.json();
                console.log('API returned:', apiData.reference || apiData.book);

                if (apiData && apiData.text) {
                    const newDaily = {
                        fecha: today,
                        cita: `${apiData.book} ${apiData.chapter}:${apiData.verse}`,
                        texto: apiData.text,
                        created_at: new Date().toISOString()
                    };

                    if (data) {
                        console.log('Updating existing verse in DB...');
                        const { error: updateError } = await supabase.from('versiculos_diarios').update({
                            cita: newDaily.cita,
                            texto: newDaily.texto,
                            created_at: newDaily.created_at
                        }).eq('fecha', today);
                        if (updateError) console.error('Update error:', updateError);
                    } else {
                        console.log('Inserting new verse to DB...');
                        const { error: insertError } = await supabase.from('versiculos_diarios').insert(newDaily);
                        if (insertError) console.error('Insert error:', insertError);
                    }

                    console.log('Success! Returning:', {
                        date: newDaily.fecha,
                        reference: newDaily.cita,
                        verse: newDaily.texto
                    });
                    return;
                }
            } catch (apiError) {
                console.error('Error fetching API:', apiError);
            }
        }
    } catch (e) {
        console.error('Crash:', e);
    }
}

fetchDailyVerseSupabase();
