import type { SubscriptionTier, UserRole } from '@/stores/profileStore';
import { LEGAL_VERSIONS } from '@/lib/legalVersions';

export type ProfileLike = {
    onboarding_complete?: boolean;
    terms_accepted_version?: string | null;
    privacy_accepted_version?: string | null;
    disclaimer_accepted_version?: string | null;
    role?: UserRole | null;
    preferred_workout_time?: string | null;
} | null;

export type BootstrapState = 'idle' | 'loading' | 'ready' | 'failed';

export function isAuthGroup(segment?: string): boolean {
    return segment === '(auth)';
}

// The reset-password screen intentionally establishes a session (via the
// recovery-token exchange) while still living inside the (auth) group, so it
// must be exempted from the "authenticated users get bounced out of (auth)"
// redirect below — otherwise the redirect fires the instant the recovery
// session is created, before the user can ever set a new password.
export function isPasswordRecoveryRoute(segments?: readonly string[]): boolean {
    return segments?.[0] === '(auth)' && segments?.[1] === 'reset-password';
}

export function isOnboardingGroup(segment?: string): boolean {
    return segment === '(onboarding)';
}

export function isLegalGroup(segment?: string): boolean {
    return segment === 'legal';
}

export function isAdminRoute(segment?: string): boolean {
    return segment === 'admin';
}

export function isDebugRoute(segment?: string): boolean {
    return segment === 'debug';
}

export function shouldBlockForBootstrap(params: {
    hasSession: boolean;
    bootstrapState: BootstrapState;
    profileLoading: boolean;
    inAuthGroup: boolean;
}): boolean {
    const { hasSession, bootstrapState, profileLoading, inAuthGroup } = params;
    return hasSession && !inAuthGroup && (bootstrapState === 'idle' || bootstrapState === 'loading' || profileLoading);
}

export function getBootstrapFailureMessage(error: string | null): string {
    return error ? `Profile bootstrap failed: ${error}` : 'Profile bootstrap failed.';
}

export function shouldRedirectToLogin(params: { hasSession: boolean; inAuthGroup: boolean }): boolean {
    return !params.hasSession && !params.inAuthGroup;
}

export function shouldRedirectToOnboarding(params: {
    hasSession: boolean;
    profile: ProfileLike;
    inOnboardingGroup: boolean;
}): boolean {
    return !!params.hasSession && !!params.profile && !params.profile.onboarding_complete && !params.inOnboardingGroup;
}

export function needsLegalAcceptance(profile: ProfileLike): boolean {
    if (!profile || !profile.onboarding_complete) return false;

    return (
        profile.terms_accepted_version !== LEGAL_VERSIONS.terms ||
        profile.privacy_accepted_version !== LEGAL_VERSIONS.privacy ||
        profile.disclaimer_accepted_version !== LEGAL_VERSIONS.disclaimer
    );
}

export function shouldRedirectToLegal(params: {
    hasSession: boolean;
    profile: ProfileLike;
    inLegalGroup: boolean;
}): boolean {
    return !!params.hasSession && needsLegalAcceptance(params.profile) && !params.inLegalGroup;
}

export function shouldRedirectAuthenticatedAwayFromAuthGroup(params: {
    hasSession: boolean;
    profile: ProfileLike;
    inAuthGroup: boolean;
}): boolean {
    return !!params.hasSession && !!params.profile?.onboarding_complete && params.inAuthGroup;
}

export function canAccessAdminRoute(role?: UserRole | null): boolean {
    return role === 'admin';
}

export function canAccessDebugRoute(role?: UserRole | null): boolean {
    return role === 'admin' || role === 'coach';
}

export function isSupportedTier(tier: SubscriptionTier): boolean {
    return tier === 'free' || tier === 'standard' || tier === 'vip' || tier === 'elite';
}
