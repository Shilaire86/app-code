import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { LEGAL_VERSIONS } from '@/lib/legalVersions';
import { goBackOr } from '@/lib/navigation';

export default function AffiliateDisclosureScreen() {
    const theme = useTheme();
    const styles = createStyles(theme);
    const router = useRouter();
    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Affiliate Disclosure',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
                headerLeft: () => (
                    <TouchableOpacity onPress={() => goBackOr(router, '/(tabs)/settings')} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                ),
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.version}>Version: {LEGAL_VERSIONS.affiliate}</Text>
                <Text style={styles.h1}>Affiliate Disclosure</Text>
                <Text style={styles.p}>
                    Some links or offers may be affiliate links. If you choose to purchase through them,
                    we may earn a commission at no additional cost to you.
                </Text>
                <Text style={styles.h2}>Why this exists</Text>
                <Text style={styles.p}>
                    Affiliate revenue helps support development and ongoing improvements.
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

