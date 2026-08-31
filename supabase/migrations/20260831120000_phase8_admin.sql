-- ═══════════════════════════════════════════════════════════════════════════
-- IronTrack Phase 8 — admin portal foundation
--
--   admin_users     — who may open /admin (role for future least-privilege)
--   exercise_flags  — kill-switch per exercise (rows are OVERRIDES; an
--                     exercise with no row is live). App reads these to hide
--                     disabled exercises; only the server (service role) writes.
--   admin_actions   — audit log: every admin write is recorded
--   user_profiles.plan — 'free' | 'pro': manual for now, Stripe writes it
--                     later; the admin portal reads + edits it
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── admin_users ─────────────────────────────────────────────────────────────

create table if not exists public.admin_users (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    role       text not null default 'owner' check (role in ('owner', 'support', 'analyst')),
    created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- A signed-in user may check ONLY their own admin status (gates the /admin UI).
-- No insert/update/delete policies: admins are managed with the service role
-- or from this SQL editor.
drop policy if exists "own admin row select" on public.admin_users;
create policy "own admin row select" on public.admin_users
    for select using (auth.uid() = user_id);

-- Bootstrap the owner (no-op if the account doesn't exist yet)
insert into public.admin_users (user_id, role)
select id, 'owner' from auth.users where email = 'isaacchukwuka67@gmail.com'
on conflict (user_id) do nothing;

-- ─── exercise_flags ──────────────────────────────────────────────────────────

create table if not exists public.exercise_flags (
    exercise_id text primary key,
    enabled     boolean not null default true,
    updated_at  timestamptz not null default now(),
    updated_by  uuid references auth.users(id) on delete set null
);

alter table public.exercise_flags enable row level security;

-- Every signed-in user reads the flags (the app hides disabled exercises);
-- writes happen only through the admin API (service role bypasses RLS).
drop policy if exists "flags readable" on public.exercise_flags;
create policy "flags readable" on public.exercise_flags
    for select using (auth.role() = 'authenticated');

-- ─── admin_actions (audit) ───────────────────────────────────────────────────

create table if not exists public.admin_actions (
    id         bigint generated always as identity primary key,
    admin_id   uuid not null references auth.users(id) on delete cascade,
    action     text not null,               -- e.g. 'exercise.disable', 'user.set_plan'
    target     text,                        -- exercise id / user id / etc.
    metadata   jsonb not null default '{}',
    created_at timestamptz not null default now()
);

alter table public.admin_actions enable row level security;
-- No client policies at all: service-role only, immutable.

-- ─── user plan (monetization-ready) ─────────────────────────────────────────

alter table public.user_profiles
    add column if not exists plan text not null default 'free'
        check (plan in ('free', 'pro')),
    add column if not exists plan_updated_at timestamptz;
