export async function run(page, context, { shotsDir }) {
    page.on('console', (msg) => {
        if (msg.type() === 'error') console.log('[console error]', msg.text());
    });

    await page.goto('http://localhost:8081/subscribe', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const [popup] = await Promise.all([
        context.waitForEvent('page', { timeout: 8000 }).catch(() => null),
        page.getByText('Start 7-day free trial').first().click(),
    ]);

    await page.waitForTimeout(2500);
    console.log('Main page URL after click:', page.url());
    console.log('Popup opened:', !!popup, popup ? popup.url() : null);

    const target = popup || page;
    await target.waitForTimeout(2000);
    await target.screenshot({ path: `${shotsDir}/09b-checkout.png`, fullPage: true }).catch((e) => console.log('screenshot err', e.message));
    console.log('Target URL:', target.url());
}
