import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Platform, TextInput } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { ENTITLEMENTS } from '@/lib/entitlements';
import { getTierLabel } from '@/lib/tier-gating';
import { BILLING, BillingPeriod } from '@/lib/billingConfig';
import type { SubscriptionTier } from '@/stores/profileStore';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { validatePromoCode, PromoValidationResult } from '@/services/promoCodes';
import { nativeBillingReady, purchaseNativeSubscription, syncNativeEntitlements } from '@/services/purchases';

import { scheduleTrialEndingReminders } from '@/lib/notifications';
import * as ExpoLinking from 'expo-linking';
import { APP_CONFIG } from '@/lib/appConfig';

export default function SubscribePlaceholderScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ checkout?: string | string[] }>();
    const { user } = useAuthStore();
    const tier = useProfileStore(s => s.tier);
    const fetchProfile = useProfileStore(s => s.fetchProfile);
    const tiers = Object.keys(BILLING.tiers) as Array<keyof typeof BILLING.tiers>;
    const [loadingTier, setLoadingTier] = useState<string | null>(null);
    const [errorText, setErrorText] = useState<string | null>(null);
    const [checkoutNotice, setCheckoutNotice] = useState<{ type: 'success' | 'cancel'; text: string } | null>(null);
    const [refreshingSubscription, setRefreshingSubscription] = useState(false);
    const lastHandledCheckoutRef = useRef<string | null>(null);

    // Billing period & promo code state
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
    const [promoInput, setPromoInput] = useState('');
    const [promoResult, setPromoResult] = useState<PromoValidationResult | null>(null);
    const [promoLoading, setPromoLoading] = useState(false);

    const syncSubscriptionState = async (userId: string) => {
        setRefreshingSubscription(true);
        try {
            await fetchProfile(userId);
            await new Promise((resolve) => setTimeout(resolve, 2500));
            await fetchProfile(userId);

            const { data: sub } = await supabase
                .from('subscriptions')
                .select('trial_end')
                .eq('user_id', userId)
                .maybeSingle();

            if (sub?.trial_end) {
                await scheduleTrialEndingReminders(sub.trial_end).catch(console.error);
            }
        } finally {
            setRefreshingSubscription(false);
        }
    };

    const validatePromoForCheckout = async (tier: string): Promise<PromoValidationResult | null> => {
        const trimmed = promoInput.trim();
        if (!trimmed || !user?.id) return null;

        const result = await validatePromoCode(trimmed, tier, billingPeriod);
        setPromoResult(result);
        return result;
    };

    const returnUrl = useMemo(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/subscribe`;
        return ExpoLinking.createURL('/subscribe');
    }, []);

    useEffect(() => {
        const checkoutParam = Array.isArray(params.checkout) ? params.checkout[0] : params.checkout;
        if (!checkoutParam || checkoutParam === lastHandledCheckoutRef.current) return;

        if (checkoutParam === 'success') {
            setCheckoutNotice({ type: 'success', text: 'Checkout complete. Syncing your subscription now...' });
            if (!user?.id) return;
            lastHandledCheckoutRef.current = checkoutParam;
            syncSubscriptionState(user.id).catch((err) => {
                console.error('[Subscribe] Failed to sync subscription state:', err);
                setRefreshingSubscription(false);
            });
            return;
        }

        if (checkoutParam === 'cancel') {
            lastHandledCheckoutRef.current = checkoutParam;
            setCheckoutNotice({ type: 'cancel', text: 'Checkout canceled. No charges were made.' });
        }
    }, [params.checkout, user?.id]);

    const startCheckout = async (tier: string) => {
        setErrorText(null);
        setLoadingTier(tier);
        try {
            const promoValidation = await validatePromoForCheckout(tier);
            if (promoInput.trim() && !promoValidation?.valid) {
                throw new Error(promoValidation?.error || 'Promo code is not valid for this plan.');
            }

            // ─── Native Checkout (iOS / Android) ───
            if (Platform.OS !== 'web') {
                if (!nativeBillingReady()) {
                    throw new Error('Native checkout is disabled until RevenueCat subscription syncing is configured for this app.');
                }
                if (promoInput.trim()) {
                    throw new Error('Promo codes are currently supported on web checkout only.');
                }
                const isAnnual = billingPeriod === 'annual';
                const success = await purchaseNativeSubscription(tier, isAnnual);
                if (success) {
                    setCheckoutNotice({ type: 'success', text: 'Checkout complete. Syncing your subscription now...' });
                    if (user?.id) {
                        await syncNativeEntitlements();
                        await syncSubscriptionState(user.id);
                    }
                } else {
                    setCheckoutNotice({ type: 'cancel', text: 'Checkout canceled. No charges were made.' });
                }
                return;
            }

            // ─── Web Checkout (Stripe) ───
            // Ensure we have a fresh access token before calling Edge Functions.
            await supabase.auth.refreshSession();
            const { data: sessRes, error: sessErr } = await supabase.auth.getSession();
            if (sessErr) throw sessErr;
            const accessToken = sessRes?.session?.access_token;
            if (!accessToken) throw new Error('You are not signed in. Please sign in again and retry.');

            // Use direct fetch to guarantee the user's JWT is the Authorization header.
            const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
            const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
            if (!baseUrl || !anonKey) throw new Error('Supabase env missing in client.');

            const res = await fetch(`${baseUrl}/functions/v1/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: anonKey,
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    tier,
                    billingPeriod,
                    returnUrl,
                    promoCode: promoValidation?.valid ? promoInput.trim().toUpperCase() : undefined,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (res.status === 401) {
                    throw Object.assign(
                        new Error('Auth token is invalid for this Supabase project. Please sign out and sign back in, then retry checkout.'),
                        { status: res.status }
                    );
                }
                const msg = (data as any)?.error || (data as any)?.message || 'Failed to start checkout.';
                throw Object.assign(new Error(String(msg)), { status: res.status });
            }
            const url = (data as any)?.url as string | undefined;
            if (!url) throw new Error('Missing checkout URL');
            await Linking.openURL(url);
        } catch (e: any) {
            let status = e?.context?.status || e?.status;
            let msg = e?.message || 'Failed to start checkout.';

            // Read the exact response body if the error context is a fetch Response
            if (e?.context instanceof Response) {
                try {
                    const cloned = e.context.clone();
                    const bodyText = await cloned.text();
                    try {
                        const parsed = JSON.parse(bodyText);
                        msg = parsed.error || parsed.message || bodyText;
                    } catch {
                        msg = bodyText;
                    }
                } catch {
                    // fall back
                }
            } else if (e?.context?.body && typeof e.context.body.error === 'string') {
                msg = e.context.body.error;
            }

            setErrorText(status ? `${msg} (HTTP ${status})` : msg);
        } finally {
            setLoadingTier(null);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Upgrade',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.hero}>
                    <Ionicons name="sparkles-outline" size={42} color={theme.colors.primary} />
                    <Text style={styles.title}>Choose Your Plan</Text>
                    <Text style={styles.body}>
                        Start your {BILLING.trialDays}-day free trial on any paid plan. Cancel anytime.
                    </Text>
                </View>

                {/* Monthly / Annual Toggle */}
                <View style={styles.periodToggle}>
                    <TouchableOpacity
                        style={[styles.periodBtn, billingPeriod === 'monthly' && styles.periodBtnActive]}
                        onPress={() => setBillingPeriod('monthly')}
                    >
                        <Text style={[styles.periodBtnText, billingPeriod === 'monthly' && styles.periodBtnTextActive]}>Monthly</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.periodBtn, billingPeriod === 'annual' && styles.periodBtnActive]}
                        onPress={() => setBillingPeriod('annual')}
                    >
                        <Text style={[styles.periodBtnText, billingPeriod === 'annual' && styles.periodBtnTextActive]}>Annual</Text>
                        <View style={styles.saveBadge}>
                            <Text style={styles.saveBadgeText}>SAVE 17%</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {checkoutNotice ? (
                    <View style={[styles.notice, checkoutNotice.type === 'success' ? styles.noticeSuccess : styles.noticeCancel]}>
                        <View style={styles.noticeHeader}>
                            <Ionicons
                                name={checkoutNotice.type === 'success' ? "checkmark-circle" : "alert-circle"}
                                size={20}
                                color={checkoutNotice.type === 'success' ? '#00b894' : '#ff9f43'}
                            />
                            <Text style={styles.noticeText}>
                                {checkoutNotice.text}
                                {refreshingSubscription ? ' Please wait...' : ''}
                            </Text>
                        </View>
                        {checkoutNotice.type === 'success' && !refreshingSubscription && (
                            <TouchableOpacity
                                style={styles.successButton}
                                onPress={() => router.replace('/(tabs)/programs')}
                            >
                                <Text style={styles.successButtonText}>Explore Programs</Text>
                                <Ionicons name="apps" size={16} color="#FFF" />
                            </TouchableOpacity>
                        )}
                    </View>
                ) : null}

                {tier !== 'free' && !checkoutNotice && (
                    <View style={styles.currentTierCard}>
                        <View style={styles.currentTierHeader}>
                            <Ionicons name="ribbon-outline" size={20} color={theme.colors.primary} />
                            <Text style={styles.currentTierTitle}>Your Current Plan</Text>
                        </View>
                        <Text style={styles.currentTierName}>
                            {getTierLabel(tier)}
                        </Text>
                        <Text style={styles.currentTierStatus}>Active • Manage your subscription in Settings</Text>
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{tier === 'free' ? 'Choose a Plan' : 'Change Plans'}</Text>
                    {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
                    {tiers.map((t) => {
                        // Billing tiers are expected to match the app's subscription tier keys.
                        const tierKey = t as SubscriptionTier;
                        const isCurrent = tier === tierKey;
                        const isElite = tierKey === 'elite';

                        return (
                            <View key={t} style={[styles.tierRow, isCurrent && styles.tierRowCurrent, isElite && styles.tierRowElite]}>
                                <View style={styles.tierLeft}>
                                    <View>
                                        <Text style={[styles.tierName, isElite && styles.tierNameElite]}>
                                            {getTierLabel(t)}
                                            {isCurrent && <Text style={styles.currentLabel}> (Current)</Text>}
                                        </Text>
                                        <Text style={[styles.tierPrice, isElite && styles.tierPriceElite]}>
                                            {BILLING.tiers[t][billingPeriod].priceText}
                                        </Text>
                                        {billingPeriod === 'annual' && !isElite && (
                                            <Text style={styles.annualSavings}>
                                                {BILLING.tiers[t].annual.monthlyCost} · {BILLING.tiers[t].annual.savings}
                                            </Text>
                                        )}
                                    </View>
                                    {isElite && (
                                        <View style={styles.comingSoonBadge}>
                                            <Ionicons name="time-outline" size={12} color="#FFD700" />
                                            <Text style={styles.comingSoonText}>By Request</Text>
                                        </View>
                                    )}
                                    {!isElite && BILLING.trialDays > 0 && !isCurrent && (
                                        <Text style={styles.trialText}>{BILLING.trialDays}-day free trial</Text>
                                    )}
                                </View>
                                <View style={styles.tierBullets}>
                                    <View style={styles.bulletRow}>
                                        <Ionicons name="checkmark-circle" size={14} color={isElite ? "rgba(255, 215, 0, 0.6)" : theme.colors.primary} />
                                        <Text style={[styles.bulletText, isElite && styles.bulletTextElite]}>
                                            {tierKey === 'free' ? 'Sample workouts to explore the feel' :
                                                tierKey === 'standard' ? 'Curated coach-led programs + unlimited quick workouts' :
                                                    tierKey === 'vip' ? 'Full program catalog + Build Your Own' :
                                                        '1:1 coaching partnership with direct messaging'}
                                        </Text>
                                    </View>
                                    <View style={styles.bulletRow}>
                                        <Ionicons name="checkmark-circle" size={14} color={isElite ? "rgba(255, 215, 0, 0.6)" : theme.colors.primary} />
                                        <Text style={[styles.bulletText, isElite && styles.bulletTextElite]}>
                                            {tierKey === 'free' ? 'Macro calculator preview' :
                                                tierKey === 'standard' ? 'Full nutrition dashboard with meal logging' :
                                                    tierKey === 'vip' ? 'Smart recommendations — splits, cardio, nutrition & recovery' :
                                                        'Personalized program design & progress interpretation'}
                                        </Text>
                                    </View>
                                    <View style={styles.bulletRow}>
                                        <Ionicons name="checkmark-circle" size={14} color={isElite ? "rgba(255, 215, 0, 0.6)" : theme.colors.primary} />
                                        <Text style={[styles.bulletText, isElite && styles.bulletTextElite]}>
                                            {tierKey === 'free' ? 'Basic weight tracking' :
                                                tierKey === 'standard' ? 'Complete progress tracking — weight, measurements, PRs & photos' :
                                                    tierKey === 'vip' ? 'Advanced adherence insights with visible logic' :
                                                        'Plateau detection, recovery adjustments & accountability'}
                                        </Text>
                                    </View>
                                </View>
                                {isElite && (
                                    <View style={styles.eliteContainer}>
                                        <Text style={styles.comingSoonNote}>
                                            Elite members receive personalized 1-on-1 coaching, routine check-ins, and bespoke programming tailored to their specific evolution.
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.inquiryButton}
                                            onPress={() => Linking.openURL(`mailto:${APP_CONFIG.coachEmail}?subject=Elite Tier Inquiry&body=I am interested in learning more about the Elite tier.`)}
                                        >
                                            <Text style={styles.inquiryButtonText}>Inquire for early access</Text>
                                            <Ionicons name="mail-outline" size={14} color={theme.colors.primary} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {!isCurrent && !isElite && (
                                    <TouchableOpacity
                                        style={styles.subscribeButton}
                                        onPress={() => startCheckout(String(t))}
                                        accessibilityRole="button"
                                        disabled={!!loadingTier}
                                    >
                                        {loadingTier === t ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <>
                                                <Text style={styles.subscribeButtonText}>
                                                    {tier === 'free' ? `Start ${BILLING.trialDays}-day free trial` : 'Switch to this plan'}
                                                </Text>
                                                <Ionicons name="arrow-forward" size={16} color="#FFF" />
                                            </>
                                        )}
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}
                </View>

                {Platform.OS === 'web' && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Have a Promo Code?</Text>
                        <View style={styles.promoRow}>
                            <TextInput
                                style={styles.promoInput}
                                placeholder="Enter code"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={promoInput}
                                onChangeText={(text) => {
                                    setPromoInput(text.toUpperCase());
                                    setPromoResult(null);
                                }}
                                autoCapitalize="characters"
                                returnKeyType="done"
                            />
                            <TouchableOpacity
                                style={[styles.promoApplyBtn, promoLoading && { opacity: 0.5 }]}
                                disabled={promoLoading || !promoInput.trim()}
                                onPress={async () => {
                                    if (!user?.id) return;
                                    setPromoLoading(true);
                                    try {
                                        let result: PromoValidationResult = { valid: false, error: 'This promo code is not valid for any available plan.' };
                                        for (const tier of tiers) {
                                            const candidate = await validatePromoCode(promoInput, tier, billingPeriod);
                                            if (candidate.valid) {
                                                result = candidate;
                                                break;
                                            }
                                        }
                                        setPromoResult(result);
                                    } catch (error) {
                                        console.warn('[Subscribe] Failed to validate promo code:', error);
                                        setPromoResult({ valid: false, error: 'Something went wrong. Try again.' });
                                    } finally {
                                        setPromoLoading(false);
                                    }
                                }}
                            >
                                {promoLoading ? (
                                    <ActivityIndicator size="small" color="#000" />
                                ) : (
                                    <Text style={styles.promoApplyText}>APPLY</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                        {promoResult && (
                            <View style={[styles.promoFeedback, promoResult.valid ? styles.promoSuccess : styles.promoError]}>
                                <Ionicons
                                    name={promoResult.valid ? 'checkmark-circle' : 'alert-circle'}
                                    size={16}
                                    color={promoResult.valid ? '#00b894' : '#FF6B6B'}
                                />
                                <Text style={[styles.promoFeedbackText, promoResult.valid ? { color: '#00b894' } : { color: '#FF6B6B' }]}>
                                    {promoResult.valid ? `✓ Code applied! ${promoResult.discountLabel}` : promoResult.error}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Standard → VIP: What Changes?</Text>
                    <Text style={styles.upgradeSubtitle}>Standard gives you the tools to show up. VIP makes the app think with you.</Text>
                    <View style={styles.comparisonTable}>
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Full Coach-Led Program Catalog</Text>
                            <Ionicons name="checkmark" size={16} color="#00b894" />
                        </View>
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Build Your Own Program</Text>
                            <Ionicons name="checkmark" size={16} color="#00b894" />
                        </View>
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Guided Program Generator</Text>
                            <Ionicons name="checkmark" size={16} color="#00b894" />
                        </View>
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Smart Split & Goal Recommendations</Text>
                            <Ionicons name="checkmark" size={16} color="#00b894" />
                        </View>
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Cardio Scheduling & Auto-Placement</Text>
                            <Ionicons name="checkmark" size={16} color="#00b894" />
                        </View>
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Full Mobility & Conditioning Library</Text>
                            <Ionicons name="checkmark" size={16} color="#00b894" />
                        </View>
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Saved Meals & Smart Food Suggestions</Text>
                            <Ionicons name="checkmark" size={16} color="#00b894" />
                        </View>
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Advanced Adherence Insights</Text>
                            <Ionicons name="checkmark" size={16} color="#00b894" />
                        </View>
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Visible Recommendation Logic</Text>
                            <Ionicons name="checkmark" size={16} color="#00b894" />
                        </View>
                    </View>
                </View>

                <View style={styles.eliteTeaserCard}>
                    <View style={styles.eliteTeaserHeader}>
                        <Ionicons name="time-outline" size={16} color="#FFD700" />
                        <Text style={styles.eliteTeaserBadge}>COMING SOON</Text>
                    </View>
                    <Text style={styles.eliteTeaserTitle}>Elite — The Coaching Partnership</Text>
                    <Text style={styles.eliteTeaserBody}>
                        Everything in VIP, plus a dedicated 1:1 coaching relationship. Your coach reviews your data, interprets your trends, and evolves your plan with you — so you never plateau alone.
                    </Text>
                    <TouchableOpacity
                        style={styles.eliteTeaserCTA}
                        onPress={() => Linking.openURL(`mailto:${APP_CONFIG.coachEmail}?subject=Elite Tier — Early Access&body=I'm interested in early access to Elite coaching.`)}
                    >
                        <Text style={styles.eliteTeaserCTAText}>Join the Early Access List</Text>
                        <Ionicons name="arrow-forward" size={14} color="#FFD700" />
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Subscription Terms</Text>
                    <Text style={styles.bullet}>- {BILLING.cancellationPolicyText}</Text>
                    <Text style={styles.bullet}>- {BILLING.refundPolicyText}</Text>
                    <View style={styles.legalLinks}>
                        <TouchableOpacity onPress={() => router.push('/legal/privacy')} accessibilityRole="link">
                            <Text style={styles.legalLinkText}>Privacy Policy</Text>
                        </TouchableOpacity>
                        <Text style={styles.legalDivider}>·</Text>
                        <TouchableOpacity onPress={() => router.push('/legal/terms')} accessibilityRole="link">
                            <Text style={styles.legalLinkText}>Terms of Use</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
                        <Text style={styles.secondaryText}>Go back</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
    hero: { alignItems: 'center', gap: 10, paddingVertical: 16 },
    title: { color: '#FFF', fontSize: 22, fontWeight: '900' },
    body: { color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 18 },
    notice: {
        borderRadius: theme.radius.md,
        borderWidth: 1,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    noticeSuccess: {
        backgroundColor: 'rgba(0, 184, 148, 0.14)',
        borderColor: 'rgba(0, 184, 148, 0.45)',
    },
    noticeCancel: {
        backgroundColor: 'rgba(255, 159, 67, 0.14)',
        borderColor: 'rgba(255, 159, 67, 0.45)',
    },
    noticeText: { color: '#FFF', fontSize: 12, fontWeight: '700', flex: 1 },
    noticeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    successButton: {
        backgroundColor: '#00b894',
        borderRadius: theme.radius.md,
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
    },
    successButtonText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    currentTierCard: {
        backgroundColor: 'rgba(255, 215, 0, 0.05)',
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
        padding: theme.spacing.lg,
        gap: 4,
        marginBottom: 8,
    },
    currentTierHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    currentTierTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    currentTierName: { color: theme.colors.primary, fontSize: 18, fontWeight: '900' },
    currentTierStatus: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600' },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        padding: theme.spacing.lg,
        gap: 8,
    },
    cardTitle: { color: '#FFF', fontSize: 14, fontWeight: '900' },
    bullet: { color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 18 },
    tierRow: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
        paddingTop: 12,
        marginTop: 8,
        gap: 8,
    },
    tierRowCurrent: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        marginHorizontal: -theme.spacing.lg,
        paddingHorizontal: theme.spacing.lg,
        borderTopWidth: 0,
        borderRadius: theme.radius.md,
    },
    tierRowElite: {
        opacity: 0.85,
        borderTopColor: 'rgba(255, 215, 0, 0.15)',
    },
    eliteContainer: { gap: 12, marginTop: 4 },
    inquiryButton: {
        backgroundColor: 'rgba(255, 215, 0, 0.08)',
        borderRadius: theme.radius.md,
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
    },
    inquiryButtonText: { color: theme.colors.primary, fontSize: 13, fontWeight: '900' },
    comparisonTable: { gap: 12, marginTop: 8 },
    comparisonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.04)',
    },
    comparisonLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
    tierNameElite: { color: 'rgba(255,255,255,0.7)' },
    tierPriceElite: { color: 'rgba(255, 215, 0, 0.6)' },
    bulletElite: { color: 'rgba(255,255,255,0.4)' },
    comingSoonBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255, 215, 0, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.25)',
    },
    comingSoonText: { color: '#FFD700', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    comingSoonNote: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontStyle: 'italic',
        lineHeight: 16,
        marginTop: 2,
    },
    upgradeSubtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontStyle: 'italic',
        marginBottom: 8,
    },
    eliteTeaserCard: {
        backgroundColor: 'rgba(255, 215, 0, 0.05)',
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
        padding: theme.spacing.lg,
        gap: 8,
    },
    eliteTeaserHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    eliteTeaserBadge: {
        color: '#FFD700',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    eliteTeaserTitle: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '900',
    },
    eliteTeaserBody: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 8,
    },
    eliteTeaserCTA: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
    },
    eliteTeaserCTAText: {
        color: '#FFD700',
        fontSize: 13,
        fontWeight: '800',
    },
    currentLabel: { color: theme.colors.primary, fontSize: 11, fontWeight: '700' },
    tierLeft: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    tierName: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    tierPrice: { color: theme.colors.primary, fontSize: 13, fontWeight: '900' },
    trialText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700' },
    tierBullets: { gap: 8, marginTop: 4 },
    bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    bulletText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500' },
    bulletTextElite: { color: 'rgba(255,255,255,0.5)' },
    errorText: { color: '#FF6B6B', fontSize: 12, lineHeight: 16, marginTop: 6 },
    subscribeButton: {
        minHeight: 44,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
    },
    subscribeButtonText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    actionsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
    secondaryButton: {
        minHeight: 44,
        flex: 1,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    secondaryText: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '900' },

    // Period Toggle Styles
    periodToggle: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    periodBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        flexDirection: 'row',
        gap: 6,
    },
    periodBtnActive: {
        backgroundColor: theme.colors.surface,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    periodBtnText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        fontWeight: '700',
    },
    periodBtnTextActive: {
        color: '#FFF',
    },
    saveBadge: {
        backgroundColor: '#00b894',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    saveBadgeText: {
        color: '#000',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    annualSavings: {
        color: '#00b894',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 4,
    },

    // Promo Code Styles
    promoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 12,
    },
    promoInput: {
        flex: 1,
        height: 48,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 10,
        paddingHorizontal: 16,
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    promoApplyBtn: {
        height: 48,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    promoApplyText: {
        color: '#000',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 1,
    },
    promoFeedback: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        paddingHorizontal: 4,
    },
    promoSuccess: {
        // Success color handled inline
    },
    promoError: {
        // Error color handled inline
    },
    promoFeedbackText: {
        fontSize: 13,
        fontWeight: '600',
    },
    legalLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    legalLinkText: {
        color: theme.colors.primary,
        fontSize: 13,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    legalDivider: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 13,
    },
});
