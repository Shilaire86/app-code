export async function run(page, context, { shotsDir }) {
    page.on('console', (msg) => {
        console.log(`[console ${msg.type()}]`, msg.text());
    });
    page.on('pageerror', (err) => {
        console.log('[page error]', err.message);
        console.log('[page error stack]', err.stack);
    });

    await page.goto('http://localhost:8081/welcome', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    await page.screenshot({ path: `${shotsDir}/03-welcome-reload.png`, fullPage: true });
    console.log('Final URL:', page.url());
}
