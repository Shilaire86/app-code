import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { goBackOr } from '@/lib/navigation';

const { width } = Dimensions.get('window');
const PHOTO_WIDTH = (width - 48) / 2;

interface Photo {
    id: string;
    photo_url: string;
    created_at: string;
    publicUrl?: string;
}

export default function CompareScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    const { user } = useAuthStore();
    const router = useRouter();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBefore, setSelectedBefore] = useState<Photo | null>(null);
    const [selectedAfter, setSelectedAfter] = useState<Photo | null>(null);
    const [selectingFor, setSelectingFor] = useState<'before' | 'after' | null>(null);

    useFocusEffect(
        useCallback(() => {
            if (user) fetchPhotos();
        }, [user])
    );

    async function fetchPhotos() {
        try {
            const { data, error } = await supabase
                .from('progress_photos')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Generate signed URLs
            const photosWithUrls = await Promise.all((data || []).map(async (photo) => {
                const { data: urlData } = await supabase.storage
                    .from('progress_photos')
                    .createSignedUrl(photo.photo_url, 3600);
                return { ...photo, publicUrl: urlData?.signedUrl };
            }));

            setPhotos(photosWithUrls);

            // Auto-select first and last photos if available
            if (photosWithUrls.length >= 2) {
                setSelectedBefore(photosWithUrls[0]);
                setSelectedAfter(photosWithUrls[photosWithUrls.length - 1]);
            }
        } catch (error) {
            console.error('[compare] Error fetching photos:', error);
        } finally {
            setLoading(false);
        }
    }

    const handlePhotoSelect = (photo: Photo) => {
        if (selectingFor === 'before') {
            setSelectedBefore(photo);
        } else if (selectingFor === 'after') {
            setSelectedAfter(photo);
        }
        setSelectingFor(null);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const daysBetween = () => {
        if (!selectedBefore || !selectedAfter) return 0;
        const diff = new Date(selectedAfter.created_at).getTime() - new Date(selectedBefore.created_at).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
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
                headerTitle: 'Compare Progress',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => goBackOr(router, '/(tabs)')} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                ),
            }} />

            {photos.length < 2 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="images-outline" size={60} color="rgba(255,255,255,0.1)" />
                    <Text style={styles.emptyText}>Need at least 2 photos to compare</Text>
                    <TouchableOpacity
                        style={styles.ctaButton}
                        onPress={() => router.push('/progress/camera')}
                    >
                        <Ionicons name="camera" size={20} color="#FFF" />
                        <Text style={styles.ctaText}>Take Photo</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView style={styles.content}>
                    {/* Comparison View */}
                    <View style={styles.comparisonContainer}>
                        {/* Before Photo */}
                        <TouchableOpacity
                            style={[styles.photoSlot, selectingFor === 'before' && styles.photoSlotActive]}
                            onPress={() => setSelectingFor('before')}
                        >
                            {selectedBefore?.publicUrl ? (
                                <Image source={{ uri: selectedBefore.publicUrl }} style={styles.comparePhoto} />
                            ) : (
                                <View style={styles.placeholderPhoto}>
                                    <Ionicons name="add" size={40} color={theme.colors.textSecondary} />
                                </View>
                            )}
                            <View style={styles.photoLabel}>
                                <Text style={styles.labelText}>BEFORE</Text>
                                {selectedBefore && (
                                    <Text style={styles.dateText}>{formatDate(selectedBefore.created_at)}</Text>
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* After Photo */}
                        <TouchableOpacity
                            style={[styles.photoSlot, selectingFor === 'after' && styles.photoSlotActive]}
                            onPress={() => setSelectingFor('after')}
                        >
                            {selectedAfter?.publicUrl ? (
                                <Image source={{ uri: selectedAfter.publicUrl }} style={styles.comparePhoto} />
                            ) : (
                                <View style={styles.placeholderPhoto}>
                                    <Ionicons name="add" size={40} color={theme.colors.textSecondary} />
                                </View>
                            )}
                            <View style={[styles.photoLabel, { backgroundColor: theme.colors.primary }]}>
                                <Text style={styles.labelText}>AFTER</Text>
                                {selectedAfter && (
                                    <Text style={styles.dateText}>{formatDate(selectedAfter.created_at)}</Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Progress Summary */}
                    {selectedBefore && selectedAfter && (
                        <View style={styles.summaryCard}>
                            <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
                            <View>
                                <Text style={styles.summaryLabel}>Your Journey</Text>
                                <Text style={styles.summaryValue}>{daysBetween()} days of progress</Text>
                            </View>
                        </View>
                    )}

                    {/* Photo Selection */}
                    {selectingFor && (
                        <View style={styles.selectionContainer}>
                            <View style={styles.selectionHeader}>
                                <Text style={styles.selectionTitle}>
                                    Select {selectingFor === 'before' ? 'Before' : 'After'} Photo
                                </Text>
                                <TouchableOpacity onPress={() => setSelectingFor(null)}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.photoGrid}>
                                    {photos.map((photo) => (
                                        <TouchableOpacity
                                            key={photo.id}
                                            style={[
                                                styles.gridPhoto,
                                                (photo.id === selectedBefore?.id || photo.id === selectedAfter?.id) &&
                                                styles.gridPhotoSelected
                                            ]}
                                            onPress={() => handlePhotoSelect(photo)}
                                        >
                                            <Image source={{ uri: photo.publicUrl }} style={styles.gridPhotoImage} />
                                            <Text style={styles.gridPhotoDate}>
                                                {new Date(photo.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    )}

                    {/* Tip */}
                    <View style={styles.tipBox}>
                        <Ionicons name="bulb-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.tipText}>
                            Tap on either photo to select a different one for comparison
                        </Text>
                    </View>
                </ScrollView>
            )}
        </View>
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
    content: {
        flex: 1,
    },
    comparisonContainer: {
        flexDirection: 'row',
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    photoSlot: {
        flex: 1,
        aspectRatio: 4 / 5,
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    photoSlotActive: {
        borderColor: theme.colors.primary,
    },
    comparePhoto: {
        width: '100%',
        height: '100%',
    },
    placeholderPhoto: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoLabel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: theme.spacing.sm,
        alignItems: 'center',
    },
    labelText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    dateText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
    },
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        margin: theme.spacing.md,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.lg,
        gap: theme.spacing.md,
    },
    summaryLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    summaryValue: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    selectionContainer: {
        margin: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
    },
    selectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    selectionTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelText: {
        color: theme.colors.primary,
        fontSize: 14,
    },
    photoGrid: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    gridPhoto: {
        width: 80,
        borderRadius: theme.radius.md,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    gridPhotoSelected: {
        borderColor: theme.colors.primary,
    },
    gridPhotoImage: {
        width: 80,
        height: 100,
    },
    gridPhotoDate: {
        color: '#FFF',
        fontSize: 10,
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 2,
    },
    tipBox: {
        flexDirection: 'row',
        margin: theme.spacing.md,
        padding: theme.spacing.md,
        backgroundColor: 'rgba(255,102,0,0.05)',
        borderRadius: theme.radius.md,
        gap: 12,
    },
    tipText: {
        flex: 1,
        color: theme.colors.textSecondary,
        fontSize: 12,
        lineHeight: 18,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontSize: 16,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    ctaButton: {
        flexDirection: 'row',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        gap: 8,
    },
    ctaText: {
        color: '#FFF',
        fontWeight: '700',
    },
});
