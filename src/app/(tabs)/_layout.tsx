import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.background,
                    borderTopColor: 'rgba(255,255,255,0.05)',
                    paddingBottom: 8,
                    paddingTop: 8,
                    height: 60,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="programs/index"
                options={{
                    title: 'Programs',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="fitness-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="history/index"
                options={{
                    title: 'History',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="time-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="feed/index"
                options={{
                    title: 'Feed',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="megaphone-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
