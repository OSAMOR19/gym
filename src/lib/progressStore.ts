/**
 * Progress Store — Workout history and stats tracking using Supabase
 */

import { ExerciseId } from './exercises';
import { createClient } from '../utils/supabase/client';

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

// ─── Storage (Supabase) ──────────────────────────────────────────────────────

async function getRecords(): Promise<WorkoutRecord[]> {
    if (typeof window === 'undefined') return [];
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('workout_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true }); // old to new so we can process easily

    if (error || !data) return [];

    return data.map(record => ({
        id: record.id,
        date: record.date,
        exerciseId: record.exercise_id as ExerciseId,
        exerciseName: record.exercise_name,
        reps: record.reps,
        formQuality: record.form_quality,
        timeUnderTension: record.time_under_tension,
        duration: record.duration,
        xpGained: record.xp_gained,
    }));
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Save a completed workout to history.
 */
export async function saveWorkout(record: Omit<WorkoutRecord, 'id' | 'date'>): Promise<WorkoutRecord | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const newRecord = {
        user_id: user.id,
        exercise_id: record.exerciseId,
        exercise_name: record.exerciseName,
        reps: record.reps,
        form_quality: record.formQuality,
        time_under_tension: record.timeUnderTension,
        duration: record.duration,
        xp_gained: record.xpGained,
    };

    const { data, error } = await supabase
        .from('workout_records')
        .insert([newRecord])
        .select()
        .single();

    if (error || !data) return null;

    return {
        id: data.id,
        date: data.date,
        exerciseId: data.exercise_id as ExerciseId,
        exerciseName: data.exercise_name,
        reps: data.reps,
        formQuality: data.form_quality,
        timeUnderTension: data.time_under_tension,
        duration: data.duration,
        xpGained: data.xp_gained,
    };
}

/**
 * Get aggregated progress stats.
 */
export async function getProgressStats(): Promise<ProgressStats> {
    const records = await getRecords();

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
export async function getAllWorkouts(): Promise<WorkoutRecord[]> {
    const records = await getRecords();
    return records.reverse();
}
