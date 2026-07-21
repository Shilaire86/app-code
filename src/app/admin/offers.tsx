import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore } from '@/stores/profileStore';

export default function AdminOffersScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    const router = useRouter();
    const { profile } = useProfileStore();

    const isAdmin = profile?.role === 'admin';

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
                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
                        <Text style={styles.primaryButtonText}>Back</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.content}>
                    <Text style={styles.header}>Offers Admin</Text>
                    <Text style={styles.body}>
                        Offer management is available through backend tooling in this build.
                        Wire up a live editor only if you want a dedicated admin UI for it.
                    </Text>
                </View>
            )}
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
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
    primaryButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: theme.radius.md,
        marginTop: 6,
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
    header: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
    },
    body: {
        color: theme.colors.textSecondary,
        lineHeight: 18,
    },
});
