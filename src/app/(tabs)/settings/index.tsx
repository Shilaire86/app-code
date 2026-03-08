import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Switch } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { checkPermissions, scheduleDailyCheckIn } from '@/lib/notifications';

const PRESET_TIMES_24H = ['06:00', '09:00', '12:00', '18:00', '20:00'] as const;

function toDisplayTime(hhmm: string | null | undefined) {
    const value = hhmm || '09:00';
    const m = /^(\d{2}):(\d{2})$/.exec(value);
    if (!m) return value;
    let h = Number(m[1]);
    const min = Number(m[2]);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${String(min).padStart(2, '0')} ${ampm}`;
}

function formatDateLabel(iso: string | null | undefined) {
    if (!iso) return 'Not set';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return 'Not set';
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

type SubscriptionSnapshot = {
    tier: 'free' | 'standard' | 'vip' | 'elite';
    status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'incomplete';
    trial_end: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
};

export default function SettingsScreen() {
    const { user } = useAuthStore();
    const { profile, tier } = useProfileStore();
    const router = useRouter();

    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [timezone, setTimezone] = useState(profile?.timezone || 'America/New_York');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [savingReminder, setSavingReminder] = useState(false);
    const [subscription, setSubscription] = useState<SubscriptionSnapshot | null>(null);
    const [loadingSubscription, setLoadingSubscription] = useState(false);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        setLoadingSubscription(true);

        const loadSubscription = async () => {
            try {
                const { data, error } = await supabase
                    .from('subscriptions')
                    .select('tier, status, trial_end, current_period_end, cancel_at_period_end')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (cancelled) return;
                if (error) {
                    console.warn('[settings] Failed to load subscription snapshot:', error.message);
                    setSubscription(null);
                    return;
                }
                setSubscription(data as SubscriptionSnapshot | null);
            } finally {
                if (!cancelled) setLoadingSubscription(false);
            }
        };

        loadSubscription();

        return () => {
            cancelled = true;
        };
    }, [user?.id, tier]);

    async function handleSaveProfile() {
        if (!user) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    timezone: timezone,
                })
                .eq('id', user.id);

            if (error) throw error;

            // Refresh profile in store
            useProfileStore.getState().fetchProfile(user.id);
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSignOut() {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await supabase.auth.signOut();
                        useAuthStore.getState().signOut();
                        useProfileStore.getState().reset();
                        router.replace('/(auth)/login');
                    },
                },
            ]
        );
    }

    async function handleDeleteAccount() {
        Alert.alert(
            'Delete Account',
            'This will permanently delete your account and ALL your data. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Forever',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Final Confirmation',
                            'Type DELETE to confirm account deletion',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Confirm',
                                    style: 'destructive',
                                    onPress: async () => {
                                        // TODO: Implement account deletion
                                        Alert.alert('Info', 'Account deletion will be implemented in a future update');
                                    },
                                },
                            ]
                        );
                    },
                },
            ]
        );
    }

    async function setReminderTime(hhmm: string) {
        if (!user?.id) return;
        if (savingReminder) return;
        setSavingReminder(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ preferred_workout_time: hhmm })
                .eq('id', user.id);
            if (error) throw error;

            // Optimistic local update so the UI reflects immediately.
            useProfileStore.getState().updateProfile({ preferred_workout_time: hhmm });

            const [hStr, mStr] = hhmm.split(':');
            const ok = await scheduleDailyCheckIn(Number(hStr), Number(mStr));

            if (!ok) {
                const hasPerm = await checkPermissions();
                Alert.alert(
                    'Saved',
                    hasPerm
                        ? 'Reminder time saved, but scheduling failed.'
                        : 'Reminder time saved, but notifications are disabled. Enable notifications to receive reminders.'
                );
            } else {
                Alert.alert('Saved', `Daily reminder set for ${toDisplayTime(hhmm)}.`);
            }
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to update reminder time.');
        } finally {
            setSavingReminder(false);
        }
    }

    const currentReminderDisplay = toDisplayTime(profile?.preferred_workout_time || null);

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: 'Settings',
                    headerStyle: { backgroundColor: theme.colors.background },
                    headerTintColor: '#FFF',
                }}
            />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Profile Section */}
                <Text style={styles.sectionTitle}>Profile</Text>

                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Your name"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={fullName}
                            onChangeText={setFullName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <Text style={styles.emailText}>{user?.email}</Text>
                        <Text style={styles.helperText}>Email cannot be changed</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Timezone</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="America/New_York"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={timezone}
                            onChangeText={setTimezone}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryButton, isSaving && styles.disabledButton]}
                        onPress={handleSaveProfile}
                        disabled={isSaving}
                    >
                        <Text style={styles.primaryButtonText}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Notifications Section */}
                <Text style={styles.sectionTitle}>Notifications</Text>

                <View style={styles.card}>
                    <View style={styles.settingRow}>
                        <View>
                            <Text style={styles.settingLabel}>Push Notifications</Text>
                            <Text style={styles.settingDesc}>Daily check-ins and reminders</Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: '#3e3e3e', true: theme.colors.primary }}
                            thumbColor="#fff"
                        />
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Workout Reminders</Text>

                <View style={styles.card}>
                    <View style={styles.settingRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.settingLabel}>Daily reminder</Text>
                            <Text style={styles.settingDesc}>Current: {currentReminderDisplay}</Text>
                        </View>
                    </View>

                    <Text style={[styles.helperText, { marginTop: 12 }]}>Set reminder time</Text>
                    <View style={styles.presetRow}>
                        {PRESET_TIMES_24H.map((t) => {
                            const active = (profile?.preferred_workout_time || '09:00') === t;
                            return (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.presetButton, active && styles.presetButtonActive]}
                                    onPress={() => setReminderTime(t)}
                                    disabled={savingReminder}
                                >
                                    <Text style={[styles.presetButtonText, active && styles.presetButtonTextActive]}>
                                        {toDisplayTime(t)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {!!savingReminder && (
                        <Text style={[styles.helperText, { marginTop: 10 }]}>Saving...</Text>
                    )}
                </View>

                {/* Account Actions */}
                <Text style={styles.sectionTitle}>Account</Text>

                <View style={styles.card}>
                    <View style={styles.subscriptionHeaderRow}>
                        <Text style={styles.settingLabel}>Current plan</Text>
                        <Text style={styles.subscriptionBadge}>{(subscription?.tier ?? tier).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.settingDesc}>
                        Status: {subscription?.status ?? (tier === 'free' ? 'free' : 'active')}
                    </Text>
                    <Text style={styles.settingDesc}>
                        Trial ends: {formatDateLabel(subscription?.trial_end)}
                    </Text>
                    <Text style={styles.settingDesc}>
                        Next billing date: {formatDateLabel(subscription?.current_period_end)}
                    </Text>
                    {(subscription?.cancel_at_period_end ?? false) ? (
                        <Text style={styles.subscriptionCancelNote}>Cancellation scheduled at period end.</Text>
                    ) : null}
                    {loadingSubscription ? (
                        <Text style={styles.helperText}>Refreshing subscription details...</Text>
                    ) : null}

                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push('/subscribe')}
                    >
                        <Ionicons name="card-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.actionText}>
                            {tier !== 'free' ? 'Manage Subscription' : 'Choose a Subscription'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
                        <Ionicons name="log-out-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.actionText}>Sign Out</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.actionButton} onPress={handleDeleteAccount}>
                        <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                        <Text style={[styles.actionText, { color: theme.colors.error }]}>
                            Delete Account
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* App Info */}
                <Text style={styles.sectionTitle}>Help</Text>

                <View style={styles.card}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/help/quick-start')}>
                        <Ionicons name="help-circle-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.actionText}>Help & Quick Start Guide</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Legal</Text>

                <View style={styles.card}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/legal/terms')}>
                        <Ionicons name="document-text-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.actionText}>Terms of Service</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/legal/privacy')}>
                        <Ionicons name="shield-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.actionText}>Privacy Policy</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/legal/disclaimer')}>
                        <Ionicons name="warning-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.actionText}>Health Disclaimer</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/legal/community')}>
                        <Ionicons name="people-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.actionText}>Community Guidelines</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/legal/affiliate')}>
                        <Ionicons name="pricetag-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.actionText}>Affiliate Disclosure</Text>
                    </TouchableOpacity>
                </View>

                {/* App Info */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>The Becoming Method</Text>
                    <Text style={styles.footerText}>Version 1.0.1</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.lg,
    },
    sectionTitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.md,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.xl,
        padding: theme.spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    inputGroup: {
        marginBottom: theme.spacing.lg,
    },
    label: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: theme.spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        color: theme.colors.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    emailText: {
        color: theme.colors.text,
        fontSize: 16,
        padding: theme.spacing.md,
    },
    helperText: {
        color: theme.colors.textTertiary,
        fontSize: 12,
        marginTop: 4,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.radius.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    disabledButton: {
        opacity: 0.5,
    },
    primaryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingLabel: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    settingDesc: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    subscriptionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    subscriptionBadge: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '800',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: 'rgba(0,187,255,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(0,187,255,0.35)',
    },
    subscriptionCancelNote: {
        color: '#FFB74D',
        fontSize: 12,
        marginTop: 4,
        fontWeight: '700',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.md,
        gap: 12,
    },
    actionText: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: theme.spacing.sm,
    },
    presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
    presetButton: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        backgroundColor: 'rgba(0,0,0,0.12)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: theme.radius.md,
        minHeight: 44,
        justifyContent: 'center',
    },
    presetButtonActive: {
        borderColor: 'rgba(0,187,255,0.35)',
        backgroundColor: 'rgba(0,187,255,0.14)',
    },
    presetButtonText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '800' },
    presetButtonTextActive: { color: '#FFF' },
    footer: {
        alignItems: 'center',
        marginTop: theme.spacing.xxl,
        marginBottom: theme.spacing.xl,
    },
    footerText: {
        color: theme.colors.textTertiary,
        fontSize: 12,
        marginTop: 4,
    },
});
