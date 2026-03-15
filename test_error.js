const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
    page.on('requestfailed', request => console.error('REQUEST FAILED:', request.url(), request.failure()?.errorText));

    try {
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle2', timeout: 10000 });
        console.log('Page loaded successfully');
    } catch (err) {
        console.error('Failed to load page:', err.message);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    await browser.close();
})();
