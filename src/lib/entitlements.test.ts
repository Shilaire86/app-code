import { ENTITLEMENTS, canAccessContentTier, hasEntitlement, requiredTierForEntitlement } from './entitlements';
import { canAccessTier } from './tier-gating';

describe('entitlements', () => {
    it('treats tiers as ordered', () => {
        expect(canAccessTier('free', 'free')).toBe(true);
        expect(canAccessTier('standard', 'free')).toBe(true);
        expect(canAccessTier('standard', 'vip')).toBe(false);
        expect(canAccessTier('elite', 'vip')).toBe(true);
    });

    it('checks content access through the same tier ordering', () => {
        expect(canAccessContentTier('vip', 'standard')).toBe(true);
        expect(canAccessContentTier('standard', 'vip')).toBe(false);
    });

    it('maps entitlement keys to their minimum tier', () => {
        expect(requiredTierForEntitlement('macroCalculatorEnabled')).toBe('free');
        expect(requiredTierForEntitlement('nutritionEnabled')).toBe('standard');
        expect(requiredTierForEntitlement('savedMealsEnabled')).toBe('vip');
        expect(requiredTierForEntitlement('messagingEnabled')).toBe('elite');
    });

    it('exposes the expected free and paid capabilities', () => {
        expect(ENTITLEMENTS.free.quickWorkoutEnabled).toBe(true);
        expect(ENTITLEMENTS.free.nutritionEnabled).toBe(false);
        expect(ENTITLEMENTS.standard.nutritionEnabled).toBe(true);
        expect(ENTITLEMENTS.vip.communityComments).toBe(true);
        expect(ENTITLEMENTS.elite.messagingEnabled).toBe(true);
        expect(hasEntitlement('free', 'quickWorkoutEnabled')).toBe(true);
        expect(hasEntitlement('free', 'savedMealsEnabled')).toBe(false);
        expect(hasEntitlement('vip', 'savedMealsEnabled')).toBe(true);
    });
});
