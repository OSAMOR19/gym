/**
 * Gamification System — XP, Levels, Badges, Streaks
 *
 * XP formula: reps × (formScore / 50) × base multiplier
 * Levels: every 500 XP
 * Streaks: consecutive days with at least 1 workout
 * Badges: milestone achievements
 */

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
    perfectFormReps: number;   // Reps with form > 90%
}

// ─── Constants ───────────────────────────────────────────────────────────────

const XP_PER_LEVEL = 500;
const STORAGE_KEY = 'irontrack_gamification';

// ─── Badge Definitions ───────────────────────────────────────────────────────

export const BADGES: Badge[] = [
    {
        id: 'first_workout',
        name: 'First Steps',
        description: 'Complete your first workout',
        icon: '🎯',
        condition: (s) => s.totalWorkouts >= 1,
    },
    {
        id: 'ten_workouts',
        name: 'Dedicated',
        description: 'Complete 10 workouts',
        icon: '🏆',
        condition: (s) => s.totalWorkouts >= 10,
    },
    {
        id: 'fifty_workouts',
        name: 'Iron Will',
        description: 'Complete 50 workouts',
        icon: '🥇',
        condition: (s) => s.totalWorkouts >= 50,
    },
    {
        id: 'hundred_reps',
        name: 'Century Club',
        description: 'Complete 100 total reps',
        icon: '💯',
        condition: (s) => s.totalReps >= 100,
    },
    {
        id: 'five_hundred_reps',
        name: 'Rep Machine',
        description: 'Complete 500 total reps',
        icon: '⚙️',
        condition: (s) => s.totalReps >= 500,
    },
    {
        id: 'thousand_reps',
        name: 'Iron Legend',
        description: 'Complete 1,000 total reps',
        icon: '👑',
        condition: (s) => s.totalReps >= 1000,
    },
    {
        id: 'perfect_form',
        name: 'Perfect Form',
        description: 'Complete 10 reps with 90%+ form score',
        icon: '✨',
        condition: (s) => s.perfectFormReps >= 10,
    },
    {
        id: 'three_day_streak',
        name: 'On a Roll',
        description: 'Maintain a 3-day workout streak',
        icon: '🔥',
        condition: (s) => s.currentStreak >= 3,
    },
    {
        id: 'seven_day_streak',
        name: 'Week Warrior',
        description: 'Maintain a 7-day workout streak',
        icon: '⚡',
        condition: (s) => s.longestStreak >= 7,
    },
    {
        id: 'level_five',
        name: 'Rising Star',
        description: 'Reach level 5',
        icon: '⭐',
        condition: (s) => s.level >= 5,
    },
    {
        id: 'level_ten',
        name: 'Elite',
        description: 'Reach level 10',
        icon: '💎',
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

// ─── Storage ─────────────────────────────────────────────────────────────────

export function loadStats(): UserStats {
    if (typeof window === 'undefined') return defaultStats();
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? { ...defaultStats(), ...JSON.parse(data) } : defaultStats();
    } catch {
        return defaultStats();
    }
}

export function saveStats(stats: UserStats): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
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

function isConsecutiveDay(dateStr: string): boolean {
    const last = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
    return diffHours < 48; // Within 48 hours counts as consecutive
}

function isToday(dateStr: string): boolean {
    const date = new Date(dateStr);
    const now = new Date();
    return date.toDateString() === now.toDateString();
}

// ─── Main update function ────────────────────────────────────────────────────

/**
 * Record a completed workout and update all gamification stats.
 * Returns newly earned badges (if any).
 */
export function recordWorkout(
    reps: number,
    formQuality: number,
    perfectReps: number,
): { stats: UserStats; newBadges: Badge[]; xpGained: number } {
    const stats = loadStats();
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
        if (stats.lastWorkoutDate && isConsecutiveDay(stats.lastWorkoutDate)) {
            stats.currentStreak += 1;
        } else if (!stats.lastWorkoutDate || !isConsecutiveDay(stats.lastWorkoutDate)) {
            stats.currentStreak = 1;
        }
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

    saveStats(stats);

    return { stats, newBadges, xpGained };
}
