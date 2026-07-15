export async function run(page, context, { shotsDir }) {
    await page.goto('http://localhost:8081/(tabs)/feed', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${shotsDir}/15-feed.png`, fullPage: true });

    const hasAnnouncement = await page.evaluate(() =>
        document.body.textContent.includes('Founders-Only: Thank You')
    );
    console.log('Sees founders-only announcement:', hasAnnouncement);
}
