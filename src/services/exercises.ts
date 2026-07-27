import { supabase } from '@/lib/supabase';

export type ExerciseMatch = {
    id: string;
    name: string;
    muscle_groups: string[];
    equipment: string[];
    video_url: string | null;
};

export async function searchExercises(query: string, equipmentAccess?: string[]) {
    const base = () =>
        supabase
            .from('exercises')
            .select('id, name, muscle_groups, equipment, video_url')
            .eq('is_active', true)
            .ilike('name', `%${query}%`)
            .order('name', { ascending: true })
            .limit(20);

    // If equipmentAccess is provided, prefer matches the user has equipment for.
    // Note: In Supabase, testing if an array overlaps another array can be done with .ov()
    if (equipmentAccess && equipmentAccess.length > 0) {
        const { data, error } = await base().overlaps('equipment', equipmentAccess);
        if (error) throw error;
        if (data && data.length > 0) return data as ExerciseMatch[];

        // Named exercises (e.g. "Back Squat", "Conventional Deadlift") that don't
        // overlap the user's saved equipment still exist in the library — surface
        // them rather than telling the user their exact search term "doesn't exist."
        const { data: unfiltered, error: fallbackError } = await base();
        if (fallbackError) throw fallbackError;
        return unfiltered as ExerciseMatch[];
    }

    const { data, error } = await base();
    if (error) throw error;
    return data as ExerciseMatch[];
}

export async function fetchTopExercises(limit = 20, equipmentAccess?: string[]) {
    let q = supabase
        .from('exercises')
        .select('id, name, muscle_groups, equipment, video_url')
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(limit);

    if (equipmentAccess && equipmentAccess.length > 0) {
        q = q.overlaps('equipment', equipmentAccess);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data as ExerciseMatch[];
}
