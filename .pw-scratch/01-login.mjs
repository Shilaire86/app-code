export async function run(page, context, { shotsDir }) {
    await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${shotsDir}/01-initial.png`, fullPage: true });

    const emailField = page.getByPlaceholder('your@email.com');
    if (await emailField.count() > 0) {
        await emailField.fill('StvnHilaire@yahoo.com');
        await page.getByPlaceholder('••••••••').fill('Android18#');
        await page.getByText('Sign In', { exact: true }).click();
        await page.waitForTimeout(4000);
    }

    await page.screenshot({ path: `${shotsDir}/02-after-login.png`, fullPage: true });
    console.log('URL after login:', page.url());
}
