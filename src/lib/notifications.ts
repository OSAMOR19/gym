/**
 * Notifications — the user-facing feed derived from the events stream.
 *
 * The events table is the source of truth (append-only, RLS own-row); this
 * layer picks the event types worth surfacing, turns their jsonb metadata
 * into human copy, and tracks read state client-side (a "last seen"
 * timestamp in localStorage — no schema change needed).
 *
 * Every mapper is defensive: metadata shapes evolved across phases, so a
 * missing field degrades to generic copy, never to a crash.
 */

import { createClient } from '../utils/supabase/client';
import { EXERCISES } from './exercises';
import { getProgramById } from './programs';
import type { WorkoutEventType } from './events';

export interface AppNotification {
    id: string;
    type: WorkoutEventType;
    kind: 'workout' | 'program' | 'cardio' | 'replay' | 'coach' | 'pr';
    title: string;
    body: string;
    href?: string;
    createdAt: Date;
}

/** Event types that become notifications (the rest are analytics noise). */
const NOTIFY_TYPES: WorkoutEventType[] = [
    'WORKOUT_COMPLETED',
    'PROGRAM_DAY_COMPLETED',
    'CARDIO_COMPLETED',
    'REPLAY_CREATED',
    'WORKOUT_MODIFIED',
    'INTAKE_COMPLETED',
    'PROGRAM_SELECTED',
    'PR_RECORDED',
];

const SEEN_KEY = 'irontrack_notifs_seen_at';
/** Fired on markAllSeen so badges elsewhere in the app can clear live. */
export const NOTIFS_SEEN_EVENT = 'irontrack-notifs-seen';

interface EventRow {
    id: string;
    event_type: WorkoutEventType;
    exercise_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function exerciseName(id: string | null): string | null {
    if (!id) return null;
    return (EXERCISES as Record<string, { name?: string }>)[id]?.name ?? null;
}

function programName(id: unknown): string | null {
    const pid = str(id);
    return pid ? getProgramById(pid)?.name ?? null : null;
}

function build(row: EventRow): AppNotification | null {
    const m = row.metadata ?? {};
    const base = { id: row.id, type: row.event_type, createdAt: new Date(row.created_at) };

    switch (row.event_type) {
        case 'WORKOUT_COMPLETED': {
            const name = str(m.workout_name) ?? exerciseName(row.exercise_id) ?? 'Session';
            const parts: string[] = [];
            const reps = num(m.total_reps);
            const form = num(m.avg_form_score);
            const xp = num(m.xp_gained);
            if (reps) parts.push(`${reps} reps`);
            if (form) parts.push(`form ${form}%`);
            if (xp) parts.push(`+${xp} XP`);
            return {
                ...base, kind: 'workout',
                title: `Workout complete — ${name}`,
                body: parts.length ? parts.join(' · ') : 'Saved to your training history.',
                href: '/progress',
            };
        }
        case 'PROGRAM_DAY_COMPLETED': {
            const pid = str(m.program_id);
            const pname = programName(pid) ?? 'your program';
            const dayIdx = num(m.day_index);
            const day = str(m.day_name) ?? (dayIdx !== null ? `Day ${dayIdx + 1}` : 'A day');
            return {
                ...base, kind: 'program',
                title: `${day} of ${pname} done`,
                body: 'Nice work — your next day is queued up.',
                href: pid ? `/programs/${pid}` : '/programs',
            };
        }
        case 'CARDIO_COMPLETED': {
            const parts: string[] = [];
            const steps = num(m.steps);
            const km = num(m.distance_km) ?? num(m.distanceKm);
            const secs = num(m.duration_seconds) ?? num(m.durationSeconds);
            if (steps) parts.push(`${steps} steps`);
            if (km) parts.push(`${km} km`);
            if (secs) parts.push(`${Math.max(1, Math.round(secs / 60))} min`);
            return {
                ...base, kind: 'cardio',
                title: 'Cardio session saved',
                body: parts.length ? parts.join(' · ') : 'Logged to your training history.',
                href: '/cardio',
            };
        }
        case 'REPLAY_CREATED':
            return {
                ...base, kind: 'replay',
                title: 'Your highlight reel is ready',
                body: 'Watch, share, or save your workout replay.',
                href: '/replays',
            };
        case 'WORKOUT_MODIFIED': {
            const reasons = Array.isArray(m.reasons)
                ? (m.reasons as unknown[]).filter((r): r is string => typeof r === 'string')
                : [];
            return {
                ...base, kind: 'coach',
                title: 'Coach adjusted your session',
                body: reasons.length ? reasons.join(' · ') : 'Tuned to match your recent training.',
            };
        }
        case 'INTAKE_COMPLETED': {
            const pid = str(m.program_id) ?? str(m.recommended_program_id);
            const pname = programName(pid);
            return {
                ...base, kind: 'coach',
                title: 'Your training plan is ready',
                body: pname ? `The coach picked ${pname} for you.` : 'The coach picked a program for you.',
                href: pid ? `/programs/${pid}` : '/programs',
            };
        }
        case 'PROGRAM_SELECTED': {
            const pid = str(m.program_id);
            const pname = programName(pid) ?? 'a new program';
            return {
                ...base, kind: 'program',
                title: `Program started — ${pname}`,
                body: 'Day 1 is waiting whenever you are.',
                href: pid ? `/programs/${pid}` : '/programs',
            };
        }
        case 'PR_RECORDED': {
            const name = exerciseName(row.exercise_id) ?? str(m.exercise_name) ?? 'an exercise';
            const reps = num(m.reps) ?? num(m.value);
            return {
                ...base, kind: 'pr',
                title: 'New personal record',
                body: reps ? `${name} — ${reps} reps. That's a new best.` : `A new best on ${name}.`,
                href: '/progress',
            };
        }
        default:
            return null;
    }
}

/** Newest-first feed. Empty array when signed out / table missing. */
export async function fetchNotifications(limit = 60): Promise<AppNotification[]> {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('events')
            .select('id, event_type, exercise_id, metadata, created_at')
            .eq('user_id', user.id)
            .in('event_type', NOTIFY_TYPES)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error || !data) return [];
        return (data as EventRow[])
            .map(build)
            .filter((n): n is AppNotification => n !== null);
    } catch {
        return [];
    }
}

export function getLastSeen(): number {
    try {
        return Number(localStorage.getItem(SEEN_KEY)) || 0;
    } catch {
        return 0;
    }
}

export function countUnseen(notifications: AppNotification[]): number {
    const seen = getLastSeen();
    return notifications.filter((n) => n.createdAt.getTime() > seen).length;
}

export function markAllSeen(): void {
    try {
        localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch { /* private mode */ }
    window.dispatchEvent(new CustomEvent(NOTIFS_SEEN_EVENT));
}
