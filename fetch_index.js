import http from 'http';

http.get('http://localhost:3001', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => console.log(data));
}).on('error', (err) => console.error(err));
