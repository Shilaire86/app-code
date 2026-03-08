import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { LEGAL_VERSIONS } from '@/lib/legalVersions';

export default function PrivacyScreen() {
    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Privacy Policy',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.version}>Version: {LEGAL_VERSIONS.privacy}</Text>
                <Text style={styles.h1}>Privacy Policy</Text>
                <Text style={styles.p}>
                    This Privacy Policy is provided for MVP/testing. It will be finalized before launch.
                </Text>
                <Text style={styles.h2}>What We Collect</Text>
                <Text style={styles.p}>
                    We collect account information (email) and the data you choose to log (workouts, progress, messages).
                </Text>
                <Text style={styles.h2}>How We Use Data</Text>
                <Text style={styles.p}>
                    We use your data to provide the app experience and improve features. We do not sell your personal data.
                </Text>
                <Text style={styles.h2}>Security</Text>
                <Text style={styles.p}>
                    Data is stored securely and protected by access controls. No system is 100% secure.
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: 10 },
    version: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
    h1: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 4 },
    h2: { color: '#FFF', fontSize: 14, fontWeight: '900', marginTop: 12 },
    p: { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 18 },
});

