# Supabase Schema and RLS Draft

Status: Draft

## Context

The mobile app talks directly to Supabase for core product data. That means the schema and row-level security policy set are part of the app's trust boundary, not an implementation detail.

This draft is based on the tables and buckets referenced by the current client code.

## Goals

- Prevent cross-user data access by default.
- Allow coaches and admins to manage the content and users they are supposed to manage.
- Keep public catalog data readable without exposing mutable tables.
- Make subscription, billing, and webhook state writeable only by trusted backend paths.

## Data Groups

### User-owned data

These should be readable by the owning user and by privileged staff where needed.

- `profiles`
- `subscriptions`
- `stage_status`
- `workout_logs`
- `set_logs`
- `prs`
- `progress_entries`
- `progress_photos`
- `nutrition_targets`
- `meal_logs`
- `saved_meals`
- `quick_workouts`
- `user_cardio_plan`
- `user_active_modules`
- `message_threads`
- `messages`
- `support_tickets`
- `promo_redemptions`

### Public catalog data

These should be readable by signed-in users and writable only by admins or backend jobs.

- `programs`
- `program_templates`
- `program_weeks`
- `program_days`
- `program_day_exercises`
- `workouts`
- `workout_exercises`
- `exercises`
- `cardio_protocols`
- `training_modules`
- `module_routines`
- `coach_posts`
- `post_likes`
- `post_comments`
- `affiliate_offers`
- `user_activities`
- `promo_codes`

### System / integration data

These should be writeable only by service-role paths or tightly scoped backend functions.

- `push_tokens`
- any billing webhook staging tables
- any future audit/log tables

## Policy Draft

### `profiles`

- Owner can read their own profile.
- Owner can update only self-service fields.
- Coach/admin can read all profiles.
- Admin can update staff/admin management fields.

### `subscriptions`

- Owner can read their own subscription snapshot.
- Writes should come from backend webhook or trusted sync jobs.
- Client writes should be avoided.

### `stage_status`

- Owner can read their own stage.
- Preferred path: backend recomputes stage and persists it.
- If client-side writes remain, restrict them to the owning user and the stage-computed fields only.

### Workout and progress tables

- Owner can read and write only their own rows.
- Coach/admin can read for support and admin tools.
- Delete rules should be limited to owner or admin depending on the table.

### Nutrition tables

- Owner can manage their own targets, logs, and saved meals.
- Staff can read for support and coaching.
- Catalog-like nutrition insights should remain owner-scoped.

### Program tables

- Signed-in users can read published/active catalog data.
- Only admins or trusted generation jobs should create or edit the program structure.
- User-owned generated programs should be readable and mutable only by their owner.

### Messaging

- Owners can create and read their own support/coaching threads.
- Coaches/admins can read and update all threads.
- Messages should inherit thread ownership rules.
- Deletion should be owner/admin only, with staff visibility as required.

### Feed and community

- Published coach posts are readable by signed-in users.
- Likes and comments are owner-scoped for writes.
- Admin/coach can manage posts and moderate comments.

### Promo codes

- Promo code definitions are readable only to staff or via validated backend flow.
- Redemptions are owner-scoped.
- Usage counters should be updated atomically by backend or RPC.

### Storage buckets

- `progress_photos` bucket should allow owner-only upload/read/delete of their own objects.
- Public read should be disabled unless a specific feature needs it.

## Suggested Backend Functions

- `create-checkout-session` for web billing.
- `stripe-webhook` for subscription state sync.
- RevenueCat webhook handler if native billing remains enabled.
- A secure account deletion endpoint or admin workflow.

## Open Questions

- Should `stage_status` remain client-written, or move fully to a server function?
- Should `subscriptions` be treated as read-only from the client once webhooks are live?
- Are coach/admin reads needed for every user-owned table, or only for support and moderation surfaces?
- Should `push_tokens` live in a separate integration schema?

## Notes

- This draft intentionally follows the current client surface instead of inventing tables the app does not use.
- When the actual migration set exists, the policy document should be turned into concrete SQL and tested against real user, coach, and admin accounts.
