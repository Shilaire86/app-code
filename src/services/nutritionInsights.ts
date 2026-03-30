import { supabase } from '@/lib/supabase';
import { getActiveTargets, getAdherenceSummary } from './nutrition';

export type InsightType = 'protein_low' | 'calories_high' | 'weight_stall' | 'streak_master';
export type ActionType = 'recalculate' | 'none';

export type NutritionInsight = {
    id: string;
    user_id: string;
    insight_type: InsightType;
    title: string;
    message: string;
    action_type: ActionType;
    status: 'active' | 'dismissed' | 'resolved';
    created_at: string;
};

/**
 * Fetches the user's active insight cards.
 */
export async function getActiveInsights(userId: string): Promise<NutritionInsight[]> {
    const { data, error } = await supabase
        .from('nutrition_insights')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Dismisses an active insight card.
 */
export async function resolveInsight(insightId: string, status: 'dismissed' | 'resolved' = 'dismissed'): Promise<void> {
    const { error } = await supabase
        .from('nutrition_insights')
        .update({ status })
        .eq('id', insightId);
    
    if (error) throw error;
}

/**
 * The core engine that detects macro inconsistencies and generates actionable coaching cards.
 * Designed to run in the background (e.g. on Dashboard load).
 */
export async function generateInsights(userId: string): Promise<void> {
    try {
        const activeInsights = await getActiveInsights(userId);
        const hasInsight = (type: string) => activeInsights.some(i => i.insight_type === type);
        
        const targets = await getActiveTargets(userId);
        if (!targets) return; 

        // Analyze recent behavior across the last 7 days
        const summary = await getAdherenceSummary(userId, targets);
        const newInsights: Omit<NutritionInsight, 'id' | 'created_at' | 'status'>[] = [];

        // Rule 1: Protein Hit Rate < 70% over the last week
        // summary.proteinHitDays7d is count of days in last 7.
        const proteinHitRate = (summary.proteinHitDays7d / 7) * 100;
        if (proteinHitRate < 70 && summary.loggingStreak >= 3 && !hasInsight('protein_low')) {
            newInsights.push({
                user_id: userId,
                insight_type: 'protein_low',
                title: 'Protein Needs a Bump',
                message: `You've hit your protein target on ${summary.proteinHitDays7d} of the last 7 days. Let's try prioritizing complete protein sources earlier in the day!`,
                action_type: 'none',
            });
        }

        // Rule 2: Calories consistently too high
        if (summary.avgCalories7d > targets.calories + 300 && summary.loggingStreak >= 3 && !hasInsight('calories_high')) {
             newInsights.push({
                user_id: userId,
                insight_type: 'calories_high',
                title: 'Slight Caloric Surplus Detected',
                message: `Your 7-day average is ${summary.avgCalories7d} calories, which is above target. If fat loss is your objective, we should consider adjusting portions or recalculating.`,
                action_type: targets.goal === 'lose' ? 'recalculate' : 'none',
            });       
        }

        // Rule 3: Great consistency streak
        if (summary.loggingStreak >= 7 && !hasInsight('streak_master')) {
            newInsights.push({
                user_id: userId,
                insight_type: 'streak_master',
                title: 'Consistency checks out!',
                message: `You've logged meals for ${summary.loggingStreak} days in a row! This is exactly the kind of foundational habit that leads to massive transformations.`,
                action_type: 'none',
            });
        }

        if (newInsights.length > 0) {
            const { error } = await supabase.from('nutrition_insights').insert(newInsights);
            if (error) console.error('[NutritionInsights] Error inserting new insights', error);
        }
    } catch (e) {
        console.error('[NutritionInsights] Engine generation failed', e);
    }
}
