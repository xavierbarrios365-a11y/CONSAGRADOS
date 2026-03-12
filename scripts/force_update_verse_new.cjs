const https = require('https');

const supabaseUrl = 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseKey = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
const url = supabaseUrl + '/rest/v1/versiculos_diarios?fecha=eq.' + today;

const diffDays = Math.floor(new Date(today).getTime() / (1000 * 60 * 60 * 24));
const FALLBACK_VERSES = [
    // --- ESPERANZA, PAZ Y SALVACIÓN ---
    { book: 'Juan', chapter: '16', verse: '33', text: 'Estas cosas os he hablado para que en mí tengáis paz. En el mundo tendréis aflicción; pero confiad, yo he vencido al mundo.' },
    { book: 'Romanos', chapter: '15', verse: '13', text: 'Y el Dios de esperanza os llene de todo gozo y paz en el creer, para que abundéis en esperanza por el poder del Espíritu Santo.' },
    { book: 'Filipenses', chapter: '4', verse: '6-7', text: 'Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias. Y la paz de Dios, que sobrepasa todo entendimiento, guardará vuestros corazones y vuestros pensamientos en Cristo Jesús.' },
    { book: '1 Pedro', chapter: '5', verse: '7', text: 'Echando toda vuestra ansiedad sobre él, porque él tiene cuidado de vosotros.' }
];
const index = diffDays % 100; // Fake index to get a different verse 
const fallbackData = FALLBACK_VERSES[index % 4];

const data = JSON.stringify({
    cita: `${fallbackData.book} ${fallbackData.chapter}:${fallbackData.verse}`,
    texto: fallbackData.text
});

const options = {
    method: 'PATCH',
    headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
};

const req = https.request(url, options, (res) => {
    let responseBody = '';
    res.on('data', chunk => responseBody += chunk);
    res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 204) {
            console.log('Successfully updated today verse to exactly the new logic verse.');
        } else {
            console.error('Error updating verse:', res.statusCode, responseBody);
        }
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.write(data);
req.end();
