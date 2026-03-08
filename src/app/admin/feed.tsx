import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert, ActivityIndicator, Switch, ScrollView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import { fetchAllPosts, createPost, updatePost, deletePost } from '@/services/feed';

type Post = {
    id: string;
    title: string;
    content: string;
    is_published: boolean;
    published_at: string | null;
    created_at: string;
};

export default function AdminFeedScreen() {
    const router = useRouter();
    const { profile } = useProfileStore();
    const { user } = useAuthStore();

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);

    const isAdmin = profile?.role === 'admin';

    const loadPosts = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchAllPosts();
            setPosts(data);
        } catch (error) {
            console.error('Error loading posts:', error);
            Alert.alert('Error', 'Failed to load posts');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) loadPosts();
    }, [isAdmin, loadPosts]);

    const handleCreate = async () => {
        if (!title.trim() || !content.trim()) {
            Alert.alert('Error', 'Please fill in both title and content');
            return;
        }
        if (!user?.id) return;

        try {
            setSaving(true);
            await createPost(title.trim(), content.trim(), user.id);
            setTitle('');
            setContent('');
            setShowForm(false);
            await loadPosts();
            Alert.alert('Success', 'Post created!');
        } catch (error) {
            console.error('Error creating post:', error);
            Alert.alert('Error', 'Failed to create post');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingPost) return;
        if (!title.trim() || !content.trim()) {
            Alert.alert('Error', 'Please fill in both title and content');
            return;
        }

        try {
            setSaving(true);
            await updatePost(editingPost.id, { title: title.trim(), content: content.trim() });
            setTitle('');
            setContent('');
            setEditingPost(null);
            setShowForm(false);
            await loadPosts();
            Alert.alert('Success', 'Post updated!');
        } catch (error) {
            console.error('Error updating post:', error);
            Alert.alert('Error', 'Failed to update post');
        } finally {
            setSaving(false);
        }
    };

    const handleTogglePublish = async (post: Post) => {
        try {
            await updatePost(post.id, { is_published: !post.is_published });
            await loadPosts();
        } catch (error) {
            console.error('Error toggling publish:', error);
            Alert.alert('Error', 'Failed to update post');
        }
    };

    const handleDelete = (post: Post) => {
        const doDelete = async () => {
            try {
                await deletePost(post.id);
                await loadPosts();
            } catch (error) {
                console.error('Error deleting post:', error);
                Alert.alert('Error', 'Failed to delete post');
            }
        };

        if (Platform.OS === 'web') {
            // eslint-disable-next-line no-alert
            if (globalThis.confirm?.(`Delete "${post.title}"?`)) doDelete();
        } else {
            Alert.alert('Delete Post', `Are you sure you want to delete "${post.title}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: doDelete },
            ]);
        }
    };

    const openEdit = (post: Post) => {
        setEditingPost(post);
        setTitle(post.title);
        setContent(post.content);
        setShowForm(true);
    };

    const cancelForm = () => {
        setShowForm(false);
        setEditingPost(null);
        setTitle('');
        setContent('');
    };

    const renderPost = ({ item }: { item: Post }) => (
        <View style={styles.postCard}>
            <View style={styles.postHeader}>
                <View style={styles.postMeta}>
                    <Text style={styles.postTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.postDate}>
                        {new Date(item.created_at).toLocaleDateString()}
                        {item.is_published ? ' • Published' : ' • Draft'}
                    </Text>
                </View>
                <Switch
                    value={item.is_published}
                    onValueChange={() => handleTogglePublish(item)}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,102,0,0.3)' }}
                    thumbColor={item.is_published ? theme.colors.primary : '#888'}
                />
            </View>
            <Text style={styles.postContent} numberOfLines={2}>{item.content}</Text>
            <View style={styles.postActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
                    <Ionicons name="pencil-outline" size={18} color={theme.colors.textSecondary} />
                    <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                    <Ionicons name="trash-outline" size={18} color="#F44" />
                    <Text style={[styles.actionText, { color: '#F44' }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (!isAdmin) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{
                    headerShown: true,
                    headerTitle: 'Admin',
                    headerStyle: { backgroundColor: theme.colors.background },
                    headerTintColor: '#FFF',
                }} />
                <View style={styles.center}>
                    <Ionicons name="lock-closed-outline" size={56} color="rgba(255,255,255,0.12)" />
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
                headerShown: true,
                headerTitle: 'Manage Feed',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            {showForm ? (
                <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
                    <Text style={styles.formTitle}>{editingPost ? 'Edit Post' : 'New Post'}</Text>

                    <Text style={styles.label}>Title</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Post title..."
                        placeholderTextColor="rgba(255,255,255,0.3)"
                    />

                    <Text style={styles.label}>Content</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={content}
                        onChangeText={setContent}
                        placeholder="Write your post..."
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        multiline
                        textAlignVertical="top"
                    />

                    <View style={styles.formButtons}>
                        <TouchableOpacity style={styles.secondaryButton} onPress={cancelForm}>
                            <Text style={styles.secondaryButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.primaryButton, saving && styles.disabledButton]}
                            onPress={editingPost ? handleUpdate : handleCreate}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <Text style={styles.primaryButtonText}>{editingPost ? 'Update' : 'Create'}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            ) : (
                <>
                    <View style={styles.headerRow}>
                        <Text style={styles.header}>Posts ({posts.length})</Text>
                        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
                            <Ionicons name="add" size={20} color="#FFF" />
                            <Text style={styles.addButtonText}>New Post</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator color={theme.colors.primary} size="large" />
                        </View>
                    ) : posts.length === 0 ? (
                        <View style={styles.center}>
                            <Ionicons name="document-text-outline" size={48} color="rgba(255,255,255,0.12)" />
                            <Text style={styles.emptyText}>No posts yet</Text>
                            <Text style={styles.emptySubtext}>Tap "New Post" to create your first post</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={posts}
                            keyExtractor={(item) => item.id}
                            renderItem={renderPost}
                            contentContainerStyle={styles.list}
                        />
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    lockedTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        marginTop: 6,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    header: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: theme.radius.md,
        gap: 6,
    },
    addButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    list: {
        padding: theme.spacing.lg,
        paddingTop: 0,
        gap: theme.spacing.md,
    },
    postCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: theme.spacing.md,
    },
    postHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    postMeta: {
        flex: 1,
        marginRight: 12,
    },
    postTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    postDate: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    postContent: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    postActions: {
        flexDirection: 'row',
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    emptyText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 8,
    },
    emptySubtext: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
    formContainer: {
        padding: theme.spacing.lg,
    },
    formTitle: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '900',
        marginBottom: theme.spacing.lg,
    },
    label: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        color: '#FFF',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    textArea: {
        minHeight: 150,
        paddingTop: theme.spacing.md,
    },
    formButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: theme.spacing.xl,
    },
    primaryButton: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        paddingVertical: 14,
        borderRadius: theme.radius.md,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 16,
    },
    secondaryButton: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 14,
        borderRadius: theme.radius.md,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
    disabledButton: {
        opacity: 0.6,
    },
});
