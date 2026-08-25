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
    /** Never surfaced by the coach intake — for programs that need an explicit
     *  self-selection (e.g. prenatal), not an algorithmic recommendation. */
    excludeFromIntake?: boolean;
    weeks: ProgramWeek[];
}

/**
 * What each level is CALLED in the UI. 'senior' stays as the internal value
 * (it's stored in program data and intake scoring), but on screen it reads
 * as "Gentle" — "Senior" made these programs sound like advanced training
 * rather than an easy, welcoming pace for older adults.
 */
export const LEVEL_LABELS: Record<Program['level'], string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    senior: 'Gentle',
};

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
        description: 'Low-impact standing and seated exercises for joint health, balance, and flexibility.',
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
                        name: 'Day 1: Standing Balance',
                        exercises: [
                            { exerciseId: 'calf_raise', targetSets: 2, targetReps: 6 },
                            { exerciseId: 'squat', targetSets: 2, targetReps: 5 }, // shallow, chair-assisted
                            { exerciseId: 'lateral_raise', targetSets: 2, targetReps: 5 },
                        ],
                    },
                    {
                        name: 'Day 2: Gentle Arms',
                        exercises: [
                            { exerciseId: 'bicep_curl', targetSets: 2, targetReps: 6 },
                            { exerciseId: 'shoulder_press', targetSets: 2, targetReps: 5 },
                            { exerciseId: 'calf_raise', targetSets: 2, targetReps: 8 },
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
                            { exerciseId: 'calf_raise', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'squat', targetSets: 2, targetReps: 6 },
                            { exerciseId: 'bicep_curl', targetSets: 2, targetReps: 8 },
                        ],
                    },
                    {
                        name: 'Day 2: Balance & Flexibility',
                        exercises: [
                            { exerciseId: 'lateral_raise', targetSets: 2, targetReps: 6 },
                            { exerciseId: 'shoulder_press', targetSets: 2, targetReps: 6 },
                            { exerciseId: 'calf_raise', targetSets: 2, targetReps: 10 },
                        ],
                    },
                ],
            },
            {
                weekNumber: 3,
                days: [
                    {
                        name: 'Day 1: Building Confidence',
                        exercises: [
                            { exerciseId: 'squat', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'bicep_curl', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'lateral_raise', targetSets: 2, targetReps: 8 },
                        ],
                    },
                    {
                        name: 'Day 2: Gentle Cardio',
                        exercises: [
                            { exerciseId: 'calf_raise', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'jumping_jacks', targetSets: 2, targetReps: 5 },
                            { exerciseId: 'shoulder_press', targetSets: 2, targetReps: 6 },
                        ],
                    },
                ],
            },
            {
                weekNumber: 4,
                days: [
                    {
                        name: 'Day 1: Full Routine',
                        exercises: [
                            { exerciseId: 'calf_raise', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'squat', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'bicep_curl', targetSets: 2, targetReps: 10 },
                            { exerciseId: 'lateral_raise', targetSets: 2, targetReps: 8 },
                        ],
                    },
                    {
                        name: 'Day 2: Active Day',
                        exercises: [
                            { exerciseId: 'jumping_jacks', targetSets: 2, targetReps: 6 },
                            { exerciseId: 'shoulder_press', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'calf_raise', targetSets: 3, targetReps: 10 },
                        ],
                    },
                ],
            },
        ],
    },
    // ─── NEW PROGRAMS ─────────────────────────────────────────────────────────
    {
        id: 'barbell-basics',
        name: 'Barbell Basics',
        description: 'Master the big compound barbell lifts for full-body strength.',
        level: 'intermediate',
        durationWeeks: 4,
        icon: 'BB',
        image: '/programs/beginner-strength.png',
        color: '#f59e0b',
        weeks: [
            {
                weekNumber: 1,
                days: [
                    {
                        name: 'Day 1: Push',
                        exercises: [
                            { exerciseId: 'bench_press', targetSets: 4, targetReps: 8 },
                            { exerciseId: 'incline_bench_press', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'overhead_press', targetSets: 3, targetReps: 8 },
                        ],
                    },
                    {
                        name: 'Day 2: Pull',
                        exercises: [
                            { exerciseId: 'deadlift', targetSets: 4, targetReps: 5 },
                            { exerciseId: 'barbell_row', targetSets: 4, targetReps: 8 },
                            { exerciseId: 'romanian_deadlift', targetSets: 3, targetReps: 10 },
                        ],
                    },
                    {
                        name: 'Day 3: Legs',
                        exercises: [
                            { exerciseId: 'barbell_squat', targetSets: 4, targetReps: 8 },
                            { exerciseId: 'front_squat', targetSets: 3, targetReps: 6 },
                            { exerciseId: 'hip_thrust_barbell', targetSets: 3, targetReps: 12 },
                        ],
                    },
                ],
            },
            {
                weekNumber: 2,
                days: [
                    {
                        name: 'Day 1: Push (Progression)',
                        exercises: [
                            { exerciseId: 'bench_press', targetSets: 4, targetReps: 10 },
                            { exerciseId: 'overhead_press', targetSets: 4, targetReps: 8 },
                            { exerciseId: 'incline_bench_press', targetSets: 3, targetReps: 12 },
                        ],
                    },
                    {
                        name: 'Day 2: Pull (Progression)',
                        exercises: [
                            { exerciseId: 'deadlift', targetSets: 5, targetReps: 5 },
                            { exerciseId: 'barbell_row', targetSets: 4, targetReps: 10 },
                            { exerciseId: 'romanian_deadlift', targetSets: 3, targetReps: 12 },
                        ],
                    },
                    {
                        name: 'Day 3: Legs (Progression)',
                        exercises: [
                            { exerciseId: 'barbell_squat', targetSets: 5, targetReps: 8 },
                            { exerciseId: 'hip_thrust_barbell', targetSets: 4, targetReps: 12 },
                            { exerciseId: 'front_squat', targetSets: 3, targetReps: 8 },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'dumbbell-sculptor',
        name: 'Dumbbell Sculptor',
        description: 'Shape every muscle group with targeted dumbbell exercises.',
        level: 'beginner',
        durationWeeks: 3,
        icon: 'DS',
        image: '/programs/upper-body.png',
        color: '#ec4899',
        weeks: [
            {
                weekNumber: 1,
                days: [
                    {
                        name: 'Day 1: Chest & Shoulders',
                        exercises: [
                            { exerciseId: 'chest_press', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'incline_chest_press', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'dumbbell_fly', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'front_raise', targetSets: 3, targetReps: 12 },
                        ],
                    },
                    {
                        name: 'Day 2: Back & Arms',
                        exercises: [
                            { exerciseId: 'dumbbell_row', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'dumbbell_deadlift', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'bicep_curl', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'tricep_kickback', targetSets: 3, targetReps: 12 },
                        ],
                    },
                    {
                        name: 'Day 3: Legs',
                        exercises: [
                            { exerciseId: 'goblet_squat', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'dumbbell_deadlift', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'walking_lunges', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'glute_bridge', targetSets: 3, targetReps: 15 },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'machine-muscle',
        name: 'Machine Muscle',
        description: 'Gym machine circuit — perfect for beginners learning movement patterns.',
        level: 'beginner',
        durationWeeks: 3,
        icon: 'MM',
        image: '/programs/full-body.png',
        color: '#8b5cf6',
        weeks: [
            {
                weekNumber: 1,
                days: [
                    {
                        name: 'Day 1: Upper Body Push',
                        exercises: [
                            { exerciseId: 'chest_press_machine', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'cable_lateral_raise', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'cable_tricep_pushdown', targetSets: 3, targetReps: 15 },
                        ],
                    },
                    {
                        name: 'Day 2: Upper Body Pull',
                        exercises: [
                            { exerciseId: 'lat_pulldown', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'seated_row', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'cable_bicep_curl', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'pec_deck', targetSets: 3, targetReps: 12 },
                        ],
                    },
                    {
                        name: 'Day 3: Lower Body',
                        exercises: [
                            { exerciseId: 'leg_press', targetSets: 4, targetReps: 12 },
                            { exerciseId: 'leg_extension', targetSets: 3, targetReps: 15 },
                            { exerciseId: 'leg_curl', targetSets: 3, targetReps: 12 },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'cardio-burn',
        name: 'Cardio Burn',
        description: 'High-energy functional cardio to torch calories and build conditioning.',
        level: 'intermediate',
        durationWeeks: 3,
        icon: 'CB',
        image: '/programs/core-strength.png',
        color: '#ef4444',
        weeks: [
            {
                weekNumber: 1,
                days: [
                    {
                        name: 'Day 1: Power Cardio',
                        exercises: [
                            { exerciseId: 'box_jumps', targetSets: 4, targetReps: 10 },
                            { exerciseId: 'burpees', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'jump_squat', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'high_knees', targetSets: 3, targetReps: 30 },
                        ],
                    },
                    {
                        name: 'Day 2: Endurance Circuit',
                        exercises: [
                            { exerciseId: 'jump_rope', targetSets: 3, targetReps: 50 },
                            { exerciseId: 'kettlebell_swing', targetSets: 4, targetReps: 15 },
                            { exerciseId: 'battle_ropes', targetSets: 3, targetReps: 20 },
                            { exerciseId: 'jumping_jacks', targetSets: 3, targetReps: 30 },
                        ],
                    },
                    {
                        name: 'Day 3: Functional Strength',
                        exercises: [
                            { exerciseId: 'farmers_walk', targetSets: 3, targetReps: 20 },
                            { exerciseId: 'rowing_machine', targetSets: 3, targetReps: 20 },
                            { exerciseId: 'burpees', targetSets: 4, targetReps: 10 },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'core-abs-blast',
        name: 'Core & Abs Blast',
        description: 'Targeted ab and core exercises for a rock-solid midsection.',
        level: 'beginner',
        durationWeeks: 3,
        icon: 'CAB',
        image: '/programs/core-strength.png',
        color: '#06b6d4',
        weeks: [
            {
                weekNumber: 1,
                days: [
                    {
                        name: 'Day 1: Core Foundation',
                        exercises: [
                            { exerciseId: 'plank', targetSets: 3, targetReps: 0, targetHoldSeconds: 30 },
                            { exerciseId: 'crunches', targetSets: 3, targetReps: 20 },
                            { exerciseId: 'reverse_crunch', targetSets: 3, targetReps: 15 },
                            { exerciseId: 'bicycle_crunch', targetSets: 3, targetReps: 20 },
                        ],
                    },
                    {
                        name: 'Day 2: Abs & Obliques',
                        exercises: [
                            { exerciseId: 'russian_twists', targetSets: 3, targetReps: 20 },
                            { exerciseId: 'toe_touches', targetSets: 3, targetReps: 20 },
                            { exerciseId: 'flutter_kicks', targetSets: 3, targetReps: 30 },
                            { exerciseId: 'leg_raises', targetSets: 3, targetReps: 15 },
                        ],
                    },
                    {
                        name: 'Day 3: Advanced Core',
                        exercises: [
                            { exerciseId: 'hanging_leg_raises', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'ab_rollout', targetSets: 3, targetReps: 8 },
                            { exerciseId: 'plank_shoulder_taps', targetSets: 3, targetReps: 20 },
                            { exerciseId: 'mountain_climber', targetSets: 3, targetReps: 20 },
                        ],
                    },
                ],
            },
            {
                weekNumber: 2,
                days: [
                    {
                        name: 'Day 1: Core Progression',
                        exercises: [
                            { exerciseId: 'plank', targetSets: 3, targetReps: 0, targetHoldSeconds: 45 },
                            { exerciseId: 'crunches', targetSets: 4, targetReps: 25 },
                            { exerciseId: 'reverse_crunch', targetSets: 4, targetReps: 20 },
                            { exerciseId: 'bicycle_crunch', targetSets: 3, targetReps: 30 },
                        ],
                    },
                    {
                        name: 'Day 2: Obliques & Lower Abs',
                        exercises: [
                            { exerciseId: 'russian_twists', targetSets: 4, targetReps: 25 },
                            { exerciseId: 'flutter_kicks', targetSets: 4, targetReps: 40 },
                            { exerciseId: 'leg_raises', targetSets: 4, targetReps: 15 },
                            { exerciseId: 'toe_touches', targetSets: 3, targetReps: 20 },
                        ],
                    },
                ],
            },
        ],
    },
    // ─── ORIGINAL active-aging continues ────────────────────────────────────
    {
        id: 'active-aging',
        name: 'Active Aging',
        description: 'Stay strong and independent with functional exercises for daily life.',
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
                        name: 'Day 1: Leg Strength',
                        exercises: [
                            { exerciseId: 'calf_raise', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'squat', targetSets: 2, targetReps: 6 },
                            { exerciseId: 'lunge', targetSets: 2, targetReps: 4 },
                        ],
                    },
                    {
                        name: 'Day 2: Arm Strength',
                        exercises: [
                            { exerciseId: 'bicep_curl', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'shoulder_press', targetSets: 2, targetReps: 6 },
                            { exerciseId: 'tricep_extension', targetSets: 2, targetReps: 6 },
                        ],
                    },
                    {
                        name: 'Day 3: Light Cardio',
                        exercises: [
                            { exerciseId: 'jumping_jacks', targetSets: 2, targetReps: 5 },
                            { exerciseId: 'calf_raise', targetSets: 2, targetReps: 10 },
                            { exerciseId: 'lateral_raise', targetSets: 2, targetReps: 6 },
                        ],
                    },
                ],
            },
            {
                weekNumber: 2,
                days: [
                    {
                        name: 'Day 1: Lower Body Focus',
                        exercises: [
                            { exerciseId: 'squat', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'calf_raise', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'lunge', targetSets: 2, targetReps: 5 },
                        ],
                    },
                    {
                        name: 'Day 2: Upper Body Focus',
                        exercises: [
                            { exerciseId: 'bicep_curl', targetSets: 2, targetReps: 10 },
                            { exerciseId: 'shoulder_press', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'lateral_raise', targetSets: 2, targetReps: 8 },
                        ],
                    },
                    {
                        name: 'Day 3: Active Recovery',
                        exercises: [
                            { exerciseId: 'jumping_jacks', targetSets: 2, targetReps: 6 },
                            { exerciseId: 'calf_raise', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'plank', targetSets: 1, targetReps: 0, targetHoldSeconds: 10 },
                        ],
                    },
                ],
            },
            {
                weekNumber: 3,
                days: [
                    {
                        name: 'Day 1: Functional Strength',
                        exercises: [
                            { exerciseId: 'squat', targetSets: 3, targetReps: 8 },
                            { exerciseId: 'lunge', targetSets: 2, targetReps: 6 },
                            { exerciseId: 'calf_raise', targetSets: 3, targetReps: 10 },
                        ],
                    },
                    {
                        name: 'Day 2: Arm Day',
                        exercises: [
                            { exerciseId: 'bicep_curl', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'tricep_extension', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'shoulder_press', targetSets: 2, targetReps: 8 },
                        ],
                    },
                    {
                        name: 'Day 3: Gentle Movement',
                        exercises: [
                            { exerciseId: 'jumping_jacks', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'lateral_raise', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'plank', targetSets: 1, targetReps: 0, targetHoldSeconds: 15 },
                        ],
                    },
                ],
            },
            {
                weekNumber: 4,
                days: [
                    {
                        name: 'Day 1: Independence Training',
                        exercises: [
                            { exerciseId: 'squat', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'lunge', targetSets: 2, targetReps: 6 },
                            { exerciseId: 'calf_raise', targetSets: 3, targetReps: 12 },
                        ],
                    },
                    {
                        name: 'Day 2: Strength & Tone',
                        exercises: [
                            { exerciseId: 'bicep_curl', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'shoulder_press', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'tricep_extension', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'lateral_raise', targetSets: 2, targetReps: 8 },
                        ],
                    },
                    {
                        name: 'Day 3: Active Cardio',
                        exercises: [
                            { exerciseId: 'jumping_jacks', targetSets: 2, targetReps: 10 },
                            { exerciseId: 'calf_raise', targetSets: 3, targetReps: 12 },
                            { exerciseId: 'plank', targetSets: 2, targetReps: 0, targetHoldSeconds: 15 },
                        ],
                    },
                ],
            },
        ],
    },

    // ─── Prenatal Gentle ─────────────────────────────────────────────────────
    // Conservative by design: upright or side-lying only — nothing flat on the
    // back, nothing face-down, no impact, no loaded hinging, no crunch-style
    // core work. Deliberately excluded from intake recommendations: pregnancy
    // is self-selected with professional clearance, never algorithmically
    // assigned (see the safety architecture notes in the product spec).
    {
        id: 'prenatal-gentle',
        name: 'Prenatal Gentle',
        description: 'Low-impact strength and mobility for pregnancy — upright, steady movements only. Get your doctor or midwife\'s okay first, and stop anything that doesn\'t feel right.',
        level: 'senior',
        excludeFromIntake: true,
        durationWeeks: 4,
        icon: 'PN',
        image: '/programs/gentle-mobility.png',
        color: '#ec4899',
        weeks: [
            {
                weekNumber: 1,
                days: [
                    {
                        name: 'Day 1: Standing Strength',
                        exercises: [
                            { exerciseId: 'squat', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'calf_raise', targetSets: 2, targetReps: 10 },
                            { exerciseId: 'bicep_curl', targetSets: 2, targetReps: 10 },
                        ],
                    },
                    {
                        name: 'Day 2: Posture & Carry',
                        exercises: [
                            { exerciseId: 'lateral_raise', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'tricep_extension', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'farmers_walk', targetSets: 2, targetReps: 0, targetHoldSeconds: 20 },
                        ],
                    },
                    {
                        name: 'Day 3: Mobility & Balance',
                        exercises: [
                            { exerciseId: 'hamstring_stretch', targetSets: 1, targetReps: 0, targetHoldSeconds: 30 },
                            { exerciseId: 'hip_flexor_stretch', targetSets: 1, targetReps: 0, targetHoldSeconds: 30 },
                            { exerciseId: 'quad_stretch', targetSets: 1, targetReps: 0, targetHoldSeconds: 30 },
                            { exerciseId: 'shoulder_stretch', targetSets: 1, targetReps: 0, targetHoldSeconds: 30 },
                        ],
                    },
                ],
            },
            {
                weekNumber: 2,
                days: [
                    {
                        name: 'Day 1: Standing Strength',
                        exercises: [
                            { exerciseId: 'squat', targetSets: 2, targetReps: 10 },
                            { exerciseId: 'calf_raise', targetSets: 2, targetReps: 12 },
                            { exerciseId: 'bicep_curl', targetSets: 2, targetReps: 10 },
                        ],
                    },
                    {
                        name: 'Day 2: Arms & Carry',
                        exercises: [
                            { exerciseId: 'shoulder_press', targetSets: 2, targetReps: 6 },
                            { exerciseId: 'lateral_raise', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'farmers_walk', targetSets: 2, targetReps: 0, targetHoldSeconds: 25 },
                        ],
                    },
                    {
                        name: 'Day 3: Core & Mobility',
                        exercises: [
                            { exerciseId: 'side_plank', targetSets: 2, targetReps: 0, targetHoldSeconds: 10 },
                            { exerciseId: 'hamstring_stretch', targetSets: 1, targetReps: 0, targetHoldSeconds: 30 },
                            { exerciseId: 'hip_flexor_stretch', targetSets: 1, targetReps: 0, targetHoldSeconds: 30 },
                            { exerciseId: 'shoulder_stretch', targetSets: 1, targetReps: 0, targetHoldSeconds: 30 },
                        ],
                    },
                ],
            },
            {
                weekNumber: 3,
                days: [
                    {
                        name: 'Day 1: Standing Strength',
                        exercises: [
                            { exerciseId: 'squat', targetSets: 3, targetReps: 8 },
                            { exerciseId: 'calf_raise', targetSets: 2, targetReps: 12 },
                            { exerciseId: 'bicep_curl', targetSets: 2, targetReps: 12 },
                        ],
                    },
                    {
                        name: 'Day 2: Arms & Carry',
                        exercises: [
                            { exerciseId: 'shoulder_press', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'tricep_extension', targetSets: 2, targetReps: 10 },
                            { exerciseId: 'farmers_walk', targetSets: 2, targetReps: 0, targetHoldSeconds: 30 },
                        ],
                    },
                    {
                        name: 'Day 3: Core & Mobility',
                        exercises: [
                            { exerciseId: 'side_plank', targetSets: 2, targetReps: 0, targetHoldSeconds: 12 },
                            { exerciseId: 'hamstring_stretch', targetSets: 1, targetReps: 0, targetHoldSeconds: 40 },
                            { exerciseId: 'hip_flexor_stretch', targetSets: 1, targetReps: 0, targetHoldSeconds: 40 },
                            { exerciseId: 'quad_stretch', targetSets: 1, targetReps: 0, targetHoldSeconds: 30 },
                        ],
                    },
                ],
            },
            {
                weekNumber: 4,
                days: [
                    {
                        name: 'Day 1: Steady Strength',
                        exercises: [
                            { exerciseId: 'squat', targetSets: 3, targetReps: 8 },
                            { exerciseId: 'calf_raise', targetSets: 3, targetReps: 10 },
                            { exerciseId: 'bicep_curl', targetSets: 2, targetReps: 12 },
                        ],
                    },
                    {
                        name: 'Day 2: Arms & Carry',
                        exercises: [
                            { exerciseId: 'shoulder_press', targetSets: 2, targetReps: 8 },
                            { exerciseId: 'lateral_raise', targetSets: 2, targetReps: 10 },
                            { exerciseId: 'farmers_walk', targetSets: 3, targetReps: 0, targetHoldSeconds: 25 },
                        ],
                    },
                    {
                        name: 'Day 3: Core & Mobility',
                        exercises: [
                            { exerciseId: 'side_plank', targetSets: 2, targetReps: 0, targetHoldSeconds: 15 },
                            { exerciseId: 'hamstring_stretch', targetSets: 1, targetReps: 0, targetHoldSeconds: 40 },
                            { exerciseId: 'hip_flexor_stretch', targetSets: 1, targetReps: 0, targetHoldSeconds: 40 },
                            { exerciseId: 'shoulder_stretch', targetSets: 1, targetReps: 0, targetHoldSeconds: 40 },
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
