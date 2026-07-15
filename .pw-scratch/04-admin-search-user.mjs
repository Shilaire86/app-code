const SEARCH = process.env.PW_SEARCH;

export async function run(page, context, { shotsDir }) {
    if (!SEARCH) throw new Error('Set PW_SEARCH env var');

    await page.goto('http://localhost:8081/admin/users', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    await page.getByPlaceholder('Search email or name...').fill(SEARCH);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${shotsDir}/04-search-result.png`, fullPage: true });
}
