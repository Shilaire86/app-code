import { View, Text, StyleSheet, TouchableOpacity, Pressable, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useProfileStore } from '@/stores/profileStore';

export default function AdminScreen() {
    const router = useRouter();
    const { profile } = useProfileStore();

    const role = profile?.role;
    const isAdmin = role === 'admin';

    const goBack = () => {
        // In some navigation stacks, back can be a no-op; fall back to tabs.
        try {
            router.back();
            setTimeout(() => router.replace('/(tabs)'), 0);
        } catch {
            router.replace('/(tabs)');
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Admin',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            {!isAdmin ? (
                <View style={styles.center}>
                    <Ionicons name="lock-closed-outline" size={56} color="rgba(255,255,255,0.12)" />
                    <Text style={styles.title}>Not authorized</Text>
                    <Text style={styles.subtitle}>You do not have access to Admin tools.</Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={goBack}>
                        <Text style={styles.primaryButtonText}>Go back</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>Admin Dashboard</Text>

                    <Pressable
                        style={({ pressed }) => [styles.cardButton, pressed && styles.cardButtonPressed]}
                        onPress={() => router.push('/admin/programs')}
                        accessibilityRole="button"
                        hitSlop={10}
                    >
                        <Ionicons name="barbell-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.cardButtonText}>Manage Programs</Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [styles.cardButton, pressed && styles.cardButtonPressed]}
                        onPress={() => router.push('/admin/feed')}
                        accessibilityRole="button"
                        hitSlop={10}
                    >
                        <Ionicons name="newspaper-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.cardButtonText}>Manage Feed</Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [styles.cardButton, pressed && styles.cardButtonPressed]}
                        onPress={() => router.push('/admin/offers')}
                        accessibilityRole="button"
                        hitSlop={10}
                    >
                        <Ionicons name="pricetags-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.cardButtonText}>Manage Offers</Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [styles.cardButton, pressed && styles.cardButtonPressed]}
                        onPress={() => router.push('/admin/inbox')}
                        accessibilityRole="button"
                        hitSlop={10}
                    >
                        <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
                        <Text style={styles.cardButtonText}>Inbox</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.lg,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    title: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        marginTop: 6,
    },
    subtitle: {
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: 10,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: theme.radius.md,
    },
    primaryButtonText: {
        color: '#FFF',
        fontWeight: '800',
    },
    content: {
        flex: 1,
        paddingTop: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
        marginBottom: theme.spacing.sm,
    },
    cardButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        minHeight: 44,
        ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null),
    },
    cardButtonPressed: {
        opacity: 0.85,
    },
    cardButtonText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '800',
    },
});
