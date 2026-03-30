import { SubscriptionTier } from '@/stores/profileStore';
import { canAccessTier } from '@/lib/tier-gating';

export type EntitlementKey =
    | 'messagingEnabled'
    | 'macroToolsEnabled'
    | 'programsAccess'
    | 'offersAccess'
    | 'communityComments'
    | 'advancedAnalytics'
    | 'quickWorkoutEnabled'
    | 'quickWorkoutsPerWeek'
    | 'guidedProgramsEnabled'
    | 'maxActiveGuidedPrograms'
    | 'customProgramsEnabled'
    | 'nutritionEnabled'
    | 'cardioRecommendationsEnabled'
    | 'macroSnapshotScansPerWeek';

export type TierEntitlements = {
    messagingEnabled: boolean;
    macroToolsEnabled: boolean;
    programsAccess: 'limited' | 'full';
    offersAccess: 'limited' | 'full';
    communityComments: boolean;
    advancedAnalytics: boolean;
    quickWorkoutEnabled: boolean;
    quickWorkoutsPerWeek: number;
    guidedProgramsEnabled: boolean;
    maxActiveGuidedPrograms: number;
    customProgramsEnabled: boolean;
    nutritionEnabled: boolean;
    cardioRecommendationsEnabled: boolean;
    macroSnapshotScansPerWeek: number; // future placeholder
};

export const ENTITLEMENTS: Record<SubscriptionTier, TierEntitlements> = {
    free: {
        messagingEnabled: false,
        macroToolsEnabled: false,
        programsAccess: 'limited',
        offersAccess: 'limited',
        communityComments: false,
        advancedAnalytics: false,
        quickWorkoutEnabled: false,
        quickWorkoutsPerWeek: 0,
        guidedProgramsEnabled: false,
        maxActiveGuidedPrograms: 0,
        customProgramsEnabled: false,
        nutritionEnabled: false,
        cardioRecommendationsEnabled: false,
        macroSnapshotScansPerWeek: 0,
    },
    standard: {
        messagingEnabled: true,
        macroToolsEnabled: true,
        programsAccess: 'limited',
        offersAccess: 'full',
        communityComments: false,
        advancedAnalytics: false,
        quickWorkoutEnabled: true,
        quickWorkoutsPerWeek: 3,
        guidedProgramsEnabled: false,
        maxActiveGuidedPrograms: 0,
        customProgramsEnabled: false,
        nutritionEnabled: true,
        cardioRecommendationsEnabled: false,
        macroSnapshotScansPerWeek: 0,
    },
    vip: {
        messagingEnabled: true,
        macroToolsEnabled: true,
        programsAccess: 'full',
        offersAccess: 'full',
        communityComments: true,
        advancedAnalytics: true,
        quickWorkoutEnabled: true,
        quickWorkoutsPerWeek: 999,
        guidedProgramsEnabled: true,
        maxActiveGuidedPrograms: 2,
        customProgramsEnabled: false,
        nutritionEnabled: true,
        cardioRecommendationsEnabled: true,
        macroSnapshotScansPerWeek: 0,
    },
    elite: {
        messagingEnabled: true,
        macroToolsEnabled: true,
        programsAccess: 'full',
        offersAccess: 'full',
        communityComments: true,
        advancedAnalytics: true,
        quickWorkoutEnabled: true,
        quickWorkoutsPerWeek: 999,
        guidedProgramsEnabled: true,
        maxActiveGuidedPrograms: 999,
        customProgramsEnabled: true,
        nutritionEnabled: true,
        cardioRecommendationsEnabled: true,
        macroSnapshotScansPerWeek: 0,
    },
};

export const PRICING: Partial<Record<SubscriptionTier, { priceText: string; period: 'month' }>> = {
    standard: { priceText: '$9.99/mo', period: 'month' },
    vip: { priceText: '$39.99/mo', period: 'month' },
    elite: { priceText: '$99.99/mo', period: 'month' },
};

export function isVip(tier: SubscriptionTier | null | undefined): boolean {
    return tier === 'vip' || tier === 'elite';
}

export function hasEntitlement(tier: SubscriptionTier | null | undefined, key: EntitlementKey): boolean {
    const t: SubscriptionTier = tier || 'free';
    return Boolean((ENTITLEMENTS[t] as any)?.[key]);
}

export function requiredTierForEntitlement(key: EntitlementKey): SubscriptionTier {
    // Keep this conservative: anything marked "limited" on free is treated as Standard+.
    if (key === 'programsAccess') return 'standard';
    if (key === 'offersAccess') return 'standard';
    if (key === 'macroSnapshotScansPerWeek') return 'vip';
    if (key === 'quickWorkoutEnabled') return 'standard';
    if (key === 'guidedProgramsEnabled') return 'vip';
    if (key === 'customProgramsEnabled') return 'elite';
    if (key === 'nutritionEnabled') return 'standard';
    if (key === 'cardioRecommendationsEnabled') return 'vip';
    return 'free';
}

export function canAccessContentTier(userTier: SubscriptionTier | null | undefined, requiredTier: SubscriptionTier): boolean {
    return canAccessTier(userTier || 'free', requiredTier);
}

