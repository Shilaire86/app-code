import { Redirect, Stack, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { theme } from '@/constants/theme';
import { scheduleDailyCheckIn } from '@/lib/notifications';

export default function RootLayout() {
    const { session, initialized } = useAuth();
    const segments = useSegments();

    useEffect(() => {
        if (initialized) {
            // Schedule daily check-in (9 AM)
            scheduleDailyCheckIn(9, 0).catch(err => console.error('Failed to schedule notification:', err));
        }
    }, [initialized]);

    const inAuthGroup = segments[0] === '(auth)';

    if (!initialized) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.colors.background }}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
        );
    }

    // If user is not logged in and not on an auth screen, redirect to login
    if (!session && !inAuthGroup) {
        return <Redirect href="/(auth)/login" />;
    }

    // If user is logged in and on an auth screen, redirect to home
    if (session && inAuthGroup) {
        return <Redirect href="/" />;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)/login" />
            <Stack.Screen name="workout/active" />
            <Stack.Screen name="mindset/new" />
            <Stack.Screen name="progress/camera" />
            <Stack.Screen name="progress/gallery" />
            <Stack.Screen name="progress/measurements" />
            <Stack.Screen name="history/prs" />
            <Stack.Screen name="history/[id]" />
        </Stack>
    );
}
