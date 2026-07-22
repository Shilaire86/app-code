import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────

export type PromoCode = {
    id: string;
    code: string;
    description: string | null;
    discount_type: 'percent' | 'fixed' | 'trial_extension';
    discount_value: number;
    applicable_tiers: string[];
    applicable_periods: string[];
    max_uses: number | null;
    current_uses: number;
    is_active: boolean;
    expires_at: string | null;
};

export type PromoValidationResult = {
    valid: boolean;
    promo?: PromoCode;
    error?: string;
    discountLabel?: string; // "50% OFF" or "$25 OFF"
};

// ─── Service Functions ──────────────────────────────────────

/**
 * Validates a promo code string and returns whether it can be used.
 */
export async function validatePromoCode(
    code: string,
    tier: string,
    period: string = 'monthly'
): Promise<PromoValidationResult> {
    const trimmed = code.trim().toUpperCase();

    if (!trimmed) {
        return { valid: false, error: 'Please enter a promo code.' };
    }

    // Fetch the code
    const { data: promo, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', trimmed)
        .eq('is_active', true)
        .maybeSingle();

    if (error) throw error;

    if (!promo) {
        return { valid: false, error: 'Invalid promo code.' };
    }

    // Check expiration
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return { valid: false, error: 'This promo code has expired.' };
    }

    // Check max uses
    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
        return { valid: false, error: 'This promo code has reached its usage limit.' };
    }

    // Check applicable tier
    if (promo.applicable_tiers && !promo.applicable_tiers.includes(tier)) {
        return { valid: false, error: `This code is not valid for the ${tier} tier.` };
    }

    // Check applicable period
    if (promo.applicable_periods && !promo.applicable_periods.includes(period)) {
        return { valid: false, error: `This code is only valid for ${promo.applicable_periods.join(' or ')} plans.` };
    }

    // Check if user already redeemed this code
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
        return { valid: false, error: 'Not signed in.' };
    }

    const { data: existing } = await supabase
        .from('promo_redemptions')
        .select('id')
        .eq('user_id', userId)
        .eq('promo_code_id', promo.id)
        .maybeSingle();

    if (existing) {
        return { valid: false, error: 'You have already used this promo code.' };
    }

    // Build discount label
    const discountLabel =
        promo.discount_type === 'percent'
            ? `${promo.discount_value}% OFF`
            : promo.discount_type === 'fixed'
            ? `$${promo.discount_value} OFF`
            : `${promo.discount_value} extra trial days`;

    return { valid: true, promo, discountLabel };
}

/**
 * Fetches the user's previous redemptions.
 */
export async function getUserRedemptions() {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Not signed in.');

    const { data, error } = await supabase
        .from('promo_redemptions')
        .select('*, promo_code:promo_codes(code, description, discount_type, discount_value)')
        .eq('user_id', userId)
        .order('redeemed_at', { ascending: false });

    if (error) throw error;
    return data || [];
}
