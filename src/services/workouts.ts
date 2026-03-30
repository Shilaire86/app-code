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

    // Look up full exercise details from the exercises table by name
    const exerciseNames = (exercises ?? []).map(ex => ex.exercise_name).filter(Boolean);
    let exerciseLookup: Record<string, any> = {};
    if (exerciseNames.length > 0) {
        const { data: fullExercises } = await supabase
            .from('exercises')
            .select('*')
            .in('name', exerciseNames);

        if (fullExercises) {
            for (const fe of fullExercises) {
                exerciseLookup[fe.name] = fe;
            }
        }
    }

    return {
        workout: {
            id: day.id,
            name: day.title || `Week ${(day as any)?.program_weeks?.week_number || ''} - Day ${day.day_number}`,
            programs: { name: programName },
            isNewStructure: true,
        },
        exercises: (exercises ?? []).map(ex => {
            const matched = exerciseLookup[ex.exercise_name];
            return {
                id: ex.id,
                exercises: {
                    id: matched?.id || ex.id,
                    name: ex.exercise_name,
                    video_url: matched?.video_url || null,
                    alternatives: matched?.alternatives || [],
                    muscle_groups: matched?.muscle_groups || [],
                    equipment: matched?.equipment || [],
                },
                sets: ex.sets_target || 3,
                reps_min: null,
                reps_max: null,
                reps_target: ex.reps_target,
                rest_seconds: ex.rest_seconds || 150,
                order_index: ex.order_index,
            };
        }),
    };
}

export async function fetchNextSession(userId: string) {
    // 1. Find the latest logged workout
    const { data: latestLog } = await supabase
        .from('workout_logs')
        .select('workout_id')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!latestLog?.workout_id) return null;

    // 2. See if it belongs to a program
    const { data: day } = await supabase
        .from('program_days')
        .select('program_week_id, program_weeks(program_id)')
        .eq('id', latestLog.workout_id)
        .maybeSingle();

    const pw = day?.program_weeks as any;
    const programId = Array.isArray(pw) ? pw[0]?.program_id : pw?.program_id;
    if (!programId) return null;

    // 3. Fetch all completed days for this program
    // To do this, we get all days for this program, and see which ones aren't in workout_logs
    const { data: allDays } = await supabase
        .from('program_days')
        .select(`
            id,
            day_number,
            title,
            program_weeks!inner (
                week_number,
                program_id,
                programs!inner (name)
            )
        `)
        .eq('program_weeks.program_id', programId)
        .order('program_weeks(week_number)', { ascending: true })
        .order('day_number', { ascending: true });

    if (!allDays || allDays.length === 0) return null;

    const { data: myLogs } = await supabase
        .from('workout_logs')
        .select('workout_id')
        .eq('user_id', userId);

    const completedIds = new Set((myLogs || []).map(l => l.workout_id));

    // Next session is the first chronologically ordered day that hasn't been completed
    const nextDay = allDays.find(d => !completedIds.has(d.id));
    if (!nextDay) return null; // Finished the whole program!

    const nextPw = nextDay.program_weeks as any;
    const weekNumber = Array.isArray(nextPw) ? nextPw[0]?.week_number : nextPw?.week_number;
    const programName = Array.isArray(nextPw) ? nextPw[0]?.programs?.name : nextPw?.programs?.name;

    return {
        programDayId: nextDay.id,
        programName,
        weekNumber,
        dayNumber: nextDay.day_number,
        title: nextDay.title,
    };
}

export async function fetchLatestWeight(userId: string) {
    const { data } = await supabase
        .from('progress_entries')
        .select('weight_lbs, created_at')
        .eq('user_id', userId)
        .not('weight_lbs', 'is', null)
        .order('created_at', { ascending: false })
        .limit(2);

    if (!data || data.length === 0) return null;

    const current = data[0].weight_lbs;
    const previous = data.length > 1 ? data[1].weight_lbs : null;
    
    let trend: 'up' | 'down' | 'flat' | null = null;
    let change = 0;
    
    if (previous !== null) {
        change = Math.abs(current - previous);
        if (current > previous) trend = 'up';
        else if (current < previous) trend = 'down';
        else trend = 'flat';
    }

    return {
        weight: current,
        trend,
        change,
        date: data[0].created_at
    };
}

export async function saveQuickWorkout(userId: string, title: string, exerciseData: any[]) {
    const { data, error } = await supabase
        .from('quick_workouts')
        .insert({
            user_id: userId,
            title,
            exercise_data: exerciseData,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getQuickWorkoutCountForWeek(userId: string) {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
        .from('quick_workouts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startOfWeek.toISOString());

    if (error) throw error;
    return count || 0;
}

export async function startQuickWorkout(userId: string, title: string, exercises: any[]) {
    // To reuse the complex active.tsx engine, we create a temporary program structure
    // 1. Create Program
    const { data: program, error: pError } = await supabase
        .from('programs')
        .insert({
            name: title,
            program_type: 'quick',
            owner_id: userId,
            is_active: false,
            duration_weeks: 1,
            difficulty: 'intermediate',
            tier_required: 'standard'
        })
        .select()
        .single();

    if (pError) throw pError;

    // 2. Create Week
    const { data: week, error: wError } = await supabase
        .from('program_weeks')
        .insert({
            program_id: program.id,
            week_number: 1,
        })
        .select()
        .single();

    if (wError) throw wError;

    // 3. Create Day
    const { data: day, error: dError } = await supabase
        .from('program_days')
        .insert({
            program_week_id: week.id,
            day_number: 1,
            title: title
        })
        .select()
        .single();

    if (dError) throw dError;

    // 4. Create Exercises
    const exercisePayload = exercises.map((ex, idx) => ({
        program_day_id: day.id,
        exercise_name: ex.name,
        order_index: idx,
        sets_target: ex.sets || 3,
        reps_target: ex.reps || '10-12',
        rest_seconds: ex.rest || 90
    }));

    const { error: exError } = await supabase
        .from('program_day_exercises')
        .insert(exercisePayload);

    if (exError) throw exError;

    // 5. Also log to quick_workouts for historical tracking/limits
    await saveQuickWorkout(userId, title, exercises);

    return day.id; // This is what active.tsx needs as 'id'
}
