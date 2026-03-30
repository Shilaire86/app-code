import { supabase } from '@/lib/supabase';

/**
 * The TBM Recovery Engine analyzes a user's recent trailing workload
 * to determine if they are in a state of high CNS/systemic stress.
 * 
 * Criteria for High Stress:
 * 1. Logged more than 30 working sets in the last 48 hours.
 * 2. Currently running an Elite-tier Power module or VIP-tier Conditioning module.
 */
export async function getRecoveryStatus(userId: string): Promise<{
    isHighStress: boolean;
    recentSets: number;
    activeStressModules: string[];
}> {
    // 1. Calculate trailing 48 hours date threshold
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - 48);
    const thresholdIso = thresholdDate.toISOString();

    // 2. Fetch workout logs from the last 48 hours
    const { data: recentLogs, error: logErr } = await supabase
        .from('workout_logs')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', thresholdIso);

    if (logErr) {
        console.error('[RecoveryEngine] Failed to fetch recent logs', logErr);
        return { isHighStress: false, recentSets: 0, activeStressModules: [] };
    }

    // 3. Count total sets
    let recentSets = 0;
    if (recentLogs && recentLogs.length > 0) {
        const logIds = recentLogs.map((l) => l.id);
        const { count, error: countErr } = await supabase
            .from('set_logs')
            .select('*', { count: 'exact', head: true })
            .in('workout_log_id', logIds);
            
        if (!countErr && count) {
            recentSets = count;
        }
    }

    // 4. Check active high-intensity modules
    const { data: activeModules, error: modErr } = await supabase
        .from('user_active_modules')
        .select('module:training_modules(slug, name)')
        .eq('user_id', userId);

    const activeStressModules: string[] = [];
    if (!modErr && activeModules) {
        activeModules.forEach((am: any) => {
            const slug = am.module?.slug;
            if (slug === 'conditioning' || slug === 'power') {
                activeStressModules.push(am.module.name);
            }
        });
    }

    // 5. Determine status
    // High Stress = > 30 sets in 48h OR running an intense module
    const isHighVolume = recentSets >= 30;
    const isRunningIntenseModule = activeStressModules.length > 0;
    
    const isHighStress = isHighVolume || isRunningIntenseModule;

    return {
        isHighStress,
        recentSets,
        activeStressModules,
    };
}
