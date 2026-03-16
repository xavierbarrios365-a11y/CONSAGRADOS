const baseUrl = "https://dnzrnpslfabowgtikora.supabase.co/rest/v1";
const headers = {
    'apikey': 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7',
    'Authorization': 'Bearer sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7'
};

async function check(path) {
    console.log(`\n🔍 Checking ${path}...`);
    try {
        const res = await fetch(`${baseUrl}/${path}?limit=1`, { headers });
        if (!res.ok) {
            console.log(`❌ ${path} failed: ${res.status} ${res.statusText}`);
            return;
        }
        const data = await res.json();
        console.log(`✅ ${path} sample:`, data[0] || 'EMPTY');
    } catch (e) {
        console.error(`❌ ${path} error:`, e.message);
    }
}

async function run() {
    await check('bible_war_questions');
    await check('bible_war_sessions');
    await check('duel_challenges');
    await check('duelo_desafios');
    await check('duelo_sesiones');
    await check('duel_sessions');
}

run();
