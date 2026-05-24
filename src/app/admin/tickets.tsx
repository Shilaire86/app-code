import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useProfileStore } from '@/stores/profileStore';
import { supabase } from '@/lib/supabase';

type Ticket = {
    id: string;
    user_id: string;
    category: string;
    subject: string;
    description: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    created_at: string;
    profiles: {
        email: string;
    };
};

const STATUS_FILTERS = ['all', 'open', 'in_progress', 'resolved', 'closed'];

export default function AdminTicketsScreen() {
    const router = useRouter();
    const { profile } = useProfileStore();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'coach';

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('open');
    const [updatingParams, setUpdatingParams] = useState<string | null>(null);

    const loadTickets = async () => {
        try {
            setLoading(true);

            let query = supabase
                .from('support_tickets')
                .select(`*, profiles:user_id ( email )`)
                .order('created_at', { ascending: false });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setTickets(data as any || []);
        } catch (error) {
            console.error('Error loading tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) loadTickets();
    }, [isAdmin, statusFilter]);

    const updateStatus = async (ticket: Ticket, newStatus: string) => {
        try {
            setUpdatingParams(ticket.id);
            const { error } = await supabase
                .from('support_tickets')
                .update({ status: newStatus })
                .eq('id', ticket.id);
            
            if (error) throw error;
            
            // local update
            setTickets(prev => prev.map(t => 
                t.id === ticket.id ? { ...t, status: newStatus as any } : t
            ));
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setUpdatingParams(null);
        }
    };

    const showStatusOptions = (ticket: Ticket) => {
        Alert.alert(
            'Update Status',
            `Current: ${ticket.status.toUpperCase()}`,
            [
                { text: 'Open', onPress: () => updateStatus(ticket, 'open') },
                { text: 'In Progress', onPress: () => updateStatus(ticket, 'in_progress') },
                { text: 'Resolved', onPress: () => updateStatus(ticket, 'resolved') },
                { text: 'Closed', onPress: () => updateStatus(ticket, 'closed'), style: 'destructive' },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    if (!isAdmin) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: true, headerTitle: 'Tickets' }} />
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
                headerTitle: 'Support Tickets',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <View style={styles.filterRow}>
                {STATUS_FILTERS.map(s => (
                    <TouchableOpacity
                        key={s}
                        style={[styles.pill, statusFilter === s && styles.pillActive]}
                        onPress={() => setStatusFilter(s)}
                    >
                        <Text style={[styles.pillText, statusFilter === s && styles.pillTextActive]}>
                            {s.replace('_', ' ').toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator color={theme.colors.primary} size="large" /></View>
            ) : (
                <FlatList
                    data={tickets}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    onRefresh={loadTickets}
                    refreshing={loading}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="bug-outline" size={48} color="rgba(255,255,255,0.1)" />
                            <Text style={styles.emptyText}>No tickets found</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.ticketCard}>
                            <View style={styles.ticketTop}>
                                <View style={styles.categoryBadge}>
                                    <Text style={styles.categoryText}>{item.category.replace('_', ' ').toUpperCase()}</Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.statusBtn}
                                    onPress={() => showStatusOptions(item)}
                                    disabled={updatingParams === item.id}
                                >
                                    {updatingParams === item.id ? (
                                        <ActivityIndicator size="small" color={theme.colors.primary} />
                                    ) : (
                                        <>
                                            <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
                                            <Ionicons name="chevron-down" size={12} color={theme.colors.primary} />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                            
                            <Text style={styles.subject}>{item.subject}</Text>
                            <Text style={styles.desc}>{item.description}</Text>

                            <View style={styles.footerRow}>
                                <Text style={styles.email}>{item.profiles?.email}</Text>
                                <Text style={styles.time}>{new Date(item.created_at).toLocaleDateString()}</Text>
                            </View>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: theme.spacing.lg, paddingBottom: 0 },
    pill: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    pillActive: { backgroundColor: 'rgba(0,187,255,0.15)', borderColor: theme.colors.primary },
    pillText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800' },
    pillTextActive: { color: theme.colors.primary },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    lockedTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 8 },
    emptyText: { color: theme.colors.textSecondary, fontSize: 14, marginTop: 8 },

    listContainer: { padding: theme.spacing.lg },
    ticketCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    categoryBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    categoryText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    statusBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statusText: { color: theme.colors.primary, fontSize: 11, fontWeight: '900' },
    
    subject: { color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 6 },
    desc: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20, marginBottom: 16 },
    
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
    email: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
    time: { color: theme.colors.textSecondary, fontSize: 12 },
});
