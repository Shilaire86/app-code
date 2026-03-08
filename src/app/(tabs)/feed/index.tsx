import React, { memo, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { fetchAffiliateOffers, fetchCoachPosts, toggleLike, fetchUserLikes, fetchComments, addComment, fetchRecentActivities } from '@/services/feed';
import { useAuthStore } from '@/stores/authStore';

const OfferCard = memo(({ offer }: { offer: any }) => (
    <TouchableOpacity key={offer.id} style={styles.offerCard}>
        <View style={styles.offerTag}>
            <Text style={styles.tagText}>{offer.tier_required?.toUpperCase()}</Text>
        </View>
        <Text style={styles.offerTitle} numberOfLines={1}>{offer.title}</Text>
        <Text style={styles.offerDesc} numberOfLines={2}>{offer.description}</Text>
    </TouchableOpacity>
));

const CommentSection = ({ postId, user }: { postId: string; user: any }) => {
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetchComments(postId)
            .then(setComments)
            .finally(() => setLoading(false));
    }, [postId]);

    const handleAddComment = async () => {
        if (!newComment.trim() || submitting || !user) return;
        setSubmitting(true);
        try {
            const comment = await addComment(postId, user.id, newComment.trim());
            setComments(prev => [...prev, comment]);
            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 10 }} />;

    return (
        <View style={styles.commentContainer}>
            {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                    <Text style={styles.commentAuthor}>{comment.profiles?.full_name || 'User'}</Text>
                    <Text style={styles.commentText}>{comment.content}</Text>
                </View>
            ))}
            {user && (
                <View style={styles.commentInputRow}>
                    <TextInput
                        style={styles.commentInput}
                        placeholder="Add a comment..."
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={newComment}
                        onChangeText={setNewComment}
                        multiline
                    />
                    <TouchableOpacity onPress={handleAddComment} disabled={submitting}>
                        {submitting ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                            <Ionicons name="send" size={20} color={theme.colors.primary} />
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const PostCard = memo(({ item, isLiked, onToggleLike, user }: any) => {
    const [likeCount, setLikeCount] = useState(item.like_count || 0);
    const [liked, setLiked] = useState(isLiked);
    const [liking, setLiking] = useState(false);
    const [showComments, setShowComments] = useState(false);

    useEffect(() => {
        setLiked(isLiked);
    }, [isLiked]);

    const handleLike = async () => {
        if (liking) return;
        setLiking(true);
        const wasLiked = liked;
        setLiked(!wasLiked);
        setLikeCount((c: number) => wasLiked ? c - 1 : c + 1);

        try {
            await onToggleLike(item.id);
        } catch {
            setLiked(wasLiked);
            setLikeCount((c: number) => wasLiked ? c + 1 : c - 1);
        } finally {
            setLiking(false);
        }
    };

    return (
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
                <TouchableOpacity style={styles.actionButton} onPress={handleLike} disabled={liking}>
                    <Ionicons
                        name={liked ? "heart" : "heart-outline"}
                        size={20}
                        color={liked ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[styles.actionText, liked && { color: theme.colors.primary }]}>
                        {likeCount > 0 ? `${likeCount} Respect` : 'Respect'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => setShowComments(!showComments)}>
                    <Ionicons name="chatbubble-outline" size={18} color={theme.colors.textSecondary} />
                    <Text style={styles.actionText}>Comment</Text>
                </TouchableOpacity>
            </View>
            {showComments && <CommentSection postId={item.id} user={user} />}
        </View>
    );
});

const ActivityCard = memo(({ activity }: { activity: any }) => {
    const renderContent = () => {
        switch (activity.activity_type) {
            case 'workout_complete':
                return `just crushed ${activity.activity_data?.workout_name || 'a workout'}!`;
            case 'pr_set':
                return `set a new PR on ${activity.activity_data?.exercise_name}: ${activity.activity_data?.weight} lbs!`;
            case 'milestone':
                return `hit a major milestone: ${activity.activity_data?.milestone}!`;
            default:
                return 'is making progress!';
        }
    };

    return (
        <View style={styles.activityCard}>
            <View style={styles.activityAvatar}>
                <Text style={styles.activityAvatarText}>
                    {activity.profiles?.full_name?.charAt(0) || 'U'}
                </Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.activityText}>
                    <Text style={styles.activityUser}>{activity.profiles?.full_name || 'Someone'}</Text>
                    {' '}{renderContent()}
                </Text>
                <Text style={styles.activityDate}>{new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
        </View>
    );
});

export default function FeedScreen() {
    const { user } = useAuthStore();
    const [likedPosts, setLikedPosts] = useState<string[]>([]);

    const {
        data: postsData,
        error: postsError,
        isLoading: postsLoading,
    } = useCachedQuery('feed:posts', fetchCoachPosts, { staleTimeMs: 30_000 });

    const {
        data: activitiesData,
        isLoading: activitiesLoading,
    } = useCachedQuery('feed:activities', fetchRecentActivities, { staleTimeMs: 30_000 });

    const {
        data: offersData,
        isLoading: offersLoading,
    } = useCachedQuery('feed:offers', fetchAffiliateOffers, { staleTimeMs: 60_000 });

    useEffect(() => {
        if (user?.id) {
            fetchUserLikes(user.id).then(setLikedPosts).catch(console.error);
        }
    }, [user?.id]);

    const handleToggleLike = useCallback(async (postId: string) => {
        if (!user?.id) return;
        const nowLiked = await toggleLike(postId, user.id);
        setLikedPosts(prev =>
            nowLiked
                ? [...prev, postId]
                : prev.filter(id => id !== postId)
        );
    }, [user?.id]);

    const posts = postsError ? [] : (postsData ?? []);
    const activities = activitiesData ?? [];
    const offers = offersData ?? [];

    // Combine and sort feed
    const feed = [
        ...posts.map(p => ({ ...p, type: 'post' })),
        ...activities.map(a => ({ ...a, type: 'activity' }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if ((postsLoading || activitiesLoading || offersLoading) && feed.length === 0) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color={theme.colors.primary} />
            </View>
        );
    }

    const renderHeader = () => (
        <View>
            <View style={styles.header}>
                <Text style={styles.title}>Community Feed</Text>
            </View>

            {offers.length > 0 && (
                <View style={styles.offersSection}>
                    <Text style={styles.sectionTitle}>Admin Offers</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.offersRow}>
                        {offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
                    </ScrollView>
                </View>
            )}

            <Text style={[styles.sectionTitle, { marginLeft: theme.spacing.lg, marginTop: theme.spacing.xl }]}>Latest Activity</Text>
        </View>
    );

    const renderItem = ({ item }: { item: any }) => {
        if (item.type === 'post') {
            return (
                <PostCard
                    item={item}
                    isLiked={likedPosts.includes(item.id)}
                    onToggleLike={handleToggleLike}
                    user={user}
                />
            );
        }
        return <ActivityCard activity={item} />;
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={feed}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.list}
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
        flexDirection: 'row',
        gap: 20,
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
    commentContainer: {
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.02)',
    },
    commentItem: {
        marginBottom: 8,
    },
    commentAuthor: {
        color: theme.colors.text,
        fontWeight: '700',
        fontSize: 12,
        marginBottom: 2,
    },
    commentText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        lineHeight: 16,
    },
    commentInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 8,
    },
    commentInput: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        color: '#FFF',
        fontSize: 12,
        maxHeight: 60,
    },
    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: theme.spacing.md,
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        borderRadius: theme.radius.lg,
        gap: 12,
    },
    activityAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityAvatarText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '700',
    },
    activityText: {
        color: theme.colors.text,
        fontSize: 13,
        lineHeight: 18,
    },
    activityUser: {
        fontWeight: '800',
        color: '#FFF',
    },
    activityDate: {
        color: theme.colors.textSecondary,
        fontSize: 10,
        marginTop: 2,
    },
});
