/**
 * Workout Programs — 6 structured training programs
 *
 * Each program has:
 *  - metadata (name, description, level, duration)
 *  - weeks containing workout days
 *  - each day has a list of exercises with target reps/sets
 */

import { ExerciseId } from './exercises';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProgramExercise {
    exerciseId: ExerciseId;
    targetSets: number;
    targetReps: number;        // 0 = timed exercise (e.g. plank 30s)
    targetHoldSeconds?: number; // For hold exercises
}

export interface WorkoutDay {
    name: string;               // e.g. "Day 1: Full Body"
    exercises: ProgramExercise[];
}

export interface ProgramWeek {
    weekNumber: number;
    days: WorkoutDay[];
}

export interface Program {
    id: string;
    name: string;
    description: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'senior';
    durationWeeks: number;
    icon: string;
    image: string;              // Path to program cover image
    color: string;              // Accent color for the card
    weeks: ProgramWeek[];
}

// ─── Program Definitions ─────────────────────────────────────────────────────

export const PROGRAMS: Program[] = [
    {
        id: 'beginner-strength',
        name: 'Beginner Strength',
        description: 'Build a solid foundation with basic compound movements.',
        level: 'beginner',
        durationWeeks: 4,
        icon: 'BS',
        image: '/programs/beginner-strength.png',
        color: '#22c55e',
        weeks: [
            {
                weekNumber: 1,
                days: [
                    {
                        name: 'Day 1: Foundation',
                        exercises: [
                            { exerciseId: 'squat', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'pushup', targetSets: 3, targetReps: 8 },
                            { exerciseId: 'bicep_curl', targetSets: 3, targetReps: 12 },
                        ],
                    },
                    {
                        name: 'Day 2: Core & Legs',
                        exercises: [
                            { exerciseId: 'lunge', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'plank', targetSets: 3, targetReps: 0, targetHoldSeconds: 30 },
                            { exerciseId: 'calf_raise', targetSets: 3, targetReps: 15 },
                        ],
                    },
                    {
                        name: 'Day 3: Upper Body',
                        exercises: [
                            { exerciseId: 'shoulder_press', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'tricep_extension', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'lateral_raise', targetSets: 3, targetReps: 12 },
                        ],
                    },
                ],
            },
            {
                weekNumber: 2,
                days: [
                    {
                        name: 'Day 1: Progression',
                        exercises: [
                            { exerciseId: 'squat', targetSets: 4, targetReps: 10 },
                            { exerciseId: 'pushup', targetSets: 4, targetReps: 10 },
                            { exerciseId: 'hammer_curl', targetSets: 3, targetReps: 12 },
                        ],
                    },
                    {
                        name: 'Day 2: Lower & Core',
                        exercises: [
                            { exerciseId: 'lunge', targetSets: 4, targetReps: 12 },
                            { exerciseId: 'situp', targetSets: 3, targetReps: 15 },
                            { exerciseId: 'plank', targetSets: 3, targetReps: 0, targetHoldSeconds: 40 },
                        ],
                    },
                    {
                        name: 'Day 3: Arms & Shoulders',
                        exercises: [
                            { exerciseId: 'bicep_curl', targetSets: 4, targetReps: 12 },
                            { exerciseId: 'shoulder_press', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'tricep_extension', targetSets: 3, targetReps: 12 },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'full-body-starter',
        name: 'Full Body Starter',
        description: 'Hit every muscle group in efficient full-body sessions.',
        level: 'beginner',
        durationWeeks: 3,
        icon: 'FB',
        image: '/programs/full-body.png',
        color: '#38bdf8',
        weeks: [
            {
                weekNumber: 1,
                days: [
                    {
                        name: 'Day 1: Total Body',
                        exercises: [
                            { exerciseId: 'squat', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'pushup', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'bicep_curl', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'plank', targetSets: 3, targetReps: 0, targetHoldSeconds: 30 },
                        ],
                    },
                    {
                        name: 'Day 2: Strength Focus',
                        exercises: [
                            { exerciseId: 'lunge', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'shoulder_press', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'tricep_extension', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'situp', targetSets: 3, targetReps: 15 },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'push-pull-legs',
        name: 'Push Pull Legs',
        description: 'Classic PPL split for balanced muscle development.',
        level: 'intermediate',
        durationWeeks: 4,
        icon: 'PPL',
        image: '/programs/push-pull-legs.png',
        color: '#a855f7',
        weeks: [
            {
                weekNumber: 1,
                days: [
                    {
                        name: 'Push Day',
                        exercises: [
                            { exerciseId: 'pushup', targetSets: 4, targetReps: 12 },
                            { exerciseId: 'shoulder_press', targetSets: 4, targetReps: 10 },
                            { exerciseId: 'tricep_extension', targetSets: 3, targetReps: 15 },
                            { exerciseId: 'lateral_raise', targetSets: 3, targetReps: 12 },
                        ],
                    },
                    {
                        name: 'Pull Day',
                        exercises: [
                            { exerciseId: 'bicep_curl', targetSets: 4, targetReps: 12 },
                            { exerciseId: 'hammer_curl', targetSets: 3, targetReps: 12 },
                        ],
                    },
                    {
                        name: 'Leg Day',
                        exercises: [
                            { exerciseId: 'squat', targetSets: 4, targetReps: 12 },
                            { exerciseId: 'lunge', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'jump_squat', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'calf_raise', targetSets: 4, targetReps: 15 },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'upper-body-builder',
        name: 'Upper Body Builder',
        description: 'Sculpt your arms, shoulders, and chest.',
        level: 'intermediate',
        durationWeeks: 4,
        icon: 'UB',
        image: '/programs/upper-body.png',
        color: '#f43f5e',
        weeks: [
            {
                weekNumber: 1,
                days: [
                    {
                        name: 'Day 1: Chest & Triceps',
                        exercises: [
                            { exerciseId: 'pushup', targetSets: 4, targetReps: 15 },
                            { exerciseId: 'tricep_extension', targetSets: 4, targetReps: 12 },
                        ],
                    },
                    {
                        name: 'Day 2: Shoulders & Arms',
                        exercises: [
                            { exerciseId: 'shoulder_press', targetSets: 4, targetReps: 10 },
                            { exerciseId: 'lateral_raise', targetSets: 4, targetReps: 12 },
                            { exerciseId: 'bicep_curl', targetSets: 4, targetReps: 12 },
                            { exerciseId: 'hammer_curl', targetSets: 3, targetReps: 12 },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'core-strength',
        name: 'Core Strength',
        description: 'Build a rock-solid core with targeted ab exercises.',
        level: 'beginner',
        durationWeeks: 3,
        icon: 'CS',
        image: '/programs/core-strength.png',
        color: '#eab308',
        weeks: [
            {
                weekNumber: 1,
                days: [
                    {
                        name: 'Day 1: Core Basics',
                        exercises: [
                            { exerciseId: 'plank', targetSets: 3, targetReps: 0, targetHoldSeconds: 30 },
                            { exerciseId: 'situp', targetSets: 3, targetReps: 15 },
                            { exerciseId: 'mountain_climber', targetSets: 3, targetReps: 20 },
                        ],
                    },
                    {
                        name: 'Day 2: Core + Stability',
                        exercises: [
                            { exerciseId: 'plank', targetSets: 3, targetReps: 0, targetHoldSeconds: 45 },
                            { exerciseId: 'situp', targetSets: 4, targetReps: 20 },
                            { exerciseId: 'mountain_climber', targetSets: 3, targetReps: 25 },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'leg-power',
        name: 'Leg Power',
        description: 'Build explosive lower body strength and power.',
        level: 'intermediate',
        durationWeeks: 4,
        icon: 'LP',
        image: '/programs/leg-power.png',
        color: '#06b6d4',
        weeks: [
            {
                weekNumber: 1,
                days: [
                    {
                        name: 'Day 1: Strength',
                        exercises: [
                            { exerciseId: 'squat', targetSets: 5, targetReps: 10 },
                            { exerciseId: 'lunge', targetSets: 4, targetReps: 12 },
                            { exerciseId: 'calf_raise', targetSets: 4, targetReps: 20 },
                        ],
                    },
                    {
                        name: 'Day 2: Power',
                        exercises: [
                            { exerciseId: 'jump_squat', targetSets: 4, targetReps: 10 },
                            { exerciseId: 'squat', targetSets: 4, targetReps: 12 },
                            { exerciseId: 'lunge', targetSets: 3, targetReps: 15 },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'gentle-mobility',
        name: 'Gentle Mobility',
        description: 'Low-impact exercises designed for active seniors and those with mobility concerns.',
        level: 'senior',
        durationWeeks: 4,
        icon: 'GM',
        image: '/programs/gentle-mobility.png',
        color: '#8b5cf6',
        weeks: [
            {
                weekNumber: 1,
                days: [
                    {
                        name: 'Day 1: Gentle Start',
                        exercises: [
                            { exerciseId: 'calf_raise', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'squat', targetSets: 2, targetReps: 6 },
                            { exerciseId: 'plank', targetSets: 2, targetReps: 0, targetHoldSeconds: 15 },
                        ],
                    },
                    {
                        name: 'Day 2: Light Movement',
                        exercises: [
                            { exerciseId: 'bicep_curl', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'lateral_raise', targetSets: 2, targetReps: 6 },
                            { exerciseId: 'calf_raise', targetSets: 2, targetReps: 10 },
                        ],
                    },
                ],
            },
            {
                weekNumber: 2,
                days: [
                    {
                        name: 'Day 1: Steady Progress',
                        exercises: [
                            { exerciseId: 'squat', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'bicep_curl', targetSets: 2, targetReps: 10 },
                            { exerciseId: 'plank', targetSets: 2, targetReps: 0, targetHoldSeconds: 20 },
                        ],
                    },
                    {
                        name: 'Day 2: Balance Day',
                        exercises: [
                            { exerciseId: 'calf_raise', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'lunge', targetSets: 2, targetReps: 6 },
                            { exerciseId: 'lateral_raise', targetSets: 2, targetReps: 8 },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'active-aging',
        name: 'Active Aging',
        description: 'Stay strong and independent with safe, effective strength training.',
        level: 'senior',
        durationWeeks: 4,
        icon: 'AA',
        image: '/programs/active-aging.png',
        color: '#14b8a6',
        weeks: [
            {
                weekNumber: 1,
                days: [
                    {
                        name: 'Day 1: Foundation',
                        exercises: [
                            { exerciseId: 'squat', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'pushup', targetSets: 2, targetReps: 5 },
                            { exerciseId: 'bicep_curl', targetSets: 2, targetReps: 10 },
                            { exerciseId: 'plank', targetSets: 2, targetReps: 0, targetHoldSeconds: 15 },
                        ],
                    },
                    {
                        name: 'Day 2: Functional',
                        exercises: [
                            { exerciseId: 'lunge', targetSets: 2, targetReps: 6 },
                            { exerciseId: 'shoulder_press', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'calf_raise', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'situp', targetSets: 2, targetReps: 8 },
                        ],
                    },
                ],
            },
            {
                weekNumber: 2,
                days: [
                    {
                        name: 'Day 1: Building Up',
                        exercises: [
                            { exerciseId: 'squat', targetSets: 3, targetReps: 8 },
                            { exerciseId: 'pushup', targetSets: 2, targetReps: 6 },
                            { exerciseId: 'hammer_curl', targetSets: 2, targetReps: 10 },
                            { exerciseId: 'plank', targetSets: 2, targetReps: 0, targetHoldSeconds: 20 },
                        ],
                    },
                    {
                        name: 'Day 2: Endurance',
                        exercises: [
                            { exerciseId: 'lunge', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'lateral_raise', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'calf_raise', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'situp', targetSets: 2, targetReps: 10 },
                        ],
                    },
                ],
            },
        ],
    },
];

export function getProgramById(id: string): Program | undefined {
    return PROGRAMS.find((p) => p.id === id);
}
