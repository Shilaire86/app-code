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
    Appearance.setColorScheme((themeMode === 'system' ? null : themeMode) as any);
}

const initialThemeMode = useThemeStore.getState().themeMode;
applyColorScheme(initialThemeMode);

useThemeStore.subscribe((state) => {
    applyColorScheme(state.themeMode);
});
