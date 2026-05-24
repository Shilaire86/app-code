import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { listMessages, sendMessage, ThreadMessage } from '@/services/messaging';
import { supabase } from '@/lib/supabase';

export default function MessageThreadScreen() {
    const router = useRouter();
    const { threadId: threadIdParam } = useLocalSearchParams();
    const threadId = Array.isArray(threadIdParam) ? threadIdParam[0] : threadIdParam;
    const { user } = useAuthStore();
    const { profile } = useProfileStore();
    const isCoachOrAdmin = profile?.role === 'admin' || profile?.role === 'coach';

    const [loading, setLoading] = useState(true);
    const [errorText, setErrorText] = useState<string | null>(null);
    const [msgs, setMsgs] = useState<ThreadMessage[]>([]);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const [threadOwnerLabel, setThreadOwnerLabel] = useState<string>('User');
    const [threadOwnerId, setThreadOwnerId] = useState<string | null>(null);
    const [threadStatus, setThreadStatus] = useState<'open' | 'closed'>('open');

    const fetchThread = useCallback(async () => {
        if (!threadId || !user?.id) return;
        setLoading(true);
        setErrorText(null);
        try {
            // Status gate: users should not be able to reply when closed.
            const { data: threadRow, error: threadErr } = await supabase
                .from('message_threads')
                .select('status,created_by')
                .eq('id', threadId)
                .maybeSingle();
            if (threadErr) throw threadErr;
            const ownerId = (threadRow as any)?.created_by as string | undefined;
            const canAccessThread = isCoachOrAdmin || ownerId === user.id;
            if (!canAccessThread) {
                setThreadStatus('closed');
                setThreadOwnerId(ownerId ?? null);
                setErrorText('Not authorized to view this thread.');
                setMsgs([]);
                return;
            }
            setThreadStatus((threadRow as any)?.status === 'closed' ? 'closed' : 'open');
            setThreadOwnerId(ownerId ?? null);

            const data = await listMessages(threadId);
            setMsgs(data);

            // If I'm viewing as coach/admin, show the actual user's name (or email) for clarity.
            if (isCoachOrAdmin) {
                if (ownerId) {
                    const { data: prof, error: profErr } = await supabase
                        .from('profiles')
                        // Some environments don't have `display_name`; keep this query to known columns.
                        .select('full_name,email')
                        .eq('id', ownerId)
                        .maybeSingle();
                    if (profErr) throw profErr;
                    const p: any = prof;
                    const label = p?.full_name || p?.email || ownerId;
                    setThreadOwnerLabel(String(label));
                } else {
                    setThreadOwnerLabel('User');
                }
            }
        } catch (e: any) {
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to load thread.');
        } finally {
            setLoading(false);
        }
    }, [threadId, user?.id, isCoachOrAdmin]);

    useFocusEffect(
        useCallback(() => {
            fetchThread();
        }, [fetchThread])
    );

    async function sendReply() {
        if (!threadId || !user?.id) return;
        const text = replyText.trim();
        if (!text || sending) return;
        if (threadOwnerId && !isCoachOrAdmin && threadOwnerId !== user.id) {
            setErrorText('Not authorized to reply to this thread.');
            return;
        }
        if (threadStatus === 'closed' && !isCoachOrAdmin) {
            setErrorText('This thread is closed.');
            return;
        }
        setSending(true);
        setErrorText(null);
        try {
            await sendMessage(threadId, text);
            setReplyText('');
            await fetchThread();
        } catch (e: any) {
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to send reply.');
        } finally {
            setSending(false);
        }
    }

    function confirmDeleteThread() {
        if (!threadId) return;
        if (threadOwnerId && !isCoachOrAdmin && threadOwnerId !== user?.id) {
            setErrorText('Not authorized to delete this thread.');
            return;
        }
        Alert.alert(
            'Delete thread?',
            'This will permanently delete the entire conversation.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('message_threads').delete().eq('id', threadId);
                            if (error) throw error;
                            router.replace('/messages');
                        } catch (e: any) {
                            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to delete thread.');
                        }
                    },
                },
            ]
        );
    }

    const title = useMemo(() => 'Thread', []);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: title,
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 12 }}>
                        <Ionicons name="chevron-back" size={26} color="#FFF" />
                    </TouchableOpacity>
                ),
                headerRight: () => (
                    <TouchableOpacity onPress={confirmDeleteThread} style={{ paddingHorizontal: 12 }}>
                        <Ionicons name="trash-outline" size={20} color="#FFF" />
                    </TouchableOpacity>
                ),
            }} />

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={theme.colors.primary} />
                </View>
            ) : (
                <View style={styles.body}>
                    {!!errorText && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorTitle}>Error</Text>
                            <Text style={styles.errorBody}>{errorText}</Text>
                        </View>
                    )}

                    {threadStatus === 'closed' && !isCoachOrAdmin && (
                        <View style={styles.closedBox}>
                            <Text style={styles.closedTitle}>Thread closed</Text>
                            <Text style={styles.closedBody}>This conversation is closed. Start a new message if you need more help.</Text>
                        </View>
                    )}

                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={styles.replies}>
                            {msgs.map((m) => {
                                const mine = m.sender_id === user?.id;
                                const senderLabel = mine ? 'You' : (isCoachOrAdmin ? threadOwnerLabel : 'Coach');
                                return (
                                <View
                                    key={m.id}
                                    style={[styles.replyBubble, mine ? styles.replyUser : styles.replyCoach]}
                                >
                                    <Text style={styles.replyMeta}>
                                        {senderLabel} • {new Date(m.created_at).toLocaleString()}
                                    </Text>
                                    <Text style={styles.replyText}>{m.body}</Text>
                                </View>
                            )})}
                        </View>
                    </ScrollView>

                    <View style={styles.replyBar}>
                        <TextInput
                            style={styles.replyInput}
                            placeholder="Reply..."
                            placeholderTextColor="rgba(255,255,255,0.35)"
                            value={replyText}
                            onChangeText={setReplyText}
                            editable={!sending && !(threadStatus === 'closed' && !isCoachOrAdmin)}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, (threadStatus === 'closed' && !isCoachOrAdmin) && styles.sendButtonDisabled]}
                            onPress={sendReply}
                            disabled={sending || (threadStatus === 'closed' && !isCoachOrAdmin)}
                        >
                            {sending ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Ionicons name="send" size={18} color="#FFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1 },
    content: { padding: theme.spacing.lg, paddingBottom: 120, gap: theme.spacing.md },
    errorBox: {
        margin: theme.spacing.lg,
        backgroundColor: 'rgba(255,107,107,0.12)',
        borderColor: 'rgba(255,107,107,0.28)',
        borderWidth: 1,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
    },
    errorTitle: { color: '#FFB3B3', fontSize: 12, fontWeight: '900', marginBottom: 4 },
    errorBody: { color: '#FFB3B3', fontSize: 12, lineHeight: 16 },
    replies: { gap: 10 },
    replyBubble: {
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    replyUser: { backgroundColor: 'rgba(0,187,255,0.10)' },
    replyCoach: { backgroundColor: 'rgba(255,255,255,0.06)' },
    replyMeta: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 6 },
    replyText: { color: '#FFF', fontSize: 13, lineHeight: 18 },
    closedBox: {
        margin: theme.spacing.lg,
        marginBottom: 0,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderColor: 'rgba(255,255,255,0.10)',
        borderWidth: 1,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
    },
    closedTitle: { color: '#FFF', fontSize: 12, fontWeight: '900', marginBottom: 4 },
    closedBody: { color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 16 },
    replyBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-end',
    },
    replyInput: {
        flex: 1,
        minHeight: 44,
        maxHeight: 120,
        backgroundColor: 'rgba(0,0,0,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: theme.radius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#FFF',
        fontSize: 13,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: { opacity: 0.5 },
});
