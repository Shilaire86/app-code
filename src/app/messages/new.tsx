import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform, ScrollView, Alert } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { theme } from '@/constants/theme';
import { createThread } from '@/services/messaging';

type Category = 'training' | 'program' | 'app_issue' | 'content' | 'other';

const CATEGORY_LABELS: { key: Category; label: string }[] = [
    { key: 'training', label: 'Training' },
    { key: 'program', label: 'Program' },
    { key: 'app_issue', label: 'App issue' },
    { key: 'content', label: 'Content' },
    { key: 'other', label: 'Other' },
];

const CATEGORY_HELP: Record<Category, string[]> = {
    training: [
        'Program you are on',
        'Exercise(s) in question',
        'What you tried, what you felt, where you got stuck',
    ],
    program: [
        'Which program',
        'Which week/day',
        'What felt off or unclear',
    ],
    app_issue: [
        'What happened',
        'Steps to reproduce',
        'Which screen you were on',
    ],
    content: [
        'Topic or post idea',
        'What you would like explained',
    ],
    other: [
        'Share what is on your mind',
    ],
};

export default function NewMessageScreen() {
    const router = useRouter();
    const pathname = usePathname();

    const [category, setCategory] = useState<Category>('training');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const diagnostics = useMemo(() => {
        if (category !== 'app_issue') return null;
        const expoConfig: any = (Constants as any)?.expoConfig;
        const appVersion = expoConfig?.version || (Constants as any)?.manifest?.version || null;
        return {
            platform: Platform.OS,
            appVersion,
            osVersion: (Platform as any)?.Version ?? null,
            route: pathname,
            timestamp: new Date().toISOString(),
            build: {
                appOwnership: (Constants as any)?.appOwnership ?? null,
                releaseChannel: (Constants as any)?.manifest2?.extra?.expoClient?.releaseChannel ?? null,
            },
        };
    }, [category, pathname]);

    async function submit() {
        const bodyText = body.trim();
        if (!bodyText) {
            Alert.alert('Required', 'Please write your message.');
            return;
        }

        setSubmitting(true);
        try {
            const { threadId } = await createThread({
                category,
                subject: subject.trim() || undefined,
                body: bodyText,
                diagnostics: diagnostics ?? undefined,
            });
            router.replace(`/messages/${threadId}`);
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to send message.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'New message',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.notice}>
                    <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.noticeText}>Not for emergencies. Replies typically within 24-48 hours.</Text>
                </View>

                <Text style={styles.label}>Category</Text>
                <View style={styles.pills}>
                    {CATEGORY_LABELS.map(c => (
                        <TouchableOpacity
                            key={c.key}
                            style={[styles.pill, category === c.key && styles.pillActive]}
                            onPress={() => setCategory(c.key)}
                            disabled={submitting}
                        >
                            <Text style={[styles.pillText, category === c.key && styles.pillTextActive]}>{c.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.helper}>
                    {CATEGORY_HELP[category].map((line, idx) => (
                        <Text key={idx} style={styles.helperLine}>- {line}</Text>
                    ))}
                    {category === 'app_issue' && (
                        <Text style={styles.helperLineStrong}>Included diagnostics: platform, version, route, timestamp</Text>
                    )}
                </View>

                <Text style={styles.label}>Subject (optional)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Short subject"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={subject}
                    onChangeText={setSubject}
                    editable={!submitting}
                />

                <Text style={styles.label}>Message</Text>
                <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder="Write your message..."
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={body}
                    onChangeText={setBody}
                    editable={!submitting}
                    multiline
                />

                <TouchableOpacity style={styles.submit} onPress={submit} disabled={submitting}>
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.submitText}>Send</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg, paddingBottom: 40, gap: theme.spacing.md },
    notice: {
        flexDirection: 'row',
        gap: 10,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    noticeText: { flex: 1, color: '#FFF', fontSize: 12, lineHeight: 16 },
    label: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '800', marginTop: 8 },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    pill: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        backgroundColor: 'rgba(0,0,0,0.18)',
    },
    pillActive: {
        backgroundColor: 'rgba(0,187,255,0.12)',
        borderColor: 'rgba(0,187,255,0.28)',
    },
    pillText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700' },
    pillTextActive: { color: '#FFF' },
    helper: { gap: 6, paddingTop: 6 },
    helperLine: { color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 16 },
    helperLineStrong: { color: 'rgba(0,187,255,0.95)', fontSize: 12, fontWeight: '800' },
    input: {
        minHeight: 44,
        backgroundColor: 'rgba(0,0,0,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: theme.radius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#FFF',
        fontSize: 13,
    },
    textarea: { minHeight: 120, textAlignVertical: 'top' },
    submit: {
        minHeight: 44,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    submitText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
});
