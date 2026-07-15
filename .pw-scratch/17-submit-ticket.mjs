export async function run(page, context, { shotsDir }) {
    page.on('console', (msg) => {
        if (msg.type() === 'error') console.log('[console error]', msg.text());
    });

    await page.goto('http://localhost:8081/help/report-issue', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    await page.getByText('Bug / Something Broken', { exact: true }).click();
    await page.getByPlaceholder('Brief summary of the issue').fill('Founders program test ticket');
    await page.getByPlaceholder("Please describe the issue in detail. Include steps to reproduce if it's a bug.").fill(
        'This is a test ticket submitted by the founder-test account to verify the founders-only filter in admin/tickets.'
    );
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${shotsDir}/17a-ticket-filled.png`, fullPage: true });

    await page.getByText('Submit Report', { exact: true }).click();
    await page.waitForTimeout(2500);
    console.log('URL after submit:', page.url());
}
