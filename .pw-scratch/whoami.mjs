export async function run(page) {
    await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const email = await page.evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                try {
                    const parsed = JSON.parse(localStorage.getItem(key));
                    return parsed?.user?.email || parsed?.currentSession?.user?.email || null;
                } catch {
                    return 'PARSE_ERROR';
                }
            }
        }
        return null;
    });
    console.log('WHOAMI:', email);
}
