import { SubscriptionTier } from '@/stores/profileStore';
import { canAccessTier } from '@/lib/tier-gating';

export type EntitlementKey =
    // Messaging (coaching — Elite only)
    | 'messagingEnabled'
    // Macro tools
    | 'macroToolsEnabled'
    | 'macroCalculatorEnabled'
    | 'macroTrackingEnabled'
    // Programs
    | 'programsAccess'
    | 'programPreviewEnabled'
    | 'guidedProgramsEnabled'
    | 'maxActiveGuidedPrograms'
    | 'customProgramsEnabled'
    | 'programGeneratorEnabled'
    // Exercise
    | 'exerciseSwapEnabled'
    // Cardio
    | 'cardioLibraryEnabled'
    | 'cardioRecommendationsEnabled'
    | 'cardioSchedulingEnabled'
    // Mobility & conditioning
    | 'mobilityAccessLevel'
    | 'finisherModulesEnabled'
    | 'moduleStackingEnabled'
    // Nutrition
    | 'nutritionEnabled'
    | 'mealLoggingEnabled'
    | 'savedMealsEnabled'
    | 'smartFoodEnabled'
    // Quick workouts
    | 'quickWorkoutEnabled'
    | 'quickWorkoutsPerWeek'
    // Offers
    | 'offersAccess'
    // Analytics & tracking
    | 'progressTrackingLevel'
    | 'adherenceStatsLevel'
    | 'advancedAnalytics'
    | 'showRecommendationLogic'
    // Community
    | 'communityComments'
    | 'communityPost'
    // AI meal scanning
    | 'mealScanEnabled'
    | 'dailyScanLimit'
    // Future / placeholders
    | 'macroSnapshotScansPerWeek';

export type TierEntitlements = {
    // Messaging (coaching — Elite only)
    messagingEnabled: boolean;
    // Macro tools
    macroToolsEnabled: boolean;
    macroCalculatorEnabled: boolean;
    macroTrackingEnabled: boolean;
    // Programs
    programsAccess: 'preview' | 'curated' | 'full';
    programPreviewEnabled: boolean;
    guidedProgramsEnabled: boolean;
    maxActiveGuidedPrograms: number;
    customProgramsEnabled: boolean;
    programGeneratorEnabled: boolean;
    // Exercise
    exerciseSwapEnabled: boolean;
    // Cardio
    cardioLibraryEnabled: boolean;
    cardioRecommendationsEnabled: boolean;
    cardioSchedulingEnabled: boolean;
    // Mobility & conditioning
    mobilityAccessLevel: 'none' | 'core' | 'full';
    finisherModulesEnabled: boolean;
    moduleStackingEnabled: boolean;
    // Nutrition
    nutritionEnabled: boolean;
    mealLoggingEnabled: boolean;
    savedMealsEnabled: boolean;
    smartFoodEnabled: boolean;
    // Quick workouts
    quickWorkoutEnabled: boolean;
    quickWorkoutsPerWeek: number;
    // Offers
    offersAccess: 'limited' | 'full';
    // Analytics & tracking
    progressTrackingLevel: 'limited' | 'full';
    adherenceStatsLevel: 'none' | 'basic' | 'advanced';
    advancedAnalytics: boolean;
    showRecommendationLogic: boolean;
    // Community
    communityComments: boolean;
    communityPost: boolean;
    // AI meal scanning
    mealScanEnabled: boolean;
    dailyScanLimit: number;
    // Future / placeholders
    macroSnapshotScansPerWeek: number;
};

export const ENTITLEMENTS: Record<SubscriptionTier, TierEntitlements> = {
    // ─────────────────────────────────────────────────────────────────
    // FREE — Discovery only. Enough to feel the app, not enough to
    // sustain a routine. Every cap is a conversion lever.
    // ─────────────────────────────────────────────────────────────────
    free: {
        messagingEnabled: false,
        macroToolsEnabled: false,
        macroCalculatorEnabled: true,   // Let them calculate — but not track
        macroTrackingEnabled: false,
        programsAccess: 'preview',
        programPreviewEnabled: true,    // Week 1 of a program only
        guidedProgramsEnabled: false,
        maxActiveGuidedPrograms: 0,
        customProgramsEnabled: false,
        programGeneratorEnabled: false,
        exerciseSwapEnabled: false,
        cardioLibraryEnabled: false,
        cardioRecommendationsEnabled: false,
        cardioSchedulingEnabled: false,
        mobilityAccessLevel: 'none',
        finisherModulesEnabled: false,
        moduleStackingEnabled: false,
        nutritionEnabled: false,
        mealLoggingEnabled: false,
        savedMealsEnabled: false,
        smartFoodEnabled: false,
        quickWorkoutEnabled: true,      // 2/week — feel a real session
        quickWorkoutsPerWeek: 2,
        offersAccess: 'limited',
        progressTrackingLevel: 'limited', // Weight entry only, no charts
        adherenceStatsLevel: 'none',
        advancedAnalytics: false,
        showRecommendationLogic: false,
        communityComments: false,
        communityPost: false,
        mealScanEnabled: false,
        dailyScanLimit: 0,
        macroSnapshotScansPerWeek: 0,
    },

    // ─────────────────────────────────────────────────────────────────
    // STANDARD ($14.99/mo) — The Foundation.
    // Every tool needed to execute consistently. Missing: intelligence.
    // ─────────────────────────────────────────────────────────────────
    standard: {
        messagingEnabled: false,        // Coaching messaging is Elite only
        macroToolsEnabled: true,
        macroCalculatorEnabled: true,
        macroTrackingEnabled: true,
        programsAccess: 'curated',      // 3-5 curated programs, not the full catalog
        programPreviewEnabled: true,
        guidedProgramsEnabled: true,    // Can start & follow coach-led programs
        maxActiveGuidedPrograms: 1,
        customProgramsEnabled: false,   // VIP+
        programGeneratorEnabled: false, // VIP+
        exerciseSwapEnabled: true,      // High perceived value, low cost to give
        cardioLibraryEnabled: true,     // View & follow protocols
        cardioRecommendationsEnabled: false, // VIP+ (smart recs)
        cardioSchedulingEnabled: false,     // VIP+ (auto-placement)
        mobilityAccessLevel: 'core',    // Core routines included
        finisherModulesEnabled: false,  // VIP+
        moduleStackingEnabled: false,   // VIP+
        nutritionEnabled: true,
        mealLoggingEnabled: true,
        savedMealsEnabled: false,       // VIP+
        smartFoodEnabled: false,        // VIP+
        quickWorkoutEnabled: true,
        quickWorkoutsPerWeek: 999,      // Unlimited
        offersAccess: 'full',
        progressTrackingLevel: 'full',  // Weight, measurements, BF%, PRs, photos
        adherenceStatsLevel: 'basic',   // Streak + completion %
        advancedAnalytics: false,       // VIP+
        showRecommendationLogic: false, // VIP+
        communityComments: true,
        communityPost: true,
        mealScanEnabled: true,
        dailyScanLimit: 1,
        macroSnapshotScansPerWeek: 0,
    },

    // ─────────────────────────────────────────────────────────────────
    // VIP ($29.99/mo) — The Method.
    // Standard gives tools to show up. VIP makes the app think with you.
    // ─────────────────────────────────────────────────────────────────
    vip: {
        messagingEnabled: false,        // Coaching messaging is Elite only
        macroToolsEnabled: true,
        macroCalculatorEnabled: true,
        macroTrackingEnabled: true,
        programsAccess: 'full',         // Full catalog
        programPreviewEnabled: true,
        guidedProgramsEnabled: true,
        maxActiveGuidedPrograms: 3,
        customProgramsEnabled: true,    // Build Your Own — fully live for launch
        programGeneratorEnabled: true,  // Guided program generator
        exerciseSwapEnabled: true,
        cardioLibraryEnabled: true,
        cardioRecommendationsEnabled: true,  // Goal-based smart recommendations
        cardioSchedulingEnabled: true,       // Auto-placement into schedule
        mobilityAccessLevel: 'full',
        finisherModulesEnabled: true,
        moduleStackingEnabled: true,
        nutritionEnabled: true,
        mealLoggingEnabled: true,
        savedMealsEnabled: true,
        smartFoodEnabled: true,
        quickWorkoutEnabled: true,
        quickWorkoutsPerWeek: 999,
        offersAccess: 'full',
        progressTrackingLevel: 'full',
        adherenceStatsLevel: 'advanced', // Trends, patterns, insights
        advancedAnalytics: true,
        showRecommendationLogic: true,  // "Why we recommended this" transparency
        communityComments: true,
        communityPost: true,
        mealScanEnabled: true,
        dailyScanLimit: 3,
        macroSnapshotScansPerWeek: 0,
    },

    // ─────────────────────────────────────────────────────────────────
    // ELITE ($199.99/mo — Coming Soon) — The Partnership.
    // A human gets involved. Everything in VIP + 1:1 coaching.
    // ─────────────────────────────────────────────────────────────────
    elite: {
        messagingEnabled: true,         // Direct coach messaging
        macroToolsEnabled: true,
        macroCalculatorEnabled: true,
        macroTrackingEnabled: true,
        programsAccess: 'full',
        programPreviewEnabled: true,
        guidedProgramsEnabled: true,
        maxActiveGuidedPrograms: 999,   // Unlimited — coach manages your stack
        customProgramsEnabled: true,
        programGeneratorEnabled: true,
        exerciseSwapEnabled: true,
        cardioLibraryEnabled: true,
        cardioRecommendationsEnabled: true,
        cardioSchedulingEnabled: true,
        mobilityAccessLevel: 'full',
        finisherModulesEnabled: true,
        moduleStackingEnabled: true,
        nutritionEnabled: true,
        mealLoggingEnabled: true,
        savedMealsEnabled: true,
        smartFoodEnabled: true,
        quickWorkoutEnabled: true,
        quickWorkoutsPerWeek: 999,
        offersAccess: 'full',
        progressTrackingLevel: 'full',
        adherenceStatsLevel: 'advanced',
        advancedAnalytics: true,
        showRecommendationLogic: true,
        communityComments: true,
        communityPost: true,
        mealScanEnabled: true,
        dailyScanLimit: 5,
        macroSnapshotScansPerWeek: 0,
    },
};

export const PRICING: Partial<Record<SubscriptionTier, { priceText: string; period: 'month' }>> = {
    standard: { priceText: '$14.99/mo', period: 'month' },
    vip: { priceText: '$29.99/mo', period: 'month' },
    elite: { priceText: '$199.99/mo', period: 'month' },
};

export function isVip(tier: SubscriptionTier | null | undefined): boolean {
    return tier === 'vip' || tier === 'elite';
}

export function hasEntitlement(tier: SubscriptionTier | null | undefined, key: EntitlementKey): boolean {
    const t: SubscriptionTier = tier || 'free';
    return Boolean((ENTITLEMENTS[t] as any)?.[key]);
}

export function requiredTierForEntitlement(key: EntitlementKey): SubscriptionTier {
    // Programs
    if (key === 'programsAccess') return 'standard';
    if (key === 'programPreviewEnabled') return 'free';
    if (key === 'guidedProgramsEnabled') return 'standard';
    if (key === 'customProgramsEnabled') return 'vip';
    if (key === 'programGeneratorEnabled') return 'vip';
    if (key === 'maxActiveGuidedPrograms') return 'standard';
    // Exercise
    if (key === 'exerciseSwapEnabled') return 'standard';
    // Cardio
    if (key === 'cardioLibraryEnabled') return 'standard';
    if (key === 'cardioRecommendationsEnabled') return 'vip';
    if (key === 'cardioSchedulingEnabled') return 'vip';
    // Mobility & conditioning
    if (key === 'mobilityAccessLevel') return 'standard';
    if (key === 'finisherModulesEnabled') return 'vip';
    if (key === 'moduleStackingEnabled') return 'vip';
    // Quick workouts
    if (key === 'quickWorkoutEnabled') return 'free';
    if (key === 'quickWorkoutsPerWeek') return 'free';
    // Nutrition
    if (key === 'nutritionEnabled') return 'standard';
    if (key === 'macroToolsEnabled') return 'standard';
    if (key === 'macroCalculatorEnabled') return 'free';
    if (key === 'macroTrackingEnabled') return 'standard';
    if (key === 'mealLoggingEnabled') return 'standard';
    if (key === 'savedMealsEnabled') return 'vip';
    if (key === 'smartFoodEnabled') return 'vip';
    // Analytics
    if (key === 'progressTrackingLevel') return 'standard';
    if (key === 'adherenceStatsLevel') return 'standard';
    if (key === 'advancedAnalytics') return 'vip';
    if (key === 'showRecommendationLogic') return 'vip';
    if (key === 'macroSnapshotScansPerWeek') return 'vip';
    // Community
    if (key === 'communityComments') return 'standard';
    if (key === 'communityPost') return 'standard';
    // Offers
    if (key === 'offersAccess') return 'standard';
    // Messaging — Elite only
    if (key === 'messagingEnabled') return 'elite';
    return 'free';
}

export function canAccessContentTier(userTier: SubscriptionTier | null | undefined, requiredTier: SubscriptionTier): boolean {
    return canAccessTier(userTier || 'free', requiredTier);
}
