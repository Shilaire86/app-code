import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { LEGAL_VERSIONS } from '@/lib/legalVersions';

export default function CommunityGuidelinesScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Community Guidelines',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.version}>Version: {LEGAL_VERSIONS.community}</Text>
                <Text style={styles.h1}>Community Guidelines</Text>
                <Text style={styles.p}>Keep it respectful and constructive.</Text>
                <Text style={styles.h2}>Be kind</Text>
                <Text style={styles.p}>No harassment, hate speech, or personal attacks.</Text>
                <Text style={styles.h2}>Stay on topic</Text>
                <Text style={styles.p}>Share wins, ask questions, and support others.</Text>
                <Text style={styles.h2}>Safety first</Text>
                <Text style={styles.p}>Do not give medical advice. Encourage professional help when needed.</Text>
            </ScrollView>
        </View>
    );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: 10 },
    version: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
    h1: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 4 },
    h2: { color: '#FFF', fontSize: 14, fontWeight: '900', marginTop: 12 },
    p: { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 18 },
});

