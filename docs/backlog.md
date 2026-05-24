# Backlog From Repo Review

This file stands in for GitHub issues in this workspace because the `gh` CLI is not installed here.

## 1. Supabase Schema and RLS
- Priority: critical
- Area: data layer / authorization
- Problem: the app assumes tables, buckets, and policies exist, but the repo snapshot does not include schema or migration files.
- Scope:
  - add the missing schema and migrations
  - define RLS for user-owned, coach-owned, admin-only, and public catalog data
  - verify storage policies for progress photos and any future uploads
- Acceptance criteria:
  - user reads are limited to self-owned data unless the user is a coach or admin
  - writes to subscriptions and entitlement state are only possible through trusted backend paths
  - admin and coach access is enforced in the database, not only in the client

## 2. Billing Sync and Webhooks
- Priority: critical
- Area: monetization
- Problem: native billing is gated off unless sync is enabled, and the repo does not include the backend handlers that reconcile purchases back to Supabase.
- Scope:
  - implement RevenueCat-to-Supabase sync
  - implement Stripe checkout/webhook handling for web subscriptions
  - verify annual and promo-code paths end to end
- Acceptance criteria:
  - subscription changes update the user tier reliably
  - webhook retries are idempotent
  - native and web billing converge on the same subscription source of truth

## 3. Production Secrets and Env Hygiene
- Priority: high
- Area: deployment safety
- Problem: placeholder keys are still documented, and the repository history has previously included `.env`.
- Scope:
  - rotate any keys that may have been committed
  - replace placeholder env values with real secret-management instructions
  - keep examples in `.env.example` only
- Acceptance criteria:
  - no live secrets are required in versioned files
  - setup docs clearly separate local, staging, and production values

## 4. Privileged Admin Flows
- Priority: high
- Area: administration
- Problem: several admin experiences still depend on client-side assumptions and would benefit from server-side enforcement or a real editor workflow.
- Scope:
  - move sensitive admin mutations behind trusted endpoints or database policies
  - replace any remaining placeholder editors with live implementations or remove them
  - add explicit audit logging for destructive admin actions
- Acceptance criteria:
  - non-admin users cannot reach privileged mutations even with a modified client
  - admin actions are observable and reviewable

## 5. Integration Coverage
- Priority: medium
- Area: quality
- Problem: the repo has useful unit coverage, but the highest-risk flows are still under-tested.
- Scope:
  - add auth bootstrap coverage
  - add billing-tier regression tests
  - add messaging ownership/access tests
  - add route-guard coverage for admin and debug screens
- Acceptance criteria:
  - the main failure modes are covered by tests that fail before release if regressions recur

## 6. Legal and Store Readiness
- Priority: medium
- Area: launch readiness
- Problem: legal, privacy, and app-store materials should be verified against the final backend behavior before launch.
- Scope:
  - review privacy, terms, and disclaimer text against actual data collection
  - align app-store disclosures with the implemented flows
  - verify support and subscription metadata
- Acceptance criteria:
  - legal text matches data collection and retention behavior
  - store metadata matches the shipped experience
