import { supabase } from '@/lib/supabase';
import { SubscriptionTier } from '@/stores/profileStore';
import { ENTITLEMENTS } from '@/lib/entitlements';

export type ScanCredits = {
    dailyUsed: number;
    dailyLimit: number;
    dailyRemaining: number;
    bonusCredits: number;
    totalRemaining: number;
};

export async function fetchScanCredits(
    userId: string,
    tier: SubscriptionTier,
): Promise<ScanCredits | null> {
    const dailyLimit = ENTITLEMENTS[tier]?.dailyScanLimit ?? 0;

    const { data, error } = await supabase
        .from('scan_credits')
        .select('daily_used, daily_reset_date, bonus_credits')
        .eq('user_id', userId)
        .maybeSingle();

    // PGRST205 = table not in schema cache (migration not yet applied)
    if (error?.code === 'PGRST205') return null;
    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    const isToday = data?.daily_reset_date === today;
    const dailyUsed = isToday ? (data?.daily_used ?? 0) : 0;
    const bonusCredits = data?.bonus_credits ?? 0;
    const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);

    return {
        dailyUsed,
        dailyLimit,
        dailyRemaining,
        bonusCredits,
        totalRemaining: dailyRemaining + bonusCredits,
    };
}
