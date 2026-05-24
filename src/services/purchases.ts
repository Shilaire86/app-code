import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { supabase } from '@/lib/supabase';

const API_KEYS = {
    apple: process.env.EXPO_PUBLIC_RC_APPLE_KEY,
    google: process.env.EXPO_PUBLIC_RC_GOOGLE_KEY,
};

const nativeBillingSyncEnabled = process.env.EXPO_PUBLIC_NATIVE_BILLING_SYNC_ENABLED === 'true';

/** Returns true only when native billing is fully configured and sync is enabled. */
export function nativeBillingReady(): boolean {
    return nativeBillingSyncEnabled;
}

function isPlaceholderKey(key: string | undefined): boolean {
    if (!key) return true;
    const lower = key.toLowerCase();
    return (
        lower.includes('your') ||
        lower.includes('placeholder') ||
        lower.includes('yourgoogle') ||
        lower.includes('yourapple') ||
        lower === 'appl_yourapplerevenuecat_key' ||
        lower === 'goog_yourgooglekeyhere'
    );
}

export async function initializePurchases() {
    if (Platform.OS === 'web') return; // RevenueCat does not run on the web

    Purchases.setLogLevel(LOG_LEVEL.DEBUG);

    const apiKey = Platform.OS === 'ios' ? API_KEYS.apple : API_KEYS.google;

    if (isPlaceholderKey(apiKey)) {
        console.warn(
            `[Purchases] RevenueCat ${Platform.OS} SDK key is missing or is still a placeholder. ` +
            `Set EXPO_PUBLIC_RC_${Platform.OS === 'ios' ? 'APPLE' : 'GOOGLE'}_KEY in your .env and EAS secrets.`
        );
        return;
    }

    if (!nativeBillingSyncEnabled) {
        console.warn('[Purchases] Native billing sync is not enabled. RevenueCat checkout is disabled to avoid stale subscription state. Set EXPO_PUBLIC_NATIVE_BILLING_SYNC_ENABLED=true once your RevenueCat webhook is configured.');
        return;
    }

    Purchases.configure({ apiKey });

    // Attempt to log in the user if a session exists
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        await Purchases.logIn(session.user.id);
    }
}

/**
 * Trigger Native App Store checkout via RevenueCat.
 * @param tier Slug of the tier (e.g., 'standard', 'vip', 'elite')
 * @param isAnnual Whether the user selected the annual billing cycle
 */
export async function purchaseNativeSubscription(tier: string, isAnnual: boolean): Promise<boolean> {
    if (Platform.OS === 'web') throw new Error('Native purchasing is not supported on web.');
    if (!nativeBillingSyncEnabled) {
        throw new Error('Native billing is disabled until subscription syncing is configured on the backend.');
    }

    try {
        const offerings = await Purchases.getOfferings();
        
        // Match the offering identifier to our database tier
        // RevenueCat Offerings should be named exactly like the tiers: 'standard', 'vip', 'elite'
        const offering = offerings.all[tier];
        
        if (!offering) {
            throw new Error(`The package '${tier}' is not configured in RevenueCat yet.`);
        }

        // Identify the correct package (Monthly vs Annual)
        const packageToBuy = isAnnual ? offering.annual : offering.monthly;
        
        if (!packageToBuy) {
            throw new Error(`The ${isAnnual ? 'annual' : 'monthly'} package for '${tier}' is missing in RevenueCat.`);
        }

        const { customerInfo } = await Purchases.purchasePackage(packageToBuy);

        // Check if the purchase unlocked the correct entitlement in RevenueCat
        // (RevenueCat Entitlements should map 1:1 with our tier slugs: 'standard', 'vip', 'elite')
        if (typeof customerInfo.entitlements.active[tier] !== 'undefined') {
            return true; // Success
        }

        return false;
    } catch (e: any) {
        if (!e.userCancelled) {
            console.error('[Purchases] Checkout failed', e);
            throw e;
        }
        return false; // User naturally canceled the sheet
    }
}

/**
 * Checks RevenueCat server-side if the user has an active native subscription.
 * Note: Real-time syncing is best handled via Supabase Webhooks listening to RevenueCat.
 */
export async function syncNativeEntitlements(): Promise<void> {
    if (Platform.OS === 'web') return;
    if (!nativeBillingSyncEnabled) return;
    
    try {
        const customerInfo = await Purchases.getCustomerInfo();
        console.log('[Purchases] Customer Info Synced:', customerInfo.entitlements.active);
    } catch (e) {
        console.warn('[Purchases] Failed to sync entitlements', e);
    }
}
