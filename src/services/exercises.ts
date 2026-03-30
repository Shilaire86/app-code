import { supabase } from '@/lib/supabase';

export type ExerciseMatch = {
    id: string;
    name: string;
    muscle_groups: string[];
    equipment: string[];
    video_url: string | null;
};

export async function searchExercises(query: string, equipmentAccess?: string[]) {
    let q = supabase
        .from('exercises')
        .select('id, name, muscle_groups, equipment, video_url')
        .eq('is_active', true)
        .ilike('name', `%${query}%`)
        .order('name', { ascending: true })
        .limit(20);

    // If equipmentAccess is provided, we filter.
    // Note: In Supabase, testing if an array overlaps another array can be done with .ov()
    if (equipmentAccess && equipmentAccess.length > 0) {
        q = q.overlaps('equipment', equipmentAccess);
    }

    const { data, error } = await q;
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
