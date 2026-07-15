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

    for (const endpoint of ['coach_posts?select=*', 'user_posts?select=*']) {
        const res = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
            headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
        });
        const body = await res.text();
        console.log(`--- ${endpoint} (${res.status}) ---`);
        console.log(body.slice(0, 1000));
    }
}
