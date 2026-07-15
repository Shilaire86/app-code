const SEARCH = process.env.PW_SEARCH;

export async function run(page) {
    await page.goto('http://localhost:8081/admin/users', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.getByPlaceholder('Search email or name...').fill(SEARCH);
    await page.waitForTimeout(1000);

    const html = await page.evaluate((search) => {
        const all = Array.from(document.querySelectorAll('*'));
        const emailEl = all.find((el) => el.children.length === 0 && el.textContent && el.textContent.includes(search));
        if (!emailEl) return 'NOT FOUND';
        // walk up a few levels
        let node = emailEl;
        for (let i = 0; i < 4 && node.parentElement; i++) node = node.parentElement;
        return node.outerHTML;
    }, SEARCH);
    console.log(html);
}
