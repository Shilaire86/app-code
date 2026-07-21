import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

function GuideCard({
    title,
    children,
    ctas,
}: {
    title: string;
    children: React.ReactNode;
    ctas?: { label: string; href: string }[];
}) {
    const theme = useTheme();
    const styles = createStyles(theme);
    const router = useRouter();
    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>{title}</Text>
            <View style={styles.cardBody}>{children}</View>
            {!!ctas?.length && (
                <View style={styles.ctaRow}>
                    {ctas.map((c) => (
                        <TouchableOpacity
                            key={c.href}
                            style={styles.ctaButton}
                            onPress={() => router.push(c.href)}
                        >
                            <Text style={styles.ctaText}>{c.label}</Text>
                            <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}

export default function QuickStartGuideScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: 'Quick Start Guide',
                    headerStyle: { backgroundColor: theme.colors.background },
                    headerTintColor: '#FFF',
                }}
            />

            <ScrollView contentContainerStyle={styles.content}>
                <GuideCard
                    title="Becoming Stages & Points"
                >
                    <Text style={styles.p}>
                        Your stage reflects consistency over time. Earn points by showing up.
                    </Text>
                    <Text style={styles.bullet}>- Workout: 5 points</Text>
                    <Text style={styles.bullet}>- Progress Entry: 2 points</Text>
                    <Text style={styles.bullet}>- Photo: 10 points</Text>
                    <Text style={[styles.p, { marginTop: 8 }]}>Stage thresholds:</Text>
                    <Text style={styles.bullet}>- Initiate: 0</Text>
                    <Text style={styles.bullet}>- Practitioner: 10</Text>
                    <Text style={styles.bullet}>- Devoted: 50</Text>
                    <Text style={styles.bullet}>- Embodied: 150</Text>
                </GuideCard>

                <GuideCard
                    title="Programs"
                    ctas={[{ label: 'Go to Programs', href: '/(tabs)/programs' }]}
                >
                    <Text style={styles.p}>
                        Choose a program that matches your current schedule. Consistency beats intensity.
                    </Text>
                    <Text style={styles.bullet}>- Weeks = the plan progression over time</Text>
                    <Text style={styles.bullet}>- Days = the workouts you complete each week</Text>
                    <Text style={styles.bullet}>- Start a workout from a program’s detail screen</Text>
                </GuideCard>

                <GuideCard
                    title="Progress"
                    ctas={[
                        { label: 'Go to Progress', href: '/progress/trends' },
                    ]}
                >
                    <Text style={styles.p}>
                        Check-ins help you stay honest and motivated. Trends reward consistency.
                    </Text>
                    <Text style={styles.bullet}>- Check-ins: weight + measurements</Text>
                    <Text style={styles.bullet}>- Trends: see changes over time</Text>
                    <Text style={styles.bullet}>- Photos: the most objective progress marker</Text>
                </GuideCard>

                <GuideCard
                    title="Feed"
                    ctas={[{ label: 'Go to Feed', href: '/(tabs)/feed' }]}
                >
                    <Text style={styles.p}>
                        The feed includes coach guidance and community wins.
                    </Text>
                    <Text style={styles.bullet}>- Tap Respect (heart) to support posts</Text>
                    <Text style={styles.bullet}>- Add a comment to ask or share</Text>
                </GuideCard>

                <GuideCard
                    title="Messaging"
                    ctas={[{ label: 'Go to Messages', href: '/messages' }]}
                >
                    <Text style={styles.p}>
                        Message your coach using categories to get faster help.
                    </Text>
                    <Text style={styles.bullet}>- Categories: training, program, app issue, content, other</Text>
                    <Text style={styles.bullet}>- Not for emergencies</Text>
                    <Text style={styles.bullet}>- Replies typically within 24–48 hours</Text>
                </GuideCard>

                <GuideCard
                    title="Having an Issue?"
                    ctas={[{ label: 'Report an Issue', href: '/help/report-issue' }]}
                >
                    <Text style={styles.p}>
                        If something isn't working right, let us know. We'll investigate and get back to you.
                    </Text>
                    <Text style={styles.bullet}>- Bug reports</Text>
                    <Text style={styles.bullet}>- Feature requests</Text>
                    <Text style={styles.bullet}>- Account or content issues</Text>
                </GuideCard>
            </ScrollView>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        padding: theme.spacing.lg,
    },
    cardTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', marginBottom: 8 },
    cardBody: { gap: 4 },
    p: { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 18 },
    bullet: { color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 18 },
    ctaRow: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: 'rgba(0,187,255,0.28)',
        backgroundColor: 'rgba(0,187,255,0.10)',
        minHeight: 44,
    },
    ctaText: { color: theme.colors.primary, fontSize: 13, fontWeight: '900' },
});
