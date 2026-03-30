import { supabase } from '@/lib/supabase';
import { SubscriptionTier } from '@/stores/profileStore';

export type ModuleExercise = {
    name: string;
    instructions?: string;
    duration_seconds?: number;
    reps?: string;
};

export type ModuleRoutine = {
    id: string;
    module_id: string;
    name: string;
    duration_minutes: number;
    placement: 'pre_workout' | 'post_workout' | 'rest_day' | 'any';
    exercises: ModuleExercise[];
    is_active: boolean;
};

export type TrainingModule = {
    id: string;
    name: string;
    slug: 'mobility' | 'conditioning' | 'power' | string;
    description: string;
    tier_required: SubscriptionTier;
    is_active: boolean;
    routines?: ModuleRoutine[]; // populated when joined
};

export type UserActiveModule = {
    id: string;
    user_id: string;
    module_id: string;
    activated_at: string;
    module?: TrainingModule;
};

/**
 * Validates whether a user can activate a specific module based on their tier.
 * Also enforces the stacking guardrail (max 2 modules, conditioning/power conflict).
 */
export async function canActivateModule(userId: string, moduleSlug: string, userTier: SubscriptionTier): Promise<{ allowed: boolean; reason?: string }> {
    // 1. Fetch the requested module to check tier requirement
    const { data: requestedModule, error: modErr } = await supabase
        .from('training_modules')
        .select('id, tier_required')
        .eq('slug', moduleSlug)
        .maybeSingle();

    if (modErr || !requestedModule) return { allowed: false, reason: 'Module not found.' };

    // Strict tier check: standard < vip < elite
    const tiers = ['free', 'standard', 'vip', 'elite'];
    if (tiers.indexOf(userTier) < tiers.indexOf(requestedModule.tier_required)) {
        return { allowed: false, reason: `Requires ${requestedModule.tier_required.toUpperCase()} or higher.` };
    }

    // 2. Fetch the user's currently active modules
    const { data: activeModules, error: actErr } = await supabase
        .from('user_active_modules')
        .select('module_id, module:training_modules(slug)')
        .eq('user_id', userId);

    if (actErr) return { allowed: false, reason: 'Failed to verify active modules.' };
    
    const active = activeModules || [];
    
    // Check if already active
    if (active.some(a => (a.module as any)?.slug === moduleSlug)) {
        return { allowed: true }; // Already active, no conflict
    }

    // 3. Stacking Guardrails
    // Max 2 active modules at a time
    if (active.length >= 2) {
        return { allowed: false, reason: 'You can only have 2 active modules at a time. Deactivate one first.' };
    }

    // Conditioning + Power conflict (recovery overload)
    const activeSlugs = active.map(a => (a.module as any).slug);
    if (moduleSlug === 'conditioning' && activeSlugs.includes('power')) {
        return { allowed: false, reason: 'Conditioning and Power modules cannot be active at the same time to prevent recovery interference.' };
    }
    if (moduleSlug === 'power' && activeSlugs.includes('conditioning')) {
        return { allowed: false, reason: 'Conditioning and Power modules cannot be active at the same time to prevent recovery interference.' };
    }

    return { allowed: true };
}

/**
 * Activates a supplemental module for the user.
 */
export async function activateModule(userId: string, moduleSlug: string): Promise<void> {
    const { data: m } = await supabase.from('training_modules').select('id').eq('slug', moduleSlug).single();
    if (!m) throw new Error('Module not found');

    const { error } = await supabase.from('user_active_modules').insert({
        user_id: userId,
        module_id: m.id
    });
    
    if (error && error.code !== '23505') throw error; // Ignore if already exists
}

/**
 * Deactivates a supplemental module for the user.
 */
export async function deactivateModule(userId: string, moduleSlug: string): Promise<void> {
    const { data: m } = await supabase.from('training_modules').select('id').eq('slug', moduleSlug).single();
    if (!m) return;

    const { error } = await supabase.from('user_active_modules')
        .delete()
        .eq('user_id', userId)
        .eq('module_id', m.id);

    if (error) throw error;
}

/**
 * Fetches all available modules along with their routines.
 */
export async function fetchAllModules(): Promise<TrainingModule[]> {
    const { data, error } = await supabase
        .from('training_modules')
        .select(`
            *,
            routines:module_routines(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Safely sort routines by placement
    if (data) {
        data.forEach(mod => {
            if (mod.routines) {
                const order: Record<string, number> = { 'pre_workout': 1, 'post_workout': 2, 'any': 3, 'rest_day': 4 };
                mod.routines.sort((a: any, b: any) => (order[a.placement] || 5) - (order[b.placement] || 5));
            }
        });
    }

    return (data || []) as unknown as TrainingModule[];
}

/**
 * Fetches the user's currently active modules.
 */
export async function fetchUserActiveModules(userId: string): Promise<TrainingModule[]> {
    const { data, error } = await supabase
        .from('user_active_modules')
        .select(`
            module:training_modules (
                *,
                routines:module_routines(*)
            )
        `)
        .eq('user_id', userId);

    if (error) throw error;
    
    const modules = data?.map(d => d.module) || [];
    
    // Sort routines inside each active module
    modules.forEach(mod => {
        if ((mod as any).routines) {
            const order: Record<string, number> = { 'pre_workout': 1, 'post_workout': 2, 'any': 3, 'rest_day': 4 };
            (mod as any).routines.sort((a: any, b: any) => (order[a.placement] || 5) - (order[b.placement] || 5));
        }
    });

    return modules as unknown as TrainingModule[];
}
