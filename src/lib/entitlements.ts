import { SubscriptionTier } from '@/stores/profileStore';
import { canAccessTier } from '@/lib/tier-gating';

export type EntitlementKey =
    | 'messagingEnabled'
    | 'macroToolsEnabled'
    | 'programsAccess'
    | 'offersAccess'
    | 'macroSnapshotScansPerWeek';

export type TierEntitlements = {
    messagingEnabled: boolean;
    macroToolsEnabled: boolean;
    programsAccess: 'limited' | 'full';
    offersAccess: 'limited' | 'full';
    macroSnapshotScansPerWeek: number; // future placeholder
};

export const ENTITLEMENTS: Record<SubscriptionTier, TierEntitlements> = {
    free: {
        messagingEnabled: true,
        macroToolsEnabled: true,
        programsAccess: 'limited',
        offersAccess: 'limited',
        macroSnapshotScansPerWeek: 0,
    },
    standard: {
        messagingEnabled: true,
        macroToolsEnabled: true,
        programsAccess: 'full',
        offersAccess: 'full',
        macroSnapshotScansPerWeek: 0,
    },
    vip: {
        messagingEnabled: true,
        macroToolsEnabled: true,
        programsAccess: 'full',
        offersAccess: 'full',
        macroSnapshotScansPerWeek: 0,
    },
    elite: {
        messagingEnabled: true,
        macroToolsEnabled: true,
        programsAccess: 'full',
        offersAccess: 'full',
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
    return 'free';
}

export function canAccessContentTier(userTier: SubscriptionTier | null | undefined, requiredTier: SubscriptionTier): boolean {
    return canAccessTier(userTier || 'free', requiredTier);
}

