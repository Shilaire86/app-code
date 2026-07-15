export async function run(page, context, { shotsDir }) {
    await page.goto('http://localhost:8081/(tabs)/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const text = await page.getByText('Current plan').first();
    await text.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${shotsDir}/08-settings-account.png`, fullPage: false });
}
