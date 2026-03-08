import { supabase } from '@/lib/supabase';
import { calculateStage, calculateTotalPoints, StageScoreInput } from '@/lib/stages/calculator';
import { BecomingStage } from '@/stores/profileStore';

export interface StageRecalculationResult {
    previous: BecomingStage;
    current: BecomingStage;
    changed: boolean;
    totalPoints: number;
    skipped?: boolean;
}

const THROTTLE_MS = 15_000;
const inFlightByUser = new Map<string, Promise<StageRecalculationResult>>();
const lastRunAtByUser = new Map<string, number>();
const lastResultByUser = new Map<string, StageRecalculationResult>();
const persistenceBlockedByRlsByUser = new Set<string>();

/**
 * Recalculates the user's Becoming Stage based on their current activity.
 * Fetches counts from the database, runs the calculator, and persists to stage_status.
 */
export async function recalculateStage(
    userId: string,
    opts?: { force?: boolean }
): Promise<StageRecalculationResult> {
    const existing = inFlightByUser.get(userId);
    if (existing) return existing;

    const nowMs = Date.now();
    const lastRunAt = lastRunAtByUser.get(userId);
    const force = !!opts?.force;

    if (!force && typeof lastRunAt === 'number' && (nowMs - lastRunAt) < THROTTLE_MS) {
        const last = lastResultByUser.get(userId);
        if (last) return { ...last, changed: false, skipped: true };
        // If we don't have a cached result yet, fall through and compute.
    }

    const p = (async (): Promise<StageRecalculationResult> => {
        lastRunAtByUser.set(userId, nowMs);

        // 1. Fetch activity counts
        const results = await Promise.allSettled([
            supabase.from('workout_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            supabase.from('progress_entries').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            supabase.from('progress_photos').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        ]);

        const [workouts, progressEntries, photos] = results.map(r =>
            r.status === 'fulfilled' ? r.value : { count: 0 }
        );

        const input: StageScoreInput = {
            workoutCount: workouts.count || 0,
            progressEntryCount: progressEntries.count || 0,
            photoCount: photos.count || 0,
        };

        // 2. Calculate new stage
        const newStage = calculateStage(input);

        // Calculate total points for display
        const totalPoints = calculateTotalPoints(input);

        // 3. Fetch current stage
        const { data: currentStageData } = await supabase
            .from('stage_status')
            .select('current_stage')
            .eq('user_id', userId)
            .maybeSingle();

        const previousStage = (currentStageData?.current_stage as BecomingStage) || 'initiate';
        const changed = previousStage !== newStage;

        // 4. Upsert stage_status (skip repeated attempts if this environment blocks writes via RLS)
        const computedFrom = JSON.stringify(input);
        if (!persistenceBlockedByRlsByUser.has(userId)) {
            const stagePayload = changed
                ? {
                    user_id: userId,
                    current_stage: newStage,
                    stage_since: new Date().toISOString(),
                    previous_stage: previousStage,
                    stage_changed_at: new Date().toISOString(),
                    computed_from: computedFrom,
                }
                : {
                    user_id: userId,
                    current_stage: newStage,
                    computed_from: computedFrom,
                };
            const { error: upsertError } = await supabase
                .from('stage_status')
                .upsert(stagePayload, {
                    onConflict: 'user_id'
                });
            if (upsertError?.code === '42501') {
                persistenceBlockedByRlsByUser.add(userId);
                console.warn('[stageService] stage_status upsert blocked by RLS; skipping future persistence for this user session.');
            }
        }

        const result: StageRecalculationResult = {
            previous: previousStage,
            current: newStage,
            changed,
            totalPoints,
        };
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
