export async function run(page, context, { shotsDir }) {
    let dialogSeen = false;
    page.on('dialog', async (dialog) => {
        dialogSeen = true;
        console.log('[dialog]', dialog.type(), dialog.message());
        await dialog.dismiss(); // cancel — don't actually sign the admin session out
    });

    await page.goto('http://localhost:8081/(tabs)/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    await page.getByText('Sign Out', { exact: true }).click();
    await page.waitForTimeout(1000);

    console.log('Dialog fired:', dialogSeen);
    console.log('Still on settings (not signed out):', page.url());
}
