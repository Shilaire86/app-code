import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { LEGAL_VERSIONS } from '@/lib/legalVersions';

export default function TermsScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Terms of Service',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.version}>Version: {LEGAL_VERSIONS.terms}</Text>
                <Text style={styles.h1}>Terms of Service</Text>
                <Text style={styles.p}>
                    These Terms of Service explain the basic rules for using The Becoming Method.
                </Text>
                <Text style={styles.h2}>Use of the App</Text>
                <Text style={styles.p}>
                    You agree to use the app responsibly and not misuse services, content, or features.
                </Text>
                <Text style={styles.h2}>Accounts</Text>
                <Text style={styles.p}>
                    You are responsible for maintaining the confidentiality of your account and activity under it.
                </Text>
                <Text style={styles.h2}>Content</Text>
                <Text style={styles.p}>
                    Coach content is for educational purposes and does not replace professional medical advice.
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
