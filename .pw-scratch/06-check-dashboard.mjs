export async function run(page, context, { shotsDir }) {
    page.on('console', (msg) => {
        if (msg.type() === 'error') console.log('[console error]', msg.text());
    });
    await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${shotsDir}/06-dashboard.png`, fullPage: true });
    console.log('URL:', page.url());
}
