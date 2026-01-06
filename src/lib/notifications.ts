import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
