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
                        <Text style={styles.noticeText}>
                            {checkoutNotice.text}
                            {refreshingSubscription ? ' Please wait...' : ''}
                        </Text>
                    </View>
                ) : null}

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Tiers (preview)</Text>
                    {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
                    {tiers.map((t) => {
                        // Billing tiers are expected to match the app's subscription tier keys.
                        const tierKey = t as SubscriptionTier;
                        return (
                            <View key={t} style={styles.tierRow}>
                                <View style={styles.tierLeft}>
                                    <Text style={styles.tierName}>{getTierLabel(t)}</Text>
                                    <Text style={styles.tierPrice}>{BILLING.tiers[t].priceText}</Text>
                                </View>
                                {BILLING.trialDays > 0 && (
                                    <Text style={styles.trialText}>{BILLING.trialDays}-day free trial</Text>
                                )}
                                <View style={styles.tierBullets}>
                                    <Text style={styles.bullet}>- Programs: {ENTITLEMENTS[tierKey].programsAccess}</Text>
                                    <Text style={styles.bullet}>- Offers: {ENTITLEMENTS[tierKey].offersAccess}</Text>
                                    <Text style={styles.bullet}>- Messaging: {ENTITLEMENTS[tierKey].messagingEnabled ? 'included' : 'no'}</Text>
                                </View>
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
                                            <Text style={styles.subscribeButtonText}>Start 7-day free trial</Text>
                                            <Ionicons name="arrow-forward" size={16} color="#FFF" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        );
                    })}
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
    noticeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
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
    tierLeft: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    tierName: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    tierPrice: { color: theme.colors.primary, fontSize: 13, fontWeight: '900' },
    trialText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700' },
    tierBullets: { gap: 4 },
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
