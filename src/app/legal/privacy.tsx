import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { LEGAL_VERSIONS } from '@/lib/legalVersions';
import { goBackOr } from '@/lib/navigation';

export default function PrivacyScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    const router = useRouter();
    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Privacy Policy',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => goBackOr(router, '/(tabs)/settings')} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                ),
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.version}>Version: {LEGAL_VERSIONS.privacy}</Text>
                <Text style={styles.h1}>Privacy Policy</Text>
                <Text style={styles.p}>
                    The Becoming Method collects information you provide to create your account, deliver app features, and support your training experience.
                </Text>
                <Text style={styles.h2}>What We Collect</Text>
                <Text style={styles.p}>
                    We may collect account information such as email address and content you choose to log, including workouts, progress updates, messages, and app preferences.
                </Text>
                <Text style={styles.h2}>How We Use Data</Text>
                <Text style={styles.p}>
                    We use this data to provide app functionality, support your training, and maintain service quality. We do not sell personal data.
                </Text>
                <Text style={styles.h2}>Security</Text>
                <Text style={styles.p}>
                    We use access controls and reasonable safeguards to protect data. No system is completely secure.
                </Text>
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
