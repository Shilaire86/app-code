import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useProfileStore } from '@/stores/profileStore';
import { listAdminThreads, MessageThread, ThreadCategory, ThreadStatus } from '@/services/messaging';
import { supabase } from '@/lib/supabase';
import { goBackOr } from '@/lib/navigation';

type Status = ThreadStatus | 'all';
type Category = ThreadCategory | 'all';

const STATUS_OPTS: Status[] = ['all', 'open', 'closed'];
const CAT_OPTS: Category[] = ['all', 'training', 'program', 'app_issue', 'content', 'other'];

export default function AdminInboxScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    const router = useRouter();
    const { profile } = useProfileStore();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'coach';

    const [status, setStatus] = useState<Status>('open');
    const [category, setCategory] = useState<Category>('all');
    const [loading, setLoading] = useState(true);
    const [errorText, setErrorText] = useState<string | null>(null);
    const [rows, setRows] = useState<(MessageThread & { ownerLabel?: string })[]>([]);

    useEffect(() => {
        if (!isAdmin) return;
        fetchInbox();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, status, category]);

    async function fetchInbox() {
        setLoading(true);
        setErrorText(null);
        try {
            const threads = await listAdminThreads(status === 'all' ? undefined : { status });

            const filtered = category === 'all' ? threads : threads.filter(t => t.category === category);
            if (filtered.length === 0) {
                setRows([]);
                return;
            }

            // Resolve "from" label from profiles for the created_by user.
            const ownerIds = Array.from(new Set(filtered.map(t => t.created_by))).filter(Boolean);
            const { data: profs, error: profErr } = await supabase
                .from('profiles')
                .select('id,full_name,email')
                .in('id', ownerIds);
            if (profErr) throw profErr;

            const byId = new Map<string, { full_name?: string | null; email?: string | null }>();
            (profs || []).forEach((p: any) => byId.set(p.id, p));

            setRows(filtered.map(t => {
                const p = byId.get(t.created_by);
                const ownerLabel = p?.full_name || p?.email || t.created_by;
                return { ...t, ownerLabel };
            }));
        } catch (e: any) {
            setRows([]);
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to load inbox.');
        } finally {
            setLoading(false);
        }
    }

    const data = useMemo(() => rows, [rows]);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Inbox',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => goBackOr(router, '/admin')} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                ),
            }} />

            {!isAdmin ? (
                <View style={styles.centered}>
                    <Ionicons name="lock-closed-outline" size={56} color="rgba(255,255,255,0.12)" />
                    <Text style={styles.title}>Not authorized</Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
                        <Text style={styles.primaryButtonText}>Back</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <View style={styles.filters}>
                        <View style={styles.filterRow}>
                            {STATUS_OPTS.map(s => (
                                <TouchableOpacity key={s} style={[styles.pill, status === s && styles.pillActive]} onPress={() => setStatus(s)}>
                                    <Text style={[styles.pillText, status === s && styles.pillTextActive]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.filterRow}>
                            {CAT_OPTS.map(c => (
                                <TouchableOpacity key={c} style={[styles.pill, category === c && styles.pillActive]} onPress={() => setCategory(c)}>
                                    <Text style={[styles.pillText, category === c && styles.pillTextActive]}>{c}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {!!errorText && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorTitle}>Error</Text>
                            <Text style={styles.errorBody}>{errorText}</Text>
                        </View>
                    )}

                    {loading ? (
                        <View style={styles.centered}>
                            <ActivityIndicator color={theme.colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={data}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.list}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.card} onPress={() => router.push(`/admin/inbox/${item.id}`)}>
                                    <View style={styles.cardTop}>
                                        <Text style={styles.cardCat}>{String(item.category).toUpperCase()}</Text>
                                        <Text style={styles.cardMeta}>{String(item.status).toUpperCase()}</Text>
                                    </View>
                                    <Text style={styles.cardSubject} numberOfLines={1}>{item.subject || '(no subject)'}</Text>
                                    <Text style={styles.cardUser}>From: {item.ownerLabel || item.created_by}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </>
            )}
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, gap: 10 },
    title: { color: '#FFF', fontSize: 18, fontWeight: '900' },
    primaryButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: theme.radius.md, minHeight: 44, justifyContent: 'center' },
    primaryButtonText: { color: '#FFF', fontWeight: '900' },
    filters: { padding: theme.spacing.lg, gap: 10 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(0,0,0,0.12)' },
    pillActive: { backgroundColor: 'rgba(0,187,255,0.18)', borderColor: 'rgba(0,187,255,0.35)' },
    pillText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '900' },
    pillTextActive: { color: '#FFF' },
    errorBox: { marginHorizontal: theme.spacing.lg, backgroundColor: 'rgba(255,107,107,0.12)', borderColor: 'rgba(255,107,107,0.28)', borderWidth: 1, borderRadius: theme.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
    errorTitle: { color: '#FFB3B3', fontSize: 12, fontWeight: '900', marginBottom: 4 },
    errorBody: { color: '#FFB3B3', fontSize: 12, lineHeight: 16 },
    list: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
    card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: theme.spacing.md },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    cardCat: { color: theme.colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 0.6 },
    cardMeta: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '800' },
    cardSubject: { color: '#FFF', fontSize: 14, fontWeight: '900' },
    cardUser: { color: theme.colors.textSecondary, marginTop: 10, fontSize: 11, fontWeight: '700' },
});
