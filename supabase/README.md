# Supabase migrations

The app's schema lives here as plain SQL. There is no linked Supabase CLI in
this repo, so apply migrations through the dashboard:

1. Open the project's **SQL Editor** at
   https://supabase.com/dashboard/project/_/sql
2. Paste the contents of the migration file(s) in `migrations/`, oldest first.
3. Run. Every migration is idempotent (`IF NOT EXISTS` / `OR REPLACE`), so
   re-running is safe.

(If you later link the CLI: `supabase link`, then `supabase db push`.)

## Current state

| Migration | Adds |
|---|---|
| `20260821120000_phase1_foundation.sql` | `user_profiles`, `program_progress`, `workout_sessions`, `workout_sets`, `events`, and the `save_workout_v1` RPC (atomic workout save) |

The two pre-existing tables (`user_stats`, `workout_records`) were created
before this migration system existed and are not modified by it.

**The app runs fine before the migration is applied** — the client falls back
to the old localStorage/per-table writes and logs a console warning. Rich data
(per-set detail, events, server-side program progress, profile) only starts
accumulating once the migration is live, so apply it early.
