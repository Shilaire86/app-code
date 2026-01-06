import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export type UserRole = 'user' | 'coach' | 'admin';
export type BecomingStage = 'initiate' | 'practitioner' | 'devoted' | 'embodied';
export type SubscriptionTier = 'free' | 'standard' | 'vip' | 'elite';

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
    fetchProfile: (userId: string) => Promise<void>;
    updateProfile: (updates: any) => Promise<void>;
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

    fetchProfile: async (userId) => {
        set({ isLoading: true });
        try {
            // Fetch profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) throw profileError;

            // Fetch stage
            const { data: stageStatus } = await supabase
                .from('stage_status')
                .select('current_stage')
                .eq('user_id', userId)
                .single();

            // Fetch subscription
            const { data: subscription } = await supabase
                .from('subscriptions')
                .select('tier')
                .eq('user_id', userId)
                .single();

            // Fetch Activity Counts for Points
            const [workouts, mindset, photos] = await Promise.all([
                supabase.from('workout_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId),
                supabase.from('mindset_entries').select('*', { count: 'exact', head: true }).eq('user_id', userId),
                supabase.from('progress_photos').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            ]);

            set({
                profile,
                stage: stageStatus?.current_stage || 'initiate',
                tier: subscription?.tier || 'free',
                activityCounts: {
                    workoutCount: workouts.count || 0,
                    progressEntryCount: mindset.count || 0,
                    photoCount: photos.count || 0,
                },
                isLoading: false,
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
            set({ isLoading: false });
        }
    },

    updateProfile: async (updates) => {
        const { profile } = get();
        if (!profile) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', profile.id);

            if (error) throw error;
            set({ profile: { ...profile, ...updates } });
        } catch (error) {
            console.error('Error updating profile:', error);
        }
    },
}));
