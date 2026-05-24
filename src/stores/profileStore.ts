import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export type UserRole = 'user' | 'coach' | 'admin';
export type BecomingStage = 'initiate' | 'practitioner' | 'devoted' | 'embodied';
export type SubscriptionTier = 'free' | 'standard' | 'vip' | 'elite';

const SELF_SERVICE_PROFILE_FIELDS = new Set([
    'full_name',
    'timezone',
    'streak_nudges_enabled',
    'dietary_preference',
    'preferred_workout_time',
    'goals',
    'equipment_access',
    'experience_level',
    'onboarding_complete',
    'legal_accepted_at',
    'legal_accepted_version',
    'terms_accepted_at',
    'terms_accepted_version',
    'privacy_accepted_at',
    'privacy_accepted_version',
    'disclaimer_accepted_at',
    'disclaimer_accepted_version',
    'seen_hints',
]);

interface ProfileState {
    profile: any | null;
    stage: BecomingStage;
    tier: SubscriptionTier;
    activityCounts: {
        workoutCount: number;
        progressEntryCount: number;
        photoCount: number;
    };
    isLoading: boolean;
    bootstrapState: 'idle' | 'loading' | 'ready' | 'failed';
    bootstrapError: string | null;
    bootstrappedUserId: string | null; // Track which user we've fetched for
    lastFetchAtMs: number | null;
    levelUpDetails: { previous: BecomingStage; current: BecomingStage } | null;
    justLeveledUp: boolean;
    setLevelUp: (previous: BecomingStage, current: BecomingStage) => void;
    clearLevelUp: () => void;
    fetchProfile: (userId: string) => Promise<void>;
    updateProfile: (updates: any) => Promise<void>;
    setSeenHint: (key: string) => Promise<void>;
    setSeenHintValue: (key: string, value: any) => Promise<void>;
    reset: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
    profile: null,
    stage: 'initiate',
    tier: 'free',
    activityCounts: {
        workoutCount: 0,
        progressEntryCount: 0,
        photoCount: 0,
    },
    isLoading: false,
    bootstrapState: 'idle',
    bootstrapError: null,
    bootstrappedUserId: null,
    lastFetchAtMs: null,
    levelUpDetails: null,
    justLeveledUp: false,

    setLevelUp: (previous, current) => {
        set({ justLeveledUp: true, levelUpDetails: { previous, current } });
    },

    clearLevelUp: () => {
        set({ justLeveledUp: false });
        // Don't clear levelUpDetails immediately so the modal can animate out smoothly
        setTimeout(() => set({ levelUpDetails: null }), 500);
    },

    fetchProfile: async (userId) => {
        if (!userId) return;

        // Avoid stampeding calls (web can re-render quickly on auth/session events).
        // We still allow explicit refreshes after a short window.
        const nowMs = Date.now();
        const state = get();
        if (state.isLoading && state.bootstrappedUserId === userId) return;
        if (state.lastFetchAtMs && (nowMs - state.lastFetchAtMs) < 1500 && state.bootstrappedUserId === userId) return;

        console.log('[profileStore] Fetching profile for:', userId);
        set({
            isLoading: true,
            bootstrapState: 'loading',
            bootstrapError: null,
            bootstrappedUserId: userId,
            lastFetchAtMs: nowMs,
        });

        // Add a timeout fallback
        const timeoutId = setTimeout(() => {
            if (get().isLoading) {
                console.warn('[profileStore] Profile fetch timed out');
                set({ isLoading: false });
            }
        }, 10000);

        try {
            // 1. Fetch profile
            console.log('[profileStore] Fetching core profile...');
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (profileError) {
                // If RLS blocks or some other issue occurs, surface it and stop loading.
                console.error('[profileStore] Profile error:', profileError);
                throw profileError;
            }

            let ensuredProfile = profile;
            if (!ensuredProfile) {
                // Defensive: some environments may be missing the `handle_new_user` trigger.
                // Attempt to create the minimal profile row for the signed-in user.
                console.warn('[profileStore] No profile row found; attempting to create one...');
                const { data: userRes, error: userErr } = await supabase.auth.getUser();
                if (userErr) throw userErr;

                const email = userRes.user?.email ?? null;
                const { error: insertErr } = await supabase
                    .from('profiles')
                    .insert({ id: userId, email });
                if (insertErr) throw insertErr;

                const { data: prof2, error: prof2Err } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();
                if (prof2Err) throw prof2Err;
                ensuredProfile = prof2;
            }

            if (!ensuredProfile) {
                throw new Error('Profile missing after attempted creation.');
            }

            console.log('[profileStore] Profile found:', ensuredProfile.email);

            // 2. Fetch stage (don't block on error)
            console.log('[profileStore] Fetching stage status...');
            const { data: stageStatus, error: stageError } = await supabase
                .from('stage_status')
                .select('current_stage')
                .eq('user_id', userId)
                .maybeSingle();

            if (stageError) console.warn('[profileStore] Stage error (non-fatal):', stageError);

            // 3. Fetch subscription (don't block on error)
            console.log('[profileStore] Fetching subscription...');
            const { data: subscription, error: subError } = await supabase
                .from('subscriptions')
                .select('tier')
                .eq('user_id', userId)
                .maybeSingle();

            if (subError) console.warn('[profileStore] Subscription error (non-fatal):', subError);

            // 4. Fetch Activity Counts (don't block on error, but log it)
            console.log('[profileStore] Fetching activity counts...');
            const results = await Promise.allSettled([
                supabase.from('workout_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId),
                // Progress entries are weight/measurements/body fat logs (not mindset notes).
                supabase.from('progress_entries').select('*', { count: 'exact', head: true }).eq('user_id', userId),
                supabase.from('progress_photos').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            ]);

            const [workouts, progressEntries, photos] = results.map(r => r.status === 'fulfilled' ? r.value : { count: 0 });

            console.log('[profileStore] All data fetched successfully');
            clearTimeout(timeoutId);
            set({
                profile: ensuredProfile,
                stage: stageStatus?.current_stage || 'initiate',
                tier: subscription?.tier || 'free',
                activityCounts: {
                    workoutCount: workouts.count || 0,
                    progressEntryCount: progressEntries.count || 0,
                    photoCount: photos.count || 0,
                },
                isLoading: false,
                bootstrapState: 'ready',
                bootstrapError: null,
            });

            // 5. Recalculate stage now that we have fresh counts
            // This ensures the stage in DB is always current
            try {
                const { recalculateStage } = await import('@/services/stageService');
                const result = await recalculateStage(userId);
                // Update local state if stage changed during recalculation
                if (result.changed && result.current !== get().stage) {
                    set({ stage: result.current });
                    get().setLevelUp(result.previous, result.current);
                }
            } catch (stageErr) {
                console.warn('[profileStore] Stage recalculation failed (non-fatal):', stageErr);
            }
        } catch (error) {
            console.error('[profileStore] Fatal error fetching profile:', error);
            clearTimeout(timeoutId);
            set({
                isLoading: false,
                bootstrapState: 'failed',
                bootstrapError: error instanceof Error ? error.message : String(error),
            });
        }
    },

    updateProfile: async (updates) => {
        const { profile } = get();
        if (!profile) return;

        try {
            const safeUpdates = Object.fromEntries(
                Object.entries(updates).filter(([key]) => SELF_SERVICE_PROFILE_FIELDS.has(key))
            );

            if (Object.keys(safeUpdates).length === 0) {
                console.warn('[profileStore] Ignoring profile update with no allowed fields.');
                return;
            }

            const blockedKeys = Object.keys(updates).filter((key) => !SELF_SERVICE_PROFILE_FIELDS.has(key));
            if (blockedKeys.length > 0) {
                console.warn('[profileStore] Ignoring disallowed profile fields:', blockedKeys.join(', '));
            }

            const { error } = await supabase
                .from('profiles')
                .update(safeUpdates)
                .eq('id', profile.id);

            if (error) throw error;
            set({ profile: { ...profile, ...safeUpdates } });
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    },

    setSeenHint: async (key: string) => {
        const { profile, updateProfile } = get();
        if (!profile?.id) return;
        const current = (profile.seen_hints && typeof profile.seen_hints === 'object') ? profile.seen_hints : {};
        if (current?.[key] === true) return;
        await updateProfile({ seen_hints: { ...current, [key]: true } });
    },

    setSeenHintValue: async (key: string, value: any) => {
        const { profile, updateProfile } = get();
        if (!profile?.id) return;
        const current = (profile.seen_hints && typeof profile.seen_hints === 'object') ? profile.seen_hints : {};
        if (current?.[key] === value) return;
        await updateProfile({ seen_hints: { ...current, [key]: value } });
    },

    reset: () => {
        console.log('[profileStore] Resetting store');
        set({
            profile: null,
            stage: 'initiate',
            tier: 'free',
            activityCounts: {
                workoutCount: 0,
                progressEntryCount: 0,
                photoCount: 0,
            },
            isLoading: false,
            bootstrapState: 'idle',
            bootstrapError: null,
            bootstrappedUserId: null,
            lastFetchAtMs: null,
        });
    },
}));
