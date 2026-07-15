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
            monthly: { priceText: '$14.99/mo', stripePriceId: stripePriceIdStandard },
            annual: { priceText: '$139.99/yr', monthlyCost: '$11.67/mo', savings: 'Save $39.89', stripePriceId: stripePriceIdStandardAnnual },
        },
        vip: {
            monthly: { priceText: '$29.99/mo', stripePriceId: stripePriceIdVip },
            annual: { priceText: '$299.99/yr', monthlyCost: '$25.00/mo', savings: 'Save $59.89', stripePriceId: stripePriceIdVipAnnual },
        },
        elite: {
            monthly: { priceText: '$349.99/mo', stripePriceId: stripePriceIdElite },
            annual: { priceText: '$3,599.99/yr', monthlyCost: '$300.00/mo', savings: 'Save $599.89', stripePriceId: stripePriceIdEliteAnnual },
        },
    },
    cancellationPolicyText: 'Cancel anytime. Access continues until the end of your billing period.',
    refundPolicyText: 'Refunds are not guaranteed and may be issued case-by-case.',
};

export function billingHasStripeIds(): boolean {
    return Boolean(
        BILLING.tiers.standard.monthly.stripePriceId &&
        BILLING.tiers.standard.annual.stripePriceId &&
        BILLING.tiers.vip.monthly.stripePriceId &&
        BILLING.tiers.vip.annual.stripePriceId &&
        BILLING.tiers.elite.monthly.stripePriceId &&
        BILLING.tiers.elite.annual.stripePriceId
    );
}

/** Gets the correct Stripe price ID for a tier + period combo. */
export function getStripePriceId(tier: BillingTierKey, period: BillingPeriod): string | null {
    return BILLING.tiers[tier]?.[period]?.stripePriceId ?? null;
}
