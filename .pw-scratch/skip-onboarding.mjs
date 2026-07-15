import fs from 'fs';
import path from 'path';

function readEnvVar(name) {
    const envPath = path.resolve('.env');
    const content = fs.readFileSync(envPath, 'utf8');
    const line = content.split('\n').find((l) => l.startsWith(`${name}=`));
    if (!line) throw new Error(`${name} not found in .env`);
    return line.slice(name.length + 1).trim();
}

export async function run(page) {
    const supabaseUrl = readEnvVar('EXPO_PUBLIC_SUPABASE_URL');
    const anonKey = readEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

    await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const { token, userId } = await page.evaluate(() => {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                const parsed = JSON.parse(localStorage.getItem(key));
                return { token: parsed?.access_token, userId: parsed?.user?.id };
            }
        }
        return {};
    });
    if (!token || !userId) throw new Error('No session found in this profile');

    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
            Authorization: `Bearer ${token}`,
            Prefer: 'return=representation',
        },
        body: JSON.stringify({ onboarding_complete: true }),
    });
    const body = await res.json().catch(() => null);
    console.log('PATCH status:', res.status, JSON.stringify(body));
}
