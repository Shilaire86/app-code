export type BillingTierKey = 'standard' | 'vip' | 'elite';

export type BillingTier = {
    priceText: string;
    stripePriceId: string | null; // fill later from Stripe dashboard
};

const stripePriceIdStandard = process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_STANDARD ?? null;
const stripePriceIdVip = process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_VIP ?? null;
const stripePriceIdElite = process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_ELITE ?? null;

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
        standard: { priceText: '$9.99/mo', stripePriceId: stripePriceIdStandard },
        vip: { priceText: '$29.99/mo', stripePriceId: stripePriceIdVip },
        elite: { priceText: '$149.99/mo', stripePriceId: stripePriceIdElite },
    },
    cancellationPolicyText: 'Cancel anytime. Access continues until the end of your billing period.',
    refundPolicyText: 'Refunds are not guaranteed and may be issued case-by-case.',
};

export function billingHasStripeIds(): boolean {
    return Boolean(
        BILLING.tiers.standard.stripePriceId &&
            BILLING.tiers.vip.stripePriceId &&
            BILLING.tiers.elite.stripePriceId
    );
}
