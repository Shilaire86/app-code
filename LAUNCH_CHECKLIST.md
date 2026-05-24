# Launch Checklist

Status key:
- `[ ]` not started
- `[~]` in progress
- `[x]` done

---

## 1. Production Secrets

### Local `.env`
- [x] `EXPO_PUBLIC_SUPABASE_URL` — set (xhzjpubapkrgtdkvnfck)
- [x] `EXPO_PUBLIC_SUPABASE_ANON_KEY` — set
- [x] `EXPO_PUBLIC_STRIPE_PRICE_ID_STANDARD` — set (price_1TTQvW...)
- [x] `EXPO_PUBLIC_STRIPE_PRICE_ID_VIP` — set (price_1T1wRA...)
- [x] `EXPO_PUBLIC_STRIPE_PRICE_ID_ELITE` — set (price_1T1wRQ...)
- [x] `EXPO_PUBLIC_STRIPE_PRICE_ID_STANDARD_ANNUAL` — set (price_1TOKSO...)
- [x] `EXPO_PUBLIC_STRIPE_PRICE_ID_VIP_ANNUAL` — set (price_1TOKVt...)
- [x] `EXPO_PUBLIC_STRIPE_PRICE_ID_ELITE_ANNUAL` — set (price_1TOKWZ...)
- [x] `EXPO_PUBLIC_RC_APPLE_KEY` — set (appl_rURDRX...)
- [ ] `EXPO_PUBLIC_RC_GOOGLE_KEY` — PLACEHOLDER (`goog_YourGoogleKeyHere`). Replace with real key from RevenueCat dashboard, or leave if Android not launching.

### EAS Secrets (for production builds)
- [ ] Run `eas secret:create` for all `EXPO_PUBLIC_*` values above.

### Supabase Edge Function Secrets
Set these in Supabase Dashboard → Project Settings → Edge Functions → Secrets:
- [ ] `STRIPE_SECRET_KEY` (sk_live_... or sk_test_...)
- [ ] `STRIPE_WEBHOOK_SECRET` (whsec_...)
- [ ] `STRIPE_PRICE_ID_STANDARD`
- [ ] `STRIPE_PRICE_ID_VIP`
- [ ] `STRIPE_PRICE_ID_ELITE`
- [ ] `STRIPE_PRICE_ID_STANDARD_ANNUAL`
- [ ] `STRIPE_PRICE_ID_VIP_ANNUAL`
- [ ] `STRIPE_PRICE_ID_ELITE_ANNUAL`
- (Note: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are auto-injected.)

---

## 2. Billing End-to-End

- [ ] iOS sandbox subscription purchase works through RevenueCat.
- [ ] Android test subscription purchase works through RevenueCat.
- [ ] RevenueCat offerings are exactly `standard`, `vip`, `elite`.
- [ ] RevenueCat entitlements are exactly `standard`, `vip`, `elite`.
- [ ] Monthly and annual packages exist for each tier.
- [ ] User subscription state syncs correctly back to Supabase.
- [ ] Web Stripe checkout works for monthly plans.
- [x] Web Stripe checkout works for annual plans. *(Edge function fixed to read billingPeriod and select annual price IDs.)*
- [ ] Promo codes apply correctly during web checkout. *(Edge function now passes promo code to Stripe — verify end-to-end.)*

---

## 3. Supabase Production State

### Schema + Migrations
Run in this order against the production Supabase SQL editor:
- [ ] `database/schema.sql` applied
- [ ] `database/migrations/002_rls_policies.sql` applied
- [ ] `database/migrations/003_indexes.sql` applied (empty, skip OK)
- [ ] `database/migrations/004_auto_profile_trigger.sql` through `043_lock_down_profile_updates.sql` applied in order

### Edge Functions
Deploy with:
```
supabase functions deploy create-checkout-session --project-ref xhzjpubapkrgtdkvnfck
supabase functions deploy stripe-webhook --project-ref xhzjpubapkrgtdkvnfck
```
- [ ] Edge function `create-checkout-session` deployed *(annual billing + promo codes now fixed)*
- [ ] Edge function `stripe-webhook` deployed *(annual price ID mapping now fixed)*
- [ ] Any RevenueCat webhook function exists and is deployed if native billing uses it.

### Stripe Webhook Endpoint
Configure in Stripe Dashboard → Developers → Webhooks:
```
https://xhzjpubapkrgtdkvnfck.supabase.co/functions/v1/stripe-webhook
```
Events to enable:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.payment_succeeded`
- `customer.subscription.trial_will_end`
- [ ] Webhook endpoint configured in Stripe dashboard
- [ ] `STRIPE_WEBHOOK_SECRET` (whsec_...) copied from Stripe and set in Supabase secrets

### RLS Verification
- [ ] RLS policies tested with real user, coach, and admin accounts.

---

## 4. Native Build Verification

- [ ] Run `npx eas-cli@latest build --platform ios --profile production`.
- [ ] Run `npx eas-cli@latest build --platform android --profile production`.
- [ ] Install both builds on physical devices.
- [ ] Smoke test login.
- [ ] Smoke test onboarding.
- [ ] Smoke test subscription flow.
- [ ] Smoke test program access.
- [ ] Smoke test admin screens.
- [ ] Smoke test photo/camera flows.
- [ ] Smoke test push notification permission.
- [ ] Smoke test offline/error states.

---

## 5. Store Readiness

- [ ] App Store bundle ID is `com.thebecomingmethod.app`.
- [ ] Play package is `com.thebecomingmethod.app`.
- [ ] Privacy policy URL is live.
- [ ] Terms URL is live.
- [ ] App privacy/data safety disclosures match app behavior.
- [ ] Screenshots are complete.
- [ ] Icons are complete.
- [ ] Age rating is complete.
- [ ] Support URL is complete.
- [ ] Subscription metadata is complete.
- [ ] Apple and Google subscription products are approved or ready for review.

---

## 6. Extra Safety Checks

- [x] Lint passes clean (0 warnings, 0 errors).
- [x] Jest tests pass (24/24).
- [x] TypeScript `tsc --noEmit` passes with 0 errors.
- [ ] `npx expo-doctor` — run before build.
- [ ] Clean install from scratch: remove `node_modules`, reinstall, run lint/test/audit.
- [ ] Test fresh-user onboarding against production-like Supabase project.
- [ ] Test expired/canceled subscription behavior.
- [ ] Test users cannot access higher tiers without entitlement.
- [ ] Test admin-only routes with non-admin users.
- [ ] Test Stripe and RevenueCat webhook retries/idempotency.
- [ ] Review logs for leaked secrets or noisy startup errors.
- [ ] Do a TestFlight release and Google internal testing release before public launch.

---

## 7. Known Open Issues (Updated)

- [x] Annual Stripe price IDs — now set in `.env` and edge functions fixed to use them.
- [x] Checkout ignored `billingPeriod` — **fixed** in `create-checkout-session` v5.
- [x] Checkout ignored promo codes — **fixed** in `create-checkout-session` v5.
- [x] Webhook didn't map annual price IDs — **fixed** in `stripe-webhook` v2 (also added metadata fallback).
- [ ] `EXPO_PUBLIC_RC_GOOGLE_KEY` is still a placeholder — replace when Android billing is ready.
- [ ] Native billing is disabled (`EXPO_PUBLIC_NATIVE_BILLING_SYNC_ENABLED` not set) — intentional until RevenueCat→Supabase webhook is built.
- [ ] RevenueCat to Supabase sync is not implemented — needed before enabling native billing.
- [ ] Supabase schema and migrations not yet confirmed applied to production.
- [ ] Edge functions not yet confirmed deployed to production.

---

## Suggested Working Order

1. Apply database schema + all migrations to production Supabase.
2. Set Supabase edge function secrets (Stripe keys + price IDs).
3. Deploy both edge functions.
4. Configure Stripe webhook endpoint.
5. Set EAS secrets + replace Google RevenueCat placeholder.
6. Run billing end-to-end tests with real test accounts.
7. Native build verification.
8. Store readiness + TestFlight / internal track.
