import { supabase } from '@/lib/supabase';
import { getRecoveryStatus } from '@/services/recoveryEngine';

// ─── Types ────────────────────────────────────────────────────

export type CardioProtocol = {
    id: string;
    name: string;
    slug: string;
    description: string;
    equipment_required: string[];
    duration_minutes: number;
    intensity: 'low' | 'moderate' | 'high';
    best_for: string[];
    instructions: { step: number; instruction: string }[];
    is_signature: boolean;
    is_active: boolean;
};

export type UserCardioPlanEntry = {
    id: string;
    user_id: string;
    protocol_id: string;
    scheduled_day: number; // 1-7 (Mon-Sun)
    placement: 'rest_day' | 'post_workout' | 'standalone';
    is_completed: boolean;
    week_start: string;
    protocol?: CardioProtocol; // joined
};

export type CardioGoal = 'lose' | 'gain' | 'maintain';

type CardioRecommendation = {
    sessionsPerWeek: number;
    preferredIntensity: 'low' | 'moderate' | 'high' | 'mixed';
    rationale: string;
};

// ─── Goal-Based Recommendation Logic ────────────────────────

const CARDIO_RULES: Record<CardioGoal, CardioRecommendation> = {
    lose: {
        sessionsPerWeek: 4,
        preferredIntensity: 'moderate',
        rationale: 'Moderate steady-state cardio maximizes fat oxidation without crushing recovery.',
    },
    gain: {
        sessionsPerWeek: 2,
        preferredIntensity: 'low',
        rationale: 'Minimal cardio preserves calories for muscle growth. Focus on low-impact recovery sessions.',
    },
    maintain: {
        sessionsPerWeek: 3,
        preferredIntensity: 'mixed',
        rationale: 'A balanced mix keeps your cardiovascular health strong without interfering with training.',
    },
};

// ─── Service Functions ──────────────────────────────────────

/**
 * Fetches all active cardio protocols from the library.
 */
export async function fetchProtocols(): Promise<CardioProtocol[]> {
    const { data, error } = await supabase
        .from('cardio_protocols')
        .select('*')
        .eq('is_active', true)
        .order('is_signature', { ascending: false }) // signature first
        .order('name');

    if (error) throw error;
    return data || [];
}

/**
 * Fetches a single protocol by its slug.
 */
export async function fetchProtocolBySlug(slug: string): Promise<CardioProtocol | null> {
    const { data, error } = await supabase
        .from('cardio_protocols')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

    if (error) throw error;
    return data;
}

/**
 * Core recommendation engine.
 * Filters protocols by equipment and returns goal-appropriate suggestions
 * with the TBM Incline Walk prioritized when available.
 */
export function generateCardioRecommendations(
    goal: CardioGoal,
    userEquipment: string[],
    allProtocols: CardioProtocol[],
    isRecovering: boolean = false
): { recommendation: CardioRecommendation; protocols: CardioProtocol[] } {
    const recommendation = { ...CARDIO_RULES[goal] };

    // ─── Recovery Mode Adjustments ───
    if (isRecovering) {
        recommendation.preferredIntensity = 'low';
        recommendation.sessionsPerWeek = Math.min(2, recommendation.sessionsPerWeek);
        recommendation.rationale = 'Recovery Mode Active. High CNS/systemic stress detected. Cardio intensity and volume have been dynamically dialed down to prioritize active recovery and avoid injury.';
    }

    // Filter protocols by equipment the user has access to
    // 'none' equipment is always available, 'full_gym' means they have everything
    const hasFullGym = userEquipment.includes('full_gym');

    const available = allProtocols.filter(p => {
        if (!p.equipment_required || p.equipment_required.length === 0) return true;
        return p.equipment_required.some(eq =>
            eq === 'none' || hasFullGym || userEquipment.includes(eq)
        );
    });

    // Sort: signature first, then by goal alignment
    const scored = available.map(p => {
        let score = 0;

        // Signature protocols get top priority
        if (p.is_signature) score += 100;

        // Goal alignment
        if (p.best_for.includes(goalToBestFor(goal))) score += 50;

        // Intensity match
        if (recommendation.preferredIntensity === 'mixed') {
            score += 20; // everything works for mixed
        } else if (p.intensity === recommendation.preferredIntensity) {
            score += 30;
        }

        return { protocol: p, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return {
        recommendation,
        protocols: scored.map(s => s.protocol),
    };
}

/**
 * Generates and saves a weekly cardio plan for the user.
 */
export async function generateWeeklyCardioPlan(
    userId: string,
    goal: CardioGoal,
    userEquipment: string[],
    trainingDays: number[] // 1-7 days the user lifts
): Promise<UserCardioPlanEntry[]> {
    const { isHighStress } = await getRecoveryStatus(userId);
    const allProtocols = await fetchProtocols();
    const { recommendation, protocols } = generateCardioRecommendations(goal, userEquipment, allProtocols, isHighStress);

    if (protocols.length === 0) return [];

    // Figure out rest days (days not in trainingDays)
    const allDays = [1, 2, 3, 4, 5, 6, 7];
    const restDays = allDays.filter(d => !trainingDays.includes(d));

    // Build the weekly schedule
    const entries: Omit<UserCardioPlanEntry, 'id' | 'protocol'>[] = [];
    const weekStart = getWeekStart();

    let assigned = 0;
    const sessionsTarget = recommendation.sessionsPerWeek;

    // Priority 1: Place on rest days first
    for (const day of restDays) {
        if (assigned >= sessionsTarget) break;
        const protocol = protocols[assigned % protocols.length];
        entries.push({
            user_id: userId,
            protocol_id: protocol.id,
            scheduled_day: day,
            placement: 'rest_day',
            is_completed: false,
            week_start: weekStart,
        });
        assigned++;
    }

    // Priority 2: If not enough rest days, place post-workout
    if (assigned < sessionsTarget) {
        for (const day of trainingDays) {
            if (assigned >= sessionsTarget) break;
            const protocol = protocols[assigned % protocols.length];
            entries.push({
                user_id: userId,
                protocol_id: protocol.id,
                scheduled_day: day,
                placement: 'post_workout',
                is_completed: false,
                week_start: weekStart,
            });
            assigned++;
        }
    }

    // Clear any existing plan for this week before inserting
    await supabase
        .from('user_cardio_plan')
        .delete()
        .eq('user_id', userId)
        .eq('week_start', weekStart);

    // Insert the new plan
    const { data, error } = await supabase
        .from('user_cardio_plan')
        .insert(entries)
        .select('*, protocol:cardio_protocols(*)');

    if (error) throw error;
    return data || [];
}

/**
 * Fetches the user's current week cardio plan with protocol details.
 */
export async function getUserCardioPlan(userId: string): Promise<UserCardioPlanEntry[]> {
    const weekStart = getWeekStart();

    const { data, error } = await supabase
        .from('user_cardio_plan')
        .select('*, protocol:cardio_protocols(*)')
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .order('scheduled_day');

    if (error) throw error;
    return data || [];
}

/**
 * Gets today's cardio entry (if any) for the Home Dashboard card.
 */
export async function getTodaysCardio(userId: string): Promise<UserCardioPlanEntry | null> {
    const weekStart = getWeekStart();
    const todayDay = getDayOfWeek(); // 1=Mon, 7=Sun

    const { data, error } = await supabase
        .from('user_cardio_plan')
        .select('*, protocol:cardio_protocols(*)')
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .eq('scheduled_day', todayDay)
        .maybeSingle();

    if (error) throw error;
    return data;
}

/**
 * Marks a cardio session as complete.
 */
export async function markCardioComplete(entryId: string): Promise<void> {
    const { error } = await supabase
        .from('user_cardio_plan')
        .update({ is_completed: true })
        .eq('id', entryId);

    if (error) throw error;
}

// ─── Helpers ────────────────────────────────────────────────

function goalToBestFor(goal: CardioGoal): string {
    switch (goal) {
        case 'lose': return 'fat_loss';
        case 'gain': return 'recovery';
        case 'maintain': return 'general_health';
    }
}

/** Returns the ISO date string of this week's Monday. */
function getWeekStart(): string {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust for Sunday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
}

/** Returns 1-7 where 1=Monday, 7=Sunday. */
function getDayOfWeek(): number {
    const jsDay = new Date().getDay(); // 0=Sun, 1=Mon
    return jsDay === 0 ? 7 : jsDay;
}
