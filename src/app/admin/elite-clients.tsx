import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore } from '@/stores/profileStore';
import { supabase } from '@/lib/supabase';
import { goBackOr } from '@/lib/navigation';

type EliteClient = {
    id: string;
    email: string;
    full_name: string | null;
    subStatus: string;
    hasProgram: boolean;
};

export default function AdminEliteClientsScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    const router = useRouter();
    const { profile } = useProfileStore();
    const isCoachOrAdmin = profile?.role === 'admin' || profile?.role === 'coach';

    const [clients, setClients] = useState<EliteClient[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isCoachOrAdmin) loadClients();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCoachOrAdmin]);

    async function loadClients() {
        try {
            setLoading(true);

            const { data: subsData, error: subError } = await supabase
                .from('subscriptions')
                .select('user_id, status')
                .eq('tier', 'elite')
                .in('status', ['active', 'trialing']);

            if (subError) throw subError;

            const userIds = (subsData || []).map((s: any) => s.user_id);
            const statusMap = new Map<string, string>();
            (subsData || []).forEach((s: any) => statusMap.set(s.user_id, s.status));

            if (userIds.length === 0) {
                setClients([]);
                return;
            }

            const { data: profilesData, error: profError } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .in('id', userIds);

            if (profError) throw profError;

            const { data: programsData, error: progError } = await supabase
                .from('programs')
                .select('owner_id')
                .eq('program_type', 'elite')
                .eq('is_active', true)
                .in('owner_id', userIds);

            if (progError) throw progError;

            const hasProgramSet = new Set((programsData || []).map((p: any) => p.owner_id));

            const mapped: EliteClient[] = (profilesData || []).map((p: any) => ({
                id: p.id,
                email: p.email || 'No email',
                full_name: p.full_name,
                subStatus: statusMap.get(p.id) || 'active',
                hasProgram: hasProgramSet.has(p.id),
            }));

            setClients(mapped);
        } catch (error) {
            console.error('Error loading elite clients:', error);
        } finally {
            setLoading(false);
        }
    }

    if (!isCoachOrAdmin) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: true, headerTitle: 'Elite Clients' }} />
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
                headerTitle: 'Elite Clients',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => goBackOr(router, '/admin')} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                ),
            }} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={theme.colors.primary} size="large" />
                </View>
            ) : (
                <FlatList
                    data={clients}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>No active Elite clients yet.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.clientCard}
                            onPress={() => router.push({ pathname: '/admin/elite-clients/[clientId]', params: { clientId: item.id } })}
                        >
                            <View style={styles.cardMain}>
                                <Text style={styles.clientEmail} numberOfLines={1}>{item.email}</Text>
                                <Text style={styles.clientName}>{item.full_name || 'No name provided'}</Text>
                                <View style={[styles.badge, item.hasProgram ? styles.badgeActive : styles.badgePending]}>
                                    <Text style={[styles.badgeText, item.hasProgram ? styles.badgeTextActive : styles.badgeTextPending]}>
                                        {item.hasProgram ? 'PROGRAM BUILT' : 'NEEDS PROGRAM'}
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    lockedTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 8 },
    emptyText: { color: theme.colors.textSecondary, fontSize: 14 },
    listContainer: { padding: theme.spacing.lg, gap: 12 },
    clientCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    cardMain: { flex: 1 },
    clientEmail: { color: '#FFF', fontSize: 15, fontWeight: '800', marginBottom: 2 },
    clientName: { color: theme.colors.textSecondary, fontSize: 13, marginBottom: 8 },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.radius.sm,
    },
    badgeActive: { backgroundColor: 'rgba(75,122,82,0.15)' },
    badgePending: { backgroundColor: 'rgba(255,215,0,0.1)' },
    badgeText: { fontSize: 10, fontWeight: '900' },
    badgeTextActive: { color: '#4B7A52' },
    badgeTextPending: { color: '#FFD700' },
});
