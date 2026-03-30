import { Redirect, Stack, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator, Text, TouchableOpacity, Platform, ViewStyle } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { theme } from '@/constants/theme';
import { scheduleDailyCheckIn, registerForPushNotificationsAsync, scheduleWeeklyProgressSummary } from '@/lib/notifications';
import { useProfileStore } from '@/stores/profileStore';
import { useSyncQueueStore } from '@/stores/syncQueueStore';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { LEGAL_VERSIONS } from '@/lib/legalVersions';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { initializePurchases } from '@/services/purchases';

const APP_VERSION = '1.0.1-debug';

function DiagnosticView({ message }: { message: string }) {
    const [showActions, setShowActions] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShowActions(true), 7000);
        return () => clearTimeout(timer);
    }, []);

    const forceClear = async () => {
        console.log('[Diagnostic] Force clearing session...');
        try {
            await supabase.auth.signOut();
            useAuthStore.getState().signOut();
            if (typeof window !== 'undefined' && window.location) {
                window.location.reload();
            }
        } catch (e) {
            console.error('[Diagnostic] Error clearing:', e);
        }
    };

    return (
        <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.colors.background,
            padding: 40,
            ...(Platform.OS === 'web' ? { height: '100vh' } : { height: '100%' })
        } as ViewStyle}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={{ color: theme.colors.textSecondary, marginTop: 20, textAlign: 'center', fontSize: 16 }}>{message}</Text>

            <Text style={{ position: 'absolute', bottom: 20, color: theme.colors.textTertiary, fontSize: 10 }}>
                v{APP_VERSION} | initialized: {useAuthStore.getState().initialized ? 'Y' : 'N'}
            </Text>

            {showActions && (
                <View style={{ marginTop: 40, width: '100%', maxWidth: 400, gap: 10 }}>
                    <Text style={{ color: '#FF4444', textAlign: 'center', marginBottom: 10 }}>Taking longer than expected?</Text>
                    <TouchableOpacity
                        onPress={forceClear}
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' }}
                    >
                        <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold' }}>Clear Session & Restart</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => typeof window !== 'undefined' && window.location && window.location.reload()}
                        style={{ padding: 15, alignItems: 'center' }}
                    >
                        <Text style={{ color: theme.colors.primary, textAlign: 'center' }}>Just Reload Page</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

export default function RootLayout() {
    try {
        const { session, initialized } = useAuth();
        const segments = useSegments();
        // Use selectors so actions don't change identity and accidentally retrigger effects.
        const profileLoading = useProfileStore(s => s.isLoading);
        const profile = useProfileStore(s => s.profile);
        const { isConnected } = useNetworkStatus();
        const { processQueue } = useSyncQueueStore();
        const lastScheduledRef = useRef<string | null>(null);

        // One-time log on first render
        useEffect(() => {
            console.log('[RootLayout] Initial Mount. Version:', APP_VERSION, 'Connected:', isConnected);
            initializePurchases().catch(err => console.error('[RootLayout] Failed to init purchases:', err));
        }, []);

        console.log(`[RootLayout] Render: init = ${initialized}, sess = ${!!session}, profLoad = ${profileLoading}, seg = ${segments?.[0] || 'none'} `);

        // Fetch profile and register push tokens when session is available
        useEffect(() => {
            if (initialized && session?.user?.id) {
                useProfileStore.getState().fetchProfile(session.user.id);
                registerForPushNotificationsAsync(session.user.id).catch(err => console.error('[RootLayout] Push registration failed', err));
                scheduleWeeklyProgressSummary().catch(err => console.error('[RootLayout] Weekly summary scheduling failed', err));
            } else if (initialized && !session) {
                // Reset profile store on logout
                useProfileStore.getState().reset();
            }
        }, [initialized, session?.user?.id]);

        useEffect(() => {
            if (!initialized) return;
            if (!session?.user?.id) return;
            if (profileLoading) return;

            const pref = typeof profile?.preferred_workout_time === 'string' ? profile.preferred_workout_time : null;
            const hhmm = pref && /^\d{2}:\d{2}$/.test(pref) ? pref : '09:00';
            if (lastScheduledRef.current === hhmm) return;
            lastScheduledRef.current = hhmm;

            const [hStr, mStr] = hhmm.split(':');
            scheduleDailyCheckIn(Number(hStr), Number(mStr)).catch(err => console.error('Failed to schedule notification:', err));
        }, [initialized, session?.user?.id, profileLoading, profile?.preferred_workout_time]);

        useEffect(() => {
            if (initialized && session?.user?.id) {
                processQueue();
            }
        }, [initialized, session?.user?.id, processQueue]);

        const inAuthGroup = segments?.[0] === '(auth)';
        const inOnboardingGroup = segments?.[0] === '(onboarding)';
        const inLegalGroup = segments?.[0] === 'legal';

        if (!initialized) {
            return <DiagnosticView message="Initializing authenticator..." />;
        }

        if (session && profileLoading && !inAuthGroup) {
            return <DiagnosticView message="Loading your profile..." />;
        }

        if (!session && !inAuthGroup) {
            console.log('[RootLayout] Auth required, redirecting to login');
            return <Redirect href="/(auth)/login" />;
        }

        if (session && profile && !profile.onboarding_complete && !inOnboardingGroup) {
            return <Redirect href="/(onboarding)/welcome" />;
        }

        const needsLegalAccept =
            !!session &&
            !!profile &&
            profile.onboarding_complete &&
            (
                profile.terms_accepted_version !== LEGAL_VERSIONS.terms ||
                profile.privacy_accepted_version !== LEGAL_VERSIONS.privacy ||
                profile.disclaimer_accepted_version !== LEGAL_VERSIONS.disclaimer
            );

        if (needsLegalAccept && !inLegalGroup) {
            return <Redirect href="/legal/accept" />;
        }

        if (session && profile?.onboarding_complete && inOnboardingGroup) {
            return <Redirect href="/" />;
        }

        if (session && inAuthGroup) {
            return <Redirect href="/" />;
        }

        return (
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(onboarding)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="debug" />
                <Stack.Screen name="workout/active" />
                <Stack.Screen name="mindset/new" />
                <Stack.Screen name="legal/accept" />
                <Stack.Screen name="legal/terms" />
                <Stack.Screen name="legal/privacy" />
                <Stack.Screen name="legal/disclaimer" />
                <Stack.Screen name="legal/community" />
                <Stack.Screen name="legal/affiliate" />
                <Stack.Screen name="progress/camera" />
                <Stack.Screen name="progress/gallery" />
                <Stack.Screen name="progress/measurements" />
                <Stack.Screen name="history/prs" />
                <Stack.Screen name="history/[id]" />
            </Stack>
        );
    } catch (error) {
        console.error('[RootLayout] Critical Crash:', error);
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <Text style={{ color: '#F00' }}>Critical Error in Root Layout</Text>
                <Text style={{ color: '#FFF' }}>{String(error)}</Text>
            </View>
        );
    }
}
