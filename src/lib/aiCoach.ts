/**
 * AI Coach — Rule-based coaching feedback system
 *
 * Provides:
 *  1. Real-time tips during workout (based on rep state + form quality)
 *  2. Post-workout summary with scores and suggestions
 */

import { RepEngineResult } from './repEngine';
import { ExerciseConfig } from './exercises';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CoachTip {
    message: string;
    type: 'encouragement' | 'technique' | 'warning';
    icon: string;
}

export interface WorkoutSummary {
    totalReps: number;
    formScore: number;         // 0–100
    romScore: number;          // Range of motion score 0–100
    tempoScore: number;        // Consistency of rep timing 0–100
    duration: number;          // seconds
    coachNotes: string[];      // AI suggestions
}

// ─── Real-time coaching messages ─────────────────────────────────────────────

const ENCOURAGEMENT_MESSAGES = [
    { message: 'Great rep! 🔥', icon: '🔥' },
    { message: 'Perfect form!', icon: '✨' },
    { message: 'You\'re crushing it!', icon: '💪' },
    { message: 'Keep that energy!', icon: '⚡' },
    { message: 'Beast mode activated!', icon: '🦁' },
    { message: 'Excellent control!', icon: '🎯' },
];

const TECHNIQUE_TIPS: Record<string, CoachTip[]> = {
    slowDown: [
        { message: 'Slow down the lowering phase', type: 'technique', icon: '🐢' },
        { message: 'Control the eccentric — time under tension matters', type: 'technique', icon: '⏱️' },
    ],
    engageCore: [
        { message: 'Engage your core', type: 'technique', icon: '🎯' },
        { message: 'Brace your abs throughout the movement', type: 'technique', icon: '💎' },
    ],
    breathe: [
        { message: 'Remember to breathe — exhale on exertion', type: 'technique', icon: '💨' },
    ],
    fullRom: [
        { message: 'Focus on full range of motion', type: 'technique', icon: '📏' },
        { message: 'Go through the complete movement', type: 'technique', icon: '🔄' },
    ],
};

// ─── State tracking for coaching ─────────────────────────────────────────────

let lastTipTime = 0;
let lastRepTime = 0;
let repTimes: number[] = [];
let totalFormScores: number[] = [];

/**
 * Reset coaching state — call when starting a new workout.
 */
export function resetCoach(): void {
    lastTipTime = 0;
    lastRepTime = 0;
    repTimes = [];
    totalFormScores = [];
}

/**
 * Get a coaching tip based on current workout state.
 * Returns null if no tip should be shown (to avoid spamming).
 *
 * Tips are rate-limited to one every 5 seconds minimum.
 */
export function getCoachTip(
    result: RepEngineResult,
    exercise: ExerciseConfig
): CoachTip | null {
    const now = Date.now();

    // Rate limit tips: at most one every 5 seconds
    if (now - lastTipTime < 5000) return null;

    // Track rep timing for tempo analysis
    if (result.repJustCounted) {
        if (lastRepTime > 0) {
            repTimes.push((now - lastRepTime) / 1000);
        }
        lastRepTime = now;
        totalFormScores.push(result.formQuality);
    }

    let tip: CoachTip | null = null;

    // If a rep was just counted, give encouragement for good form
    if (result.repJustCounted && result.formQuality >= 80) {
        const msg = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];
        tip = { ...msg, type: 'encouragement' };
    }

    // Form corrections take priority
    if (result.formCorrections.length > 0) {
        tip = {
            message: result.formCorrections[0].message,
            type: 'warning',
            icon: '⚠️',
        };
    }

    // If reps are too fast (less than 1.5s per rep), suggest slowing down
    if (repTimes.length >= 3) {
        const avgTime = repTimes.slice(-3).reduce((a, b) => a + b, 0) / 3;
        if (avgTime < 1.5 && !tip) {
            const tips = TECHNIQUE_TIPS.slowDown;
            tip = tips[Math.floor(Math.random() * tips.length)];
        }
    }

    // Occasionally remind about form quality if it's dropping
    if (result.formQuality > 0 && result.formQuality < 60 && !tip) {
        const tips = TECHNIQUE_TIPS.fullRom;
        tip = tips[Math.floor(Math.random() * tips.length)];
    }

    // If we have a tip, update the last tip time
    if (tip) {
        lastTipTime = now;
    }

    return tip;
}

/**
 * Generate a post-workout summary with AI coaching suggestions.
 */
export function generateWorkoutSummary(
    totalReps: number,
    formQuality: number,
    timeUnderTension: number,
    duration: number,
    exerciseName: string,
): WorkoutSummary {
    // ROM score: based on average form quality
    const romScore = Math.min(100, Math.max(0, formQuality * 1.1));

    // Tempo score: based on consistency of rep timing
    let tempoScore = 80; // default
    if (repTimes.length >= 3) {
        const avgTime = repTimes.reduce((a, b) => a + b, 0) / repTimes.length;
        const variance = repTimes.reduce((sum, t) => sum + (t - avgTime) ** 2, 0) / repTimes.length;
        const stdDev = Math.sqrt(variance);
        // Lower variance = better tempo consistency
        tempoScore = Math.max(0, Math.min(100, Math.round(100 - stdDev * 30)));
    }

    // Generate coach notes
    const notes: string[] = [];

    if (formQuality >= 80) {
        notes.push(`Excellent form on your ${exerciseName.toLowerCase()}s! Keep it up.`);
    } else if (formQuality >= 60) {
        notes.push(`Your ${exerciseName.toLowerCase()} form is decent. Focus on full range of motion to improve.`);
    } else {
        notes.push(`Work on your ${exerciseName.toLowerCase()} form. Try slower, controlled reps with lighter weight.`);
    }

    if (tempoScore < 60) {
        notes.push('Try to maintain a more consistent tempo between reps.');
    }

    if (totalReps >= 20) {
        notes.push('Great volume today! Make sure to stretch and recover.');
    }

    if (timeUnderTension > 0 && totalReps > 0) {
        const avgTension = timeUnderTension / totalReps;
        if (avgTension < 2) {
            notes.push('Slow down your reps — aim for 3-4 seconds per rep for better muscle activation.');
        }
    }

    return {
        totalReps,
        formScore: formQuality,
        romScore: Math.round(romScore),
        tempoScore,
        duration,
        coachNotes: notes,
    };
}
