export async function run(page, context, { shotsDir }) {
    await page.goto('http://localhost:8081/admin/feed', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const box = await page.evaluate(() => {
        const heading = Array.from(document.querySelectorAll('*')).find(
            (el) => el.children.length === 0 && el.textContent === 'Founders-Only: Thank You'
        );
        if (!heading) return null;
        const card = heading.closest('div[style], div');
        // Walk up until we find a container with a toggle-like element (tabindex 0, role switch)
        let node = heading;
        for (let i = 0; i < 6 && node; i++) node = node.parentElement;
        const toggle = node ? node.querySelector('[role="switch"], input[type="checkbox"], [tabindex="0"]') : null;
        if (!toggle) return { found: false };
        const r = toggle.getBoundingClientRect();
        return { found: true, x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });

    console.log('toggle box:', JSON.stringify(box));
    if (box?.found) {
        await page.mouse.click(box.x, box.y);
        await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: `${shotsDir}/14-after-publish.png`, fullPage: true });
}
