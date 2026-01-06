import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - theme.spacing.lg * 3) / COLUMN_COUNT;

export default function ProgressGalleryScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [photos, setPhotos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchPhotos();
        }
    }, [user]);

    async function fetchPhotos() {
        try {
            const { data, error } = await supabase
                .from('progress_photos')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Generate signed URLs for private photos (optional depending on privacy setting)
            // For MVP, we'll assume they are in the 'progress_photos' bucket and we need public URLs or transform them
            const photosWithUrls = await Promise.all((data || []).map(async (photo) => {
                const { data: urlData } = await supabase.storage
                    .from('progress_photos')
                    .getPublicUrl(photo.image_url); // Simplified for MVP; in production use createSignedUrl

                return { ...photo, publicUrl: urlData.publicUrl };
            }));

            setPhotos(photosWithUrls);
        } catch (error) {
            console.error('Error fetching photos:', error);
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

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerTitle: 'Evolution Gallery',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
                headerRight: () => (
                    <TouchableOpacity onPress={() => router.push('/progress/camera')}>
                        <Ionicons name="add" size={28} color={theme.colors.primary} />
                    </TouchableOpacity>
                )
            }} />

            <FlatList
                data={photos}
                keyExtractor={(item) => item.id}
                numColumns={COLUMN_COUNT}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="images-outline" size={60} color="rgba(255,255,255,0.1)" />
                        <Text style={styles.emptyText}>No photos yet. Capture your first win.</Text>
                        <TouchableOpacity
                            style={styles.ctaButton}
                            onPress={() => router.push('/progress/camera')}
                        >
                            <Text style={styles.ctaText}>Take Photo</Text>
                        </TouchableOpacity>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={styles.photoCard}>
                        <Image source={{ uri: item.publicUrl }} style={styles.photo} />
                        <View style={styles.photoOverlay}>
                            <Text style={styles.photoDate}>
                                {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </Text>
                        </View>
                    </View>
                )}
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
    list: {
        padding: theme.spacing.lg,
    },
    photoCard: {
        width: ITEM_WIDTH,
        aspectRatio: 1,
        margin: theme.spacing.xs,
        borderRadius: theme.radius.md,
        overflow: 'hidden',
        backgroundColor: theme.colors.surface,
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
        textAlign: 'center',
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
    ctaButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.radius.md,
    },
    ctaText: {
        color: '#FFF',
        fontWeight: '700',
    },
});
