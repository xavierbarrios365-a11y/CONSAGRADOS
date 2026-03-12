const https = require('https');

const supabaseUrl = 'https://dnzrnpslfabowgtikora.supabase.co';
const supabaseKey = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
const url = supabaseUrl + '/rest/v1/versiculos_diarios?fecha=eq.' + today;

const options = {
    method: 'DELETE',
    headers: {
        'apikey': supabaseKey,
        'Authorization': 'Bearer ' + supabaseKey
    }
};

const req = https.request(url, options, (res) => {
    if (res.statusCode === 200 || res.statusCode === 204) {
        console.log('Successfully deleted today verse to force a refresh.');
    } else {
        console.error('Error deleting verse:', res.statusCode);
        res.on('data', d => process.stdout.write(d));
    }
});

req.on('error', (e) => {
    console.error(e);
});

req.end();
