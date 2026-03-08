import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { LEGAL_VERSIONS } from '@/lib/legalVersions';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function LegalAcceptScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { profile } = useProfileStore();

    const [agreeTerms, setAgreeTerms] = useState(false);
    const [agreePrivacy, setAgreePrivacy] = useState(false);
    const [agreeDisclaimer, setAgreeDisclaimer] = useState(false);
    const [saving, setSaving] = useState(false);

    const missing = useMemo(() => {
        const termsOk = profile?.terms_accepted_version === LEGAL_VERSIONS.terms;
        const privacyOk = profile?.privacy_accepted_version === LEGAL_VERSIONS.privacy;
        const disclaimerOk = profile?.disclaimer_accepted_version === LEGAL_VERSIONS.disclaimer;
        return { termsOk, privacyOk, disclaimerOk };
    }, [profile, profile?.terms_accepted_version, profile?.privacy_accepted_version, profile?.disclaimer_accepted_version]);

    async function submit() {
        if (!user?.id) return;
        if (saving) return;

        if (!agreeTerms || !agreePrivacy || !agreeDisclaimer) {
            Alert.alert('Required', 'Please accept Terms, Privacy, and the Disclaimer to continue.');
            return;
        }

        setSaving(true);
        try {
            const now = new Date().toISOString();
            const updates = {
                legal_accepted_at: now,
                legal_accepted_version: 'v1.0',
                terms_accepted_at: now,
                terms_accepted_version: LEGAL_VERSIONS.terms,
                privacy_accepted_at: now,
                privacy_accepted_version: LEGAL_VERSIONS.privacy,
                disclaimer_accepted_at: now,
                disclaimer_accepted_version: LEGAL_VERSIONS.disclaimer,
            };

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);
            if (error) throw error;

            // Optimistic local update so gate passes immediately.
            useProfileStore.getState().updateProfile(updates);
            router.replace('/');
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to save acceptance.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: 'Legal',
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: '#FFF',
                headerBackVisible: false,
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.notice}>
                    <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
                    <Text style={styles.noticeText}>
                        Before continuing, please review and accept the Terms, Privacy Policy, and Health Disclaimer.
                    </Text>
                </View>

                <View style={styles.links}>
                    <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/legal/terms')}>
                        <Text style={styles.linkText}>Open Terms of Service</Text>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/legal/privacy')}>
                        <Text style={styles.linkText}>Open Privacy Policy</Text>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/legal/disclaimer')}>
                        <Text style={styles.linkText}>Open Health Disclaimer</Text>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <View style={styles.toggleRow}>
                        <View style={styles.toggleTextWrap}>
                            <Text style={styles.toggleTitle}>I agree to the Terms</Text>
                            {!missing.termsOk && <Text style={styles.toggleSub}>Required</Text>}
                        </View>
                        <Switch value={agreeTerms} onValueChange={setAgreeTerms} />
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.toggleRow}>
                        <View style={styles.toggleTextWrap}>
                            <Text style={styles.toggleTitle}>I agree to the Privacy Policy</Text>
                            {!missing.privacyOk && <Text style={styles.toggleSub}>Required</Text>}
                        </View>
                        <Switch value={agreePrivacy} onValueChange={setAgreePrivacy} />
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.toggleRow}>
                        <View style={styles.toggleTextWrap}>
                            <Text style={styles.toggleTitle}>I understand the Disclaimer</Text>
                            {!missing.disclaimerOk && <Text style={styles.toggleSub}>Required</Text>}
                        </View>
                        <Switch value={agreeDisclaimer} onValueChange={setAgreeDisclaimer} />
                    </View>
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={submit} disabled={saving}>
                    <Text style={styles.primaryText}>{saving ? 'Saving...' : 'Agree & Continue'}</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
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
    links: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        minHeight: 44,
    },
    linkText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        gap: 12,
    },
    toggleTextWrap: { flex: 1, gap: 2 },
    toggleTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    toggleSub: { color: theme.colors.textSecondary, fontSize: 12 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
    primaryButton: {
        minHeight: 44,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginTop: 6,
    },
    primaryText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
});
