import { supabase } from '@/lib/supabase';
import { MacroResults } from '@/lib/macros/calculator';

export type NutritionTarget = {
    id: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    goal: string;
    is_active: boolean;
};

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type MealLog = {
    id: string;
    meal_type: MealType;
    name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    logged_date: string;
    saved_meal_id?: string;
};

export type SavedMeal = {
    id: string;
    name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    meal_type: MealType;
    is_active: boolean;
};

export type DailySummary = {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
};

export type AdherenceSummary = {
    avgCalories7d: number;
    avgProtein7d: number;
    proteinHitDays7d: number;
    loggingStreak: number;
};

export type FoodSuggestion = {
    title: string;
    description: string;
    macroFocus: 'protein' | 'carbs' | 'fat' | 'balanced' | 'done';
};

/**
 * Saves a user's macro calculation results as their active targets.
 * Archiving any previous active targets.
 */
export async function saveNutritionTargets(userId: string, results: MacroResults, goal: string): Promise<void> {
    // 1. Mark existing active targets as inactive
    const { error: updateErr } = await supabase
        .from('nutrition_targets')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

    if (updateErr) throw updateErr;

    // 2. Insert new target
    const { error: insertErr } = await supabase
        .from('nutrition_targets')
        .insert({
            user_id: userId,
            calories: results.targetCalories,
            protein_g: results.protein,
            carbs_g: results.carbs,
            fat_g: results.fat,
            goal: goal,
        });

    if (insertErr) throw insertErr;
}

/**
 * Fetches the user's current active nutrition targets.
 */
export async function getActiveTargets(userId: string): Promise<NutritionTarget | null> {
    const { data, error } = await supabase
        .from('nutrition_targets')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.warn('[Nutrition] Error fetching active targets:', error);
        return null;
    }

    return data;
}

/**
 * Update the user's dietary preference in their profile.
 */
export async function setDietaryPreference(userId: string, preference: string): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .update({ dietary_preference: preference })
        .eq('id', userId);

    if (error) throw error;
}

/**
 * Logs a new meal.
 */
export async function logMeal(userId: string, data: Omit<MealLog, 'id' | 'logged_date'>, date?: string): Promise<void> {
    const { error } = await supabase
        .from('meal_logs')
        .insert({
            user_id: userId,
            meal_type: data.meal_type,
            name: data.name,
            calories: data.calories,
            protein_g: data.protein_g,
            carbs_g: data.carbs_g,
            fat_g: data.fat_g,
            logged_date: date || new Date().toISOString().split('T')[0],
            saved_meal_id: data.saved_meal_id,
        });

    if (error) throw error;
}

/**
 * Fetches all meal logs for a specific date.
 */
export async function fetchDailyLogs(userId: string, date: string): Promise<MealLog[]> {
    const { data, error } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('logged_date', date)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
}

/**
 * Deletes a meal log.
 */
export async function deleteMealLog(logId: string): Promise<void> {
    const { error } = await supabase
        .from('meal_logs')
        .delete()
        .eq('id', logId);

    if (error) throw error;
}

/**
 * Calculates sums for a day.
 */
export function calculateDailySummary(logs: MealLog[]): DailySummary {
    return logs.reduce(
        (acc, log) => ({
            calories: acc.calories + log.calories,
            protein_g: acc.protein_g + Number(log.protein_g),
            carbs_g: acc.carbs_g + Number(log.carbs_g),
            fat_g: acc.fat_g + Number(log.fat_g),
        }),
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
}

/**
 * Saves a new meal template to the user's library.
 */
export async function saveMeal(userId: string, data: Omit<SavedMeal, 'id' | 'is_active'>): Promise<string> {
    const { data: inserted, error } = await supabase
        .from('saved_meals')
        .insert({
            user_id: userId,
            name: data.name,
            calories: data.calories,
            protein_g: data.protein_g,
            carbs_g: data.carbs_g,
            fat_g: data.fat_g,
            meal_type: data.meal_type,
        })
        .select()
        .single();

    if (error) throw error;
    return inserted.id;
}

/**
 * Fetches the user's active saved meals.
 */
export async function fetchSavedMeals(userId: string): Promise<SavedMeal[]> {
    const { data, error } = await supabase
        .from('saved_meals')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
}

/**
 * Soft deletes a saved meal from the library.
 */
export async function deleteSavedMeal(mealId: string): Promise<void> {
    const { error } = await supabase
        .from('saved_meals')
        .update({ is_active: false })
        .eq('id', mealId);

    if (error) throw error;
}

/**
 * Calculates adherence stats based on recent meal logs and current targets.
 */
export async function getAdherenceSummary(userId: string, currentTarget: NutritionTarget): Promise<AdherenceSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get last 30 days of logs for streak calculation
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: logs, error } = await supabase
        .from('meal_logs')
        .select('logged_date, calories, protein_g')
        .eq('user_id', userId)
        .gte('logged_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('logged_date', { ascending: false });

    if (error) throw error;

    if (!logs || logs.length === 0) {
        return { avgCalories7d: 0, avgProtein7d: 0, proteinHitDays7d: 0, loggingStreak: 0 };
    }

    // Group by date
    const dailyTotals: Record<string, { calories: number; protein: number }> = {};
    for (const log of logs) {
        if (!dailyTotals[log.logged_date]) {
            dailyTotals[log.logged_date] = { calories: 0, protein: 0 };
        }
        dailyTotals[log.logged_date].calories += log.calories;
        dailyTotals[log.logged_date].protein += Number(log.protein_g);
    }

    // Calculate 7d averages & hits
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    let sumCals7d = 0;
    let sumProtein7d = 0;
    let hitDays = 0;
    let logDays7d = 0;

    for (const [dateStr, totals] of Object.entries(dailyTotals)) {
        if (dateStr >= sevenDaysAgoStr) {
            logDays7d++;
            sumCals7d += totals.calories;
            sumProtein7d += totals.protein;
            
            if (totals.protein >= currentTarget.protein_g * 0.9) {
                hitDays++;
            }
        }
    }

    const avgCalories7d = logDays7d > 0 ? Math.round(sumCals7d / logDays7d) : 0;
    const avgProtein7d = logDays7d > 0 ? Math.round(sumProtein7d / logDays7d) : 0;

    // Calculate Streak (consecutive days looking backwards from today or yesterday)
    let streak = 0;
    let checkDate = new Date(today);
    const todayStr = checkDate.toISOString().split('T')[0];
    
    // If they haven't logged today, the streak can still be alive from yesterday
    if (!dailyTotals[todayStr]) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
        const dStr = checkDate.toISOString().split('T')[0];
        if (dailyTotals[dStr]) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return {
        avgCalories7d,
        avgProtein7d,
        proteinHitDays7d: hitDays,
        loggingStreak: streak,
    };
}

/**
 * Generates lightweight food suggestions based on macros remaining and dietary preference.
 */
export function getSmartFoodSuggestions(
    remaining: { protein_g: number; carbs_g: number; fat_g: number },
    preference: string = 'standard'
): FoodSuggestion[] {
    const suggestions: FoodSuggestion[] = [];

    const p = remaining.protein_g;
    const c = remaining.carbs_g;
    const f = remaining.fat_g;

    // Check if basically done
    if (p <= 5 && c <= 10 && f <= 5) {
        return [{
            title: 'Targets Hit!',
            description: 'You are right on track with your macros. Great job today!',
            macroFocus: 'done'
        }];
    }

    const isVegetarian = preference === 'vegetarian';
    const isVegan = preference === 'vegan';
    const isPescatarian = preference === 'pescatarian';

    const meatOk = !isVegetarian && !isVegan && !isPescatarian;
    const fishOk = meatOk || isPescatarian;
    const dairyOk = !isVegan;

    // High Protein gap
    if (p > 25) {
        if (meatOk) {
            suggestions.push({
                title: 'Chicken Breast or Turkey',
                description: 'Lean poultry is the most efficient way to close that protein gap fast.',
                macroFocus: 'protein'
            });
        } else if (fishOk) {
            suggestions.push({
                title: 'White Fish or Tuna',
                description: 'Extremely lean protein sources to hit your target efficiently.',
                macroFocus: 'protein'
            });
        } else if (dairyOk) {
            suggestions.push({
                title: 'Greek Yogurt or Cottage Cheese',
                description: 'A great vegetarian option packed with slow-digesting protein.',
                macroFocus: 'protein'
            });
        } else {
            suggestions.push({
                title: 'Tofu, Seitan, or Plant Protein',
                description: 'Combine plant proteins or grab a shake to hit your target.',
                macroFocus: 'protein'
            });
        }
    }

    // High Carbs gap
    if (c > 30 && f < 10) {
        suggestions.push({
            title: 'Rice, Oats, or Fruit',
            description: 'Clean, low-fat carbohydrate sources to fuel your training or recovery.',
            macroFocus: 'carbs'
        });
    }

    // High Fat gap
    if (f > 15 && p < 15 && c < 20) {
        suggestions.push({
            title: 'Nuts, Seeds, or Avocado',
            description: 'Nutrient-dense healthy fats to hit your calorie goal without overshooting carbs or protein.',
            macroFocus: 'fat'
        });
    }

    // Balanced options
    if (p > 15 && (c > 20 || f > 10)) {
        if (meatOk) {
            suggestions.push({
                title: 'Lean Beef or Salmon with Sides',
                description: 'A higher-fat protein source paired with moderate carbs.',
                macroFocus: 'balanced'
            });
        } else if (dairyOk) {
            suggestions.push({
                title: 'Eggs on Toast',
                description: 'A classic, balanced mix of protein, fats, and carbohydrates.',
                macroFocus: 'balanced'
            });
        } else {
            suggestions.push({
                title: 'Tempeh or Beans with Quinoa',
                description: 'A complete plant-based meal offering balanced macros.',
                macroFocus: 'balanced'
            });
        }
    }

    if (suggestions.length === 0) {
       suggestions.push({
           title: 'Mixed Snack or Protein Shake',
           description: 'A small balanced snack can help you close out your remaining macros.',
           macroFocus: 'balanced'
       });
    }

    // Suggest max 2 items to avoid UI clutter
    return suggestions.slice(0, 2);
}
