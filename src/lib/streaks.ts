import { supabase } from '@/lib/supabase';

export type WorkoutStreakSummary = {
    streakDays: number;
    lastWorkoutAt: string | null;
    daysSinceLast: number | null;
    skipped?: boolean;
};

const THROTTLE_MS = 15_000;
const inFlightByUser = new Map<string, Promise<WorkoutStreakSummary>>();
const lastRunAtByUser = new Map<string, number>();
const lastResultByUser = new Map<string, WorkoutStreakSummary>();

function dateKeyForTimeZone(isoLike: string, timeZone?: string): string | null {
    const d = new Date(isoLike);
    if (Number.isNaN(d.getTime())) return null;

    // en-CA yields YYYY-MM-DD format.
    try {
        // eslint-disable-next-line no-new
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: timeZone || undefined,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(d);
    } catch {
        // Fallback to device local if timeZone is unsupported.
        return new Intl.DateTimeFormat('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(d);
    }
}

function epochDayFromKey(key: string): number | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
    return Math.floor(Date.UTC(y, mo - 1, d) / 86_400_000);
}

export async function getWorkoutStreakSummary(
    userId: string,
    opts?: { timeZone?: string; force?: boolean }
): Promise<WorkoutStreakSummary> {
    const existing = inFlightByUser.get(userId);
    if (existing) return existing;

    const nowMs = Date.now();
    const lastRunAt = lastRunAtByUser.get(userId);
    const force = !!opts?.force;

    if (!force && typeof lastRunAt === 'number' && (nowMs - lastRunAt) < THROTTLE_MS) {
        const last = lastResultByUser.get(userId);
        if (last) return { ...last, skipped: true };
    }

    const p = (async (): Promise<WorkoutStreakSummary> => {
        lastRunAtByUser.set(userId, nowMs);

        const { data, error } = await supabase
            .from('workout_logs')
            .select('completed_at')
            .eq('user_id', userId)
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false })
            .limit(120);

        if (error) throw error;
        const rows = (data || []) as { completed_at: string | null }[];
        const lastWorkoutAt = rows[0]?.completed_at ?? null;
        if (!lastWorkoutAt) {
            const result = { streakDays: 0, lastWorkoutAt: null, daysSinceLast: null };
            lastResultByUser.set(userId, result);
            return result;
        }

        const tz = opts?.timeZone || 'America/New_York';
        const keys: string[] = [];
        const seen = new Set<string>();
        for (const r of rows) {
            if (!r.completed_at) continue;
            const key = dateKeyForTimeZone(r.completed_at, tz);
            if (!key) continue;
            if (seen.has(key)) continue;
            seen.add(key);
            keys.push(key);
        }
        if (keys.length === 0) {
            const result = { streakDays: 0, lastWorkoutAt, daysSinceLast: null };
            lastResultByUser.set(userId, result);
            return result;
        }

        const todayKey = dateKeyForTimeZone(new Date().toISOString(), tz);
        const todayEpoch = todayKey ? epochDayFromKey(todayKey) : null;
        const lastKey = keys[0];
        const lastEpoch = epochDayFromKey(lastKey);

        const daysSinceLast =
            todayEpoch != null && lastEpoch != null ? Math.max(0, todayEpoch - lastEpoch) : null;

        // Streak only counts if the latest workout is today or yesterday.
        if (daysSinceLast == null || daysSinceLast > 1) {
            const result = { streakDays: 0, lastWorkoutAt, daysSinceLast };
            lastResultByUser.set(userId, result);
            return result;
        }

        let streakDays = 1;
        let prevEpoch = lastEpoch;
        for (let i = 1; i < keys.length; i++) {
            const e = epochDayFromKey(keys[i]);
            if (e == null || prevEpoch == null) break;
            if ((prevEpoch - e) === 1) {
                streakDays += 1;
                prevEpoch = e;
            } else {
                break;
            }
        }

        const result = { streakDays, lastWorkoutAt, daysSinceLast };
        lastResultByUser.set(userId, result);
        return result;
    })();

    inFlightByUser.set(userId, p);
    try {
        return await p;
    } finally {
        inFlightByUser.delete(userId);
    }
}

