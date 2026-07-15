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

    const res = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=email,founder_status,founder_reward_applied_at&email=eq.tbm.founder.test.1784049513@gmail.com`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } }
    );
    console.log(await res.text());
}
