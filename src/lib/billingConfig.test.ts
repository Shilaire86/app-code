describe('billingConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('reports Stripe IDs as configured only when every tier/period has an ID', () => {
        process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_STANDARD = 'price_standard_monthly';
        process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_STANDARD_ANNUAL = 'price_standard_annual';
        process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_VIP = 'price_vip_monthly';
        process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_VIP_ANNUAL = 'price_vip_annual';
        process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_ELITE = 'price_elite_monthly';
        process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_ELITE_ANNUAL = 'price_elite_annual';

        const { billingHasStripeIds, getStripePriceId } = require('./billingConfig');

        expect(billingHasStripeIds()).toBe(true);
        expect(getStripePriceId('standard', 'annual')).toBe('price_standard_annual');
        expect(getStripePriceId('vip', 'monthly')).toBe('price_vip_monthly');
    });

    it('fails closed when any annual ID is missing', () => {
        process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_STANDARD = 'price_standard_monthly';
        process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_STANDARD_ANNUAL = 'price_standard_annual';
        process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_VIP = 'price_vip_monthly';
        process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_VIP_ANNUAL = '';
        process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_ELITE = 'price_elite_monthly';
        process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_ELITE_ANNUAL = 'price_elite_annual';

        const { billingHasStripeIds } = require('./billingConfig');

        expect(billingHasStripeIds()).toBe(false);
    });
});
