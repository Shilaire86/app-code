import { supabase } from '@/lib/supabase';

// ------- Types -------

export type ProgramTemplate = {
    id: string;
    name: string;
    split_type: string;
    days_per_week: number;
    goal: string;
    description: string | null;
    day_slots: DaySlot[];
    tier_required: string;
};

export type DaySlot = {
    day_number: number;
    focus: string;
    muscle_groups: string[];
};

export type GeneratorPreferences = {
    templateId: string;
    durationWeeks: number; // 4, 6, 8, 12
    goal: 'strength' | 'hypertrophy' | 'general';
    equipmentAccess: string[];
};

// ------- Goal-Based Parameters -------

const GOAL_PARAMS: Record<string, { setsPerExercise: number; repsTarget: string; restSeconds: number }> = {
    strength: { setsPerExercise: 5, repsTarget: '3-5', restSeconds: 180 },
    hypertrophy: { setsPerExercise: 4, repsTarget: '8-12', restSeconds: 90 },
    general: { setsPerExercise: 3, repsTarget: '10-15', restSeconds: 90 },
};

// ------- Exercises Per Day -------

function getExercisesPerDay(muscleGroupCount: number, goal: string): number {
    // More focused days (fewer muscle groups) = more exercises per muscle
    if (muscleGroupCount <= 1) return goal === 'strength' ? 5 : 6;
    if (muscleGroupCount <= 3) return goal === 'strength' ? 4 : 5;
    return goal === 'strength' ? 5 : 6; // full body days
}

// ------- Public API -------

export async function fetchTemplates(): Promise<ProgramTemplate[]> {
    const { data, error } = await supabase
        .from('program_templates')
        .select('*')
        .eq('is_active', true)
        .order('days_per_week', { ascending: true });

    if (error) throw error;
    return (data ?? []) as ProgramTemplate[];
}

export async function countActiveGuidedPrograms(userId: string): Promise<number> {
    const { count, error } = await supabase
        .from('programs')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('program_type', 'guided')
        .eq('is_active', true);

    if (error) throw error;
    return count || 0;
}

export async function generateProgram(
    userId: string,
    prefs: GeneratorPreferences,
): Promise<string> {
    // 1. Fetch the template
    const { data: template, error: tErr } = await supabase
        .from('program_templates')
        .select('*')
        .eq('id', prefs.templateId)
        .single();

    if (tErr || !template) throw tErr || new Error('Template not found');

    const daySlots: DaySlot[] = template.day_slots;
    const goalParams = GOAL_PARAMS[prefs.goal] || GOAL_PARAMS.general;

    // 2. Fetch exercises from the library, filtered by equipment
    const { data: exercisePool, error: exErr } = await supabase
        .from('exercises')
        .select('id, name, muscle_groups, equipment')
        .eq('is_active', true);

    if (exErr) throw exErr;

    // Filter by equipment if specified
    let filteredPool = exercisePool ?? [];
    if (prefs.equipmentAccess && prefs.equipmentAccess.length > 0) {
        filteredPool = filteredPool.filter((ex: any) =>
            ex.equipment?.some((eq: string) => prefs.equipmentAccess.includes(eq))
        );
    }

    // If filtering left us with very few, fall back to full pool
    if (filteredPool.length < 10) {
        filteredPool = exercisePool ?? [];
    }

    // 3. Create the program
    const { data: program, error: pErr } = await supabase
        .from('programs')
        .insert({
            name: `${template.name} — ${prefs.goal.charAt(0).toUpperCase() + prefs.goal.slice(1)}`,
            program_type: 'guided',
            owner_id: userId,
            is_active: true,
            duration_weeks: prefs.durationWeeks,
            difficulty: prefs.goal === 'strength' ? 'advanced' : 'intermediate',
            tier_required: 'vip',
            goals: [prefs.goal],
        })
        .select()
        .single();

    if (pErr) throw pErr;

    const createdWeekIds: string[] = [];
    const createdDayIds: string[] = [];

    try {
        // 4. Create weeks and days
        const usedExercisesThisWeek = new Set<string>();

        for (let week = 1; week <= prefs.durationWeeks; week++) {
            usedExercisesThisWeek.clear();

            const { data: weekRow, error: wErr } = await supabase
                .from('program_weeks')
                .insert({ program_id: program.id, week_number: week })
                .select()
                .single();

            if (wErr) throw wErr;
            createdWeekIds.push(weekRow.id);

            for (const slot of daySlots) {
                const { data: dayRow, error: dErr } = await supabase
                    .from('program_days')
                    .insert({
                        program_week_id: weekRow.id,
                        day_number: slot.day_number,
                        title: slot.focus,
                    })
                    .select()
                    .single();

                if (dErr) throw dErr;
                createdDayIds.push(dayRow.id);

                // Pick exercises for this day
                const exercisesPerDay = getExercisesPerDay(slot.muscle_groups.length, prefs.goal);
                const dayExercises = pickExercisesForDay(
                    filteredPool,
                    slot.muscle_groups,
                    exercisesPerDay,
                    usedExercisesThisWeek,
                );

                // Insert exercises
                const exercisePayload = dayExercises.map((ex, idx) => ({
                    program_day_id: dayRow.id,
                    exercise_name: ex.name,
                    order_index: idx,
                    sets_target: goalParams.setsPerExercise,
                    reps_target: goalParams.repsTarget,
                    rest_seconds: goalParams.restSeconds,
                }));

                if (exercisePayload.length > 0) {
                    const { error: eErr } = await supabase
                        .from('program_day_exercises')
                        .insert(exercisePayload);
                    if (eErr) throw eErr;
                }
            }
        }

        return program.id;
    } catch (error) {
        console.error('[ProgramGenerator] Rolling back partially created guided program', error);

        if (createdDayIds.length > 0) {
            await supabase
                .from('program_day_exercises')
                .delete()
                .in('program_day_id', createdDayIds);
        }

        if (createdDayIds.length > 0) {
            await supabase
                .from('program_days')
                .delete()
                .in('id', createdDayIds);
        }

        if (createdWeekIds.length > 0) {
            await supabase
                .from('program_weeks')
                .delete()
                .in('id', createdWeekIds);
        }

        await supabase
            .from('programs')
            .delete()
            .eq('id', program.id);

        throw error;
    }
}

// ------- Exercise Selection Logic -------

function pickExercisesForDay(
    pool: any[],
    targetMuscleGroups: string[],
    count: number,
    usedThisWeek: Set<string>,
): any[] {
    const selected: any[] = [];

    // 1. For each target muscle group, find the best candidates
    for (const muscleGroup of targetMuscleGroups) {
        const candidates = pool.filter(
            (ex) =>
                ex.muscle_groups?.some((mg: string) =>
                    mg.toLowerCase().includes(muscleGroup.toLowerCase())
                ) && !usedThisWeek.has(ex.name)
        );

        // Pick at least 1 exercise per muscle group, up to a proportional share
        const share = Math.max(1, Math.floor(count / targetMuscleGroups.length));
        const shuffled = shuffleArray([...candidates]);

        for (let i = 0; i < share && i < shuffled.length; i++) {
            if (selected.length >= count) break;
            selected.push(shuffled[i]);
            usedThisWeek.add(shuffled[i].name);
        }
    }

    // 2. If we haven't filled enough, grab remaining from any matching group
    if (selected.length < count) {
        const remaining = pool.filter(
            (ex) =>
                !selected.some((s) => s.id === ex.id) &&
                !usedThisWeek.has(ex.name) &&
                ex.muscle_groups?.some((mg: string) =>
                    targetMuscleGroups.some((tg) => mg.toLowerCase().includes(tg.toLowerCase()))
                )
        );

        const shuffled = shuffleArray([...remaining]);
        for (const ex of shuffled) {
            if (selected.length >= count) break;
            selected.push(ex);
            usedThisWeek.add(ex.name);
        }
    }

    return selected;
}

function shuffleArray<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ------- Split Recommendation Engine -------

export function suggestTemplate(
    templates: ProgramTemplate[],
    profile: {
        goal?: string; // e.g. 'lose', 'gain', 'maintain'
        training_days_per_week?: number;
        experience_level?: string;
    } | null
): { recommendedTemplateId: string | null; rationale: string | null } {
    if (!templates.length || !profile) return { recommendedTemplateId: null, rationale: null };

    // Strict filter on available days
    const daysAllowed = profile.training_days_per_week || 4;
    const fittingTemplates = templates.filter(t => t.days_per_week <= daysAllowed);
    
    // Fallback if none fit
    const candidates = fittingTemplates.length > 0 ? fittingTemplates : templates;

    let bestMatch = candidates[0];
    let score = -1;

    for (const t of candidates) {
        let currentScore = 0;
        
        // Exact day match is heavily preferred
        if (t.days_per_week === daysAllowed) currentScore += 3;
        
        // Goal alignment from onboarding preferences to training templates
        if (profile.goal === 'gain' && t.goal === 'hypertrophy') currentScore += 2;
        if (profile.goal === 'lose' && t.goal === 'general') currentScore += 2;
        if (profile.goal === 'maintain' && t.goal === 'general') currentScore += 1;
        
        // Experience alignment
        if (profile.experience_level === 'beginner' && t.days_per_week <= 3) currentScore += 2;
        if (profile.experience_level === 'advanced' && t.days_per_week >= 5) currentScore += 2;

        if (currentScore > score) {
            score = currentScore;
            bestMatch = t;
        }
    }

    if (!bestMatch) return { recommendedTemplateId: null, rationale: null };

    // Generate rationale string based on the heuristic
    let rationale = `Based on your goal to ${profile.goal || 'improve'} and your ${daysAllowed}-day schedule.`;
    if (profile.experience_level === 'beginner' && bestMatch.days_per_week <= 3) {
        rationale = `A balanced ${bestMatch.days_per_week}-day split is perfect for building a foundation.`;
    } else if (profile.goal === 'gain' && bestMatch.goal === 'hypertrophy') {
        rationale = `Optimized for muscle growth over ${bestMatch.days_per_week} days per week.`;
    } else if (bestMatch.days_per_week === daysAllowed) {
        rationale = `Perfectly matches your ${daysAllowed}-day training schedule.`;
    }

    return {
        recommendedTemplateId: bestMatch.id,
        rationale
    };
}
