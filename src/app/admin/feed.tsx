import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Switch, ScrollView, Platform } from 'react-native';
import { showAlert } from '@/lib/confirm';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import { goBackOr } from '@/lib/navigation';
import {
    fetchAllPosts, createPost, updatePost, deletePost,
    fetchAllUserPosts, updateUserPostStatus, deleteUserPost,
    fetchPendingReports, updateReportStatus,
} from '@/services/feed';

type AdminTab = 'coach' | 'members' | 'reports';

type CoachPost = {
    id: string; title: string; content: string;
    is_published: boolean; published_at: string | null; created_at: string;
    audience: 'all' | 'founders';
};

type UserPost = {
    id: string; title: string | null; content: string;
    post_type: string; status: string; created_at: string;
    profiles?: { full_name: string };
};

type Report = {
    id: string; content_type: string; content_id: string;
    reason: string | null; status: string; created_at: string;
};

// ─── Coach posts tab ──────────────────────────────────────────────────────────

function CoachPostsTab({ userId }: { userId: string }) {
    const theme = useTheme();
    const { colors } = theme;
    const styles = createStyles(theme);

    const [posts, setPosts] = useState<CoachPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingPost, setEditingPost] = useState<CoachPost | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [audience, setAudience] = useState<'all' | 'founders'>('all');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setPosts(await fetchAllPosts());
        } catch {
            showAlert('Error', 'Failed to load posts');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async () => {
        if (!title.trim() || !content.trim()) { showAlert('Error', 'Fill in both fields'); return; }
        try {
            setSaving(true);
            await createPost(title.trim(), content.trim(), userId, audience);
            setTitle(''); setContent(''); setAudience('all'); setShowForm(false);
            await load();
        } catch { showAlert('Error', 'Failed to create post'); }
        finally { setSaving(false); }
    };

    const handleUpdate = async () => {
        if (!editingPost || !title.trim() || !content.trim()) return;
        try {
            setSaving(true);
            await updatePost(editingPost.id, { title: title.trim(), content: content.trim(), audience });
            setTitle(''); setContent(''); setAudience('all'); setEditingPost(null); setShowForm(false);
            await load();
        } catch { showAlert('Error', 'Failed to update post'); }
        finally { setSaving(false); }
    };

    const handleTogglePublish = async (post: CoachPost) => {
        try {
            await updatePost(post.id, { is_published: !post.is_published });
            await load();
        } catch { showAlert('Error', 'Failed to update post'); }
    };

    const handleDelete = (post: CoachPost) => {
        const doDelete = async () => {
            try { await deletePost(post.id); await load(); }
            catch { showAlert('Error', 'Failed to delete post'); }
        };
        if (Platform.OS === 'web') {
            if (globalThis.confirm?.(`Delete "${post.title}"?`)) doDelete();
        } else {
            showAlert('Delete Post', `Delete "${post.title}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: doDelete },
            ]);
        }
    };

    const openEdit = (post: CoachPost) => {
        setEditingPost(post); setTitle(post.title); setContent(post.content);
        setAudience(post.audience ?? 'all'); setShowForm(true);
    };

    const cancelForm = () => {
        setShowForm(false); setEditingPost(null); setTitle(''); setContent(''); setAudience('all');
    };

    if (showForm) {
        return (
            <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
                <Text style={styles.formTitle}>{editingPost ? 'Edit Post' : 'New Post'}</Text>
                <Text style={styles.label}>Title</Text>
                <TextInput
                    style={styles.input} value={title} onChangeText={setTitle}
                    placeholder="Post title..." placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.label}>Content</Text>
                <TextInput
                    style={[styles.input, styles.textArea]} value={content} onChangeText={setContent}
                    placeholder="Write your post..." placeholderTextColor={colors.textSecondary}
                    multiline textAlignVertical="top"
                />
                <Text style={styles.label}>Audience</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['all', 'founders'] as const).map(a => (
                        <TouchableOpacity
                            key={a}
                            style={[
                                styles.secondaryButton,
                                { flex: 1 },
                                audience === a && { borderColor: colors.primary, backgroundColor: `${colors.primary}22` },
                            ]}
                            onPress={() => setAudience(a)}
                        >
                            <Text style={[styles.secondaryButtonText, audience === a && { color: colors.primary }]}>
                                {a === 'all' ? 'Everyone' : 'Founders only'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.formButtons}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={cancelForm}>
                        <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.primaryButton, saving && styles.disabledButton]}
                        onPress={editingPost ? handleUpdate : handleCreate}
                        disabled={saving}
                    >
                        {saving
                            ? <ActivityIndicator color="#FFF" size="small" />
                            : <Text style={styles.primaryButtonText}>{editingPost ? 'Update' : 'Create'}</Text>
                        }
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    return (
        <>
            <View style={styles.tabHeaderRow}>
                <Text style={styles.tabHeader}>Posts ({posts.length})</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
                    <Ionicons name="add" size={20} color="#FFF" />
                    <Text style={styles.addButtonText}>New Post</Text>
                </TouchableOpacity>
            </View>
            {loading ? (
                <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
            ) : posts.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyText}>No posts yet</Text>
                </View>
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <View style={styles.postCard}>
                            <View style={styles.postHeader}>
                                <View style={styles.postMeta}>
                                    <Text style={styles.postTitle} numberOfLines={1}>{item.title}</Text>
                                    <Text style={styles.postDate}>
                                        {new Date(item.created_at).toLocaleDateString()}
                                        {item.is_published ? ' • Published' : ' • Draft'}
                                        {item.audience === 'founders' ? ' • Founders only' : ''}
                                    </Text>
                                </View>
                                <Switch
                                    value={item.is_published}
                                    onValueChange={() => handleTogglePublish(item)}
                                    trackColor={{ false: colors.border, true: `${colors.primary}55` }}
                                    thumbColor={item.is_published ? colors.primary : colors.textSecondary}
                                />
                            </View>
                            <Text style={styles.postContent} numberOfLines={2}>{item.content}</Text>
                            <View style={styles.postActions}>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
                                    <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                                    <Text style={styles.actionText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                                    <Ionicons name="trash-outline" size={18} color="#F44" />
                                    <Text style={[styles.actionText, { color: '#F44' }]}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}
        </>
    );
}

// ─── Member posts tab ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    published: '#00b894',
    flagged:   '#fdcb6e',
    removed:   '#d63031',
};

function MemberPostsTab() {
    const theme = useTheme();
    const { colors } = theme;
    const styles = createStyles(theme);

    const [posts, setPosts] = useState<UserPost[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setPosts(await fetchAllUserPosts());
        } catch {
            showAlert('Error', 'Failed to load member posts');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleStatusChange = async (post: UserPost, status: 'published' | 'flagged' | 'removed') => {
        try {
            await updateUserPostStatus(post.id, status);
            await load();
        } catch { showAlert('Error', 'Failed to update post status'); }
    };

    const handleDelete = (post: UserPost) => {
        const doDelete = async () => {
            try { await deleteUserPost(post.id); await load(); }
            catch { showAlert('Error', 'Failed to delete post'); }
        };
        if (Platform.OS === 'web') {
            if (globalThis.confirm?.('Delete this post permanently?')) doDelete();
        } else {
            showAlert('Delete Post', 'Delete this post permanently?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: doDelete },
            ]);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;

    if (posts.length === 0) {
        return (
            <View style={styles.center}>
                <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No member posts yet</Text>
                <Text style={styles.emptySubtext}>Posts from Standard+ members will appear here</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={posts}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
                <View style={styles.postCard}>
                    <View style={styles.postHeader}>
                        <View style={styles.postMeta}>
                            <Text style={styles.postTitle} numberOfLines={1}>
                                {item.profiles?.full_name || 'Unknown'} · {item.post_type.replace('_', ' ')}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] || colors.textSecondary }]} />
                                <Text style={styles.postDate}>
                                    {item.status} · {new Date(item.created_at).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                    </View>
                    {item.title ? <Text style={styles.memberPostTitle} numberOfLines={1}>{item.title}</Text> : null}
                    <Text style={styles.postContent} numberOfLines={3}>{item.content}</Text>
                    <View style={styles.postActions}>
                        {item.status !== 'published' && (
                            <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusChange(item, 'published')}>
                                <Ionicons name="checkmark-circle-outline" size={18} color="#00b894" />
                                <Text style={[styles.actionText, { color: '#00b894' }]}>Restore</Text>
                            </TouchableOpacity>
                        )}
                        {item.status !== 'flagged' && (
                            <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusChange(item, 'flagged')}>
                                <Ionicons name="flag-outline" size={18} color="#fdcb6e" />
                                <Text style={[styles.actionText, { color: '#fdcb6e' }]}>Flag</Text>
                            </TouchableOpacity>
                        )}
                        {item.status !== 'removed' && (
                            <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusChange(item, 'removed')}>
                                <Ionicons name="eye-off-outline" size={18} color="#F44" />
                                <Text style={[styles.actionText, { color: '#F44' }]}>Remove</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                            <Ionicons name="trash-outline" size={18} color="#F44" />
                            <Text style={[styles.actionText, { color: '#F44' }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        />
    );
}

// ─── Reports tab ──────────────────────────────────────────────────────────────

function ReportsTab() {
    const theme = useTheme();
    const { colors } = theme;
    const styles = createStyles(theme);

    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setReports(await fetchPendingReports());
        } catch {
            showAlert('Error', 'Failed to load reports');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleResolve = async (report: Report, status: 'reviewed' | 'dismissed') => {
        try {
            await updateReportStatus(report.id, status);
            await load();
        } catch { showAlert('Error', 'Failed to update report'); }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;

    if (reports.length === 0) {
        return (
            <View style={styles.center}>
                <Ionicons name="shield-checkmark-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No pending reports</Text>
                <Text style={styles.emptySubtext}>Community is clean</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={reports}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
                <View style={[styles.postCard, styles.reportCard]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Ionicons name="flag" size={14} color="#fdcb6e" />
                        <Text style={styles.reportType}>{item.content_type.replace('_', ' ').toUpperCase()}</Text>
                        <Text style={styles.postDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                    {item.reason ? <Text style={styles.postContent} numberOfLines={2}>{item.reason}</Text> : null}
                    <Text style={styles.reportId} numberOfLines={1}>Content ID: {item.content_id}</Text>
                    <View style={styles.postActions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleResolve(item, 'reviewed')}>
                            <Ionicons name="checkmark-circle-outline" size={18} color="#00b894" />
                            <Text style={[styles.actionText, { color: '#00b894' }]}>Reviewed</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handleResolve(item, 'dismissed')}>
                            <Ionicons name="close-circle-outline" size={18} color={colors.textSecondary} />
                            <Text style={styles.actionText}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        />
    );
}

// ─── Root screen ──────────────────────────────────────────────────────────────

export default function AdminFeedScreen() {
    const theme = useTheme();
    const { colors } = theme;
    const styles = createStyles(theme);
    const router = useRouter();
    const { profile } = useProfileStore();
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<AdminTab>('coach');
    const isAdmin = profile?.role === 'admin';

    if (!isAdmin) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{
                    headerShown: true, headerTitle: 'Admin',
                    headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text,
                }} />
                <View style={styles.center}>
                    <Ionicons name="lock-closed-outline" size={56} color={colors.textSecondary} />
                    <Text style={styles.lockedTitle}>Not authorized</Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
                        <Text style={styles.primaryButtonText}>Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true, headerTitle: 'Manage Feed',
                headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text,
                headerLeft: () => (
                    <TouchableOpacity onPress={() => goBackOr(router, '/admin')} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                ),
            }} />

            <View style={styles.tabBar}>
                {([
                    { key: 'coach',   label: 'Coach Posts', icon: 'megaphone-outline' },
                    { key: 'members', label: 'Members',     icon: 'people-outline'    },
                    { key: 'reports', label: 'Reports',     icon: 'flag-outline'      },
                ] as { key: AdminTab; label: string; icon: string }[]).map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Ionicons
                            name={tab.icon as any}
                            size={16}
                            color={activeTab === tab.key ? colors.primary : colors.textSecondary}
                        />
                        <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {activeTab === 'coach'   && <CoachPostsTab userId={user?.id ?? ''} />}
            {activeTab === 'members' && <MemberPostsTab />}
            {activeTab === 'reports' && <ReportsTab />}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = ({ colors, spacing, radius }: ReturnType<typeof useTheme>) =>
    StyleSheet.create({
        container:   { flex: 1, backgroundColor: colors.background },
        center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
        lockedTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 6 },
        tabBar: {
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        tabItem: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 12,
            borderBottomWidth: 2,
            borderBottomColor: 'transparent',
        },
        tabItemActive:  { borderBottomColor: colors.primary },
        tabLabel:       { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
        tabLabelActive: { color: colors.primary },
        tabHeaderRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: spacing.lg,
            paddingBottom: spacing.md,
        },
        tabHeader:  { color: colors.text, fontSize: 18, fontWeight: '900' },
        addButton: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.primary,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: radius.md,
            gap: 6,
        },
        addButtonText:  { color: '#FFF', fontWeight: '700', fontSize: 14 },
        list:           { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
        postCard: {
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.lg,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: spacing.md,
        },
        reportCard:     { borderColor: 'rgba(253,203,110,0.15)' },
        postHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 8,
        },
        postMeta:        { flex: 1, marginRight: 12 },
        statusDot:       { width: 7, height: 7, borderRadius: 4 },
        postTitle:       { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
        memberPostTitle: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 4 },
        postDate:        { color: colors.textSecondary, fontSize: 12 },
        postContent:     { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 12 },
        reportType:      { color: '#fdcb6e', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
        reportId:        { color: colors.textSecondary, fontSize: 10, marginBottom: 10, fontFamily: 'monospace' },
        postActions: {
            flexDirection: 'row',
            gap: 16,
            flexWrap: 'wrap',
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: 12,
        },
        actionBtn:           { flexDirection: 'row', alignItems: 'center', gap: 6 },
        actionText:          { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
        emptyText:           { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 8 },
        emptySubtext:        { color: colors.textSecondary, fontSize: 14 },
        formContainer:       { padding: spacing.lg },
        formTitle:           { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: spacing.lg },
        label: {
            color: colors.textSecondary,
            fontSize: 12, fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: 1,
            marginBottom: 8, marginTop: 12,
        },
        input: {
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            padding: spacing.md,
            color: colors.text,
            fontSize: 16,
            borderWidth: 1,
            borderColor: colors.border,
        },
        textArea:       { minHeight: 150, paddingTop: spacing.md },
        formButtons:    { flexDirection: 'row', gap: 12, marginTop: spacing.xl },
        primaryButton: {
            flex: 1,
            backgroundColor: colors.primary,
            paddingVertical: 14,
            borderRadius: radius.md,
            alignItems: 'center',
        },
        primaryButtonText:   { color: '#FFF', fontWeight: '800', fontSize: 16 },
        secondaryButton: {
            flex: 1,
            backgroundColor: colors.surface,
            paddingVertical: 14,
            borderRadius: radius.md,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
        },
        secondaryButtonText: { color: colors.text, fontWeight: '700', fontSize: 16 },
        disabledButton:      { opacity: 0.6 },
    });
