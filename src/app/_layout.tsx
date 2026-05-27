import { Redirect, Stack, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useFonts } from 'expo-font';
import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold } from '@expo-google-fonts/barlow-condensed';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { View, ActivityIndicator, Text, TouchableOpacity, Platform, ViewStyle } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { darkColors } from '@/constants/theme';
// DiagnosticView renders before any hook context is available, so it reads
// from the static darkColors palette directly. All other screens use useTheme().
const theme = { colors: darkColors };
import { scheduleDailyCheckIn, registerForPushNotificationsAsync, scheduleWeeklyProgressSummary } from '@/lib/notifications';
import { useProfileStore } from '@/stores/profileStore';
import { useSyncQueueStore } from '@/stores/syncQueueStore';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { initializePurchases } from '@/services/purchases';
import {
    canAccessAdminRoute,
    canAccessDebugRoute,
    getBootstrapFailureMessage,
    isAdminRoute,
    isAuthGroup,
    isDebugRoute,
    isLegalGroup,
    isOnboardingGroup,
    shouldBlockForBootstrap,
    shouldRedirectAuthenticatedAwayFromAuthGroup,
    shouldRedirectToLegal,
    shouldRedirectToLogin,
    shouldRedirectToOnboarding,
} from '@/lib/routeGuards';
import Constants from 'expo-constants';

const APP_VERSION = Constants.expoConfig?.version ?? Constants.easConfig?.projectId ?? 'dev';

function DiagnosticView({ message, initialized, onForceClear }: { message: string; initialized: boolean; onForceClear: () => Promise<void> }) {
    const [showActions, setShowActions] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShowActions(true), 7000);
        return () => clearTimeout(timer);
    }, []);

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
                v{APP_VERSION} | initialized: {initialized ? 'Y' : 'N'}
            </Text>

            {showActions && (
                <View style={{ marginTop: 40, width: '100%', maxWidth: 400, gap: 10 }}>
                    <Text style={{ color: '#FF4444', textAlign: 'center', marginBottom: 10 }}>Taking longer than expected?</Text>
                    <TouchableOpacity
                         onPress={onForceClear}
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
        const [fontsLoaded] = useFonts({
            BarlowCondensed_600SemiBold,
            BarlowCondensed_700Bold,
            BarlowCondensed_800ExtraBold,
            DMSans_400Regular,
            DMSans_500Medium,
            DMSans_700Bold,
        });

        const { session, initialized } = useAuth();
        const segments = useSegments();
        const signOut = useAuthStore(s => s.signOut);
        // Use selectors so actions don't change identity and accidentally retrigger effects.
        const profileLoading = useProfileStore(s => s.isLoading);
        const profileBootstrapState = useProfileStore(s => s.bootstrapState);
        const profileBootstrapError = useProfileStore(s => s.bootstrapError);
        const profile = useProfileStore(s => s.profile);
        const fetchProfile = useProfileStore(s => s.fetchProfile);
        const resetProfile = useProfileStore(s => s.reset);
        const { isConnected } = useNetworkStatus();
        const { processQueue } = useSyncQueueStore();
        const lastScheduledRef = useRef<string | null>(null);

        const forceClear = async () => {
            console.log('[Diagnostic] Force clearing session...');
            try {
                await supabase.auth.signOut();
                signOut();
                if (typeof window !== 'undefined' && window.location) {
                    window.location.reload();
                }
            } catch (e) {
                console.error('[Diagnostic] Error clearing:', e);
            }
        };

        // One-time log on first render
        useEffect(() => {
            console.log('[RootLayout] Initial Mount. Version:', APP_VERSION, 'Connected:', isConnected);
            initializePurchases().catch(err => console.error('[RootLayout] Failed to init purchases:', err));
        }, []);

        console.log(`[RootLayout] Render: init = ${initialized}, sess = ${!!session}, profLoad = ${profileLoading}, seg = ${segments?.[0] || 'none'} `);

        // Fetch profile and register push tokens when session is available
        useEffect(() => {
            if (initialized && session?.user?.id) {
                void fetchProfile(session.user.id);
                registerForPushNotificationsAsync(session.user.id).catch(err => console.error('[RootLayout] Push registration failed', err));
                scheduleWeeklyProgressSummary().catch(err => console.error('[RootLayout] Weekly summary scheduling failed', err));
            } else if (initialized && !session) {
                // Reset profile store on logout
                resetProfile();
            }
        }, [initialized, session?.user?.id, fetchProfile, resetProfile]);

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

        const currentSegment = segments?.[0];
        const inAuthGroup = isAuthGroup(currentSegment);
        const inOnboardingGroup = isOnboardingGroup(currentSegment);
        const inLegalGroup = isLegalGroup(currentSegment);

        if (!initialized || !fontsLoaded) {
            return <DiagnosticView message={!fontsLoaded ? "Loading assets..." : "Initializing authenticator..."} initialized={initialized} onForceClear={forceClear} />;
        }

        if (shouldBlockForBootstrap({
            hasSession: !!session,
            bootstrapState: profileBootstrapState,
            profileLoading,
            inAuthGroup,
        })) {
            return <DiagnosticView message="Loading your profile..." initialized={initialized} onForceClear={forceClear} />;
        }

        if (session && profileBootstrapState === 'failed' && !inAuthGroup) {
            return (
                <DiagnosticView
                    message={getBootstrapFailureMessage(profileBootstrapError)}
                    initialized={initialized}
                    onForceClear={forceClear}
                />
            );
        }

        if (shouldRedirectToLogin({ hasSession: !!session, inAuthGroup })) {
            console.log('[RootLayout] Auth required, redirecting to login');
            return <Redirect href="/(auth)/login" />;
        }

        if (shouldRedirectToOnboarding({ hasSession: !!session, profile, inOnboardingGroup })) {
            return <Redirect href="/(onboarding)/welcome" />;
        }

        if (shouldRedirectToLegal({ hasSession: !!session, profile, inLegalGroup })) {
            return <Redirect href="/legal/accept" />;
        }

        if (shouldRedirectAuthenticatedAwayFromAuthGroup({ hasSession: !!session, profile, inAuthGroup })) {
            return <Redirect href="/" />;
        }

        if (session && inAuthGroup) {
            return <Redirect href="/" />;
        }

        if (isAdminRoute(currentSegment) && !canAccessAdminRoute(profile?.role)) {
            return <Redirect href="/" />;
        }

        if (isDebugRoute(currentSegment) && !canAccessDebugRoute(profile?.role)) {
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
