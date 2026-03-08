import { supabase } from '@/lib/supabase';

export async function fetchWorkoutSession(workoutId: string) {
    const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select('*, programs(name)')
        .eq('id', workoutId)
        .single();

    if (workoutError) throw workoutError;

    const { data: exercises, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select('*, exercises(*)')
        .eq('workout_id', workoutId)
        .order('order_index', { ascending: true });

    if (exercisesError) throw exercisesError;

    return {
        workout,
        exercises: exercises ?? [],
    };
}

export async function fetchProgramDaySession(programDayId: string) {
    const { data: day, error: dayError } = await supabase
        .from('program_days')
        .select(`
            *,
            program_weeks(
                week_number,
                title,
                programs(name)
            )
        `)
        .eq('id', programDayId)
        .single();

    if (dayError) throw dayError;

    const { data: exercises, error: exercisesError } = await supabase
        .from('program_day_exercises')
        .select('*')
        .eq('program_day_id', programDayId)
        .order('order_index', { ascending: true });

    if (exercisesError) throw exercisesError;

    // Transform to match expected format
    const programName = (day as any)?.program_weeks?.programs?.name || 'Program';

    return {
        workout: {
            id: day.id,
            name: day.title || `Week ${(day as any)?.program_weeks?.week_number || ''} - Day ${day.day_number}`,
            programs: { name: programName },
            isNewStructure: true,
        },
        exercises: (exercises ?? []).map(ex => ({
            id: ex.id,
            exercises: {
                id: ex.id,
                name: ex.exercise_name,
                video_url: null,
            },
            sets: ex.sets_target || 3,
            reps_min: null,
            reps_max: null,
            reps_target: ex.reps_target,
            rest_seconds: ex.rest_seconds || 150,
            order_index: ex.order_index,
        })),
    };
}
