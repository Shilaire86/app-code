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
    if (!popup) throw new Error('Checkout popup did not open');
    await popup.waitForLoadState('domcontentloaded');
    await popup.waitForTimeout(2500);

    await popup.getByPlaceholder('email@example.com').fill('tbm.control.test.checkout@gmail.com');

    const cardRowBox = await popup.evaluate(() => {
        const btn = document.querySelector('[data-testid="card-accordion-item-button"]');
        if (!btn) return null;
        const r = btn.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (cardRowBox) await popup.mouse.click(cardRowBox.x, cardRowBox.y);
    await popup.waitForTimeout(1500);

    await popup.getByPlaceholder('1234 1234 1234 1234').fill('4242424242424242');
    await popup.getByPlaceholder('MM / YY').fill('12/34');
    await popup.getByPlaceholder('CVC').fill('123');
    await popup.getByPlaceholder('Full name on card').fill('Control Test');

    const zip = popup.getByPlaceholder('ZIP');
    if (await zip.count() > 0) await zip.fill('10001');

    const saveInfoBox = popup.getByText('Save my information for faster checkout');
    if (await saveInfoBox.count() > 0) {
        const box = await saveInfoBox.evaluate((el) => {
            const checkbox = el.closest('label')?.querySelector('input[type="checkbox"]')
                || document.querySelector('input[type="checkbox"]');
            if (!checkbox) return null;
            const r = checkbox.getBoundingClientRect();
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        });
        if (box) await popup.mouse.click(box.x, box.y);
    }

    await popup.waitForTimeout(500);
    await popup.getByRole('button', { name: /Start trial/i }).click();
    await popup.waitForTimeout(7000);
    console.log('Popup URL after submit:', popup.url());
}
