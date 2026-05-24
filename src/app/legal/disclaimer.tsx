import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { LEGAL_VERSIONS } from '@/lib/legalVersions';

export default function DisclaimerScreen() {
    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Health Disclaimer',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.version}>Version: {LEGAL_VERSIONS.disclaimer}</Text>
                <Text style={styles.h1}>Health & Fitness Disclaimer</Text>
                <Text style={styles.p}>
                    The Becoming Method provides general fitness and educational information. It is not medical advice.
                </Text>
                <Text style={styles.h2}>Consult a Professional</Text>
                <Text style={styles.p}>
                    Always consult your physician or qualified health provider before starting a new exercise or nutrition program.
                </Text>
                <Text style={styles.h2}>Assumption of Risk</Text>
                <Text style={styles.p}>
                    Exercise carries inherent risks. By using the app, you acknowledge and accept these risks.
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
