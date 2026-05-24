import { SubscriptionTier } from '@/stores/profileStore';

/**
 * Checks if a user's current tier is sufficient for a required tier.
 */
export function canAccessTier(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
    const tierWeights: Record<SubscriptionTier, number> = {
        'free': 0,
        'standard': 1,
        'vip': 2,
        'elite': 3,
    };

    const userWeight = tierWeights[userTier] || 0;
    const requiredWeight = tierWeights[requiredTier] || 0;

    return userWeight >= requiredWeight;
}

/**
 * Returns a human-friendly label for a subscription tier.
 */
export function getTierLabel(tier: SubscriptionTier): string {
    switch (tier) {
        case 'free': return 'Free';
        case 'standard': return 'Standard';
        case 'vip': return 'VIP';
        case 'elite': return 'Elite';
        default: return 'Free';
    }
}

/**
 * Returns the marketing tagline for a subscription tier.
 */
export function getTierTagline(tier: SubscriptionTier): string {
    switch (tier) {
        case 'free': return 'Explore the Method';
        case 'standard': return 'Build Your Foundation';
        case 'vip': return 'Train Smarter, Not Harder';
        case 'elite': return 'Your Coach. Your Plan. Your Evolution.';
        default: return 'Explore the Method';
    }
}
