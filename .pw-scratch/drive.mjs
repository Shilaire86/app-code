import { chromium } from 'playwright';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import fs from 'fs';

const here = path.dirname(fileURLToPath(import.meta.url));

const profileName = process.argv[2];
const actionPath = process.argv[3];
if (!profileName || !actionPath) {
    console.error('usage: node drive.mjs <profileName> <action.mjs>');
    process.exit(1);
}

const profileDir = path.join(here, 'profiles', profileName);
const shotsDir = path.join(here, 'screenshots', profileName);
fs.mkdirSync(shotsDir, { recursive: true });

const context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    viewport: { width: 1280, height: 900 },
});
const page = context.pages()[0] || (await context.newPage());
page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[console error]', msg.text());
});
page.on('pageerror', (err) => console.log('[page error]', err.message));

try {
    const mod = await import(pathToFileURL(path.resolve(actionPath)).href);
    await mod.run(page, context, { shotsDir });
} catch (err) {
    console.error('[driver error]', err);
    process.exitCode = 1;
} finally {
    await context.close();
}
