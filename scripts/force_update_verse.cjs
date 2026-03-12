const https = require('https');

const supabaseUrl = 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseKey = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
const url = supabaseUrl + '/rest/v1/versiculos_diarios?fecha=eq.' + today;

// 3 hours ago
const oldTimestamp = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

const options = {
    method: 'PATCH',
    headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
};

const data = JSON.stringify({
    created_at: oldTimestamp
});

const req = https.request(url, options, (res) => {
    let responseBody = '';
    res.on('data', chunk => responseBody += chunk);
    res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 204) {
            console.log('Successfully updated today verse timestamp to force a refresh.');
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
