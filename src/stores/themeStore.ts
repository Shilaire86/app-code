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
    try {
        Appearance.setColorScheme((themeMode === 'system' ? null : themeMode) as any);
    } catch (error) {
        // Android's native AppearanceModule.setColorScheme can throw a
        // NullPointerException if called before the activity/bridge is
        // fully attached (observed crashing every cold start in closed
        // testing — see the deferred initial call below). Don't let a
        // theme-sync failure take down the whole app.
        console.warn('[themeStore] Failed to apply color scheme:', error);
    }
}

const initialThemeMode = useThemeStore.getState().themeMode;
// Deferred (not called synchronously at module-eval time) so the native
// module has a chance to finish attaching during cold start on Android
// first — calling this at module scope crashed every launch in practice.
setTimeout(() => applyColorScheme(initialThemeMode), 0);

useThemeStore.subscribe((state) => {
    applyColorScheme(state.themeMode);
});
