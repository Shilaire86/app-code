import { View, Text, StyleSheet, TouchableOpacity, Pressable, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore } from '@/stores/profileStore';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    const router = useRouter();
    const { profile } = useProfileStore();

    const role = profile?.role;
    const isAdmin = role === 'admin';

    const [stats, setStats] = useState({
        totalUsers: 0,
        activeSubs: 0,
        workoutsThisWeek: 0,
        openTickets: 0,
    });
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        if (!isAdmin) return;
        
        async function fetchStats() {
            try {
                // 1. Total Users
                const { count: usersCount } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true });

                // 2. Active Subscribers (VIP/Elite)
                const { count: activeSubs } = await supabase
                    .from('subscriptions')
                    .select('*', { count: 'exact', head: true })
                    .in('tier', ['vip', 'elite']); // Standard is also paid, we can include it.
                    // Wait, standard is also a sub. Let's just count all that aren't 'free'.
                    
                const { count: paidCount } = await supabase
                    .from('subscriptions')
                    .select('*', { count: 'exact', head: true })
                    .neq('tier', 'free');

                // 3. Workouts this week
                const startOfWeek = new Date();
                startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
                startOfWeek.setHours(0, 0, 0, 0);

                const { count: workouts } = await supabase
                    .from('workout_logs')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', startOfWeek.toISOString());

                // 4. Open tickets
                const { count: tickets } = await supabase
                    .from('support_tickets')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['open', 'in_progress']);

                setStats({
                    totalUsers: usersCount || 0,
                    activeSubs: paidCount || 0,
                    workoutsThisWeek: workouts || 0,
                    openTickets: tickets || 0,
                });
            } catch (err) {
                console.error('Error fetching admin stats:', err);
            } finally {
                setLoadingStats(false);
            }
        }

        fetchStats();
    }, [isAdmin]);

    const goBack = () => {
        try {
            router.back();
            setTimeout(() => router.replace('/(tabs)'), 0);
        } catch (error) {
            console.warn('[Admin] router.back failed, falling back to tabs root:', error);
            router.replace('/(tabs)');
        }
    };

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
                    <Text style={styles.title}>Not authorized</Text>
                    <Text style={styles.subtitle}>You do not have access to Admin tools.</Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={goBack}>
                        <Text style={styles.primaryButtonText}>Go back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Admin Dashboard',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            {/* STATS ROW */}
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Users</Text>
                    {loadingStats ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={styles.statValue}>{stats.totalUsers}</Text>}
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Active Subs</Text>
                    {loadingStats ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={styles.statValue}>{stats.activeSubs}</Text>}
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Workouts / Wk</Text>
                    {loadingStats ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={styles.statValue}>{stats.workoutsThisWeek}</Text>}
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Open Tix</Text>
                    {loadingStats ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={[styles.statValue, stats.openTickets > 0 && { color: '#FFD700' }]}>{stats.openTickets}</Text>}
                </View>
            </View>

            <Text style={styles.sectionTitle}>Overview & Management</Text>
            
            <View style={styles.navGrid}>
                <Pressable style={({ pressed }) => [styles.navCard, pressed && styles.pressed]} onPress={() => router.push('/admin/users')}>
                    <View style={styles.navIconWrap}><Ionicons name="people" size={24} color={theme.colors.primary} /></View>
                    <Text style={styles.navTitle}>Users</Text>
                    <Text style={styles.navDesc}>Manage users, block accounts</Text>
                </Pressable>

                <Pressable style={({ pressed }) => [styles.navCard, pressed && styles.pressed]} onPress={() => router.push('/admin/activity')}>
                    <View style={styles.navIconWrap}><Ionicons name="pulse" size={24} color={theme.colors.primary} /></View>
                    <Text style={styles.navTitle}>Activity</Text>
                    <Text style={styles.navDesc}>Community event timeline</Text>
                </Pressable>

                <Pressable style={({ pressed }) => [styles.navCard, pressed && styles.pressed]} onPress={() => router.push('/admin/tickets')}>
                    <View style={styles.navIconWrap}><Ionicons name="bug" size={24} color={theme.colors.primary} /></View>
                    <Text style={styles.navTitle}>Tickets</Text>
                    <Text style={styles.navDesc}>Support issues & bugs</Text>
                </Pressable>

                <Pressable style={({ pressed }) => [styles.navCard, pressed && styles.pressed]} onPress={() => router.push('/admin/programs')}>
                    <View style={styles.navIconWrap}><Ionicons name="barbell" size={24} color={theme.colors.primary} /></View>
                    <Text style={styles.navTitle}>Programs</Text>
                    <Text style={styles.navDesc}>Manage workout content</Text>
                </Pressable>

                <Pressable style={({ pressed }) => [styles.navCard, pressed && styles.pressed]} onPress={() => router.push('/admin/feed')}>
                    <View style={styles.navIconWrap}><Ionicons name="newspaper" size={24} color={theme.colors.primary} /></View>
                    <Text style={styles.navTitle}>Feed</Text>
                    <Text style={styles.navDesc}>Coach posts & community</Text>
                </Pressable>

                <Pressable style={({ pressed }) => [styles.navCard, pressed && styles.pressed]} onPress={() => router.push('/admin/inbox')}>
                    <View style={styles.navIconWrap}><Ionicons name="mail" size={24} color={theme.colors.primary} /></View>
                    <Text style={styles.navTitle}>Inbox</Text>
                    <Text style={styles.navDesc}>Direct coach messages</Text>
                </Pressable>
                
                <Pressable style={({ pressed }) => [styles.navCard, pressed && styles.pressed]} onPress={() => router.push('/admin/offers')}>
                    <View style={styles.navIconWrap}><Ionicons name="pricetags" size={24} color={theme.colors.primary} /></View>
                    <Text style={styles.navTitle}>Offers</Text>
                    <Text style={styles.navDesc}>Affiliate & promo codes</Text>
                </Pressable>

                <Pressable style={({ pressed }) => [styles.navCard, pressed && styles.pressed]} onPress={() => router.push('/admin/elite-clients')}>
                    <View style={styles.navIconWrap}><Ionicons name="star" size={24} color={theme.colors.primary} /></View>
                    <Text style={styles.navTitle}>Elite Clients</Text>
                    <Text style={styles.navDesc}>Bespoke programs & progress</Text>
                </Pressable>
            </View>

        </ScrollView>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: theme.spacing.lg,
        paddingBottom: 40,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 400,
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
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
    },
    statLabel: {
        color: theme.colors.textSecondary,
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    statValue: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '900',
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 12,
        marginTop: 8,
    },
    navGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    navCard: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: theme.radius.lg,
        padding: 16,
        ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null),
    },
    pressed: {
        opacity: 0.8,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    navIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0,187,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    navTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
        flex: 1,
        marginBottom: 2,
    },
    navDesc: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
});
