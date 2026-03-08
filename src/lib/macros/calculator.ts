/**
 * Macro Calculator - BMR/TDEE calculations using Mifflin-St Jeor equation
 */

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';

export interface MacroInputs {
    age: number;
    gender: Gender;
    weightLbs: number;
    heightInches: number;
    activityLevel: ActivityLevel;
    goal: Goal;
}

export interface MacroResults {
    bmr: number;
    tdee: number;
    targetCalories: number;
    protein: number;
    fat: number;
    carbs: number;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
    sedentary: 1.2,      // Little to no exercise
    light: 1.375,        // 1-3 days/week
    moderate: 1.55,      // 3-5 days/week
    active: 1.725,       // 6-7 days/week
    very_active: 1.9,    // Athlete/physical job
};

const GOAL_ADJUSTMENTS: Record<Goal, number> = {
    lose: -500,          // 500 cal deficit (1 lb/week)
    maintain: 0,
    gain: 300,           // 300 cal surplus (lean bulk)
};

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
 */
export function calculateBMR(inputs: MacroInputs): number {
    const weightKg = inputs.weightLbs * 0.453592;
    const heightCm = inputs.heightInches * 2.54;

    let bmr = 10 * weightKg + 6.25 * heightCm - 5 * inputs.age;

    if (inputs.gender === 'male') {
        bmr += 5;
    } else {
        bmr -= 161;
    }

    return Math.round(bmr);
}

/**
 * Calculate Total Daily Energy Expenditure
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
    return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Calculate target calories based on goal
 */
export function calculateTargetCalories(tdee: number, goal: Goal): number {
    return Math.max(1200, tdee + GOAL_ADJUSTMENTS[goal]); // Minimum 1200 cal floor
}

/**
 * Calculate macro split (P/F/C in grams)
 * - Protein: 1g per lb bodyweight (high protein for muscle retention)
 * - Fat: 25% of calories
 * - Carbs: Remaining calories
 */
export function calculateMacros(targetCalories: number, weightLbs: number): { protein: number; fat: number; carbs: number } {
    const protein = Math.round(weightLbs * 1.0); // 1g per lb
    const proteinCals = protein * 4;

    const fatCals = Math.round(targetCalories * 0.25);
    const fat = Math.round(fatCals / 9);

    const carbCals = targetCalories - proteinCals - fatCals;
    const carbs = Math.round(carbCals / 4);

    return { protein, fat, carbs };
}

/**
 * Main calculation function
 */
export function calculateMacroResults(inputs: MacroInputs): MacroResults {
    const bmr = calculateBMR(inputs);
    const tdee = calculateTDEE(bmr, inputs.activityLevel);
    const targetCalories = calculateTargetCalories(tdee, inputs.goal);
    const { protein, fat, carbs } = calculateMacros(targetCalories, inputs.weightLbs);

    return {
        bmr,
        tdee,
        targetCalories,
        protein,
        fat,
        carbs,
    };
}
