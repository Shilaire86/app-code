import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, Platform } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            themeMode: 'system',
            setThemeMode: (themeMode) => {
                applyColorScheme(themeMode);
                set({ themeMode });
            },
        }),
        {
            name: 'theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

function applyColorScheme(themeMode: ThemeMode) {
    if (Platform.OS === 'web') return;
    if (themeMode === 'system') {
        // Android's native AppearanceModule.setColorScheme requires a
        // non-null string and throws a NullPointerException when passed
        // null — confirmed via local repro, crashing every cold start
        // since 'system' is the default themeMode for every fresh
        // install. Skipping the call here is safe: useTheme() already
        // derives the correct light/dark palette on its own via
        // useColorScheme(), independent of this call. This override
        // only exists to keep native chrome (status bar, system
        // dialogs, etc.) in sync when the user picks an *explicit*
        // light/dark override — there's nothing to override back to
        // when going back to 'system'.
        return;
    }
    try {
        Appearance.setColorScheme(themeMode);
    } catch (error) {
        // Defensive: don't let a theme-sync failure take down the app.
        console.warn('[themeStore] Failed to apply color scheme:', error);
    }
}

const initialThemeMode = useThemeStore.getState().themeMode;
applyColorScheme(initialThemeMode);

useThemeStore.subscribe((state) => {
    applyColorScheme(state.themeMode);
});
