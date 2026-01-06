import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function PRDashboardScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [prs, setPrs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchPRs();
        }
    }, [user]);

    async function fetchPRs() {
        try {
            // Fetch the highest weight for each exercise
            // In a real app, this might be a more complex query or a dedicated table
            const { data, error } = await supabase
                .from('prs')
                .select('*')
                .eq('user_id', user?.id)
                .order('achieved_at', { ascending: false });

            if (error) throw error;
            setPrs(data || []);
        } catch (error) {
            console.error('Error fetching PRs:', error);
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
                headerTitle: 'Personal Records',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <FlatList
                data={prs}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListHeaderComponent={
                    <View style={styles.hero}>
                        <Ionicons name="trophy" size={60} color={theme.colors.primary} />
                        <Text style={styles.heroTitle}>Your Evolution</Text>
                        <Text style={styles.heroSubtitle}>Every pound gained is a piece of your old self shed.</Text>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No records hit yet. Keep pushing.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={styles.prCard}>
                        <View style={styles.prInfo}>
                            <Text style={styles.exerciseName}>{item.exercise_name}</Text>
                            <Text style={styles.achievedAt}>Hit on {new Date(item.achieved_at).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.prValueBox}>
                            <Text style={styles.prWeight}>{item.weight_lbs}</Text>
                            <Text style={styles.prUnit}>LBS</Text>
                            {item.reps > 1 && <Text style={styles.prReps}>x{item.reps}</Text>}
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
    hero: {
        alignItems: 'center',
        marginBottom: theme.spacing.xxl,
        paddingVertical: theme.spacing.xl,
    },
    heroTitle: {
        color: theme.colors.text,
        fontSize: 24,
        fontWeight: '800',
        marginTop: theme.spacing.md,
    },
    heroSubtitle: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: theme.spacing.xl,
    },
    prCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    prInfo: {
        flex: 1,
    },
    exerciseName: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    achievedAt: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    prValueBox: {
        alignItems: 'flex-end',
    },
    prWeight: {
        color: theme.colors.primary,
        fontSize: 24,
        fontWeight: '900',
    },
    prUnit: {
        color: theme.colors.primary,
        fontSize: 10,
        fontWeight: '700',
        marginTop: -4,
    },
    prReps: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        color: theme.colors.textSecondary,
    },
});
