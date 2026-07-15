export async function run(page, context, { shotsDir }) {
    await page.goto('http://localhost:8081/admin/tickets', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${shotsDir}/18a-all-tickets.png`, fullPage: true });

    // Toggle the "FOUNDERS ONLY" filter pill
    await page.getByText('FOUNDERS ONLY', { exact: true }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${shotsDir}/18b-founders-filtered.png`, fullPage: true });
}
