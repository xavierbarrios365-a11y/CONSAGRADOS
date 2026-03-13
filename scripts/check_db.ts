import { createClient } from '@supabase/supabase-js';

// Utilizamos las credenciales de .env.local explícitamente para ver a qué nos estamos conectando
const url = process.env.VITE_SUPABASE_URL || 'https://dnzrnpslfabowgtikora.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

console.log('Conectando a:', url);
const supabase = createClient(url, key);

async function checkDB() {
    console.log('Listando todas las tablas disponibles en public...');
    const { data: tables, error: tsError } = await supabase
        .from('noticia_likes') // valid for something we know exists
        .select('*, intel_feed!inner(*)') // just testing some relations? No, let's use rpc or raw fetch if we can't query information_schema directly from client.
        .limit(1);

    // Let's just try viewing all tables that sound like news. 
    const checks = ['news', 'feed', 'noticias', 'noticias_feed', 'intel_feed', 'muro', 'publicaciones', 'notificacion_push'];
    for (const t of checks) {
        const { error } = await supabase.from(t).select('id').limit(1);
        if (!error) console.log(`✓ TABLA ENCONTRADA: ${t}`);
        else if (error.code !== 'PGRST205') console.log(`✓ TABLA EXISTE CON RLS: ${t} (${error.message})`);
    }

    console.log('\nConsultando agentes...');
    const { data: agents, error: agentsError } = await supabase.from('agentes').select('id, nombre').limit(2);
    if (agentsError) {
        console.error('Error agentes:', agentsError);
    } else {
        console.log(`Éxito. Agentes encontrados:`, agents);
    }
}

checkDB();
