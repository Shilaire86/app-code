export async function run(page, context, { shotsDir }) {
    page.on('response', async (res) => {
        if (res.url().includes('/rest/v1/') && res.status() >= 400) {
            const body = await res.text().catch(() => '(unreadable)');
            console.log('[rest error]', res.status(), res.url().split('/rest/v1/')[1], body);
        }
    });

    await page.goto('http://localhost:8081/(tabs)/feed', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: `${shotsDir}/11a-feed-before.png`, fullPage: true });
}
