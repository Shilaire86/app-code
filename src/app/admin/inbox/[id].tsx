import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Platform, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useProfileStore } from '@/stores/profileStore';
import { supabase } from '@/lib/supabase';
import { listMessages, sendMessage, ThreadMessage } from '@/services/messaging';

type ThreadMeta = {
    id: string;
    created_at: string;
    created_by: string;
    status: 'open' | 'closed';
    category: string;
    subject: string | null;
    diagnostics: any | null;
};

export default function AdminInboxThreadScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const threadId = Array.isArray(id) ? id[0] : id;

    const { profile } = useProfileStore();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'coach';

    const [loading, setLoading] = useState(true);
    const [errorText, setErrorText] = useState<string | null>(null);
    const [thread, setThread] = useState<ThreadMeta | null>(null);
    const [ownerLabel, setOwnerLabel] = useState<string>('');
    const [msgs, setMsgs] = useState<ThreadMessage[]>([]);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [showDiagnostics, setShowDiagnostics] = useState(false);

    useEffect(() => {
        if (!isAdmin) return;
        if (!threadId) return;
        fetchThread();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, threadId]);

    async function fetchThread() {
        setLoading(true);
        setErrorText(null);
        try {
            const { data: t, error: tErr } = await supabase
                .from('message_threads')
                .select('id,created_at,created_by,status,category,subject,diagnostics')
                .eq('id', threadId)
                .maybeSingle();
            if (tErr) throw tErr;
            if (!t) throw new Error('Thread not found.');
            setThread(t as any);

            const { data: p, error: pErr } = await supabase
                .from('profiles')
                .select('full_name,email')
                .eq('id', (t as any).created_by)
                .maybeSingle();
            if (pErr) throw pErr;
            setOwnerLabel((p as any)?.full_name || (p as any)?.email || (t as any).created_by);

            const data = await listMessages(String(threadId));
            setMsgs(data);
        } catch (e: any) {
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to load thread.');
        } finally {
            setLoading(false);
        }
    }

    async function sendReply() {
        if (!threadId) return;
        const text = replyText.trim();
        if (!text || sending) return;
        setSending(true);
        setErrorText(null);
        try {
            await sendMessage(String(threadId), text);
            setReplyText('');
            await fetchThread();
        } catch (e: any) {
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to send reply.');
        } finally {
            setSending(false);
        }
    }

    async function toggleStatus() {
        if (!threadId || !thread) return;
        const next = thread.status === 'open' ? 'closed' : 'open';
        setUpdating(true);
        setErrorText(null);
        try {
            const { data, error } = await supabase
                .from('message_threads')
                .update({ status: next })
                .eq('id', threadId)
                .select('status')
                .maybeSingle();
            if (error) throw error;
            setThread(prev => (prev ? { ...prev, status: (data as any)?.status || next } : prev));
        } catch (e: any) {
            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to update status.');
        } finally {
            setUpdating(false);
        }
    }

    function confirmDeleteThread() {
        if (!threadId) return;
        Alert.alert(
            'Delete thread?',
            'This will permanently delete the thread and all messages.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('message_threads').delete().eq('id', threadId);
                            if (error) throw error;
                            router.replace('/admin/inbox');
                        } catch (e: any) {
                            setErrorText(typeof e?.message === 'string' ? e.message : 'Failed to delete thread.');
                        }
                    },
                },
            ]
        );
    }

    const title = useMemo(() => thread?.subject || 'Inbox', [thread?.subject]);

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

            {!isAdmin ? (
                <View style={styles.centered}>
                    <Ionicons name="lock-closed-outline" size={56} color="rgba(255,255,255,0.12)" />
                    <Text style={styles.title}>Not authorized</Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
                        <Text style={styles.primaryButtonText}>Back</Text>
                    </TouchableOpacity>
                </View>
            ) : loading ? (
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

                    <View style={styles.metaBar}>
                        <Text style={styles.metaText}>From: {ownerLabel || thread?.created_by}</Text>
                        <TouchableOpacity style={styles.statusButton} onPress={toggleStatus} disabled={updating}>
                            <Text style={styles.statusButtonText}>
                                {updating ? 'Saving...' : `Mark ${thread?.status === 'open' ? 'closed' : 'open'}`}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        {thread?.category === 'app_issue' && thread?.diagnostics && (
                            <View style={styles.diagBox}>
                                <TouchableOpacity style={styles.diagToggle} onPress={() => setShowDiagnostics(v => !v)}>
                                    <Text style={styles.sectionTitle}>Diagnostics</Text>
                                    <Ionicons name={showDiagnostics ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.primary} />
                                </TouchableOpacity>
                                {showDiagnostics && (
                                    <Text style={styles.diagText} selectable>
                                        {JSON.stringify(thread.diagnostics, null, 2)}
                                    </Text>
                                )}
                            </View>
                        )}

                        <View style={styles.replies}>
                            {msgs.map((m) => (
                                <View
                                    key={m.id}
                                    style={[styles.replyBubble, m.sender_id === thread?.created_by ? styles.replyUser : styles.replyCoach]}
                                >
                                    <Text style={styles.replyMeta}>
                                        {m.sender_id === thread?.created_by ? (ownerLabel || 'User') : 'Coach'} • {new Date(m.created_at).toLocaleString()}
                                    </Text>
                                    <Text style={styles.replyText}>{m.body}</Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={styles.replyBar}>
                        <TextInput
                            style={styles.replyInput}
                            placeholder="Reply as coach..."
                            placeholderTextColor="rgba(255,255,255,0.35)"
                            value={replyText}
                            onChangeText={setReplyText}
                            editable={!sending}
                            multiline
                        />
                        <TouchableOpacity style={styles.sendButton} onPress={sendReply} disabled={sending}>
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
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg, gap: 10 },
    title: { color: '#FFF', fontSize: 18, fontWeight: '900' },
    primaryButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: theme.radius.md, minHeight: 44, justifyContent: 'center' },
    primaryButtonText: { color: '#FFF', fontWeight: '900' },
    body: { flex: 1 },
    metaBar: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    metaText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
    statusButton: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius.md, minHeight: 36, justifyContent: 'center' },
    statusButtonText: { color: theme.colors.primary, fontSize: 12, fontWeight: '900' },
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
    sectionTitle: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    diagBox: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: theme.radius.lg, padding: theme.spacing.md },
    diagToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    diagText: {
        marginTop: 8,
        color: 'rgba(255,255,255,0.75)',
        fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
        fontSize: 12,
        lineHeight: 16,
    },
    replies: { gap: 10 },
    replyBubble: { borderRadius: theme.radius.lg, padding: theme.spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    replyUser: { backgroundColor: 'rgba(0,187,255,0.10)' },
    replyCoach: { backgroundColor: 'rgba(255,255,255,0.06)' },
    replyMeta: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 6 },
    replyText: { color: '#FFF', fontSize: 13, lineHeight: 18 },
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
    sendButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
});
