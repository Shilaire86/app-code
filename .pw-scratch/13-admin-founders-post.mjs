export async function run(page, context, { shotsDir }) {
    page.on('dialog', async (dialog) => { await dialog.accept(); });

    await page.goto('http://localhost:8081/admin/feed', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    await page.getByText('New Post', { exact: true }).click();
    await page.waitForTimeout(1000);

    await page.getByPlaceholder('Post title...').fill('Founders-Only: Thank You');
    await page.getByPlaceholder('Write your post...').fill(
        'This update is just for our Founders — thank you for shaping this app with us.'
    );
    await page.getByText('Founders only', { exact: true }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${shotsDir}/13a-composer-filled.png`, fullPage: true });

    await page.getByText('Create', { exact: true }).click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${shotsDir}/13b-after-create.png`, fullPage: true });
}
