import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { Ionicons } from '@expo/vector-icons';

export default function ProgressPhotoScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [image, setImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 5],
            quality: 0.7,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const uploadImage = async () => {
        if (!image || !user) return;

        setUploading(true);
        try {
            const fileExt = image.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const filePath = fileName;

            // Convert URI to Blob
            const response = await fetch(image);
            const blob = await response.blob();

            const { error: uploadError } = await supabase.storage
                .from('progress_photos')
                .upload(filePath, blob);

            if (uploadError) throw uploadError;

            // Log the photo entry in the progress_entries table (assuming it handles photos)
            // Or a dedicated progress_photos table if specified in schema
            const { error: dbError } = await supabase
                .from('progress_photos')
                .insert({
                    user_id: user.id,
                    image_url: filePath,
                });

            if (dbError) throw dbError;

            // Refresh profile to update points
            if (user) {
                useProfileStore.getState().fetchProfile(user.id);
            }

            Alert.alert("Transformed", "Progress photo uploaded. +10 Becoming Points earned.");
            router.back();
        } catch (error) {
            console.error('Error uploading image:', error);
            Alert.alert('Error', 'Failed to upload photo');
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Growth Track',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <View style={styles.content}>
                <View style={styles.previewContainer}>
                    {image ? (
                        <Image source={{ uri: image }} style={styles.preview} />
                    ) : (
                        <View style={styles.placeholder}>
                            <Ionicons name="camera-outline" size={60} color="rgba(255,255,255,0.1)" />
                            <Text style={styles.placeholderText}>Capture your evolution</Text>
                        </View>
                    )}
                </View>

                {!image ? (
                    <TouchableOpacity style={styles.mainButton} onPress={pickImage}>
                        <Ionicons name="camera" size={24} color="#FFF" />
                        <Text style={styles.buttonText}>Take Photo</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.button, styles.secondaryButton]}
                            onPress={() => setImage(null)}
                            disabled={uploading}
                        >
                            <Text style={styles.secondaryButtonText}>Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.primaryButton]}
                            onPress={uploadImage}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.buttonText}>Upload Photo</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.tipBox}>
                    <Ionicons name="bulb-outline" size={20} color={theme.colors.primary} />
                    <Text style={styles.tipText}>
                        Tip: Take your photos in the same lighting and position each time for the best comparison.
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
        padding: theme.spacing.xl,
        justifyContent: 'center',
    },
    previewContainer: {
        width: '100%',
        aspectRatio: 4 / 5,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: theme.spacing.xxl,
        justifyContent: 'center',
        alignItems: 'center',
    },
    preview: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        alignItems: 'center',
    },
    placeholderText: {
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.md,
        fontSize: 16,
    },
    mainButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        padding: theme.spacing.lg,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    actionRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    button: {
        flex: 1,
        padding: theme.spacing.lg,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
    },
    secondaryButton: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryButtonText: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    tipBox: {
        marginTop: theme.spacing.xxl,
        flexDirection: 'row',
        backgroundColor: 'rgba(255,102,0,0.05)',
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        gap: 12,
    },
    tipText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        flex: 1,
        lineHeight: 18,
    },
});
