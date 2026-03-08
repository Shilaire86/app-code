import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, Platform } from 'react-native';
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
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
    const [uploading, setUploading] = useState(false);
    const [photoType, setPhotoType] = useState<'front' | 'side' | 'back'>('front');

    const PHOTO_TYPES = [
        { id: 'front', label: 'Front', icon: 'person' },
        { id: 'side', label: 'Side', icon: 'body' },
        { id: 'back', label: 'Back', icon: 'person-outline' },
    ] as const;

    function base64ToUint8Array(b64: string) {
        // Expo/RN provides `atob` in most environments; if it isn't available,
        // the upload will fail loudly and we can switch to a FileSystem-based approach.
        const binary = globalThis.atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }

    function extFromMime(mime: string) {
        if (mime === 'image/png') return 'png';
        if (mime === 'image/webp') return 'webp';
        if (mime === 'image/heic' || mime === 'image/heif') return 'heic';
        return 'jpg';
    }

    const pickImage = async () => {
        try {
            // Explicitly request permissions first
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'We need camera access to capture your progress.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 5],
                quality: 0.7,
                base64: true,
            });

            if (!result.canceled) {
                const asset = result.assets[0];
                setImage(asset.uri);
                setImageBase64(asset.base64 ?? null);
                setImageMimeType(asset.mimeType || 'image/jpeg');
            }
        } catch (error: any) {
            console.error('Camera error:', error);
            if (Platform.OS === 'web') {
                Alert.alert('Camera Error', 'The camera is restricted in this browser or no camera was found. Try "Choose from Library" instead. Details: ' + (error?.message || 'Unknown error'));
            } else {
                Alert.alert('Error', 'Could not open camera. Please check your app settings. Details: ' + (error?.message || 'Unknown error'));
            }
        }
    };

    const pickFromLibrary = async () => {
        try {
            // Explicitly request permissions first
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'We need gallery access to upload your progress.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 5],
                quality: 0.7,
                base64: true,
            });

            if (!result.canceled) {
                const asset = result.assets[0];
                setImage(asset.uri);
                setImageBase64(asset.base64 ?? null);
                setImageMimeType(asset.mimeType || 'image/jpeg');
            }
        } catch (error) {
            console.error('Library error:', error);
            Alert.alert('Error', 'Could not access image library.');
        }
    };

    const uploadImage = async () => {
        if (!image || !user) return;

        setUploading(true);
        try {
            console.log('[camera] Starting upload for user:', user.id);
            const fileExt = extFromMime(imageMimeType);
            const filePath = `${user.id}/${Date.now()}.${fileExt}`;

            console.log('[camera] File path:', filePath);

            // Prefer base64 from ImagePicker to avoid 0-byte uploads in some RN/Expo environments.
            // (We were seeing 0.0KB objects in Storage even though the DB row existed.)
            let body: Uint8Array | Blob;
            let contentType = imageMimeType || 'image/jpeg';
            if (imageBase64) {
                console.log('[camera] Using base64 payload:', imageBase64.length, 'chars');
                body = base64ToUint8Array(imageBase64);
            } else {
                console.log('[camera] No base64 available; falling back to fetch(blob)');
                const res = await fetch(image);
                if (!res.ok) throw new Error(`Failed to read image URI (${res.status})`);
                const blob = await res.blob();
                if (!blob || (typeof (blob as any).size === 'number' && (blob as any).size === 0)) {
                    throw new Error('Captured image is empty (0 bytes).');
                }
                contentType = (blob as any).type || contentType;
                body = blob;
            }

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('progress_photos')
                .upload(filePath, body as any, {
                    contentType,
                    upsert: true
                });

            if (uploadError) {
                console.error('[camera] Storage upload error:', uploadError);
                throw uploadError;
            }

            console.log('[camera] Upload successful:', uploadData);

            // Prefer the returned path from Supabase as the source of truth.
            // This prevents "Object not found" issues caused by mismatched paths.
            const storedPath = uploadData?.path || filePath;
            console.log('[camera] Saving to database with path:', storedPath);

            // Save to database with file path
            const { error: dbError } = await supabase
                .from('progress_photos')
                .insert({
                    user_id: user.id,
                    photo_url: storedPath, // Store path, not full URL
                    photo_type: photoType,
                    taken_at: new Date().toISOString().split('T')[0],
                });

            if (dbError) {
                console.error('[camera] Database insert error:', dbError);
                throw dbError;
            }

            console.log('[camera] Database insert successful');

            // Clear local image state so the next upload can't accidentally reuse base64.
            setImage(null);
            setImageBase64(null);

            // Refresh profile to update points
            if (user) {
                useProfileStore.getState().fetchProfile(user.id);
            }

            Alert.alert("Transformed", "Progress photo uploaded. Your growth is documented.");
            router.back();
        } catch (error: any) {
            console.error('[camera] Full error:', error);
            const errorMessage = error?.message || 'Unknown error';
            Alert.alert('Upload Failed', `Could not upload photo: ${errorMessage}\n\nCheck console for details.`);
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

                {/* Photo Type Selector */}
                <View style={styles.typeSelector}>
                    <Text style={styles.typeSelectorLabel}>Photo Type</Text>
                    <View style={styles.typeButtons}>
                        {PHOTO_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type.id}
                                style={[styles.typeButton, photoType === type.id && styles.typeButtonActive]}
                                onPress={() => setPhotoType(type.id)}
                            >
                                <Ionicons
                                    name={type.icon as any}
                                    size={20}
                                    color={photoType === type.id ? '#FFF' : theme.colors.textSecondary}
                                />
                                <Text style={[styles.typeButtonText, photoType === type.id && styles.typeButtonTextActive]}>
                                    {type.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {!image ? (
                    <View style={styles.buttonStack}>
                        <TouchableOpacity style={styles.mainButton} onPress={pickImage}>
                            <Ionicons name="camera" size={24} color="#FFF" />
                            <Text style={styles.buttonText}>{Platform.OS === 'web' ? 'Open Camera' : 'Take Photo'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.mainButton, styles.libraryButton]}
                            onPress={pickFromLibrary}
                        >
                            <Ionicons name="images" size={24} color="#FFF" />
                            <Text style={styles.buttonText}>Choose from Library</Text>
                        </TouchableOpacity>
                    </View>
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
    buttonStack: {
        gap: theme.spacing.md,
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
    libraryButton: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
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
    typeSelector: {
        marginBottom: theme.spacing.lg,
    },
    typeSelectorLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    typeButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: theme.spacing.sm,
    },
    typeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    typeButtonActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    typeButtonText: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    typeButtonTextActive: {
        color: '#FFF',
    },
});
