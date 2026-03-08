import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

const isWeb = Platform.OS === 'web';

// Only configure notifications on native platforms
if (!isWeb) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

export async function requestNotificationPermissions() {
    if (isWeb) return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    return finalStatus === 'granted';
}

export async function scheduleDailyCheckIn(hour: number = 9, minute: number = 0) {
    if (isWeb) return false;

    try {
        // 1. Clear existing schedules to avoid duplicates
        await Notifications.cancelAllScheduledNotificationsAsync();

        // 2. Request permissions (if not already granted)
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return false;

        // 3. Schedule the notification
        const trigger: Notifications.NotificationTriggerInput = {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
        };

        await Notifications.scheduleNotificationAsync({
            content: {
                title: "The Becoming Method",
                body: "Your daily evolution awaits. Time for your check-in.",
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger,
        });

        console.log(`Notification scheduled for ${hour}:${minute.toString().padStart(2, '0')} daily.`);
        return true;
    } catch (error) {
        console.error('Error scheduling notification:', error);
        return false;
    }
}

export async function checkPermissions() {
    if (isWeb) return false;
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
}

export async function registerForPushNotificationsAsync(userId: string) {
    let token;

    if (isWeb) {
        return;
    }

    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('[Push] Failed to get push token for push notification!');
        return;
    }

    try {
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
            console.log('[Push] Project ID not found');
        }
        token = (
            await Notifications.getExpoPushTokenAsync({
                projectId,
            })
        ).data;
        console.log('[Push] Expo Push Token:', token);

        // Save token to Supabase
        if (token && userId) {
            const { error } = await supabase
                .from('push_tokens')
                .upsert(
                    {
                        user_id: userId,
                        expo_push_token: token,
                        device_type: Platform.OS,
                        is_active: true,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'user_id,expo_push_token' }
                );

            if (error) {
                console.error('[Push] Error saving push token to Supabase:', error);
            } else {
                console.log('[Push] Successfully saved push token to Supabase');
            }
        }
    } catch (e) {
        console.error('[Push] Exception getting push token:', e);
    }

    return token;
}
