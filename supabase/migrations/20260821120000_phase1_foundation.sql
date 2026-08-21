-- ═══════════════════════════════════════════════════════════════════════════
-- IronTrack Phase 1 — Data Foundation
--
-- Adds the persistence layer the app has been missing:
--   user_profiles     — stable user attributes (extends auth.users, 1:1)
--   program_progress  — server-side program position (was localStorage)
--   workout_sessions  — one row per workout (groups sets)
--   workout_sets      — per-set detail incl. CV form results, weight, RPE
--   events            — append-only event stream (feed/notifications/AI later)
--   save_workout_v1() — atomic save: session + sets + record + stats + events
--
-- Existing tables (user_stats, workout_records) are NOT modified; the RPC
-- writes workout_records in the same shape the client always has, so the
-- progress page keeps working unchanged.
--
-- Apply via the Supabase dashboard SQL editor, or `supabase db push` if the
-- CLI is linked. Safe to re-run: everything is IF NOT EXISTS / OR REPLACE.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── user_profiles ───────────────────────────────────────────────────────────
-- Stable attributes. Everything nullable: the app must never force users to
-- provide information the current onboarding doesn't collect.

create table if not exists public.user_profiles (
    user_id                        uuid primary key references auth.users(id) on delete cascade,
    age                            int,
    sex                            text,
    height_cm                      numeric,
    weight_kg                      numeric,
    fitness_experience             text,        -- 'new' | 'some' | 'regular' | 'gentle'
    primary_goal                   text,        -- intake Goal values
    secondary_goal                 text,
    preferred_workout_days         int,         -- days per week
    preferred_workout_duration_min int,
    equipment                      text[],      -- 'bodyweight' | 'dumbbell' | 'barbell' | 'machine'
    exercise_preferences           text[],      -- exercise ids the user likes
    exercise_dislikes              text[],      -- exercise ids the user avoids
    limitations                    text[],      -- 'knees' | 'shoulders' | 'back'
    dietary_preferences            text[],
    recommended_program_id         text,        -- from coach intake
    intake_completed_at            timestamptz,
    created_at                     timestamptz not null default now(),
    updated_at                     timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "own profile select" on public.user_profiles;
create policy "own profile select" on public.user_profiles
    for select using (auth.uid() = user_id);
drop policy if exists "own profile insert" on public.user_profiles;
create policy "own profile insert" on public.user_profiles
    for insert with check (auth.uid() = user_id);
drop policy if exists "own profile update" on public.user_profiles;
create policy "own profile update" on public.user_profiles
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── program_progress ────────────────────────────────────────────────────────
-- Server-side source of truth for "where am I in this program".
-- localStorage remains a device-local cache only.

create table if not exists public.program_progress (
    user_id           uuid not null references auth.users(id) on delete cascade,
    program_id        text not null,
    completed_days    int[] not null default '{}',   -- global 0-based day indices
    current_day_index int,                            -- next day to do
    is_modified       boolean not null default false, -- program deviates from template
    started_at        timestamptz not null default now(),
    last_session_at   timestamptz,
    updated_at        timestamptz not null default now(),
    primary key (user_id, program_id)
);

alter table public.program_progress enable row level security;

drop policy if exists "own progress select" on public.program_progress;
create policy "own progress select" on public.program_progress
    for select using (auth.uid() = user_id);
drop policy if exists "own progress insert" on public.program_progress;
create policy "own progress insert" on public.program_progress
    for insert with check (auth.uid() = user_id);
drop policy if exists "own progress update" on public.program_progress;
create policy "own progress update" on public.program_progress
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── workout_sessions ────────────────────────────────────────────────────────
-- One row per completed workout. Groups the per-set rows below.

create table if not exists public.workout_sessions (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null references auth.users(id) on delete cascade,
    source            text not null default 'free' check (source in ('free', 'program')),
    program_id        text,
    program_day_index int,
    program_day_name  text,
    started_at        timestamptz,
    completed_at      timestamptz not null default now(),
    duration_seconds  int,
    total_reps        int,
    avg_form_score    int,
    xp_gained         int
);

create index if not exists workout_sessions_user_completed_idx
    on public.workout_sessions (user_id, completed_at desc);

alter table public.workout_sessions enable row level security;

drop policy if exists "own sessions select" on public.workout_sessions;
create policy "own sessions select" on public.workout_sessions
    for select using (auth.uid() = user_id);
drop policy if exists "own sessions insert" on public.workout_sessions;
create policy "own sessions insert" on public.workout_sessions
    for insert with check (auth.uid() = user_id);

-- ─── workout_sets ────────────────────────────────────────────────────────────
-- Per-set detail: what the CV pipeline actually observed, plus weight/RPE
-- columns that Phase 4 (adaptive training) will start filling.

create table if not exists public.workout_sets (
    id               uuid primary key default gen_random_uuid(),
    user_id          uuid not null references auth.users(id) on delete cascade,
    session_id       uuid not null references public.workout_sessions(id) on delete cascade,
    exercise_id      text not null,
    set_number       int not null,
    target_reps      int,
    completed_reps   int,
    weight_kg        numeric,                          -- not captured yet (Phase 4)
    rpe              int check (rpe between 1 and 10), -- not captured yet (Phase 4)
    form_score       int,
    good_reps        int,
    poor_reps        int,
    hold_seconds     int,                              -- hold-mode exercises
    duration_seconds int,
    rest_seconds     int,                              -- rest before this set
    completed_at     timestamptz not null default now()
);

create index if not exists workout_sets_session_idx
    on public.workout_sets (session_id);
create index if not exists workout_sets_user_exercise_idx
    on public.workout_sets (user_id, exercise_id, completed_at desc);

alter table public.workout_sets enable row level security;

drop policy if exists "own sets select" on public.workout_sets;
create policy "own sets select" on public.workout_sets
    for select using (auth.uid() = user_id);
drop policy if exists "own sets insert" on public.workout_sets;
create policy "own sets insert" on public.workout_sets
    for insert with check (auth.uid() = user_id);

-- ─── events ──────────────────────────────────────────────────────────────────
-- Append-only stream of everything meaningful that happens. Powers the future
-- activity feed, notifications, analytics, and AI memory. Deliberately has no
-- update/delete policies: rows are immutable once written.

create table if not exists public.events (
    id          bigint generated always as identity primary key,
    user_id     uuid not null references auth.users(id) on delete cascade,
    event_type  text not null,
    exercise_id text,
    session_id  uuid,
    metadata    jsonb not null default '{}',
    created_at  timestamptz not null default now()
);

create index if not exists events_user_created_idx
    on public.events (user_id, created_at desc);
create index if not exists events_user_type_idx
    on public.events (user_id, event_type, created_at desc);

alter table public.events enable row level security;

drop policy if exists "own events select" on public.events;
create policy "own events select" on public.events
    for select using (auth.uid() = user_id);
drop policy if exists "own events insert" on public.events;
create policy "own events insert" on public.events
    for insert with check (auth.uid() = user_id);

-- ─── updated_at maintenance ──────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists user_profiles_touch on public.user_profiles;
create trigger user_profiles_touch
    before update on public.user_profiles
    for each row execute function public.touch_updated_at();

drop trigger if exists program_progress_touch on public.program_progress;
create trigger program_progress_touch
    before update on public.program_progress
    for each row execute function public.touch_updated_at();

-- ─── save_workout_v1 ─────────────────────────────────────────────────────────
-- Atomic workout save. In one transaction:
--
--   1. workout_sessions row
--   2. workout_sets rows (per-set CV results)
--   3. workout_records row (legacy shape — progress page reads this)
--   4. WORKOUT_COMPLETED event (+ PROGRAM_DAY_COMPLETED)
--   5. program_progress upsert when a program day was finished
--
-- user_stats stays client-updated (its exact column types predate this
-- migration); stats are recomputable aggregates, so they can safely follow
-- in a second write — the irreplaceable workout data is what's atomic here.
--
-- SECURITY INVOKER: runs with the caller's rights, so RLS applies and the
-- user id always comes from the JWT, never from the payload.

create or replace function public.save_workout_v1(payload jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
    v_user       uuid := auth.uid();
    v_session_id uuid;
    v_record_id  text;
    v_set        jsonb;
    v_day        jsonb := payload->'program_day_completed';
begin
    if v_user is null then
        raise exception 'not authenticated';
    end if;

    -- 1. Session
    insert into public.workout_sessions
        (user_id, source, program_id, program_day_index, program_day_name,
         started_at, duration_seconds, total_reps, avg_form_score, xp_gained)
    values
        (v_user,
         coalesce(payload->>'source', 'free'),
         payload->>'program_id',
         (payload->>'program_day_index')::int,
         payload->>'program_day_name',
         (payload->>'started_at')::timestamptz,
         (payload->>'duration_seconds')::int,
         (payload->>'total_reps')::int,
         (payload->>'avg_form_score')::int,
         (payload->>'xp_gained')::int)
    returning id into v_session_id;

    -- 2. Sets
    for v_set in select * from jsonb_array_elements(coalesce(payload->'sets', '[]'::jsonb))
    loop
        insert into public.workout_sets
            (user_id, session_id, exercise_id, set_number, target_reps,
             completed_reps, form_score, good_reps, poor_reps, hold_seconds,
             duration_seconds, rest_seconds, completed_at)
        values
            (v_user, v_session_id,
             v_set->>'exercise_id',
             (v_set->>'set_number')::int,
             (v_set->>'target_reps')::int,
             (v_set->>'completed_reps')::int,
             (v_set->>'form_score')::int,
             (v_set->>'good_reps')::int,
             (v_set->>'poor_reps')::int,
             (v_set->>'hold_seconds')::int,
             (v_set->>'duration_seconds')::int,
             (v_set->>'rest_seconds')::int,
             coalesce((v_set->>'completed_at')::timestamptz, now()));
    end loop;

    -- 3. Legacy per-workout record (same shape the client used to insert)
    insert into public.workout_records
        (user_id, exercise_id, exercise_name, reps, form_quality,
         time_under_tension, duration, xp_gained)
    values
        (v_user,
         payload->>'exercise_id',
         payload->>'exercise_name',
         (payload->>'total_reps')::int,
         (payload->>'avg_form_score')::int,
         (payload->>'time_under_tension')::int,
         (payload->>'duration_seconds')::int,
         (payload->>'xp_gained')::int)
    returning id::text into v_record_id;

    -- 4. Completion event
    insert into public.events (user_id, event_type, exercise_id, session_id, metadata)
    values (v_user, 'WORKOUT_COMPLETED', payload->>'exercise_id', v_session_id,
            jsonb_build_object(
                'total_reps', (payload->>'total_reps')::int,
                'avg_form_score', (payload->>'avg_form_score')::int,
                'duration_seconds', (payload->>'duration_seconds')::int,
                'xp_gained', (payload->>'xp_gained')::int,
                'set_count', jsonb_array_length(coalesce(payload->'sets', '[]'::jsonb)),
                'source', coalesce(payload->>'source', 'free'),
                'program_id', payload->>'program_id',
                'workout_name', payload->>'exercise_name'));

    -- 5. Program day completed → progress + event
    if v_day is not null and v_day <> 'null'::jsonb then
        insert into public.program_progress
            (user_id, program_id, completed_days, current_day_index, last_session_at)
        values
            (v_user, v_day->>'program_id',
             array[(v_day->>'day_index')::int],
             (v_day->>'day_index')::int + 1,
             now())
        on conflict (user_id, program_id) do update set
            completed_days = (
                select coalesce(array_agg(distinct d order by d), '{}')
                from unnest(program_progress.completed_days || excluded.completed_days) d
            ),
            current_day_index = greatest(
                coalesce(program_progress.current_day_index, 0),
                (v_day->>'day_index')::int + 1),
            last_session_at = now();

        insert into public.events (user_id, event_type, session_id, metadata)
        values (v_user, 'PROGRAM_DAY_COMPLETED', v_session_id,
                jsonb_build_object(
                    'program_id', v_day->>'program_id',
                    'day_index', (v_day->>'day_index')::int,
                    'day_name', payload->>'program_day_name'));
    end if;

    return jsonb_build_object('session_id', v_session_id, 'record_id', v_record_id);
end;
$$;

grant execute on function public.save_workout_v1(jsonb) to authenticated;
