import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

// ─────────────────────────────────────────────────────────────────────────────
// Tabs layout — uses Ionicons (outline) to match the icon language used
// across every screen in the app. Feather was inconsistent here.
// ─────────────────────────────────────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
    index:             { active: 'home',        inactive: 'home-outline' },
    'programs/index':  { active: 'barbell',     inactive: 'barbell-outline' },
    'history/index':   { active: 'time',        inactive: 'time-outline' },
    'nutrition/index': { active: 'nutrition',   inactive: 'nutrition-outline' },
    'feed/index':      { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
    'settings/index':  { active: 'settings',    inactive: 'settings-outline' },
};

export default function TabsLayout() {
    const { colors, radius } = useTheme();

    return (
        <Tabs
            screenOptions={({ route }) => {
                const icons = TAB_ICONS[route.name] ?? {
                    active:   'ellipse'         as IoniconsName,
                    inactive: 'ellipse-outline' as IoniconsName,
                };
                return {
                    headerShown: false,
                    tabBarStyle: {
                        backgroundColor:  colors.surface,
                        borderTopColor:   colors.border,
                        borderTopWidth:   1,
                        paddingBottom:    10,
                        paddingTop:       8,
                        height:           64,
                    },
                    tabBarActiveTintColor:   colors.primary,
                    tabBarInactiveTintColor: colors.textTertiary,
                    tabBarLabelStyle: {
                        fontSize:   10,
                        fontFamily: 'Inter_500Medium',
                        marginTop:  2,
                    },
                    tabBarIcon: ({ color, focused, size }) => (
                        <Ionicons
                            name={focused ? icons.active : icons.inactive}
                            size={size ?? 22}
                            color={color}
                        />
                    ),
                };
            }}
        >
            <Tabs.Screen name="index"            options={{ title: 'Home' }} />
            <Tabs.Screen name="programs/index"   options={{ title: 'Programs' }} />
            <Tabs.Screen name="history/index"    options={{ title: 'History' }} />
            <Tabs.Screen name="nutrition/index"  options={{ title: 'Nutrition' }} />
            <Tabs.Screen name="feed/index"       options={{ title: 'Feed' }} />
            <Tabs.Screen name="settings/index"   options={{ title: 'Settings' }} />
        </Tabs>
    );
}
