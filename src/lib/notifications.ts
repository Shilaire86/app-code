import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

const isWeb = Platform.OS === 'web';
const DAILY_CHECK_IN_TYPE = 'daily_check_in';

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
        // Clear only prior daily check-ins so weekly summaries and trial reminders survive.
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of scheduled) {
            if (n.content.data?.type === DAILY_CHECK_IN_TYPE) {
                await Notifications.cancelScheduledNotificationAsync(n.identifier);
            }
        }

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
                data: { type: DAILY_CHECK_IN_TYPE },
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

export async function cancelStreakNudges() {
    if (isWeb) return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
        if (n.content.data?.type === 'streak_nudge') {
            await Notifications.cancelScheduledNotificationAsync(n.identifier);
        }
    }
}

export async function scheduleStreakNudge(streakDays: number) {
    if (isWeb) return;
    if (streakDays < 1) return; // Only nudge if they have at least 1 day streak they want to keep

    try {
        // 1. Cancel previous nudges to avoid spam
        await cancelStreakNudges();

        // 2. Schedule for 22 hours from now
        // This gives them a 2-hour window before the 24-hour streak window expires
        const trigger: Notifications.NotificationTriggerInput = {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 22 * 3600, // 22 hours
        };

        await Notifications.scheduleNotificationAsync({
            content: {
                title: "🔥 Streak at Risk!",
                body: `Don't lose your ${streakDays}-day streak. One quick session keeps the momentum alive.`,
                data: { type: 'streak_nudge' },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger,
        });

        console.log(`[Push] Streak nudge scheduled for 22 hours from now (Streak: ${streakDays} days)`);
    } catch (e) {
        console.error('[Push] Error scheduling streak nudge:', e);
    }
}

// ─── Weekly Progress Summary ───────────────────────────────────────────
export async function scheduleWeeklyProgressSummary() {
    if (isWeb) return;

    try {
        // Cancel any existing weekly summaries first
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of scheduled) {
            if (n.content.data?.type === 'weekly_summary') {
                await Notifications.cancelScheduledNotificationAsync(n.identifier);
            }
        }

        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;

        // Schedule for every Sunday at 6:00 PM
        const trigger: Notifications.NotificationTriggerInput = {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: 1, // Sunday
            hour: 18,
            minute: 0,
        };

        await Notifications.scheduleNotificationAsync({
            content: {
                title: "📊 Your Weekly Recap",
                body: "Another week of becoming. Tap to see what you accomplished.",
                data: { type: 'weekly_summary' },
                sound: true,
            },
            trigger,
        });

        console.log('[Push] Weekly progress summary scheduled for Sundays at 6 PM');
    } catch (e) {
        console.error('[Push] Error scheduling weekly summary:', e);
    }
}

// ─── Trial Ending Reminders ────────────────────────────────────────────
export async function scheduleTrialEndingReminders(trialEndDateIso: string) {
    if (isWeb) return;

    try {
        // Cancel previous trial reminders
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of scheduled) {
            if (n.content.data?.type === 'trial_ending') {
                await Notifications.cancelScheduledNotificationAsync(n.identifier);
            }
        }

        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;

        const trialEnd = new Date(trialEndDateIso);
        if (Number.isNaN(trialEnd.getTime())) return;

        const now = Date.now();

        // 3-day reminder
        const threeDaysBefore = trialEnd.getTime() - 3 * 24 * 3600 * 1000;
        if (threeDaysBefore > now) {
            const secondsUntil = Math.floor((threeDaysBefore - now) / 1000);
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "⏳ Trial Ends in 3 Days",
                    body: "Your VIP trial is ending soon. Keep your premium access — upgrade now.",
                    data: { type: 'trial_ending', daysLeft: 3 },
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: secondsUntil,
                },
            });
            console.log(`[Push] Trial reminder (3-day) scheduled in ${Math.round(secondsUntil / 3600)}h`);
        }

        // 1-day reminder
        const oneDayBefore = trialEnd.getTime() - 1 * 24 * 3600 * 1000;
        if (oneDayBefore > now) {
            const secondsUntil = Math.floor((oneDayBefore - now) / 1000);
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "⚠️ Trial Ends Tomorrow",
                    body: "Last chance to keep your VIP access. Upgrade today to avoid losing your features.",
                    data: { type: 'trial_ending', daysLeft: 1 },
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: secondsUntil,
                },
            });
            console.log(`[Push] Trial reminder (1-day) scheduled in ${Math.round(secondsUntil / 3600)}h`);
        }
    } catch (e) {
        console.error('[Push] Error scheduling trial reminders:', e);
    }
}
