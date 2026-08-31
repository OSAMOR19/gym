/**
 * Gamification System — XP, Levels, Badges, Streaks
 *
 * XP formula: reps × (formScore / 50) × base multiplier
 * Levels: every 500 XP
 * Streaks: consecutive days with at least 1 workout
 * Badges: milestone achievements
 */

import { createClient } from '../utils/supabase/client';
import { cached, invalidateDataCache } from './dataCache';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    condition: (stats: UserStats) => boolean;
}

export interface UserStats {
    totalXP: number;
    level: number;
    totalWorkouts: number;
    totalReps: number;
    currentStreak: number;
    longestStreak: number;
    lastWorkoutDate: string | null;
    earnedBadges: string[];
    perfectFormReps: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const XP_PER_LEVEL = 500;

// ─── Badge Definitions ───────────────────────────────────────────────────────

export const BADGES: Badge[] = [
    {
        id: 'first_workout',
        name: 'First Steps',
        description: 'Complete your first workout',
        icon: 'target',
        condition: (s) => s.totalWorkouts >= 1,
    },
    {
        id: 'ten_workouts',
        name: 'Dedicated',
        description: 'Complete 10 workouts',
        icon: 'trophy',
        condition: (s) => s.totalWorkouts >= 10,
    },
    {
        id: 'fifty_workouts',
        name: 'Iron Will',
        description: 'Complete 50 workouts',
        icon: 'medal',
        condition: (s) => s.totalWorkouts >= 50,
    },
    {
        id: 'hundred_reps',
        name: 'Century Club',
        description: 'Complete 100 total reps',
        icon: 'century',
        condition: (s) => s.totalReps >= 100,
    },
    {
        id: 'five_hundred_reps',
        name: 'Rep Machine',
        description: 'Complete 500 total reps',
        icon: 'gear',
        condition: (s) => s.totalReps >= 500,
    },
    {
        id: 'thousand_reps',
        name: 'Iron Legend',
        description: 'Complete 1,000 total reps',
        icon: 'crown',
        condition: (s) => s.totalReps >= 1000,
    },
    {
        id: 'perfect_form',
        name: 'Perfect Form',
        description: 'Complete 10 reps with 90%+ form score',
        icon: 'star',
        condition: (s) => s.perfectFormReps >= 10,
    },
    {
        id: 'three_day_streak',
        name: 'On a Roll',
        description: 'Maintain a 3-day workout streak',
        icon: 'flame',
        condition: (s) => s.currentStreak >= 3,
    },
    {
        id: 'seven_day_streak',
        name: 'Week Warrior',
        description: 'Maintain a 7-day workout streak',
        icon: 'bolt',
        condition: (s) => s.longestStreak >= 7,
    },
    {
        id: 'level_five',
        name: 'Rising Star',
        description: 'Reach level 5',
        icon: 'pentagon',
        condition: (s) => s.level >= 5,
    },
    {
        id: 'level_ten',
        name: 'Elite',
        description: 'Reach level 10',
        icon: 'diamond',
        condition: (s) => s.level >= 10,
    },
];

// ─── Default stats ───────────────────────────────────────────────────────────

function defaultStats(): UserStats {
    return {
        totalXP: 0,
        level: 1,
        totalWorkouts: 0,
        totalReps: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        earnedBadges: [],
        perfectFormReps: 0,
    };
}

// ─── Storage (Supabase) ──────────────────────────────────────────────────────

export async function loadStats(): Promise<UserStats> {
    if (typeof window === 'undefined') return defaultStats();
    return cached('user-stats', 60_000, fetchStats);
}

async function fetchStats(): Promise<UserStats> {
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return defaultStats();

    const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error || !data) return defaultStats();

    return {
        totalXP: data.total_xp,
        level: data.level,
        totalWorkouts: data.total_workouts,
        totalReps: data.total_reps,
        currentStreak: data.current_streak,
        longestStreak: data.longest_streak,
        lastWorkoutDate: data.last_workout_date,
        earnedBadges: data.earned_badges || [],
        perfectFormReps: data.perfect_form_reps,
    };
}

/** Returns true if the stats were persisted. */
export async function saveStats(stats: UserStats): Promise<boolean> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // upsert, not update: nothing ever inserts a user_stats row, so a plain
    // UPDATE matched zero rows for new users and their XP silently vanished.
    const { error } = await supabase
        .from('user_stats')
        .upsert({
            user_id: user.id,
            total_xp: stats.totalXP,
            level: stats.level,
            total_workouts: stats.totalWorkouts,
            total_reps: stats.totalReps,
            current_streak: stats.currentStreak,
            longest_streak: stats.longestStreak,
            last_workout_date: stats.lastWorkoutDate,
            earned_badges: stats.earnedBadges,
            perfect_form_reps: stats.perfectFormReps,
        }, { onConflict: 'user_id' });

    if (!error) invalidateDataCache();
    if (error) {
        console.error('[gamification] Failed to save stats:', error.message);
        return false;
    }
    return true;
}

// ─── XP / Level calculations ─────────────────────────────────────────────────

export function calculateXPForWorkout(reps: number, formQuality: number): number {
    const formMultiplier = Math.max(0.5, formQuality / 50); // 0.5× at 0%, 2× at 100%
    return Math.round(reps * formMultiplier * 10); // Base 10 XP per rep
}

export function getLevelFromXP(xp: number): number {
    return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function getXPForCurrentLevel(xp: number): { current: number; required: number } {
    const currentLevelXP = xp % XP_PER_LEVEL;
    return { current: currentLevelXP, required: XP_PER_LEVEL };
}

// ─── Streak calculation ──────────────────────────────────────────────────────

/** Whole calendar days between two dates (local time). */
function calendarDaysBetween(a: Date, b: Date): number {
    const dayA = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const dayB = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((dayB.getTime() - dayA.getTime()) / (1000 * 60 * 60 * 24));
}

function isConsecutiveDay(dateStr: string): boolean {
    // Exactly the previous calendar day — the old "within 48 hours" check
    // let Mon 8AM → Wed 7AM keep a streak despite skipping Tuesday
    return calendarDaysBetween(new Date(dateStr), new Date()) === 1;
}

function isToday(dateStr: string): boolean {
    const date = new Date(dateStr);
    const now = new Date();
    return date.toDateString() === now.toDateString();
}

// ─── Main update function ────────────────────────────────────────────────────

/**
 * Apply a completed workout to a stats snapshot — pure, no I/O.
 * The caller persists the returned stats (workoutSession.completeSession does
 * this together with the workout data itself).
 */
export function applyWorkout(
    current: UserStats,
    reps: number,
    formQuality: number,
    perfectReps: number,
): { stats: UserStats; newBadges: Badge[]; xpGained: number } {
    const stats: UserStats = { ...current, earnedBadges: [...current.earnedBadges] };
    const xpGained = calculateXPForWorkout(reps, formQuality);

    // Update stats
    stats.totalReps += reps;
    stats.totalWorkouts += 1;
    stats.totalXP += xpGained;
    stats.level = getLevelFromXP(stats.totalXP);
    stats.perfectFormReps += perfectReps;

    // Update streak
    const today = new Date().toISOString();
    if (!stats.lastWorkoutDate || !isToday(stats.lastWorkoutDate)) {
        stats.currentStreak = stats.lastWorkoutDate && isConsecutiveDay(stats.lastWorkoutDate)
            ? stats.currentStreak + 1
            : 1;
        stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    }
    stats.lastWorkoutDate = today;

    // Check for new badges
    const newBadges: Badge[] = [];
    for (const badge of BADGES) {
        if (!stats.earnedBadges.includes(badge.id) && badge.condition(stats)) {
            stats.earnedBadges.push(badge.id);
            newBadges.push(badge);
        }
    }

    return { stats, newBadges, xpGained };
}
