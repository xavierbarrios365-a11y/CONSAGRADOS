const url = 'https://dnzrnpslfabowgtikora.supabase.co/rest/v1/asistencia_visitas?select=*';
const key = 'sb_publishable_Q8gdZ29dpKJeiU-1bE9c2A_aRdUsAD7';

fetch(url, {
    method: 'GET',
    headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
    }
})
    .then(res => res.text().then(text => ({ status: res.status, text })))
    .then(data => console.log('Fetch Result:', data))
    .catch(err => console.error('Fetch Error:', err));
