import type { Router } from 'expo-router';

/**
 * Goes back if there's history to go back to; otherwise replaces with a
 * known-good fallback route. Needed because a screen can lose its back
 * history (e.g. a reload while deep in the stack), which would otherwise
 * leave the user with no way to navigate away.
 */
export function goBackOr(router: Router, fallbackPath: string) {
    if (router.canGoBack()) {
        router.back();
    } else {
        router.replace(fallbackPath as any);
    }
}
