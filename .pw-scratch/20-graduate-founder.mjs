const SEARCH = process.env.PW_SEARCH;

export async function run(page, context, { shotsDir }) {
    page.on('console', (msg) => console.log('[console]', msg.type(), msg.text()));
    page.on('dialog', async (dialog) => {
        console.log('[dialog]', dialog.type(), dialog.message());
        await dialog.accept();
    });

    await page.goto('http://localhost:8081/admin/users', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.getByPlaceholder('Search email or name...').fill(SEARCH);
    await page.waitForTimeout(1000);

    const index = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('[tabindex="0"]'));
        const glyphs = Array.from(document.querySelectorAll('div[style*="ionicons"]'));
        const ribbon = glyphs.find((el) => {
            const c = el.style.color;
            return c === 'rgba(255, 255, 255, 0.3)' || c === 'rgb(212, 130, 74)';
        });
        if (!ribbon) return -1;
        const btn = ribbon.closest('[tabindex="0"]');
        return all.indexOf(btn);
    });
    console.log('Ribbon button index:', index);
    if (index < 0) throw new Error('Could not locate ribbon button');

    await page.locator('[tabindex="0"]').nth(index).click({ force: true });
    // Give the discount edge function call time to complete (it's a real
    // Stripe round trip: coupon lookup/create + subscription update).
    await page.waitForTimeout(6000);
    await page.screenshot({ path: `${shotsDir}/20-after-graduate.png`, fullPage: true });
}
