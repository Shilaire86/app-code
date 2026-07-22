import React, { memo, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Platform } from 'react-native';
import { showAlert } from '@/lib/confirm';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import {
    fetchAffiliateOffers, fetchCoachPosts, toggleLike, fetchUserLikes,
    fetchComments, addComment, fetchRecentActivities,
    fetchUserPosts, toggleUserPostLike, fetchUserPostLikes, reportContent,
} from '@/services/feed';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { hasEntitlement } from '@/lib/entitlements';
import { useRouter } from 'expo-router';

// ─── Offer card ───────────────────────────────────────────────────────────────

const OfferCard = memo(({ offer }: { offer: any }) => {
    const theme = useTheme();
    const styles = createStyles(theme);
    return (
        <TouchableOpacity style={styles.offerCard}>
            <View style={styles.offerTag}>
                <Text style={styles.tagText}>{offer.tier_required?.toUpperCase()}</Text>
            </View>
            <Text style={styles.offerTitle} numberOfLines={1}>{offer.title}</Text>
            <Text style={styles.offerDesc} numberOfLines={2}>{offer.description}</Text>
        </TouchableOpacity>
    );
});

// ─── Comment section ──────────────────────────────────────────────────────────

const CommentSection = ({ postId, user }: { postId: string; user: any }) => {
    const theme = useTheme();
    const { colors } = theme;
    const styles = createStyles(theme);
    const router = useRouter();
    const tier = useProfileStore(s => s.tier);
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

    if (loading) return <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} />;

    return (
        <View style={styles.commentContainer}>
            {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                    <Text style={styles.commentAuthor}>{comment.profile_public?.full_name || 'User'}</Text>
                    <Text style={styles.commentText}>{comment.content}</Text>
                </View>
            ))}
            {user && (
                hasEntitlement(tier, 'communityComments') ? (
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
                            {submitting
                                ? <ActivityIndicator size="small" color={colors.primary} />
                                : <Ionicons name="send" size={20} color={colors.primary} />
                            }
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.lockedCommentRow}
                        onPress={() => router.push('/subscribe')}
                    >
                        <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.4)" />
                        <Text style={styles.lockedCommentText}>Standard+ Feature: Upgrade to join the conversation</Text>
                    </TouchableOpacity>
                )
            )}
        </View>
    );
};

// ─── Coach post card ──────────────────────────────────────────────────────────

const PostCard = memo(({ item, isLiked, onToggleLike, user }: any) => {
    const theme = useTheme();
    const { colors } = theme;
    const styles = createStyles(theme);
    const [likeCount, setLikeCount] = useState(item.like_count || 0);
    const [liked, setLiked] = useState(isLiked);
    const [liking, setLiking] = useState(false);
    const [showComments, setShowComments] = useState(false);

    useEffect(() => { setLiked(isLiked); }, [isLiked]);

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
                <View style={[styles.avatar, styles.avatarCoach]}>
                    <Text style={styles.avatarText}>C</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.authorName}>Coach</Text>
                        <View style={styles.coachBadge}>
                            <Text style={styles.coachBadgeText}>COACH</Text>
                        </View>
                        {item.audience === 'founders' && (
                            <View style={styles.founderBadge}>
                                <Text style={styles.founderBadgeText}>FOUNDERS ONLY</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.date}>{new Date(item.published_at || item.created_at).toLocaleDateString()}</Text>
                </View>
            </View>
            <Text style={styles.postTitle}>{item.title}</Text>
            <Text style={styles.postContent}>{item.content}</Text>
            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleLike} disabled={liking}>
                    <Ionicons
                        name={liked ? 'heart' : 'heart-outline'}
                        size={20}
                        color={liked ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.actionText, liked && { color: colors.primary }]}>
                        {likeCount > 0 ? `${likeCount} Respect` : 'Respect'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => setShowComments(!showComments)}>
                    <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                    <Text style={styles.actionText}>Comment</Text>
                </TouchableOpacity>
            </View>
            {showComments && <CommentSection postId={item.id} user={user} />}
        </View>
    );
});

// ─── User post card ───────────────────────────────────────────────────────────

const POST_TYPE_ICONS: Record<string, string> = {
    workout_share:   'barbell-outline',
    milestone_share: 'trophy-outline',
    thread:          'chatbubbles-outline',
};

const UserPostCard = memo(({ item, isLiked, onToggleLike, onReport, user }: any) => {
    const theme = useTheme();
    const { colors } = theme;
    const styles = createStyles(theme);
    const [likeCount, setLikeCount] = useState(item.like_count || 0);
    const [liked, setLiked] = useState(isLiked);
    const [liking, setLiking] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const isOwnPost = user?.id === item.author_id;
    const icon = POST_TYPE_ICONS[item.post_type] || 'chatbubbles-outline';

    useEffect(() => { setLiked(isLiked); }, [isLiked]);

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

    const handleReport = () => {
        if (Platform.OS === 'web') {
            if (globalThis.confirm?.('Report this post as violating community guidelines?')) onReport(item.id);
        } else {
            showAlert('Report Post', 'Report this post as violating community guidelines?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Report', style: 'destructive', onPress: () => onReport(item.id) },
            ]);
        }
    };

    const initials = (item.profile_public?.full_name || 'U')
        .split(' ')
        .map((w: string) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <View style={styles.postCard}>
            <View style={styles.authorRow}>
                <View style={[styles.avatar, styles.avatarUser]}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.authorName}>{item.profile_public?.full_name || 'Member'}</Text>
                        {['active', 'graduated'].includes(item.profile_public?.founder_status) && (
                            <View style={styles.founderBadge}>
                                <Text style={styles.founderBadgeText}>FOUNDER</Text>
                            </View>
                        )}
                        <Ionicons name={icon as any} size={12} color={colors.textSecondary} />
                    </View>
                    <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                {!isOwnPost && (
                    <TouchableOpacity onPress={handleReport} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="flag-outline" size={16} color="rgba(255,255,255,0.2)" />
                    </TouchableOpacity>
                )}
            </View>
            {item.title ? <Text style={styles.postTitle}>{item.title}</Text> : null}
            <Text style={styles.postContent}>{item.content}</Text>
            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleLike} disabled={liking}>
                    <Ionicons
                        name={liked ? 'heart' : 'heart-outline'}
                        size={20}
                        color={liked ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.actionText, liked && { color: colors.primary }]}>
                        {likeCount > 0 ? `${likeCount} Respect` : 'Respect'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => setShowComments(!showComments)}>
                    <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                    <Text style={styles.actionText}>Comment</Text>
                </TouchableOpacity>
            </View>
            {showComments && <CommentSection postId={item.id} user={user} />}
        </View>
    );
});

// ─── Activity card ────────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<string, { name: string; color: string }> = {
    workout_complete: { name: 'barbell-outline',         color: '#00b894' },
    pr_set:           { name: 'trophy-outline',          color: '#fdcb6e' },
    milestone:        { name: 'ribbon-outline',          color: '#e17055' },
    stage_up:         { name: 'arrow-up-circle-outline', color: '#a29bfe' },
    streak:           { name: 'flame-outline',           color: '#ff7675' },
};

const ActivityCard = memo(({ activity }: { activity: any }) => {
    const theme = useTheme();
    const { colors } = theme;
    const styles = createStyles(theme);
    const iconInfo = ACTIVITY_ICONS[activity.activity_type] || { name: 'ellipse-outline', color: colors.textSecondary };

    const renderContent = () => {
        switch (activity.activity_type) {
            case 'workout_complete': return `just crushed ${activity.activity_data?.workout_name || 'a workout'}! 💪`;
            case 'pr_set':          return `set a new PR on ${activity.activity_data?.exercise_name}: ${activity.activity_data?.weight} lbs! 🏆`;
            case 'milestone':       return `hit a major milestone: ${activity.activity_data?.milestone}! 🎯`;
            case 'stage_up':        return `evolved to ${activity.activity_data?.new_stage?.toUpperCase() || 'a new stage'}! 🔥`;
            case 'streak':          return `is on a ${activity.activity_data?.days || ''} day streak! 🔥`;
            default:                return 'is making progress!';
        }
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <View style={[styles.activityCard, { borderLeftColor: iconInfo.color }]}>
            <View style={[styles.activityAvatar, { backgroundColor: `${iconInfo.color}22` }]}>
                <Ionicons name={iconInfo.name as any} size={18} color={iconInfo.color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.activityText}>
                    <Text style={styles.activityUser}>{activity.profile_public?.full_name || 'Someone'}</Text>
                    {' '}{renderContent()}
                </Text>
                <Text style={styles.activityDate}>{timeAgo(activity.created_at)}</Text>
            </View>
        </View>
    );
});

// ─── Feed screen ──────────────────────────────────────────────────────────────

export default function FeedScreen() {
    const theme = useTheme();
    const { colors, spacing } = theme;
    const styles = createStyles(theme);
    const router = useRouter();
    const { user } = useAuthStore();
    const tier = useProfileStore(s => s.tier);
    const canPost = hasEntitlement(tier, 'communityPost');

    const [likedCoachPosts, setLikedCoachPosts] = useState<string[]>([]);
    const [likedUserPosts, setLikedUserPosts] = useState<string[]>([]);

    const { data: postsData,      error: postsError,      isLoading: postsLoading }      = useCachedQuery('feed:posts',      fetchCoachPosts,       { staleTimeMs: 30_000 });
    const { data: userPostsData,  error: userPostsError,  isLoading: userPostsLoading }  = useCachedQuery('feed:user-posts', fetchUserPosts,        { staleTimeMs: 30_000 });
    const { data: activitiesData, isLoading: activitiesLoading }                         = useCachedQuery('feed:activities',  fetchRecentActivities, { staleTimeMs: 30_000 });
    const { data: offersData,     isLoading: offersLoading }                             = useCachedQuery('feed:offers',      fetchAffiliateOffers,  { staleTimeMs: 60_000 });

    useEffect(() => {
        if (!user?.id) return;
        fetchUserLikes(user.id).then(setLikedCoachPosts).catch(console.error);
        fetchUserPostLikes(user.id).then(setLikedUserPosts).catch(console.error);
    }, [user?.id]);

    const handleToggleCoachLike = useCallback(async (postId: string) => {
        if (!user?.id) return;
        const nowLiked = await toggleLike(postId, user.id);
        setLikedCoachPosts(prev => nowLiked ? [...prev, postId] : prev.filter(id => id !== postId));
    }, [user?.id]);

    const handleToggleUserPostLike = useCallback(async (postId: string) => {
        if (!user?.id) return;
        const nowLiked = await toggleUserPostLike(postId, user.id);
        setLikedUserPosts(prev => nowLiked ? [...prev, postId] : prev.filter(id => id !== postId));
    }, [user?.id]);

    const handleReport = useCallback(async (postId: string) => {
        if (!user?.id) return;
        try {
            await reportContent(user.id, 'user_post', postId, 'Reported by user');
            showAlert('Reported', 'Thank you. This post has been flagged for review.');
        } catch {
            showAlert('Error', 'Could not submit report. Please try again.');
        }
    }, [user?.id]);

    const posts       = postsError      ? [] : (postsData      ?? []);
    const userPosts   = userPostsError  ? [] : (userPostsData  ?? []);
    const activities  = activitiesData ?? [];
    const offers      = offersData     ?? [];

    const feed = [
        ...posts.map(p     => ({ ...p, _feedType: 'coach_post' })),
        ...userPosts.map(p => ({ ...p, _feedType: 'user_post'  })),
        ...activities.map(a => ({ ...a, _feedType: 'activity'  })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const isLoading = (postsLoading || userPostsLoading || activitiesLoading || offersLoading) && feed.length === 0;

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    const renderHeader = () => (
        <View>
            <View style={styles.header}>
                <Text style={styles.title}>Community Feed</Text>
                {canPost && (
                    <TouchableOpacity style={styles.newPostBtn} onPress={() => router.push('/(tabs)/feed/new-post')}>
                        <Ionicons name="add" size={18} color="#FFF" />
                        <Text style={styles.newPostBtnText}>Post</Text>
                    </TouchableOpacity>
                )}
            </View>

            {!canPost && (
                <TouchableOpacity style={styles.upgradeBar} onPress={() => router.push('/subscribe')}>
                    <Ionicons name="lock-closed-outline" size={14} color={colors.primary} />
                    <Text style={styles.upgradeBarText}>Upgrade to Standard to post & comment</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
            )}

            {offers.length > 0 && (
                <View style={styles.offersSection}>
                    <Text style={styles.sectionTitle}>Admin Offers</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.offersRow}>
                        {offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
                    </ScrollView>
                </View>
            )}

            <Text style={[styles.sectionTitle, { marginLeft: spacing.lg, marginTop: spacing.xl }]}>Latest Activity</Text>
        </View>
    );

    const renderItem = ({ item }: { item: any }) => {
        if (item._feedType === 'coach_post') {
            return (
                <PostCard
                    item={item}
                    isLiked={likedCoachPosts.includes(item.id)}
                    onToggleLike={handleToggleCoachLike}
                    user={user}
                />
            );
        }
        if (item._feedType === 'user_post') {
            return (
                <UserPostCard
                    item={item}
                    isLiked={likedUserPosts.includes(item.id)}
                    onToggleLike={handleToggleUserPostLike}
                    onReport={handleReport}
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
                keyExtractor={(item) => `${item._feedType}-${item.id}`}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.list}
                renderItem={renderItem}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = ({ colors, spacing, radius, typography }: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        container:    { flex: 1, backgroundColor: colors.background },
        centered:     { justifyContent: 'center', alignItems: 'center' },
        header: {
            paddingTop: 60,
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        title:        { color: colors.text, fontSize: 28, fontWeight: '800' },
        newPostBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: colors.primary,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: radius.md,
        },
        newPostBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
        upgradeBar: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginHorizontal: spacing.lg,
            marginBottom: spacing.md,
            backgroundColor: `${colors.primary}12`,
            borderRadius: radius.md,
            padding: spacing.md,
            borderWidth: 1,
            borderColor: `${colors.primary}25`,
        },
        upgradeBarText: { flex: 1, color: colors.primary, fontSize: 13, fontWeight: '600' },
        list:         { paddingBottom: spacing.xl },
        offersSection: { marginTop: spacing.md },
        sectionTitle: {
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            marginBottom: spacing.md,
            marginLeft: spacing.lg,
        },
        offersRow:    { paddingLeft: spacing.lg, paddingRight: spacing.lg, gap: spacing.md },
        offerCard: {
            width: 220,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.md,
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
        tagText:      { color: colors.primary, fontSize: 10, fontWeight: '800' },
        offerTitle:   { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
        offerDesc:    { color: colors.textSecondary, fontSize: 12, lineHeight: 16 },
        postCard: {
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            padding: spacing.lg,
            marginHorizontal: spacing.lg,
            marginBottom: spacing.xl,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.05)',
        },
        authorRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: spacing.lg,
            gap: 12,
        },
        avatar: {
            width: 36,
            height: 36,
            borderRadius: 18,
            justifyContent: 'center',
            alignItems: 'center',
        },
        avatarCoach: { backgroundColor: colors.primary },
        avatarUser:  { backgroundColor: 'rgba(255,255,255,0.12)' },
        avatarText:  { color: '#FFF', fontWeight: '800', fontSize: 14 },
        coachBadge: {
            backgroundColor: `${colors.primary}22`,
            paddingHorizontal: 6,
            paddingVertical: 1,
            borderRadius: 4,
        },
        coachBadgeText: { color: colors.primary, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
        founderBadge: {
            borderWidth: 1,
            borderColor: colors.primary,
            paddingHorizontal: 6,
            paddingVertical: 1,
            borderRadius: 4,
        },
        founderBadgeText: { color: colors.primary, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
        authorName:  { color: colors.text, fontWeight: '700', fontSize: 14 },
        date:        { color: colors.textSecondary, fontSize: 12 },
        postTitle: {
            color: colors.text,
            fontSize: 18,
            fontWeight: '800',
            marginBottom: 8,
        },
        postContent: {
            color: colors.textSecondary,
            fontSize: 15,
            lineHeight: 22,
            marginBottom: spacing.lg,
        },
        actions: {
            flexDirection: 'row',
            gap: 20,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.05)',
            paddingTop: spacing.md,
        },
        actionButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        actionText:   { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
        commentContainer: {
            marginTop: spacing.md,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255,255,255,0.02)',
        },
        commentItem:   { marginBottom: 8 },
        commentAuthor: { color: colors.text, fontWeight: '700', fontSize: 12, marginBottom: 2 },
        commentText:   { color: colors.textSecondary, fontSize: 12, lineHeight: 16 },
        commentInputRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginTop: 8,
        },
        lockedCommentRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 8,
            backgroundColor: 'rgba(255,255,255,0.03)',
            padding: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.05)',
        },
        lockedCommentText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
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
            padding: spacing.md,
            marginHorizontal: spacing.lg,
            marginBottom: spacing.md,
            borderRadius: radius.lg,
            borderLeftWidth: 3,
            gap: 12,
        },
        activityAvatar: {
            width: 32,
            height: 32,
            borderRadius: 16,
            justifyContent: 'center',
            alignItems: 'center',
        },
        activityText: { color: colors.text, fontSize: 13, lineHeight: 18 },
        activityUser: { fontWeight: '800', color: '#FFF' },
        activityDate: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
    });
