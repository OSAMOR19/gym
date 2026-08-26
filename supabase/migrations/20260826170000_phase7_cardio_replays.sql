-- ═══════════════════════════════════════════════════════════════════════════
-- IronTrack Phase 7 — cardio sessions + workout replays
--
--   cardio_sessions  — one row per completed cardio workout (summary only —
--                      pose landmarks stay ephemeral on-device; distance and
--                      calories carry a source label so estimates are never
--                      presented as measurements)
--   workout_replays  — metadata for the ~25s recap videos; the MP4/WebM
--                      binary lives in the PRIVATE `replays` storage bucket,
--                      never in a database row
--
-- All RLS own-row / own-folder. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── cardio_sessions ─────────────────────────────────────────────────────────

create table if not exists public.cardio_sessions (
    id               uuid primary key default gen_random_uuid(),
    user_id          uuid not null references auth.users(id) on delete cascade,
    activity_type    text not null check (activity_type in
                         ('walking', 'running', 'treadmill_walk', 'treadmill_run', 'jump_rope')),
    started_at       timestamptz not null,
    completed_at     timestamptz not null default now(),
    duration_seconds int not null,
    steps            int,                -- camera-derived (estimated)
    avg_cadence      int,                -- steps/min, camera-derived (estimated)
    peak_cadence     int,
    treadmill_speed_kmh numeric,         -- user input (measured input), null otherwise
    distance_km      numeric,
    distance_source  text check (distance_source in ('treadmill_input', 'estimated')),
    est_calories     int,                -- MET-based estimate, always "estimated"
    form_score       int,                -- posture/consistency 0-100 where applicable
    metadata         jsonb not null default '{}'::jsonb,
    created_at       timestamptz not null default now()
);

create index if not exists cardio_sessions_user_idx
    on public.cardio_sessions (user_id, completed_at desc);

alter table public.cardio_sessions enable row level security;

drop policy if exists "own cardio select" on public.cardio_sessions;
create policy "own cardio select" on public.cardio_sessions
    for select using (auth.uid() = user_id);
drop policy if exists "own cardio insert" on public.cardio_sessions;
create policy "own cardio insert" on public.cardio_sessions
    for insert with check (auth.uid() = user_id);
drop policy if exists "own cardio delete" on public.cardio_sessions;
create policy "own cardio delete" on public.cardio_sessions
    for delete using (auth.uid() = user_id);

-- ─── workout_replays ─────────────────────────────────────────────────────────
-- The database stores ONLY references + metadata. Deleting a source workout
-- keeps the replay (the user's video memory); deleting a replay row is done
-- by the app together with its storage objects.

create table if not exists public.workout_replays (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid not null references auth.users(id) on delete cascade,
    workout_id        uuid references public.workout_sessions(id) on delete set null,
    cardio_session_id uuid references public.cardio_sessions(id) on delete set null,
    workout_type      text not null check (workout_type in ('strength', 'cardio')),
    storage_path      text not null,      -- replays/{user_id}/{id}.webm|mp4
    thumbnail_path    text,               -- replays/{user_id}/{id}.jpg
    duration_seconds  numeric not null,
    status            text not null default 'ready'
                          check (status in ('pending', 'processing', 'ready', 'failed', 'deleted')),
    metadata          jsonb not null default '{}'::jsonb,  -- stats snapshot shown in the library
    created_at        timestamptz not null default now()
);

create index if not exists workout_replays_user_idx
    on public.workout_replays (user_id, created_at desc);

alter table public.workout_replays enable row level security;

drop policy if exists "own replays select" on public.workout_replays;
create policy "own replays select" on public.workout_replays
    for select using (auth.uid() = user_id);
drop policy if exists "own replays insert" on public.workout_replays;
create policy "own replays insert" on public.workout_replays
    for insert with check (auth.uid() = user_id);
drop policy if exists "own replays update" on public.workout_replays;
create policy "own replays update" on public.workout_replays
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own replays delete" on public.workout_replays;
create policy "own replays delete" on public.workout_replays
    for delete using (auth.uid() = user_id);

-- ─── replays storage bucket (PRIVATE — playback goes through signed URLs) ───

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('replays', 'replays', false, 26214400,  -- 25MB cap per object
        array['video/webm', 'video/mp4', 'image/jpeg'])
on conflict (id) do update
    set public = false,
        file_size_limit = 26214400,
        allowed_mime_types = array['video/webm', 'video/mp4', 'image/jpeg'];

drop policy if exists "own replay files select" on storage.objects;
create policy "own replay files select" on storage.objects
    for select using (
        bucket_id = 'replays' and auth.uid()::text = (storage.foldername(name))[1]
    );
drop policy if exists "own replay files insert" on storage.objects;
create policy "own replay files insert" on storage.objects
    for insert with check (
        bucket_id = 'replays' and auth.uid()::text = (storage.foldername(name))[1]
    );
drop policy if exists "own replay files delete" on storage.objects;
create policy "own replay files delete" on storage.objects
    for delete using (
        bucket_id = 'replays' and auth.uid()::text = (storage.foldername(name))[1]
    );
