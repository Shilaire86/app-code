import { supabase } from '@/lib/supabase';
import { MacroResults } from '@/lib/macroCalculator';

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
    const isKeto = preference === 'keto';
    const isPaleo = preference === 'paleo';
    const isCarnivore = preference === 'carnivore';

    const meatOk = !isVegetarian && !isVegan && !isPescatarian;
    const fishOk = meatOk || isPescatarian;
    // Paleo excludes dairy; carnivore allows it; keto allows it
    const dairyOk = !isVegan && !isPaleo;
    // High protein gap
    if (p > 25) {
        if (isCarnivore) {
            suggestions.push({ title: 'Ribeye, Ground Beef, or Organ Meat', description: 'Nutrient-dense animal proteins to close your protein gap efficiently.', macroFocus: 'protein' });
        } else if (isPaleo) {
            suggestions.push({ title: 'Chicken Breast, Grass-fed Beef, or Wild Salmon', description: 'Clean, whole-food paleo proteins to hit your target.', macroFocus: 'protein' });
        } else if (isKeto) {
            suggestions.push({ title: 'Chicken Breast, Ground Beef, or Tuna', description: 'Zero-carb protein sources to close a large gap without affecting ketosis.', macroFocus: 'protein' });
        } else if (meatOk) {
            suggestions.push({ title: 'Chicken Breast or Turkey', description: 'Lean poultry is the most efficient way to close a large protein gap.', macroFocus: 'protein' });
        } else if (fishOk) {
            suggestions.push({ title: 'White Fish, Tuna, or Shrimp', description: 'Extremely lean protein sources to hit your target efficiently.', macroFocus: 'protein' });
        } else if (dairyOk) {
            suggestions.push({ title: 'Greek Yogurt or Cottage Cheese', description: 'A great vegetarian option packed with slow-digesting protein.', macroFocus: 'protein' });
        } else {
            suggestions.push({ title: 'Tofu, Seitan, or Plant Protein Shake', description: 'Combine plant proteins or blend a shake to close the gap fast.', macroFocus: 'protein' });
        }
    } else if (p > 10) {
        // Moderate protein gap
        if (isCarnivore) {
            suggestions.push({ title: 'Eggs, Bacon, or Beef Jerky', description: 'Quick animal-based protein to top up without adding any carbs.', macroFocus: 'protein' });
        } else if (isPaleo) {
            suggestions.push({ title: 'Hard-Boiled Eggs or Paleo Jerky', description: 'Portable whole-food snacks to close a moderate protein gap.', macroFocus: 'protein' });
        } else if (isKeto) {
            suggestions.push({ title: 'Eggs, Cheese, or Deli Meat', description: 'Quick, zero-carb protein options to top up your intake.', macroFocus: 'protein' });
        } else if (meatOk) {
            suggestions.push({ title: 'Turkey Mince or Hard-Boiled Eggs', description: 'A moderate protein top-up to fill your remaining gap without overeating.', macroFocus: 'protein' });
        } else if (fishOk) {
            suggestions.push({ title: 'Canned Tuna or Smoked Salmon', description: 'Quick, no-cook protein to close a moderate gap on the go.', macroFocus: 'protein' });
        } else if (dairyOk) {
            suggestions.push({ title: 'Boiled Eggs or Low-fat Cheese', description: 'Easy, portable options to top up your protein intake.', macroFocus: 'protein' });
        } else {
            suggestions.push({ title: 'Edamame, Chickpeas, or Lentils', description: 'Convenient plant-based proteins to close the remaining gap.', macroFocus: 'protein' });
        }
    }

    // Carbs gap — skip for carnivore; give diet-appropriate options for keto/paleo
    if (!isCarnivore) {
        if (c > 30) {
            if (isKeto) {
                suggestions.push({ title: 'Low-carb Veggies or Berries', description: 'Fill your remaining carb budget with fibrous greens or a small handful of berries.', macroFocus: 'carbs' });
            } else if (isPaleo) {
                suggestions.push({ title: 'Sweet Potato, Plantain, or Fresh Fruit', description: 'Whole-food paleo carbs to fuel your energy needs.', macroFocus: 'carbs' });
            } else {
                suggestions.push({ title: 'Rice, Sweet Potato, or Oats', description: 'Clean, energy-dense carbs to fuel your training or aid recovery.', macroFocus: 'carbs' });
            }
        } else if (c > 15 && f < 15) {
            if (isKeto) {
                suggestions.push({ title: 'Leafy Greens or Cucumber Slices', description: 'Low-carb veggies to fill your carb allotment without spiking insulin.', macroFocus: 'carbs' });
            } else if (isPaleo) {
                suggestions.push({ title: 'Apple, Banana, or Roasted Root Vegetables', description: 'Natural paleo carb sources to close the remaining gap.', macroFocus: 'carbs' });
            } else {
                suggestions.push({ title: 'Banana, Whole Grain Toast, or Rice Cakes', description: 'Light carbs to bridge the remaining gap without overshooting fat.', macroFocus: 'carbs' });
            }
        }
    }

    // High fat gap
    if (f > 15 && p < 20) {
        if (isKeto || isCarnivore) {
            suggestions.push({ title: 'Butter, Heavy Cream, or Fatty Steak', description: 'High-fat staples to hit your fat target while keeping carbs at zero.', macroFocus: 'fat' });
        } else if (isPaleo) {
            suggestions.push({ title: 'Avocado, Coconut Oil, or Macadamia Nuts', description: 'Paleo-friendly fat sources to reach your daily target.', macroFocus: 'fat' });
        } else {
            suggestions.push({ title: 'Avocado, Mixed Nuts, or Nut Butter', description: 'Nutrient-dense healthy fats to hit your calorie target.', macroFocus: 'fat' });
        }
    } else if (f > 8 && p < 15) {
        // Moderate fat gap
        if (isKeto || isCarnivore) {
            suggestions.push({ title: 'Cheese, Sour Cream, or Bacon', description: 'Easy fat sources to round out your remaining macro target.', macroFocus: 'fat' });
        } else if (isPaleo) {
            suggestions.push({ title: 'Olive Oil Dressing or Handful of Nuts', description: 'Clean paleo fats to fill the remaining gap.', macroFocus: 'fat' });
        } else if (dairyOk) {
            suggestions.push({ title: 'Whole Eggs or Full-fat Cheese', description: 'An easy way to add healthy fats and a bit of protein in one go.', macroFocus: 'fat' });
        } else {
            suggestions.push({ title: 'Seeds, Olive Oil Dressing, or Dark Chocolate', description: 'Simple plant-based fats to round out your remaining target.', macroFocus: 'fat' });
        }
    }

    // Balanced — needs protein plus carbs or fat
    if (p > 15 && (c > 20 || f > 10)) {
        if (isCarnivore) {
            suggestions.push({ title: 'Ribeye Steak and Eggs', description: 'The ultimate carnivore meal — rich in protein and fat to cover both gaps at once.', macroFocus: 'balanced' });
        } else if (isKeto) {
            suggestions.push({ title: 'Salmon with Butter and Asparagus', description: 'A keto-perfect plate: high-fat protein with low-carb greens.', macroFocus: 'balanced' });
        } else if (isPaleo) {
            suggestions.push({ title: 'Chicken Thighs with Sweet Potato and Greens', description: 'A complete paleo plate with whole-food carbs and clean protein.', macroFocus: 'balanced' });
        } else if (meatOk) {
            suggestions.push({ title: 'Lean Beef Bowl or Salmon with Rice', description: 'A complete meal hitting protein, healthy fats, and complex carbs at once.', macroFocus: 'balanced' });
        } else if (fishOk) {
            suggestions.push({ title: 'Tuna Pasta or Shrimp Stir-fry', description: 'A filling pescatarian meal to cover multiple macro gaps in one sitting.', macroFocus: 'balanced' });
        } else if (dairyOk) {
            suggestions.push({ title: 'Eggs on Toast with Avocado', description: 'A balanced mix of protein, healthy fats, and complex carbs.', macroFocus: 'balanced' });
        } else {
            suggestions.push({ title: 'Lentil Curry with Brown Rice', description: 'A complete plant-based meal with a solid macro spread.', macroFocus: 'balanced' });
        }
    }

    if (suggestions.length === 0) {
        suggestions.push({ title: 'Mixed Snack or Protein Shake', description: 'A small balanced snack can help you close out your remaining macros.', macroFocus: 'balanced' });
    }

    return suggestions.slice(0, 4);
}
