import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const OfferCard = memo(({ offer }: { offer: any }) => (
    <TouchableOpacity key={offer.id} style={styles.offerCard}>
        <View style={styles.offerTag}>
            <Text style={styles.tagText}>{offer.tier_required?.toUpperCase()}</Text>
        </View>
        <Text style={styles.offerTitle} numberOfLines={1}>{offer.title}</Text>
        <Text style={styles.offerDesc} numberOfLines={2}>{offer.description}</Text>
    </TouchableOpacity>
));

const PostCard = memo(({ item }: { item: any }) => (
    <View style={styles.postCard}>
        <View style={styles.authorRow}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>C</Text>
            </View>
            <View>
                <Text style={styles.authorName}>Coach</Text>
                <Text style={styles.date}>{new Date(item.published_at || item.created_at).toLocaleDateString()}</Text>
            </View>
        </View>
        <Text style={styles.postTitle}>{item.title}</Text>
        <Text style={styles.postContent}>{item.content}</Text>
        <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="heart-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.actionText}>Respect</Text>
            </TouchableOpacity>
        </View>
    </View>
));

export default function FeedScreen() {
    const [posts, setPosts] = useState<any[]>([]);
    const [offers, setOffers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            // Fetch Coach Posts
            const { data: postsData } = await supabase
                .from('coach_posts')
                .select('*')
                .eq('is_published', true)
                .order('published_at', { ascending: false });

            // Fetch Affiliate Offers
            const { data: offersData } = await supabase
                .from('affiliate_offers')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            setPosts(postsData || []);
            setOffers(offersData || []);
        } catch (error) {
            console.error('Error fetching feed data:', error);
            // Fallback for demo if tables aren't ready
            setPosts([
                { id: '1', title: 'Welcome to the Method', content: 'Your journey starts today.', author: 'Coach' }
            ]);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color={theme.colors.primary} />
            </View>
        );
    }

    const renderHeader = () => (
        <View>
            <View style={styles.header}>
                <Text style={styles.title}>Coach Feed</Text>
            </View>

            {offers.length > 0 && (
                <View style={styles.offersSection}>
                    <Text style={styles.sectionTitle}>Curated Offers</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.offersRow}
                    >
                        {offers.map((offer) => (
                            <OfferCard key={offer.id} offer={offer} />
                        ))}
                    </ScrollView>
                </View>
            )}

            <Text style={[styles.sectionTitle, { marginLeft: theme.spacing.lg, marginTop: theme.spacing.xl }]}>Guidance</Text>
        </View>
    );

    const renderItem = ({ item }: { item: any }) => <PostCard item={item} />;

    return (
        <View style={styles.container}>
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.list}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={5}
                removeClippedSubviews={true}
                renderItem={renderItem}
            />
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
        paddingTop: 60,
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    title: {
        color: theme.colors.text,
        fontSize: 28,
        fontWeight: '800',
    },
    list: {
        paddingBottom: theme.spacing.xl,
    },
    offersSection: {
        marginTop: theme.spacing.md,
    },
    sectionTitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: theme.spacing.md,
        marginLeft: theme.spacing.lg,
    },
    offersRow: {
        paddingLeft: theme.spacing.lg,
        paddingRight: theme.spacing.lg,
        gap: theme.spacing.md,
    },
    offerCard: {
        width: 220,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    offerTag: {
        backgroundColor: 'rgba(255,102,0,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    tagText: {
        color: theme.colors.primary,
        fontSize: 10,
        fontWeight: '800',
    },
    offerTitle: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    offerDesc: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        lineHeight: 16,
    },
    postCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.xl,
        padding: theme.spacing.lg,
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        gap: 12,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 16,
    },
    authorName: {
        color: theme.colors.text,
        fontWeight: '700',
        fontSize: 14,
    },
    date: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    postTitle: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 8,
    },
    postContent: {
        color: theme.colors.textSecondary,
        fontSize: 15,
        lineHeight: 22,
        marginBottom: theme.spacing.lg,
    },
    actions: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: theme.spacing.md,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
});
