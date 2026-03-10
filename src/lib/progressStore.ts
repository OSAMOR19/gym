/**
 * Progress Store — Workout history and stats tracking with localStorage
 *
 * Saves each completed workout as a record and provides
 * aggregation functions for the progress dashboard.
 */

import { ExerciseId } from './exercises';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorkoutRecord {
    id: string;
    date: string;               // ISO string
    exerciseId: ExerciseId;
    exerciseName: string;
    reps: number;
    formQuality: number;
    timeUnderTension: number;
    duration: number;            // seconds
    xpGained: number;
}

export interface WeeklyActivity {
    day: string;                 // "Mon", "Tue", etc.
    reps: number;
    workouts: number;
}

export interface ProgressStats {
    totalReps: number;
    totalWorkouts: number;
    totalDuration: number;       // seconds
    averageFormQuality: number;
    bestFormQuality: number;
    weeklyActivity: WeeklyActivity[];
    recentWorkouts: WorkoutRecord[];
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'irontrack_progress';

function getRecords(): WorkoutRecord[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveRecords(records: WorkoutRecord[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Save a completed workout to history.
 */
export function saveWorkout(record: Omit<WorkoutRecord, 'id' | 'date'>): WorkoutRecord {
    const records = getRecords();
    const newRecord: WorkoutRecord = {
        ...record,
        id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
        date: new Date().toISOString(),
    };
    records.push(newRecord);
    saveRecords(records);
    return newRecord;
}

/**
 * Get aggregated progress stats.
 */
export function getProgressStats(): ProgressStats {
    const records = getRecords();

    const totalReps = records.reduce((sum, r) => sum + r.reps, 0);
    const totalWorkouts = records.length;
    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
    const avgForm = records.length > 0
        ? Math.round(records.reduce((sum, r) => sum + r.formQuality, 0) / records.length)
        : 0;
    const bestForm = records.length > 0
        ? Math.max(...records.map((r) => r.formQuality))
        : 0;

    // Weekly activity for the last 7 days
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const weeklyActivity: WeeklyActivity[] = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayName = days[date.getDay()];
        const dateStr = date.toDateString();

        const dayRecords = records.filter((r) => new Date(r.date).toDateString() === dateStr);
        weeklyActivity.push({
            day: dayName,
            reps: dayRecords.reduce((sum, r) => sum + r.reps, 0),
            workouts: dayRecords.length,
        });
    }

    // Recent workouts (last 10)
    const recentWorkouts = records.slice(-10).reverse();

    return {
        totalReps,
        totalWorkouts,
        totalDuration,
        averageFormQuality: avgForm,
        bestFormQuality: bestForm,
        weeklyActivity,
        recentWorkouts,
    };
}

/**
 * Get all workout records (for detailed history view).
 */
export function getAllWorkouts(): WorkoutRecord[] {
    return getRecords().reverse();
}
