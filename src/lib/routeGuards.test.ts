import { LEGAL_VERSIONS } from '@/lib/legalVersions';
import {
    canAccessAdminRoute,
    canAccessDebugRoute,
    getBootstrapFailureMessage,
    isAdminRoute,
    isAuthGroup,
    isDebugRoute,
    isLegalGroup,
    isOnboardingGroup,
    needsLegalAcceptance,
    shouldBlockForBootstrap,
    shouldRedirectAuthenticatedAwayFromAuthGroup,
    shouldRedirectToLegal,
    shouldRedirectToLogin,
    shouldRedirectToOnboarding,
} from '@/lib/routeGuards';

describe('routeGuards', () => {
    it('recognizes route groups', () => {
        expect(isAuthGroup('(auth)')).toBe(true);
        expect(isOnboardingGroup('(onboarding)')).toBe(true);
        expect(isLegalGroup('legal')).toBe(true);
        expect(isAdminRoute('admin')).toBe(true);
        expect(isDebugRoute('debug')).toBe(true);
    });

    it('fails closed while profile bootstrap is still in progress', () => {
        expect(
            shouldBlockForBootstrap({
                hasSession: true,
                bootstrapState: 'loading',
                profileLoading: false,
                inAuthGroup: false,
            })
        ).toBe(true);

        expect(
            shouldBlockForBootstrap({
                hasSession: true,
                bootstrapState: 'ready',
                profileLoading: true,
                inAuthGroup: false,
            })
        ).toBe(true);

        expect(
            shouldBlockForBootstrap({
                hasSession: true,
                bootstrapState: 'loading',
                profileLoading: false,
                inAuthGroup: true,
            })
        ).toBe(false);
    });

    it('redirects unauthenticated users away from protected routes', () => {
        expect(shouldRedirectToLogin({ hasSession: false, inAuthGroup: false })).toBe(true);
        expect(shouldRedirectToLogin({ hasSession: false, inAuthGroup: true })).toBe(false);
    });

    it('redirects incomplete profiles into onboarding', () => {
        expect(
            shouldRedirectToOnboarding({
                hasSession: true,
                profile: { onboarding_complete: false },
                inOnboardingGroup: false,
            })
        ).toBe(true);

        expect(
            shouldRedirectToOnboarding({
                hasSession: true,
                profile: { onboarding_complete: true },
                inOnboardingGroup: false,
            })
        ).toBe(false);
    });

    it('requires legal acceptance when any version is stale', () => {
        const acceptedProfile = {
            onboarding_complete: true,
            terms_accepted_version: LEGAL_VERSIONS.terms,
            privacy_accepted_version: LEGAL_VERSIONS.privacy,
            disclaimer_accepted_version: LEGAL_VERSIONS.disclaimer,
        };

        expect(needsLegalAcceptance(acceptedProfile)).toBe(false);
        expect(
            shouldRedirectToLegal({
                hasSession: true,
                profile: acceptedProfile,
                inLegalGroup: false,
            })
        ).toBe(false);

        expect(
            needsLegalAcceptance({
                ...acceptedProfile,
                terms_accepted_version: 'stale',
            })
        ).toBe(true);
    });

    it('keeps authenticated users out of auth screens', () => {
        expect(
            shouldRedirectAuthenticatedAwayFromAuthGroup({
                hasSession: true,
                profile: { onboarding_complete: true },
                inAuthGroup: true,
            })
        ).toBe(true);
    });

    it('returns a stable bootstrap failure message', () => {
        expect(getBootstrapFailureMessage(null)).toBe('Profile bootstrap failed.');
        expect(getBootstrapFailureMessage('boom')).toBe('Profile bootstrap failed: boom');
    });

    it('scopes admin and debug routes to privileged roles', () => {
        expect(canAccessAdminRoute('admin')).toBe(true);
        expect(canAccessAdminRoute('coach')).toBe(false);
        expect(canAccessDebugRoute('coach')).toBe(true);
        expect(canAccessDebugRoute('user')).toBe(false);
    });
});
