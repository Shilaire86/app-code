import fs from 'fs';
import path from 'path';

function readEnvVar(name) {
    const content = fs.readFileSync(path.resolve('.env'), 'utf8');
    const line = content.split('\n').find((l) => l.startsWith(`${name}=`));
    return line.slice(name.length + 1).trim();
}

export async function run(page) {
    const supabaseUrl = readEnvVar('EXPO_PUBLIC_SUPABASE_URL');
    const anonKey = readEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

    await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const token = await page.evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                return JSON.parse(localStorage.getItem(key))?.access_token;
            }
        }
        return null;
    });

    const targetId = 'dc910e12-f1df-4e86-88be-3d2e4578b3d1'; // founder-test
    const res = await fetch(`${supabaseUrl}/functions/v1/grant-founder-discount`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target_id: targetId }),
    });
    console.log('status:', res.status);
    console.log('body:', await res.text());
}
