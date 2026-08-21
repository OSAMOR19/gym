/**
 * Program Progress — server-persisted program position (`program_progress`).
 *
 * Supabase is the source of truth; the localStorage copy that workoutQueue
 * maintains is a device cache so the calendar renders instantly. Day
 * completion from a finished workout is written atomically by the
 * save_workout_v1 RPC — this module handles reads and reconciliation.
 */

import { createClient } from '../utils/supabase/client';
import { getCompletedDays, markDayCompleted } from './workoutQueue';

export interface ProgramPosition {
    completedDays: number[];
    currentDayIndex: number | null;
    lastSessionAt: string | null;
}

/** Server-side position in a program; null when signed out, no row yet, or
 *  the table is unavailable. */
export async function getProgramPosition(programId: string): Promise<ProgramPosition | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('program_progress')
        .select('completed_days, current_day_index, last_session_at')
        .eq('user_id', user.id)
        .eq('program_id', programId)
        .maybeSingle();

    if (error || !data) return null;
    return {
        completedDays: data.completed_days ?? [],
        currentDayIndex: data.current_day_index,
        lastSessionAt: data.last_session_at,
    };
}

/** Server copy of completed days; null when signed out or table unavailable. */
async function getServerCompletedDays(programId: string): Promise<number[] | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('program_progress')
        .select('completed_days')
        .eq('user_id', user.id)
        .eq('program_id', programId)
        .maybeSingle();

    if (error) return null;          // table missing / offline → cache only
    return data?.completed_days ?? [];
}

/**
 * Reconcile local and server progress for a program and return the union.
 * Days the server is missing (recorded on this device before the migration,
 * or while offline) are pushed up; days from other devices land in the local
 * cache. Safe to call on every page view.
 */
export async function syncProgramProgress(programId: string): Promise<number[]> {
    const local = getCompletedDays(programId);
    try {
        const server = await getServerCompletedDays(programId);
        if (server === null) return local;

        const merged = [...new Set([...local, ...server])].sort((a, b) => a - b);

        // Pull: cache days from other devices locally
        for (const day of merged) {
            if (!local.includes(day)) markDayCompleted(programId, day);
        }

        // Push: server is missing days this device knows about
        if (merged.some((day) => !server.includes(day))) {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('program_progress').upsert({
                    user_id: user.id,
                    program_id: programId,
                    completed_days: merged,
                    current_day_index: merged.length > 0 ? Math.max(...merged) + 1 : 0,
                }, { onConflict: 'user_id,program_id' });
            }
        }

        return merged;
    } catch {
        return local;
    }
}
