const SEARCH = process.env.PW_SEARCH;

export async function run(page) {
    await page.goto('http://localhost:8081/admin/users', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.getByPlaceholder('Search email or name...').fill(SEARCH);
    await page.waitForTimeout(1000);

    const buttons = await page.locator('[role="button"]').all();
    for (const b of buttons) {
        const box = await b.boundingBox();
        const text = await b.innerText().catch(() => '');
        const aria = await b.getAttribute('aria-label').catch(() => null);
        console.log('BTN', JSON.stringify({ box, text, aria }));
    }
}
