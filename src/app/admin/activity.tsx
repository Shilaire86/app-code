import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useProfileStore } from '@/stores/profileStore';
import { supabase } from '@/lib/supabase';

type ActivityLog = {
    id: string;
    user_id: string;
    activity_type: string;
    activity_data: any;
    created_at: string;
    profiles: {
        full_name: string | null;
        email: string;
    };
};

const TYPES = ['all', 'workout_complete', 'pr_set', 'milestone', 'stage_up', 'streak'];

export default function AdminActivityScreen() {
    const router = useRouter();
    const { profile } = useProfileStore();
    const isAdmin = profile?.role === 'admin';

    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('all');

    const loadActivities = async () => {
        try {
            setLoading(true);

            let query = supabase
                .from('user_activities')
                .select(`
                    id, user_id, activity_type, activity_data, created_at,
                    profiles:user_id ( full_name, email )
                `)
                .order('created_at', { ascending: false })
                .limit(50);
                
            if (typeFilter !== 'all') {
                query = query.eq('activity_type', typeFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setActivities(data as any || []);
        } catch (error) {
            console.error('Error loading activity:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) loadActivities();
    }, [isAdmin, typeFilter]);

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'workout_complete': return <Ionicons name="barbell" size={20} color={theme.colors.primary} />;
            case 'pr_set': return <Ionicons name="trophy" size={20} color="#FFD700" />;
            case 'milestone': return <Ionicons name="star" size={20} color="#FFD700" />;
            case 'stage_up': return <Ionicons name="chevron-up-circle" size={20} color="#00E676" />;
            case 'streak': return <Ionicons name="flame" size={20} color="#FF6B6B" />;
            default: return <Ionicons name="pulse" size={20} color="rgba(255,255,255,0.5)" />;
        }
    };

    const getActivityDescription = (item: ActivityLog) => {
        const { activity_type, activity_data } = item;
        switch (activity_type) {
            case 'workout_complete':
                return `Completed: ${activity_data?.workout_name || 'A workout'}`;
            case 'pr_set':
                return `New PR on ${activity_data?.exercise_name || 'an exercise'}!`;
            case 'milestone':
                return `Reached milestone: ${activity_data?.title || 'Achievement'}`;
            case 'stage_up':
                return `Advanced to ${activity_data?.new_stage || 'next stage'}`;
            case 'streak':
                return `Hit a ${activity_data?.count || '-'} day streak`;
            default:
                return JSON.stringify(activity_data);
        }
    };

    if (!isAdmin) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: true, headerTitle: 'Activity' }} />
                <View style={styles.center}>
                    <Ionicons name="lock-closed-outline" size={56} color="rgba(255,255,255,0.12)" />
                    <Text style={styles.lockedTitle}>Not authorized</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Live Activity',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <View style={styles.filterRow}>
                <FlatList
                    horizontal
                    data={TYPES}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={t => t}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.pill, typeFilter === item && styles.pillActive]}
                            onPress={() => setTypeFilter(item)}
                        >
                            <Text style={[styles.pillText, typeFilter === item && styles.pillTextActive]}>
                                {item.replace('_', ' ').toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {loading && activities.length === 0 ? (
                <View style={styles.center}><ActivityIndicator color={theme.colors.primary} size="large" /></View>
            ) : (
                <FlatList
                    data={activities}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    onRefresh={loadActivities}
                    refreshing={loading}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="pulse" size={48} color="rgba(255,255,255,0.1)" />
                            <Text style={styles.emptyText}>No activity found</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const name = item.profiles?.full_name || item.profiles?.email || 'Unknown User';
                        return (
                            <View style={styles.logCard}>
                                <View style={styles.iconWrap}>
                                    {getActivityIcon(item.activity_type)}
                                </View>
                                <View style={styles.logMain}>
                                    <View style={styles.logHeader}>
                                        <Text style={styles.logUser}>{name}</Text>
                                        <Text style={styles.logTime}>
                                            {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </Text>
                                    </View>
                                    <Text style={styles.logDesc}>{getActivityDescription(item)}</Text>
                                </View>
                            </View>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    filterRow: { padding: theme.spacing.md, paddingBottom: 0 },
    pill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginRight: 8,
    },
    pillActive: { backgroundColor: 'rgba(0,187,255,0.15)', borderColor: theme.colors.primary },
    pillText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800' },
    pillTextActive: { color: theme.colors.primary },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    lockedTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 8 },
    emptyText: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 8 },

    listContainer: { padding: theme.spacing.lg },
    logCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    logMain: { flex: 1 },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    logUser: { color: '#FFF', fontSize: 13, fontWeight: '800' },
    logTime: { color: theme.colors.textSecondary, fontSize: 11 },
    logDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 20 },
});
