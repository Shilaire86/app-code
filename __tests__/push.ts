// Temporary debug script to test sending a push notification via Expo
// Run this with "npx ts-node __tests__/push.ts <expo-push-token>"

async function sendPushNotification(expoPushToken: string) {
    console.log(`Sending test push notification to: ${expoPushToken}`);
    const message = {
        to: expoPushToken,
        sound: 'default',
        title: 'Workout Reminder',
        body: 'Time to crush todays session! Your Becoming Stage awaits.',
        data: { someData: 'goes here', route: '/(tabs)/programs' },
    };

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        const data = await response.json();
        console.log('Expo Push API Response:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error sending push notification:', e);
    }
}

const token = process.argv[2];
if (!token || !token.startsWith('ExponentPushToken[')) {
    console.error('Please provide a valid Expo push token as the first argument.');
    console.error('Example: npx ts-node __tests__/push.ts ExponentPushToken[xxxx]');
    process.exit(1);
}

sendPushNotification(token);
