/**
 * Macro Calculator - Mifflin-St Jeor Equation
 * 
 * Calculates BMR, TDEE, and macro splits based on user goals.
 */

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';

export interface MacroInputs {
    age: number;
    sex: Sex;
    heightInches: number; // Total height in inches
    weightLbs: number;
    activityLevel: ActivityLevel;
    goal: Goal;
}

export interface MacroResults {
    bmr: number;        // Basal Metabolic Rate
    tdee: number;       // Total Daily Energy Expenditure
    targetCalories: number;
    protein: number;    // grams
    carbs: number;      // grams
    fat: number;        // grams
}

// Activity multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
    sedentary: 1.2,      // Little or no exercise
    light: 1.375,        // Light exercise 1-3 days/week
    moderate: 1.55,      // Moderate exercise 3-5 days/week
    active: 1.725,       // Hard exercise 6-7 days/week
    very_active: 1.9,    // Very hard exercise, physical job
};

// Calorie adjustments for goals
const GOAL_ADJUSTMENTS: Record<Goal, number> = {
    lose: -500,      // 1 lb/week deficit
    maintain: 0,
    gain: 300,       // Lean bulk surplus
};

// Macro ratios by goal (as percentages)
const MACRO_RATIOS: Record<Goal, { protein: number; carbs: number; fat: number }> = {
    lose: { protein: 0.40, carbs: 0.30, fat: 0.30 },     // High protein for muscle retention
    maintain: { protein: 0.30, carbs: 0.40, fat: 0.30 },
    gain: { protein: 0.30, carbs: 0.45, fat: 0.25 },     // Higher carbs for energy
};

/**
 * Calculate BMR using Mifflin-St Jeor equation
 */
function calculateBMR(sex: Sex, weightLbs: number, heightInches: number, age: number): number {
    // Convert to metric
    const weightKg = weightLbs * 0.453592;
    const heightCm = heightInches * 2.54;

    if (sex === 'male') {
        return (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
    } else {
        return (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
    }
}

/**
 * Main calculation function
 */
export function calculateMacros(inputs: MacroInputs): MacroResults {
    const { age, sex, heightInches, weightLbs, activityLevel, goal } = inputs;

    // Step 1: Calculate BMR
    const bmr = Math.round(calculateBMR(sex, weightLbs, heightInches, age));

    // Step 2: Calculate TDEE
    const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);

    // Step 3: Apply goal adjustment
    const targetCalories = Math.max(1200, tdee + GOAL_ADJUSTMENTS[goal]); // Min 1200 for safety

    // Step 4: Calculate macros
    const ratios = MACRO_RATIOS[goal];
    const proteinCals = targetCalories * ratios.protein;
    const carbsCals = targetCalories * ratios.carbs;
    const fatCals = targetCalories * ratios.fat;

    // Convert to grams (protein=4cal/g, carbs=4cal/g, fat=9cal/g)
    const protein = Math.round(proteinCals / 4);
    const carbs = Math.round(carbsCals / 4);
    const fat = Math.round(fatCals / 9);

    return {
        bmr,
        tdee,
        targetCalories: Math.round(targetCalories),
        protein,
        carbs,
        fat,
    };
}

/**
 * Activity level descriptions for UI
 */
export const ACTIVITY_DESCRIPTIONS: Record<ActivityLevel, string> = {
    sedentary: 'Desk job, little exercise',
    light: 'Light exercise 1-3 days/week',
    moderate: 'Moderate exercise 3-5 days/week',
    active: 'Hard exercise 6-7 days/week',
    very_active: 'Intense training, physical job',
};

/**
 * Goal descriptions for UI
 */
export const GOAL_DESCRIPTIONS: Record<Goal, string> = {
    lose: 'Fat Loss (-500 cal/day)',
    maintain: 'Maintain Weight',
    gain: 'Muscle Gain (+300 cal/day)',
};
