const https = require('https');

const supabaseUrl = 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseKey = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
const url = supabaseUrl + '/rest/v1/versiculos_diarios?fecha=eq.' + today;

const options = {
    method: 'GET',
    headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey
    }
};

const req = https.request(url, options, (res) => {
    let responseBody = '';
    res.on('data', chunk => responseBody += chunk);
    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('Current verse in DB:', responseBody);
        } else {
            console.error('Error fetching verse:', res.statusCode, responseBody);
        }
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.end();
