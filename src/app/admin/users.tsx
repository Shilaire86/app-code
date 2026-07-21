import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { showAlert } from '@/lib/confirm';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore } from '@/stores/profileStore';
import { supabase } from '@/lib/supabase';
import { SubscriptionTier } from '@/stores/profileStore';
import { goBackOr } from '@/lib/navigation';

type FounderStatus = 'none' | 'invited' | 'active' | 'graduated';

type AdminUser = {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    created_at: string;
    is_blocked: boolean;
    tier: SubscriptionTier;
    founder_status: FounderStatus;
    founder_number: number | null;
    founder_reward_applied_at: string | null;
};

const TIER_FILTERS: (SubscriptionTier | 'all')[] = ['all', 'free', 'standard', 'vip', 'elite'];

export default function AdminUsersScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    const router = useRouter();
    const { profile } = useProfileStore();
    const isAdmin = profile?.role === 'admin';

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tierFilter, setTierFilter] = useState<SubscriptionTier | 'all'>('all');
    const [updatingParams, setUpdatingParams] = useState<string | null>(null);

    const loadUsers = async () => {
        try {
            setLoading(true);

            // Fetch all profiles
            const { data: profilesData, error: profError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profError) throw profError;

            // Fetch all subscriptions
            const { data: subsData, error: subError } = await supabase
                .from('subscriptions')
                .select('user_id, tier');

            if (subError) throw subError;

            const subMap = new Map<string, string>();
            subsData?.forEach((sub: any) => subMap.set(sub.user_id, sub.tier));

            const mappedUsers: AdminUser[] = (profilesData || []).map((p: any) => ({
                id: p.id,
                email: p.email || 'No email',
                full_name: p.full_name,
                role: p.role || 'user',
                created_at: p.created_at,
                is_blocked: p.is_blocked || false,
                tier: (subMap.get(p.id) as SubscriptionTier) || 'free',
                founder_status: (p.founder_status as FounderStatus) || 'none',
                founder_number: p.founder_number ?? null,
                founder_reward_applied_at: p.founder_reward_applied_at ?? null,
            }));

            setUsers(mappedUsers);
        } catch (error) {
            console.error('Error loading users:', error);
            showAlert('Error', 'Failed to load list of users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) loadUsers();
    }, [isAdmin]);

    const handleToggleBlock = async (user: AdminUser) => {
        const action = user.is_blocked ? 'Unblock' : 'Block';
        showAlert(
            `${action} User`,
            `Are you sure you want to ${action.toLowerCase()} ${user.email}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: action,
                    style: user.is_blocked ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            setUpdatingParams(user.id);
                            const updates = {
                                is_blocked: !user.is_blocked,
                                blocked_at: user.is_blocked ? null : new Date().toISOString(),
                                // Note: we could prompt for a reason here in a modal
                            };

                            const { error } = await supabase
                                .from('profiles')
                                .update(updates)
                                .eq('id', user.id);

                            if (error) throw error;
                            
                            // Immediately update local UI
                            setUsers(prev => prev.map(u => 
                                u.id === user.id ? { ...u, is_blocked: updates.is_blocked } : u
                            ));
                        } catch (error: any) {
                            showAlert('Failed to update', error.message);
                        } finally {
                            setUpdatingParams(null);
                        }
                    }
                }
            ]
        );
    };

    const applyFounderDiscount = async (targetId: string): Promise<{ applied: boolean; reason?: string; error?: string }> => {
        await supabase.auth.refreshSession();
        const { data: sessRes, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;
        const accessToken = sessRes?.session?.access_token;
        if (!accessToken) throw new Error('You are not signed in. Please sign in again and retry.');

        const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
        if (!baseUrl || !anonKey) throw new Error('Supabase env missing in client.');

        const res = await fetch(`${baseUrl}/functions/v1/grant-founder-discount`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: anonKey,
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ target_id: targetId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return { applied: false, error: (data as any)?.error || 'Failed to apply founder discount.' };
        }
        return data as { applied: boolean; reason?: string };
    };

    const handleFounderAction = async (user: AdminUser) => {
        if (user.founder_status === 'graduated') return;

        if (user.founder_status === 'active') {
            showAlert(
                'Mark Graduated',
                `Mark ${user.email} as a graduated Founder? This applies their permanent 25% lifetime discount automatically if they're on a web (Stripe) subscription. Their founder badge and number stay on their account regardless of future subscription changes.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Graduate',
                        onPress: async () => {
                            try {
                                setUpdatingParams(user.id);
                                const { error } = await supabase
                                    .from('profiles')
                                    .update({ founder_status: 'graduated' })
                                    .eq('id', user.id);
                                if (error) throw error;
                                setUsers(prev => prev.map(u =>
                                    u.id === user.id ? { ...u, founder_status: 'graduated' } : u
                                ));

                                const discountResult = await applyFounderDiscount(user.id);
                                if (discountResult.applied) {
                                    setUsers(prev => prev.map(u =>
                                        u.id === user.id ? { ...u, founder_reward_applied_at: new Date().toISOString() } : u
                                    ));
                                    showAlert('Discount Applied', `${user.email}'s 25% lifetime discount is now active on their subscription.`);
                                } else if (discountResult.reason === 'no_stripe_subscription') {
                                    showAlert(
                                        'Discount Not Applied',
                                        `${user.email} isn't on a web (Stripe) subscription, so the discount can't be applied automatically. Reach out and have them manage their subscription via the website instead — the discount will apply there.`
                                    );
                                } else if (discountResult.reason !== 'already_applied') {
                                    showAlert('Discount Failed', discountResult.error || 'Could not apply the founder discount. You can retry by re-opening this screen.');
                                }
                            } catch (error: any) {
                                showAlert('Failed to update', error.message);
                            } finally {
                                setUpdatingParams(null);
                            }
                        },
                    },
                ]
            );
            return;
        }

        showAlert(
            'Grant Founder Status',
            `Grant ${user.email} permanent Founder status? They'll be assigned the next founder number.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Grant',
                    onPress: async () => {
                        try {
                            setUpdatingParams(user.id);
                            const { error } = await supabase.rpc('grant_founder_status', { target_id: user.id });
                            if (error) throw error;

                            const { data: refreshed } = await supabase
                                .from('profiles')
                                .select('founder_status, founder_number')
                                .eq('id', user.id)
                                .single();

                            setUsers(prev => prev.map(u =>
                                u.id === user.id
                                    ? {
                                        ...u,
                                        founder_status: (refreshed?.founder_status as FounderStatus) || 'active',
                                        founder_number: refreshed?.founder_number ?? u.founder_number,
                                    }
                                    : u
                            ));
                        } catch (error: any) {
                            showAlert('Failed to update', error.message);
                        } finally {
                            setUpdatingParams(null);
                        }
                    },
                },
            ]
        );
    };

    // Filter logic
    const displayedUsers = useMemo(() => {
        return users.filter(u => {
            const matchesTier = tierFilter === 'all' || u.tier === tierFilter;
            const matchesSearch = 
                u.email.toLowerCase().includes(search.toLowerCase()) || 
                (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase()));
            
            return matchesTier && matchesSearch;
        });
    }, [users, search, tierFilter]);

    if (!isAdmin) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: true, headerTitle: 'Users' }} />
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
                headerTitle: 'Manage Users',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => goBackOr(router, '/admin')} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                ),
            }} />

            <View style={styles.topSection}>
                <View style={styles.searchWrap}>
                    <Ionicons name="search" size={20} color="rgba(255,255,255,0.4)" />
                    <TextInput 
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search email or name..."
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        autoCapitalize="none"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.filterScroll}>
                    {TIER_FILTERS.map(t => (
                        <TouchableOpacity 
                            key={t} 
                            style={[styles.tierPill, tierFilter === t && styles.tierPillActive]}
                            onPress={() => setTierFilter(t)}
                        >
                            <Text style={[styles.tierPillText, tierFilter === t && styles.tierPillTextActive]}>
                                {t.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={theme.colors.primary} size="large" />
                </View>
            ) : (
                <FlatList
                    data={displayedUsers}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>No users found.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={[styles.userCard, item.is_blocked && styles.userCardBlocked]}>
                            <View style={styles.cardMain}>
                                <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                                <Text style={styles.userName}>{item.full_name || 'No name provided'}</Text>
                                
                                <View style={styles.badgeRow}>
                                    <View style={styles.tierBadge}>
                                        <Text style={styles.tierBadgeText}>{item.tier.toUpperCase()}</Text>
                                    </View>
                                    {item.role === 'coach' && (
                                        <View style={[styles.tierBadge, { backgroundColor: 'rgba(255,215,0,0.1)' }]}>
                                            <Text style={[styles.tierBadgeText, { color: '#FFD700' }]}>COACH</Text>
                                        </View>
                                    )}
                                    {['active', 'graduated'].includes(item.founder_status) && (
                                        <View style={[styles.tierBadge, { backgroundColor: 'rgba(181,98,42,0.15)' }]}>
                                            <Text style={[styles.tierBadgeText, { color: '#D4824A' }]}>
                                                FOUNDER{item.founder_number ? ` #${item.founder_number}` : ''}
                                            </Text>
                                        </View>
                                    )}
                                    {item.founder_reward_applied_at && (
                                        <View style={[styles.tierBadge, { backgroundColor: 'rgba(75,122,82,0.15)' }]}>
                                            <Text style={[styles.tierBadgeText, { color: '#4B7A52' }]}>25% LIFETIME</Text>
                                        </View>
                                    )}
                                    {item.is_blocked && (
                                        <View style={[styles.tierBadge, { backgroundColor: 'rgba(255,107,107,0.1)' }]}>
                                            <Text style={[styles.tierBadgeText, { color: '#FF6B6B' }]}>BLOCKED</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.blockBtn}
                                onPress={() => handleFounderAction(item)}
                                disabled={updatingParams === item.id || item.founder_status === 'graduated'}
                            >
                                <Ionicons
                                    name="ribbon"
                                    size={22}
                                    color={item.founder_status === 'none' ? 'rgba(255,255,255,0.3)' : '#D4824A'}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.blockBtn}
                                onPress={() => handleToggleBlock(item)}
                                disabled={updatingParams === item.id}
                            >
                                {updatingParams === item.id ? (
                                    <ActivityIndicator size="small" color={item.is_blocked ? theme.colors.primary : '#FF6B6B'} />
                                ) : (
                                    <Ionicons
                                        name={item.is_blocked ? "shield-checkmark" : "ban"}
                                        size={22}
                                        color={item.is_blocked ? theme.colors.primary : '#FF6B6B'}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    topSection: { padding: theme.spacing.lg, paddingBottom: 0, gap: 12 },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    searchInput: { flex: 1, color: '#FFF', paddingHorizontal: 10, fontSize: 15 },
    filterScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    tierPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    tierPillActive: { backgroundColor: 'rgba(0,187,255,0.1)', borderColor: theme.colors.primary },
    tierPillText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800' },
    tierPillTextActive: { color: theme.colors.primary },
    
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    lockedTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 8 },
    emptyText: { color: theme.colors.textSecondary, fontSize: 14 },
    
    listContainer: { padding: theme.spacing.lg, paddingTop: 0, gap: 12 },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    userCardBlocked: {
        borderColor: 'rgba(255,107,107,0.3)',
        backgroundColor: 'rgba(255,107,107,0.03)',
    },
    cardMain: { flex: 1 },
    userEmail: { color: '#FFF', fontSize: 15, fontWeight: '800', marginBottom: 2 },
    userName: { color: theme.colors.textSecondary, fontSize: 13, marginBottom: 8 },
    badgeRow: { flexDirection: 'row', gap: 6 },
    tierBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.radius.sm,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    tierBadgeText: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '900' },
    blockBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
});
