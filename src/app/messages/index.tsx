import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { listMyThreads, MessageThread } from '@/services/messaging';
import { useProfileStore } from '@/stores/profileStore';
import { hasEntitlement } from '@/lib/entitlements';

function fmtDate(ts: string) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function prettyCategory(category: string) {
    switch (category) {
        case 'training': return 'Training';
        case 'program': return 'Program';
        case 'app_issue': return 'App issue';
        case 'content': return 'Content';
        default: return 'Other';
    }
}

export default function MessagesIndexScreen() {
    const router = useRouter();
    const { tier } = useProfileStore();
    const canMessage = hasEntitlement(tier, 'messagingEnabled');

    const [loading, setLoading] = useState(true);
    const [errorText, setErrorText] = useState<string | null>(null);
    const [threads, setThreads] = useState<MessageThread[]>([]);

    const fetchThreads = useCallback(async () => {
        setLoading(true);
        setErrorText(null);
        try {
            const rows = await listMyThreads();
            setThreads(rows);
        } catch (e: any) {
            setThreads([]);
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to load messages.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Requirement: refresh on focus.
    useFocusEffect(
        useCallback(() => {
            if (canMessage) fetchThreads();
        }, [fetchThreads, canMessage])
    );

    const data = useMemo(() => threads, [threads]);

    if (!canMessage) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{
                    headerShown: true,
                    headerTitle: 'Inbox',
                    headerStyle: { backgroundColor: theme.colors.background },
                    headerTintColor: '#FFF',
                }} />
                <View style={styles.centered}>
                    <View style={styles.emptyCard}>
                        <Ionicons name="lock-closed-outline" size={56} color="rgba(255,255,255,0.12)" />
                        <Text style={styles.emptyTitle}>1:1 coach messaging is an Elite feature</Text>
                        <Text style={styles.emptyText}>Elite members get direct messaging with their coach for personalized program design, plateau troubleshooting, and accountability.</Text>
                        <TouchableOpacity style={styles.newButton} onPress={() => router.push('/subscribe')}>
                            <Text style={styles.newButtonText}>See Elite</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Inbox',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.newButton} onPress={() => router.push('/messages/new')}>
                    <Ionicons name="add" size={18} color="#FFF" />
                    <Text style={styles.newButtonText}>New message</Text>
                </TouchableOpacity>
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
                    ListEmptyComponent={
                        <View style={styles.emptyCard}>
                            <Ionicons name="chatbubble-ellipses-outline" size={56} color="rgba(255,255,255,0.12)" />
                            <Text style={styles.emptyTitle}>Message your coach</Text>
                            <Text style={styles.emptyText}>Ask training questions, program help, or report app issues.</Text>
                            <Text style={styles.emptyDisclaimer}>Not for emergencies. Expect a reply within 24-48 hours.</Text>
                            <TouchableOpacity style={styles.newButton} onPress={() => router.push('/messages/new')}>
                                <Text style={styles.newButtonText}>Start a message</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.secondaryLink} onPress={() => router.push('/help/quick-start')}>
                                <Text style={styles.secondaryLinkText}>Quick Start Guide</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.threadCard} onPress={() => router.push(`/messages/${item.id}`)}>
                            <View style={styles.threadTop}>
                                <Text style={styles.threadCategory}>{prettyCategory(item.category).toUpperCase()}</Text>
                                <Text style={styles.threadMeta}>
                                    {item.status.toUpperCase()} • {fmtDate(item.last_message_at)}
                                </Text>
                            </View>
                            <Text style={styles.threadSubject} numberOfLines={1}>
                                {item.subject || '(no subject)'}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    headerRow: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    newButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.md,
        paddingVertical: 12,
        paddingHorizontal: 14,
        minHeight: 44,
    },
    newButtonText: { color: '#FFF', fontWeight: '900' },
    errorBox: {
        marginHorizontal: theme.spacing.lg,
        backgroundColor: 'rgba(255,107,107,0.12)',
        borderColor: 'rgba(255,107,107,0.28)',
        borderWidth: 1,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    errorTitle: { color: '#FFB3B3', fontSize: 12, fontWeight: '900', marginBottom: 4 },
    errorBody: { color: '#FFB3B3', fontSize: 12, lineHeight: 16 },
    list: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
    threadCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: theme.spacing.md,
    },
    threadTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
    threadCategory: { color: theme.colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 0.6 },
    threadMeta: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700' },
    threadSubject: { color: '#FFF', fontSize: 14, fontWeight: '900' },
    emptyCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        padding: theme.spacing.xl,
        alignItems: 'center',
        gap: 10,
    },
    emptyTitle: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    emptyText: { color: theme.colors.textSecondary, textAlign: 'center' },
    emptyDisclaimer: { color: 'rgba(255,255,255,0.55)', textAlign: 'center', fontSize: 12, lineHeight: 16, marginTop: 2 },
    secondaryLink: { paddingVertical: 8, paddingHorizontal: 8, minHeight: 36, justifyContent: 'center' },
    secondaryLinkText: { color: theme.colors.primary, fontWeight: '800', textDecorationLine: 'underline' },
});
