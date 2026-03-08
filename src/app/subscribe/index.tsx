import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { ENTITLEMENTS } from '@/lib/entitlements';
import { getTierLabel } from '@/lib/tier-gating';
import { BILLING } from '@/lib/billingConfig';
import type { SubscriptionTier } from '@/stores/profileStore';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function SubscribePlaceholderScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ checkout?: string | string[] }>();
    const { user } = useAuthStore();
    const tiers = Object.keys(BILLING.tiers) as Array<keyof typeof BILLING.tiers>;
    const [loadingTier, setLoadingTier] = useState<string | null>(null);
    const [errorText, setErrorText] = useState<string | null>(null);
    const [checkoutNotice, setCheckoutNotice] = useState<{ type: 'success' | 'cancel'; text: string } | null>(null);
    const [refreshingSubscription, setRefreshingSubscription] = useState(false);
    const lastHandledCheckoutRef = useRef<string | null>(null);

    const returnUrl = useMemo(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/subscribe`;
        // TODO: replace with your production web base URL or a deep link handler once configured.
        return 'http://localhost:8081/subscribe';
    }, []);

    useEffect(() => {
        const checkoutParam = Array.isArray(params.checkout) ? params.checkout[0] : params.checkout;
        if (!checkoutParam || checkoutParam === lastHandledCheckoutRef.current) return;
        lastHandledCheckoutRef.current = checkoutParam;

        if (checkoutParam === 'success') {
            setCheckoutNotice({ type: 'success', text: 'Checkout complete. Syncing your subscription now...' });
            if (!user?.id) return;

            setRefreshingSubscription(true);
            useProfileStore.getState().fetchProfile(user.id)
                .finally(() => {
                    setTimeout(() => {
                        useProfileStore.getState().fetchProfile(user.id)
                            .finally(() => setRefreshingSubscription(false));
                    }, 2500);
                });
            return;
        }

        if (checkoutParam === 'cancel') {
            setCheckoutNotice({ type: 'cancel', text: 'Checkout canceled. No charges were made.' });
        }
    }, [params.checkout, user?.id]);

    const startCheckout = async (tier: string) => {
        setErrorText(null);
        setLoadingTier(tier);
        try {
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
                body: JSON.stringify({ tier, returnUrl }),
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
                    <Text style={styles.title}>Upgrade</Text>
                    <Text style={styles.body}>
                        Choose a plan to start your {BILLING.trialDays}-day free trial.
                    </Text>
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

                {useProfileStore.getState().tier !== 'free' && !checkoutNotice && (
                    <View style={styles.currentTierCard}>
                        <View style={styles.currentTierHeader}>
                            <Ionicons name="ribbon-outline" size={20} color={theme.colors.primary} />
                            <Text style={styles.currentTierTitle}>Your Current Plan</Text>
                        </View>
                        <Text style={styles.currentTierName}>
                            {getTierLabel(useProfileStore.getState().tier)}
                        </Text>
                        <Text style={styles.currentTierStatus}>Active • Subscription is managed via Stripe</Text>
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>{useProfileStore.getState().tier === 'free' ? 'Choose a Plan' : 'Change Plans'}</Text>
                    {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
                    {tiers.map((t) => {
                        // Billing tiers are expected to match the app's subscription tier keys.
                        const tierKey = t as SubscriptionTier;
                        const isCurrent = useProfileStore.getState().tier === tierKey;
                        const isElite = tierKey === 'elite';

                        return (
                            <View key={t} style={[styles.tierRow, isCurrent && styles.tierRowCurrent, isElite && styles.tierRowElite]}>
                                <View style={styles.tierLeft}>
                                    <View>
                                        <Text style={[styles.tierName, isElite && styles.tierNameElite]}>
                                            {getTierLabel(t)}
                                            {isCurrent && <Text style={styles.currentLabel}> (Current)</Text>}
                                        </Text>
                                        <Text style={[styles.tierPrice, isElite && styles.tierPriceElite]}>{BILLING.tiers[t].priceText}</Text>
                                    </View>
                                    {isElite && (
                                        <View style={styles.comingSoonBadge}>
                                            <Ionicons name="time-outline" size={12} color="#FFD700" />
                                            <Text style={styles.comingSoonText}>Coming Soon</Text>
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
                                            {tierKey === 'free' ? 'Introduction & Foundations' :
                                                tierKey === 'standard' ? 'Standard Program Library' :
                                                    tierKey === 'vip' ? 'Full Method Catalog' :
                                                        'Custom 1-on-1 Programming'}
                                        </Text>
                                    </View>
                                    <View style={styles.bulletRow}>
                                        <Ionicons name="checkmark-circle" size={14} color={isElite ? "rgba(255, 215, 0, 0.6)" : theme.colors.primary} />
                                        <Text style={[styles.bulletText, isElite && styles.bulletTextElite]}>
                                            {tierKey === 'vip' || tierKey === 'elite' ? 'Advanced Analytics & Trends' : 'Workout Logbook & History'}
                                        </Text>
                                    </View>
                                    <View style={styles.bulletRow}>
                                        <Ionicons name="checkmark-circle" size={14} color={isElite ? "rgba(255, 215, 0, 0.6)" : theme.colors.primary} />
                                        <Text style={[styles.bulletText, isElite && styles.bulletTextElite]}>
                                            {tierKey === 'elite' ? 'Direct 24/7 Coach Messaging' :
                                                tierKey === 'vip' ? 'Community Feed Access' :
                                                    'Read-only Feed Access'}
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
                                            onPress={() => Linking.openURL(`mailto:coach@thebecomingmethod.com?subject=Elite Tier Inquiry&body=I am interested in learning more about the Elite tier.`)}
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
                                                    {useProfileStore.getState().tier === 'free' ? `Start ${BILLING.trialDays}-day free trial` : 'Switch to this plan'}
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

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Why Upgrade to VIP?</Text>
                    <View style={styles.comparisonTable}>
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Full Program Library</Text>
                            <Ionicons name="checkmark" size={16} color="#00b894" />
                        </View>
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Advanced Trend Analytics</Text>
                            <Ionicons name="checkmark" size={16} color="#00b894" />
                        </View>
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Full Community Comments</Text>
                            <Ionicons name="checkmark" size={16} color="#00b894" />
                        </View>
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Exclusive Mindset Audio</Text>
                            <Ionicons name="checkmark" size={16} color="#00b894" />
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Policies (preview)</Text>
                    <Text style={styles.bullet}>- {BILLING.cancellationPolicyText}</Text>
                    <Text style={styles.bullet}>- {BILLING.refundPolicyText}</Text>
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
});
