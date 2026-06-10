import { useCallback } from 'react';
import { useProfileStore } from '@/stores/profileStore';

/**
 * Controls the in-app virtual guide.
 *
 * shouldShow(key) — true when the guide is on AND the user has not dismissed this hint.
 * dismiss(key)    — marks the hint seen (persisted in seen_hints JSONB).
 * resetAllHints() — clears all seen_hints so every tip reappears.
 */
export function useGuide() {
    const profile       = useProfileStore(s => s.profile);
    const setSeenHint   = useProfileStore(s => s.setSeenHint);
    const updateProfile = useProfileStore(s => s.updateProfile);

    // Defaults to true when the column is absent (pre-migration) or explicitly true.
    const isEnabled = profile?.guide_enabled !== false;

    const shouldShow = useCallback(
        (hintKey: string): boolean => {
            if (!isEnabled) return false;
            const seen = profile?.seen_hints;
            if (!seen || typeof seen !== 'object') return true;
            return !(seen as Record<string, unknown>)[hintKey];
        },
        [isEnabled, profile?.seen_hints],
    );

    const dismiss = useCallback(
        (hintKey: string) => { setSeenHint(hintKey); },
        [setSeenHint],
    );

    const resetAllHints = useCallback(
        async () => { await updateProfile({ seen_hints: {} }); },
        [updateProfile],
    );

    return { isEnabled, shouldShow, dismiss, resetAllHints };
}
