const EMAIL = process.env.PW_EMAIL;
const PASSWORD = process.env.PW_PASSWORD || 'TestPass123!';
const NAME = process.env.PW_NAME || 'Test User';

export async function run(page, context, { shotsDir }) {
    if (!EMAIL) throw new Error('Set PW_EMAIL env var');

    page.on('response', async (res) => {
        if (res.url().includes('/auth/v1/') && res.status() >= 400) {
            const body = await res.text().catch(() => '(unreadable)');
            console.log('[auth error]', res.status(), res.url(), body);
        }
    });

    await page.goto('http://localhost:8081/(auth)/register', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    await page.getByPlaceholder('Your name').fill(NAME);
    await page.getByPlaceholder('your@email.com').fill(EMAIL);
    await page.getByPlaceholder('••••••••').fill(PASSWORD);
    await page.getByText('Create Account', { exact: true }).last().click();
    await page.waitForTimeout(4000);

    await page.screenshot({ path: `${shotsDir}/02-after-register.png`, fullPage: true });
    console.log('URL after register:', page.url());
}
