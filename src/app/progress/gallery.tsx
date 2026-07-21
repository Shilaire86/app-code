import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { showAlert } from '@/lib/confirm';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import * as Linking from 'expo-linking';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - spacing.lg * 3) / COLUMN_COUNT;

export default function EvolutionGalleryScreen() { // Renamed to force Metro refresh
    const theme = useTheme();
    const styles = createStyles(theme);
    const { user } = useAuthStore();
    const router = useRouter();
    const [photos, setPhotos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (user) {
                console.log('--- EVOLUTION GALLERY v1.2 ---'); // New log
                fetchPhotos();
            }
        }, [user])
    );

    async function verifyStorage() {
        if (!user) return;
        setVerifying(true);
        try {
            console.log('[gallery] Verifying storage access...');
            const { data, error } = await supabase.storage
                .from('progress_photos')
                .list(user.id);

            if (error) {
                const msg = `Storage Error: ${error.message}`;
                if (Platform.OS === 'web') alert(msg);
                else showAlert('Storage Error', error.message);
                console.error('[gallery] List error:', error);
            } else {
                const fileInfos = (data || []).map(f => `${f.name} (${(f.metadata?.size / 1024).toFixed(1)}KB)`).join('\n');
                const firstFile = data && data.length > 0 ? data[0].name : 'none';
                const msg = `Storage Verified! Found ${data?.length || 0} files.\n\n${fileInfos}\n\nNote: This bucket is configured as private, so images must be loaded via signed URLs.`;
                if (Platform.OS === 'web') alert(msg);
                else showAlert('Storage Verified', msg);
                console.log('[gallery] Files found:', data);
            }
        } catch (err: any) {
            const msg = `Diagnostic Error: ${err.message}`;
            if (Platform.OS === 'web') alert(msg);
            else showAlert('Error', msg);
        } finally {
            setVerifying(false);
        }
    }

    async function fetchPhotos() {
        try {
            console.log('--- GALLERY VERSION 1.2.1 ---');
            console.log('[gallery] Fetching photos for user:', user?.id);
            const { data, error } = await supabase
                .from('progress_photos')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[gallery] Fetch error:', error);
                throw error;
            }

            console.log('[gallery] Fetched photos:', data?.length || 0);

            // Storage bucket is configured as private in `database/migrations/007_storage_setup.sql`
            // so we must use signed URLs (a "public" URL will 403 and RN <Image> renders a gray box).
            const photosWithUrls = await Promise.all((data || []).map(async (photo) => {
                let finalPath = photo.photo_url;

                // Smart Prefix: If path is just a filename (no slash), add the user folder
                if (finalPath && !finalPath.includes('/') && !finalPath.startsWith('http')) {
                    finalPath = `${user?.id}/${finalPath}`;
                }

                // If the DB ever stored a full URL, just use it as-is.
                if (!finalPath || finalPath.startsWith('http')) {
                    return { ...photo, publicUrl: finalPath };
                }

                const { data: urlData, error: urlError } = await supabase.storage
                    .from('progress_photos')
                    .createSignedUrl(finalPath, 60 * 60); // 1 hour

                if (urlError) {
                    console.error('[gallery] Signed URL error:', urlError);
                    // Keep the card rendered (gray) but avoid passing undefined to <Image>.
                    return { ...photo, publicUrl: null };
                }

                const publicUrl = urlData?.signedUrl;

                // Logging for deep diagnostic
                console.log(`[gallery] Photo: ${photo.id}`);
                console.log(` - Stored Path: ${photo.photo_url}`);
                console.log(` - Final Path: ${finalPath}`);
                console.log(` - User ID: ${user?.id}`);
                console.log(` - Public URL: ${publicUrl}`);

                return { ...photo, publicUrl };
            }));

            setPhotos(photosWithUrls);
        } catch (error) {
            console.error('[gallery] Error fetching photos:', error);
        } finally {
            setLoading(false);
        }
    }

    async function deletePhoto(photoId: string, photoUrl: string) {
        try {
            console.log('[gallery] Deleting photo:', photoId);

            // Delete from storage if it's a path (not full URL)
            if (!photoUrl.startsWith('http')) {
                const { error: storageError } = await supabase.storage
                    .from('progress_photos')
                    .remove([photoUrl]);

                if (storageError) console.error('[gallery] Storage delete error:', storageError);
            }

            // Delete from database
            const { error: dbError } = await supabase
                .from('progress_photos')
                .delete()
                .eq('id', photoId);

            if (dbError) throw dbError;

            // Refresh list
            fetchPhotos();
        } catch (error) {
            console.error('[gallery] Delete error:', error);
            showAlert('Error', 'Failed to delete photo');
        }
    }

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Evolution Gallery',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
                headerRight: () => (
                    <TouchableOpacity onPress={() => router.push('/progress/camera')}>
                        <Ionicons name="add" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                )
            }} />

            <View style={styles.debugActions}>
                <TouchableOpacity
                    style={styles.debugButton}
                    onPress={verifyStorage}
                    disabled={verifying}
                >
                    <Ionicons name="shield-checkmark" size={16} color="#FFF" />
                    <Text style={styles.debugButtonText}>{verifying ? 'Checking...' : 'Verify Storage'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.debugButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => router.push('/progress/compare')}
                >
                    <Ionicons name="git-compare-outline" size={16} color="#FFF" />
                    <Text style={styles.debugButtonText}>Compare</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={photos}
                keyExtractor={(item) => item.id}
                numColumns={COLUMN_COUNT}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="images-outline" size={60} color="rgba(255,255,255,0.1)" />
                        <Text style={styles.emptyText}>No photos yet. Capture your first win.</Text>
                        <View style={styles.emptyActions}>
                            <TouchableOpacity
                                style={styles.ctaButton}
                                onPress={() => router.push('/progress/camera')}
                            >
                                <Ionicons name="camera" size={20} color="#FFF" />
                                <Text style={styles.ctaText}>Take Photo</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.photoCard}
                        onLongPress={() => {
                            showAlert(
                                'Delete Photo',
                                'Are you sure you want to delete this photo?',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Delete',
                                        style: 'destructive',
                                        onPress: () => deletePhoto(item.id, item.photo_url)
                                    }
                                ]
                            );
                        }}
                    >
                        <Image
                            key={`${item.id}-${item.publicUrl}`} // Force remount if URL changes
                            source={{
                                uri: item.publicUrl,
                                cache: 'reload' // Force bypass client cache
                            }}
                            style={styles.photo}
                            resizeMode="cover"
                            onError={(e) => {
                                console.error('[gallery] Image load failed!');
                                console.error('[gallery] ID:', item.id);
                                console.error('[gallery] URL:', item.publicUrl);
                                console.error('[gallery] Error:', e.nativeEvent.error);
                            }}
                        />
                        <View style={styles.photoOverlay}>
                            <Text style={styles.photoDate}>
                                {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </Text>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => {
                                    showAlert(
                                        'Delete Photo',
                                        'Are you sure?',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Delete',
                                                style: 'destructive',
                                                onPress: () => deletePhoto(item.id, item.photo_url)
                                            }
                                        ]
                                    );
                                }}
                            >
                                <Ionicons name="trash-outline" size={16} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.debugLink, { backgroundColor: '#333' }]}
                                onPress={() => {
                                    if (item.publicUrl) {
                                        console.log('[gallery] Opening URL:', item.publicUrl);
                                        Linking.openURL(item.publicUrl);
                                    }
                                }}
                            >
                                <Ionicons name="link" size={14} color={theme.colors.primary} />
                                <Text style={[styles.debugLinkText, { color: theme.colors.primary, fontWeight: '700' }]}>TEST LINK</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View >
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        padding: theme.spacing.lg,
    },
    photoCard: {
        width: ITEM_WIDTH,
        aspectRatio: 1,
        margin: theme.spacing.xs,
        borderRadius: theme.radius.md,
        overflow: 'hidden',
        backgroundColor: '#1A1A1A', // Distinct color to confirm code update
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    photoDate: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
    deleteButton: {
        backgroundColor: 'rgba(255,0,0,0.8)',
        padding: 4,
        borderRadius: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        marginVertical: theme.spacing.lg,
        textAlign: 'center',
    },
    emptyActions: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    ctaButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ctaText: {
        color: '#FFF',
        fontWeight: '700',
    },
    debugActions: {
        padding: theme.spacing.md,
        backgroundColor: '#111',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    debugButton: {
        backgroundColor: '#444',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    debugButtonText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    debugLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
    },
    debugLinkText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '500',
    },
});
