/**
 * Workout Queue — hands a program day's exercises to the workout page.
 *
 * The program detail page stores the selected day here ("Start Day N"), and
 * the workout page consumes it: exercise order, sets, reps, and hold targets.
 * Without this handoff, program days silently opened the default free workout
 * (bicep curls, 10×3) and the entire program definition was ignored.
 *
 * Day completion is tracked in localStorage so the pathway can show progress.
 * (Device-local for now — move to a Supabase table to sync across devices.)
 */

import { ExerciseId } from './exercises';

export interface QueueItem {
    exerciseId: ExerciseId;
    targetSets: number;
    targetReps: number;         // 0 for hold exercises
    targetHoldSeconds?: number;
}

export interface WorkoutQueue {
    programId: string;
    programName: string;
    dayIndex: number;           // global 0-based day index within the program
    dayName: string;
    items: QueueItem[];
}

const QUEUE_KEY = 'irontrack_workout_queue';
const PROGRESS_KEY = 'irontrack_program_progress';

// ─── Queue handoff (sessionStorage: one tab, one pending workout) ───────────

export function setWorkoutQueue(queue: WorkoutQueue): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getWorkoutQueue(): WorkoutQueue | null {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem(QUEUE_KEY);
    if (!raw) return null;
    try {
        const queue = JSON.parse(raw) as WorkoutQueue;
        return Array.isArray(queue.items) && queue.items.length > 0 ? queue : null;
    } catch {
        return null;
    }
}

export function clearWorkoutQueue(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(QUEUE_KEY);
}

// ─── Program day completion (localStorage) ───────────────────────────────────

type ProgressMap = Record<string, number[]>; // programId → completed day indices

function readProgress(): ProgressMap {
    if (typeof window === 'undefined') return {};
    try {
        return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}') as ProgressMap;
    } catch {
        return {};
    }
}

export function getCompletedDays(programId: string): number[] {
    return readProgress()[programId] ?? [];
}

export function markDayCompleted(programId: string, dayIndex: number): void {
    if (typeof window === 'undefined') return;
    const progress = readProgress();
    const days = new Set(progress[programId] ?? []);
    days.add(dayIndex);
    progress[programId] = [...days].sort((a, b) => a - b);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}
