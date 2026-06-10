import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Switch, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useThemeStore, ThemeMode } from '@/stores/themeStore';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useGuide } from '@/hooks/useGuide';
import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { checkPermissions, scheduleDailyCheckIn } from '@/lib/notifications';
import { APP_CONFIG } from '@/lib/appConfig';

const PRESET_TIMES_24H = ['06:00', '09:00', '12:00', '18:00', '20:00'] as const;
const DIETARY_PREFERENCES = ['standard', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'carnivore'] as const;

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
    const { colors, spacing, radius, typography, isDark } = useTheme();
    const { themeMode, setThemeMode } = useThemeStore();
    const { user } = useAuthStore();
    const { profile, tier } = useProfileStore();
    const router = useRouter();
    const hydratedProfileIdRef = useRef<string | null>(null);
    const signOut = useAuthStore(s => s.signOut);
    const fetchProfile = useProfileStore(s => s.fetchProfile);
    const resetProfile = useProfileStore(s => s.reset);
    const updateProfile = useProfileStore(s => s.updateProfile);
    const { isEnabled: guideEnabled, resetAllHints } = useGuide();

    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [timezone, setTimezone] = useState(profile?.timezone || 'America/New_York');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [streakNudgesEnabled, setStreakNudgesEnabled] = useState(profile?.streak_nudges_enabled ?? true);
    const [dietaryPreference, setDietaryPreference] = useState(profile?.dietary_preference || 'standard');
    const [isSaving, setIsSaving] = useState(false);
    const [savingReminder, setSavingReminder] = useState(false);
    const [subscription, setSubscription] = useState<SubscriptionSnapshot | null>(null);
    const [loadingSubscription, setLoadingSubscription] = useState(false);

    useEffect(() => {
        if (!profile?.id) return;
        if (hydratedProfileIdRef.current === profile.id) return;

        hydratedProfileIdRef.current = profile.id;
        setFullName(profile.full_name || '');
        setTimezone(profile.timezone || 'America/New_York');
        setStreakNudgesEnabled(profile.streak_nudges_enabled ?? true);
        setDietaryPreference(profile.dietary_preference || 'standard');
    }, [profile?.id]);

    async function handleToggleGuide(value: boolean) {
        await updateProfile({ guide_enabled: value });
    }

    async function handleResetGuide() {
        Alert.alert(
            'Reset Guide Tips',
            'All dismissed tips will reappear. This is useful if you want to review the guide from the beginning.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    onPress: async () => {
                        await resetAllHints();
                        Alert.alert('Done', 'Guide tips have been reset.');
                    },
                },
            ]
        );
    }

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
                    streak_nudges_enabled: streakNudgesEnabled,
                    dietary_preference: dietaryPreference,
                })
                .eq('id', user.id);

            if (error) throw error;

            // Refresh profile in store
            void fetchProfile(user.id);
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
                        signOut();
                        resetProfile();
                        router.replace('/(auth)/login');
                    },
                },
            ]
        );
    }

    async function handleDeleteAccount() {
        Alert.alert(
            'Delete Account',
            'This will request permanent deletion of your account and all associated data. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Request Deletion',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Final Confirmation',
                            'To continue, open your email app and send a deletion request.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Email Coach',
                                    style: 'destructive',
                                    onPress: async () => {
                                        const subject = encodeURIComponent('Account deletion request');
                                        const body = encodeURIComponent(
                                            `Please delete my The Becoming Method account for ${user?.email || 'my account'}.\n\nUser ID: ${user?.id || 'unknown'}\n`
                                        );
                                        const mailto = `mailto:${APP_CONFIG.coachEmail}?subject=${subject}&body=${body}`;
                                        try {
                                            await Linking.openURL(mailto);
                                        } catch {
                                            Alert.alert('Email unavailable', `Please email ${APP_CONFIG.coachEmail} to request deletion.`);
                                        }
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
            void updateProfile({ preferred_workout_time: hhmm });

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
    const placeholderColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: 'Settings',
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                }}
            />

            <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg }]}>
                {/* Upgrade Banner for Standard/Free users */}
                {(tier === 'free' || tier === 'standard') && (
                    <TouchableOpacity
                        style={[styles.upgradeBanner, { borderRadius: radius.lg }]}
                        onPress={() => router.push('/subscribe')}
                    >
                        <View style={styles.upgradeContent}>
                            <Ionicons name="sparkles" size={20} color="#FFD700" />
                            <View>
                                <Text style={styles.upgradeTitle}>Unlock Full Potential</Text>
                                <Text style={styles.upgradeSubtitle}>Upgrade to VIP for advanced analytics & community</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#FFD700" />
                    </TouchableOpacity>
                )}

                {/* Profile Section */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.md }]}>Profile</Text>

                <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderColor: colors.border }]}>
                    <View style={[styles.inputGroup, { marginBottom: spacing.lg }]}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Full Name</Text>
                        <TextInput
                            style={[styles.input, { borderRadius: radius.md, padding: spacing.md, color: colors.text, borderColor: colors.border }]}
                            placeholder="Your name"
                            placeholderTextColor={placeholderColor}
                            value={fullName}
                            onChangeText={setFullName}
                        />
                    </View>

                    <View style={[styles.inputGroup, { marginBottom: spacing.lg }]}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Email</Text>
                        <Text style={[styles.emailText, { color: colors.text, padding: spacing.md }]}>{user?.email}</Text>
                        <Text style={[styles.helperText, { color: colors.textTertiary }]}>Email cannot be changed</Text>
                    </View>

                    <View style={[styles.inputGroup, { marginBottom: spacing.lg }]}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Timezone</Text>
                        <TextInput
                            style={[styles.input, { borderRadius: radius.md, padding: spacing.md, color: colors.text, borderColor: colors.border }]}
                            placeholder="America/New_York"
                            placeholderTextColor={placeholderColor}
                            value={timezone}
                            onChangeText={setTimezone}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md }, isSaving && styles.disabledButton]}
                        onPress={handleSaveProfile}
                        disabled={isSaving}
                    >
                        <Text style={styles.primaryButtonText}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Theme Section */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.md }]}>Theme</Text>
                <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderColor: colors.border }]}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>App Theme</Text>
                    <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Choose light, dark, or system default</Text>
                    <View style={styles.presetRow}>
                        {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => {
                            const active = themeMode === mode;
                            return (
                                <TouchableOpacity
                                    key={mode}
                                    style={[
                                        styles.presetButton,
                                        { borderRadius: radius.md, borderColor: colors.border },
                                        active && {
                                            borderColor: colors.primary,
                                            backgroundColor: colors.primary + '20',
                                        },
                                        { minWidth: '30%', flex: 1, alignItems: 'center' }
                                    ]}
                                    onPress={() => setThemeMode(mode)}
                                >
                                    <Text style={[styles.presetButtonText, { color: colors.textSecondary }, active && { color: colors.text, fontWeight: '800' }, { textTransform: 'capitalize' }]}>
                                        {mode}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Notifications Section */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.md }]}>Notifications</Text>

                <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderColor: colors.border }]}>
                    <View style={styles.settingRow}>
                        <View>
                            <Text style={[styles.settingLabel, { color: colors.text }]}>Push Notifications</Text>
                            <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Daily check-ins and reminders</Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: '#3e3e3e', true: colors.primary }}
                            thumbColor="#fff"
                        />
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.sm }]} />

                    <View style={styles.settingRow}>
                        <View>
                            <Text style={[styles.settingLabel, { color: colors.text }]}>Smart Streak Reminders</Text>
                            <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Nudges you when your streak is at risk</Text>
                        </View>
                        <Switch
                            value={streakNudgesEnabled}
                            onValueChange={setStreakNudgesEnabled}
                            trackColor={{ false: '#3e3e3e', true: colors.primary }}
                            thumbColor="#fff"
                        />
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.md }]}>Workout Reminders</Text>

                <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderColor: colors.border }]}>
                    <View style={styles.settingRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.settingLabel, { color: colors.text }]}>Daily reminder</Text>
                            <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Current: {currentReminderDisplay}</Text>
                        </View>
                    </View>

                    <Text style={[styles.helperText, { color: colors.textTertiary, marginTop: 12 }]}>Set reminder time</Text>
                    <View style={styles.presetRow}>
                        {PRESET_TIMES_24H.map((t) => {
                            const active = (profile?.preferred_workout_time || '09:00') === t;
                            return (
                                <TouchableOpacity
                                    key={t}
                                    style={[
                                        styles.presetButton,
                                        { borderRadius: radius.md, borderColor: colors.border },
                                        active && {
                                            borderColor: colors.primary,
                                            backgroundColor: colors.primary + '20',
                                        }
                                    ]}
                                    onPress={() => setReminderTime(t)}
                                    disabled={savingReminder}
                                >
                                    <Text style={[styles.presetButtonText, { color: colors.textSecondary }, active && { color: colors.text, fontWeight: '800' }]}>
                                        {toDisplayTime(t)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {!!savingReminder && (
                        <Text style={[styles.helperText, { color: colors.textTertiary, marginTop: 10 }]}>Saving...</Text>
                    )}
                </View>

                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.md }]}>Nutrition</Text>

                <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderColor: colors.border }]}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Dietary Preference</Text>
                    <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Used to personalize smart food suggestions</Text>
                    
                    <View style={styles.presetRow}>
                        {DIETARY_PREFERENCES.map((pref) => {
                            const active = dietaryPreference === pref;
                            return (
                                <TouchableOpacity
                                    key={pref}
                                    style={[
                                        styles.presetButton,
                                        { borderRadius: radius.md, borderColor: colors.border },
                                        active && {
                                            borderColor: colors.primary,
                                            backgroundColor: colors.primary + '20',
                                        },
                                        { minWidth: '45%' }
                                    ]}
                                    onPress={() => setDietaryPreference(pref)}
                                    disabled={isSaving}
                                >
                                    <Text style={[styles.presetButtonText, { color: colors.textSecondary }, active && { color: colors.text, fontWeight: '800' }, { textTransform: 'capitalize' }]}>
                                        {pref}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Account Actions */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.md }]}>Account</Text>

                <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderColor: colors.border }]}>
                    <View style={styles.subscriptionHeaderRow}>
                        <Text style={[styles.settingLabel, { color: colors.text }]}>Current plan</Text>
                        <Text style={styles.subscriptionBadge}>{(subscription?.tier ?? tier).toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                        Status: {subscription?.status ?? (tier === 'free' ? 'free' : 'active')}
                    </Text>
                    <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                        Trial ends: {formatDateLabel(subscription?.trial_end)}
                    </Text>
                    <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>
                        Next billing date: {formatDateLabel(subscription?.current_period_end)}
                    </Text>
                    {(subscription?.cancel_at_period_end ?? false) ? (
                        <Text style={styles.subscriptionCancelNote}>Cancellation scheduled at period end.</Text>
                    ) : null}
                    {loadingSubscription ? (
                        <Text style={[styles.helperText, { color: colors.textTertiary }]}>Refreshing subscription details...</Text>
                    ) : null}

                    <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.sm }]} />

                    <TouchableOpacity
                        style={[styles.actionButton, { paddingVertical: spacing.md }]}
                        onPress={() => router.push('/subscribe')}
                    >
                        <Ionicons name="card-outline" size={20} color={colors.text} />
                        <Text style={[styles.actionText, { color: colors.text }]}>
                            {tier !== 'free' ? 'Manage Subscription' : 'Choose a Subscription'}
                        </Text>
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.sm }]} />

                    <TouchableOpacity style={[styles.actionButton, { paddingVertical: spacing.md }]} onPress={handleSignOut}>
                        <Ionicons name="log-out-outline" size={20} color={colors.text} />
                        <Text style={[styles.actionText, { color: colors.text }]}>Sign Out</Text>
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.sm }]} />

                    <TouchableOpacity style={[styles.actionButton, { paddingVertical: spacing.md }]} onPress={handleDeleteAccount}>
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                        <Text style={[styles.actionText, { color: colors.error }]}>
                            Delete Account
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Guide Section */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.md }]}>Guide</Text>

                <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderColor: colors.border }]}>
                    <View style={styles.settingRow}>
                        <View>
                            <Text style={[styles.settingLabel, { color: colors.text }]}>App Guide</Text>
                            <Text style={[styles.settingDesc, { color: colors.textSecondary }]}>Show tips that help you discover features</Text>
                        </View>
                        <Switch
                            value={guideEnabled}
                            onValueChange={handleToggleGuide}
                            trackColor={{ false: '#3e3e3e', true: colors.primary }}
                            thumbColor="#fff"
                        />
                    </View>

                    {guideEnabled && (
                        <>
                            <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.sm }]} />
                            <TouchableOpacity style={[styles.actionButton, { paddingVertical: spacing.md }]} onPress={handleResetGuide}>
                                <Ionicons name="refresh-outline" size={20} color={colors.text} />
                                <Text style={[styles.actionText, { color: colors.text }]}>Reset Guide Tips</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* App Info */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.md }]}>Help</Text>

                <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderColor: colors.border }]}>
                    <TouchableOpacity style={[styles.actionButton, { paddingVertical: spacing.md }]} onPress={() => router.push('/help/quick-start')}>
                        <Ionicons name="help-circle-outline" size={20} color={colors.text} />
                        <Text style={[styles.actionText, { color: colors.text }]}>Help & Quick Start Guide</Text>
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.sm }]} />

                    <TouchableOpacity style={[styles.actionButton, { paddingVertical: spacing.md }]} onPress={() => router.push('/help/report-issue')}>
                        <Ionicons name="chatbox-ellipses-outline" size={20} color={colors.text} />
                        <Text style={[styles.actionText, { color: colors.text }]}>Report an Issue</Text>
                    </TouchableOpacity>
                </View>

                {/* Legal Section */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.md }]}>Legal</Text>

                <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderColor: colors.border }]}>
                    <TouchableOpacity style={[styles.actionButton, { paddingVertical: spacing.md }]} onPress={() => router.push('/legal/terms')}>
                        <Ionicons name="document-text-outline" size={20} color={colors.text} />
                        <Text style={[styles.actionText, { color: colors.text }]}>Terms of Service</Text>
                    </TouchableOpacity>
                    <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.sm }]} />
                    <TouchableOpacity style={[styles.actionButton, { paddingVertical: spacing.md }]} onPress={() => router.push('/legal/privacy')}>
                        <Ionicons name="shield-outline" size={20} color={colors.text} />
                        <Text style={[styles.actionText, { color: colors.text }]}>Privacy Policy</Text>
                    </TouchableOpacity>
                    <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.sm }]} />
                    <TouchableOpacity style={[styles.actionButton, { paddingVertical: spacing.md }]} onPress={() => router.push('/legal/disclaimer')}>
                        <Ionicons name="warning-outline" size={20} color={colors.text} />
                        <Text style={[styles.actionText, { color: colors.text }]}>Health Disclaimer</Text>
                    </TouchableOpacity>
                    <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.sm }]} />
                    <TouchableOpacity style={[styles.actionButton, { paddingVertical: spacing.md }]} onPress={() => router.push('/legal/community')}>
                        <Ionicons name="people-outline" size={20} color={colors.text} />
                        <Text style={[styles.actionText, { color: colors.text }]}>Community Guidelines</Text>
                    </TouchableOpacity>
                    <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.sm }]} />
                    <TouchableOpacity style={[styles.actionButton, { paddingVertical: spacing.md }]} onPress={() => router.push('/legal/affiliate')}>
                        <Ionicons name="pricetag-outline" size={20} color={colors.text} />
                        <Text style={[styles.actionText, { color: colors.text }]}>Affiliate Disclosure</Text>
                    </TouchableOpacity>
                </View>

                {/* App Info */}
                <View style={[styles.footer, { marginTop: spacing.xxl, marginBottom: spacing.xl }]}>
                    <Text style={styles.footerText}>The Becoming Method</Text>
                    <Text style={[styles.footerText, { color: colors.textTertiary }]}>Version 1.0.1</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {},
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    card: {
        borderWidth: 1,
    },
    inputGroup: {},
    label: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: 'rgba(128,128,128,0.06)',
        fontSize: 16,
        borderWidth: 1,
    },
    emailText: {
        fontSize: 16,
    },
    helperText: {
        fontSize: 12,
        marginTop: 4,
    },
    primaryButton: {
        alignItems: 'center',
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
        fontSize: 16,
        fontWeight: '600',
    },
    settingDesc: {
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
        backgroundColor: 'rgba(197,168,128,0.2)',
        borderWidth: 1,
        borderColor: 'rgba(197,168,128,0.35)',
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
        gap: 12,
    },
    actionText: {
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        height: 1,
    },
    presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
    presetButton: {
        borderWidth: 1,
        backgroundColor: 'rgba(128,128,128,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 44,
        justifyContent: 'center',
    },
    presetButtonText: { fontSize: 12, fontWeight: '800' },
    footer: {
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        marginTop: 4,
    },
    upgradeBanner: {
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        padding: 16,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
    },
    upgradeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    upgradeTitle: {
        color: '#FFD700',
        fontSize: 14,
        fontWeight: '800',
    },
    upgradeSubtitle: {
        color: 'rgba(255, 215, 0, 0.7)',
        fontSize: 11,
        fontWeight: '600',
    },
});
