export type BillingTierKey = 'standard' | 'vip' | 'elite';
export type BillingPeriod = 'monthly' | 'annual';

export type BillingTier = {
    monthly: { priceText: string; stripePriceId: string | null };
    annual: { priceText: string; monthlyCost: string; savings: string; stripePriceId: string | null };
};

// Monthly price IDs
const stripePriceIdStandard = process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_STANDARD ?? null;
const stripePriceIdVip = process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_VIP ?? null;
const stripePriceIdElite = process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_ELITE ?? null;

// Annual price IDs
const stripePriceIdStandardAnnual = process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_STANDARD_ANNUAL ?? null;
const stripePriceIdVipAnnual = process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_VIP_ANNUAL ?? null;
const stripePriceIdEliteAnnual = process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_ELITE_ANNUAL ?? null;

export const BILLING: {
    currency: 'usd';
    trialDays: number;
    tiers: Record<BillingTierKey, BillingTier>;
    cancellationPolicyText: string;
    refundPolicyText: string;
} = {
    currency: 'usd',
    trialDays: 7,
    tiers: {
        standard: {
            monthly: { priceText: '$9.99/mo', stripePriceId: stripePriceIdStandard },
            annual: { priceText: '$99.99/yr', monthlyCost: '$8.33/mo', savings: 'Save $19.89', stripePriceId: stripePriceIdStandardAnnual },
        },
        vip: {
            monthly: { priceText: '$39.99/mo', stripePriceId: stripePriceIdVip },
            annual: { priceText: '$399.99/yr', monthlyCost: '$33.33/mo', savings: 'Save $79.89', stripePriceId: stripePriceIdVipAnnual },
        },
        elite: {
            monthly: { priceText: '$99.99/mo', stripePriceId: stripePriceIdElite },
            annual: { priceText: '$999.99/yr', monthlyCost: '$83.33/mo', savings: 'Save $199.89', stripePriceId: stripePriceIdEliteAnnual },
        },
    },
    cancellationPolicyText: 'Cancel anytime. Access continues until the end of your billing period.',
    refundPolicyText: 'Refunds are not guaranteed and may be issued case-by-case.',
};

export function billingHasStripeIds(): boolean {
    return Boolean(
        BILLING.tiers.standard.monthly.stripePriceId &&
        BILLING.tiers.vip.monthly.stripePriceId &&
        BILLING.tiers.elite.monthly.stripePriceId
    );
}

/** Gets the correct Stripe price ID for a tier + period combo. */
export function getStripePriceId(tier: BillingTierKey, period: BillingPeriod): string | null {
    return BILLING.tiers[tier]?.[period]?.stripePriceId ?? null;
}
