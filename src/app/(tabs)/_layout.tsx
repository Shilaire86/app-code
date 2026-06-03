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
    'nutrition/index': { active: 'nutrition',   inactive: 'nutrition-outline' },
    'history/index':   { active: 'time',        inactive: 'time-outline' },
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
                        borderTopColor:   colors.borderHard,
                        borderTopWidth:   1,
                        paddingBottom:    12,
                        paddingTop:       10,
                        height:           68,
                    },
                    tabBarActiveTintColor:   colors.primary,
                    tabBarInactiveTintColor: colors.textSecondary,
                    tabBarLabelStyle: {
                        fontSize:    10,
                        fontFamily:  'DMSans_700Bold',
                        marginTop:   2,
                        letterSpacing: 0.8,
                        textTransform: 'uppercase',
                    },
                    tabBarIcon: ({ color, focused, size }) => (
                        <Ionicons
                            name={focused ? icons.active : icons.inactive}
                            size={focused ? 24 : 22}
                            color={color}
                        />
                    ),
                };
            }}
        >
            <Tabs.Screen name="index"            options={{ title: 'Home' }} />
            <Tabs.Screen name="programs/index"   options={{ title: 'Programs' }} />
            <Tabs.Screen name="nutrition/index"  options={{ title: 'Nutrition' }} />
            <Tabs.Screen name="history/index"    options={{ title: 'History' }} />
            <Tabs.Screen name="settings/index"   options={{ title: 'Settings' }} />
            {/* Detail screens — navigable but hidden from the tab bar */}
            <Tabs.Screen name="programs/[id]"    options={{ href: null }} />
            {/* Feed lives off the bar — reachable via the Home header icon */}
            <Tabs.Screen name="feed/index"       options={{ href: null, title: 'Feed' }} />
        </Tabs>
    );
}
