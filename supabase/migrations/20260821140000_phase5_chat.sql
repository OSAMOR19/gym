-- ═══════════════════════════════════════════════════════════════════════════
-- IronTrack Phase 5 — AI coach chat
--
--   conversations  — one row per chat thread (title, timestamps)
--   messages       — user/assistant turns within a conversation
--   coach_memory   — durable coach notes about the user (read into context)
--
-- All RLS own-row. Deleting a conversation cascades its messages.
-- Apply after the Phase 1 migration; safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.conversations (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references auth.users(id) on delete cascade,
    title      text not null default 'New conversation',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx
    on public.conversations (user_id, updated_at desc);

alter table public.conversations enable row level security;

drop policy if exists "own conversations select" on public.conversations;
create policy "own conversations select" on public.conversations
    for select using (auth.uid() = user_id);
drop policy if exists "own conversations insert" on public.conversations;
create policy "own conversations insert" on public.conversations
    for insert with check (auth.uid() = user_id);
drop policy if exists "own conversations update" on public.conversations;
create policy "own conversations update" on public.conversations
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own conversations delete" on public.conversations;
create policy "own conversations delete" on public.conversations
    for delete using (auth.uid() = user_id);

-- ─── messages ────────────────────────────────────────────────────────────────

create table if not exists public.messages (
    id              bigint generated always as identity primary key,
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    user_id         uuid not null references auth.users(id) on delete cascade,
    role            text not null check (role in ('user', 'assistant')),
    content         text not null,
    created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_idx
    on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

drop policy if exists "own messages select" on public.messages;
create policy "own messages select" on public.messages
    for select using (auth.uid() = user_id);
drop policy if exists "own messages insert" on public.messages;
create policy "own messages insert" on public.messages
    for insert with check (auth.uid() = user_id);
drop policy if exists "own messages delete" on public.messages;
create policy "own messages delete" on public.messages
    for delete using (auth.uid() = user_id);

-- ─── coach_memory ────────────────────────────────────────────────────────────
-- Durable coach notes (goals confirmed in chat, standing preferences, …).
-- Read into the coach's context; written sparingly by later phases.

create table if not exists public.coach_memory (
    id                     uuid primary key default gen_random_uuid(),
    user_id                uuid not null references auth.users(id) on delete cascade,
    content                text not null,
    category               text,
    source_conversation_id uuid,
    created_at             timestamptz not null default now(),
    updated_at             timestamptz not null default now()
);

create index if not exists coach_memory_user_idx
    on public.coach_memory (user_id, updated_at desc);

alter table public.coach_memory enable row level security;

drop policy if exists "own memory select" on public.coach_memory;
create policy "own memory select" on public.coach_memory
    for select using (auth.uid() = user_id);
drop policy if exists "own memory insert" on public.coach_memory;
create policy "own memory insert" on public.coach_memory
    for insert with check (auth.uid() = user_id);
drop policy if exists "own memory update" on public.coach_memory;
create policy "own memory update" on public.coach_memory
    for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own memory delete" on public.coach_memory;
create policy "own memory delete" on public.coach_memory
    for delete using (auth.uid() = user_id);

-- ─── updated_at maintenance (touch_updated_at() exists since Phase 1) ────────

drop trigger if exists conversations_touch on public.conversations;
create trigger conversations_touch
    before update on public.conversations
    for each row execute function public.touch_updated_at();

drop trigger if exists coach_memory_touch on public.coach_memory;
create trigger coach_memory_touch
    before update on public.coach_memory
    for each row execute function public.touch_updated_at();
