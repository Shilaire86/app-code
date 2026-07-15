export async function run(page, context, { shotsDir }) {
    page.on('console', (msg) => {
        if (msg.type() === 'error') console.log('[console error]', msg.text());
    });

    await page.goto('http://localhost:8081/(tabs)/feed/new-post', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    await page.getByPlaceholder("What's on your mind? Share a thought, question, or update...").fill(
        'Excited to be part of the Founders Program — testing this post to check the badge!'
    );
    await page.getByText('I agree to the', { exact: false }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${shotsDir}/12a-new-post-filled.png`, fullPage: true });

    await page.getByText('Post', { exact: true }).last().click();
    await page.waitForTimeout(3000);
    console.log('URL after post:', page.url());

    await page.goto('http://localhost:8081/(tabs)/feed', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${shotsDir}/12b-feed-after-post.png`, fullPage: true });
}
