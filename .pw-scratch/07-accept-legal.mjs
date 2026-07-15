export async function run(page, context, { shotsDir }) {
    await page.goto('http://localhost:8081/legal/accept', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    for (const y of [365, 432, 499]) {
        await page.mouse.click(1210, y);
        await page.waitForTimeout(300);
    }
    await page.screenshot({ path: `${shotsDir}/07a-switches-on.png`, fullPage: true });

    await page.getByText('Agree & Continue', { exact: true }).click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${shotsDir}/07b-after-agree.png`, fullPage: true });
    console.log('URL:', page.url());
}
