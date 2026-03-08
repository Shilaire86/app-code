import { Stack } from 'expo-router';

export default function OnboardingLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="welcome" />
            <Stack.Screen name="identity" />
            <Stack.Screen name="alignment" />
            <Stack.Screen name="commitment" />
            <Stack.Screen name="survey" />
            <Stack.Screen name="photo" />
        </Stack>
    );
}
