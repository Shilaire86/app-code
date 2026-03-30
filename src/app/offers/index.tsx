import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Linking, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { canAccessContentTier } from '@/lib/entitlements';
import { logAffiliateClick } from '@/services/feed';

interface Offer {
    id: string;
    title: string;
    description: string;
    url: string;
    image_url?: string;
    tier_required: 'free' | 'standard' | 'vip';
}

const TIER_COLORS: Record<string, string> = {
    free: '#4ECDC4',
    standard: '#FFD700',
    vip: '#FF6B6B',
};

export default function AffiliateOffersScreen() {
    const { tier } = useProfileStore();
    const { user } = useAuthStore();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const canAccess = (offerTier: string) => canAccessContentTier(tier || 'free', offerTier as any);

    useEffect(() => {
        fetchOffers();
    }, []);

    async function fetchOffers() {
        try {
            const { data, error } = await supabase
                .from('affiliate_offers')
                .select('*')
                .eq('is_active', true)
                .order('tier_required', { ascending: true });

            if (error) throw error;
            setOffers(data || []);
        } catch (error) {
            console.error('[offers] Fetch error:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleOfferPress = (offer: Offer) => {
        if (canAccess(offer.tier_required)) {
            if (user?.id) {
                logAffiliateClick(user.id, offer.id, offer.title);
            }
            Linking.openURL(offer.url);
        }
    };

    const renderOffer = ({ item }: { item: Offer }) => {
        const accessible = canAccess(item.tier_required);

        return (
            <TouchableOpacity
                style={[styles.offerCard, !accessible && styles.offerLocked]}
                onPress={() => handleOfferPress(item)}
                activeOpacity={accessible ? 0.7 : 1}
            >
                {item.image_url && (
                    <Image source={{ uri: item.image_url }} style={styles.offerImage} />
                )}
                <View style={styles.offerContent}>
                    <View style={styles.offerHeader}>
                        <Text style={styles.offerTitle}>{item.title}</Text>
                        <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[item.tier_required] }]}>
                            <Text style={styles.tierText}>{item.tier_required.toUpperCase()}</Text>
                        </View>
                    </View>
                    <Text style={styles.offerDescription}>{item.description}</Text>
                    {!accessible && (
                        <View style={styles.lockedBanner}>
                            <Ionicons name="lock-closed" size={14} color="#FFF" />
                            <Text style={styles.lockedText}>Upgrade to {item.tier_required} to unlock</Text>
                        </View>
                    )}
                    {accessible && (
                        <View style={styles.ctaRow}>
                            <Text style={styles.ctaText}>Claim Offer</Text>
                            <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Partner Offers',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Exclusive Partner Deals</Text>
                <Text style={styles.headerSubtitle}>Special offers for The Becoming Method community</Text>
            </View>

            {offers.length > 0 && !canAccess(offers[offers.length - 1].tier_required) && (
                <View style={styles.upgradeWrap}>
                    <UpgradePrompt
                        title="Unlock partner offers"
                        body="Some offers are reserved for higher tiers. Upgrade to access everything."
                        requiredTier={offers[offers.length - 1].tier_required as any}
                        onUpgradePress={() => router.push('/subscribe')}
                        onLearnMorePress={() => router.push('/help/quick-start')}
                    />
                </View>
            )}

            {offers.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="gift-outline" size={60} color="rgba(255,255,255,0.1)" />
                    <Text style={styles.emptyText}>No offers available right now</Text>
                    <Text style={styles.emptySubtext}>Check back soon for exclusive deals</Text>
                </View>
            ) : (
                <FlatList
                    data={offers}
                    renderItem={renderOffer}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '700',
    },
    headerSubtitle: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginTop: 4,
    },
    upgradeWrap: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    list: {
        padding: theme.spacing.md,
        paddingTop: 0,
    },
    offerCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        marginBottom: theme.spacing.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    offerLocked: {
        opacity: 0.6,
    },
    offerImage: {
        width: '100%',
        height: 120,
    },
    offerContent: {
        padding: theme.spacing.md,
    },
    offerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.xs,
    },
    offerTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    tierBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    tierText: {
        color: '#000',
        fontSize: 10,
        fontWeight: '700',
    },
    offerDescription: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
    lockedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: theme.spacing.md,
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: theme.spacing.sm,
        borderRadius: theme.radius.sm,
    },
    lockedText: {
        color: '#FFF',
        fontSize: 12,
    },
    ctaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: theme.spacing.md,
    },
    ctaText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    emptyText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
        marginTop: theme.spacing.lg,
    },
    emptySubtext: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginTop: theme.spacing.xs,
    },
});
