/**
 * Coach Intake — guided conversation that turns "I don't know where to start"
 * into a concrete program recommendation.
 *
 * Deliberately scripted (no LLM): the coach asks one question at a time and
 * the answers feed a scoring function over the real program catalog, so the
 * recommendation can never name a program that doesn't exist, and limitation
 * handling only ever FILTERS content — it never gives medical advice.
 */

import { PROGRAMS, Program } from './programs';
import { EXERCISES, ExerciseId } from './exercises';
import { exercisesContraindicatedFor } from './exerciseMeta';

// ─── Answer types ────────────────────────────────────────────────────────────

export type Goal = 'build_muscle' | 'get_stronger' | 'lose_weight' | 'move_better' | 'core' | 'just_start';
export type Experience = 'new' | 'some' | 'regular' | 'gentle';
export type Equipment = 'bodyweight' | 'dumbbell' | 'barbell' | 'machine';
export type Limitation = 'knees' | 'shoulders' | 'back' | 'none';

export interface IntakeAnswers {
    goal: Goal;
    experience: Experience;
    equipment: Equipment[];
    daysPerWeek: number;
    limitations: Limitation[];
}

// ─── Conversation script ─────────────────────────────────────────────────────

export interface IntakeOption {
    label: string;
    value: string;
    hint?: string;
}

export interface IntakeStep {
    id: keyof IntakeAnswers;
    prompt: string;
    /** Multi-select steps show a "That's everything" confirm chip */
    multi?: boolean;
    options: IntakeOption[];
}

export const INTAKE_STEPS: IntakeStep[] = [
    {
        id: 'goal',
        prompt: "First things first — what are you mainly training for?",
        options: [
            { label: 'Build muscle', value: 'build_muscle' },
            { label: 'Get stronger', value: 'get_stronger' },
            { label: 'Lose weight', value: 'lose_weight' },
            { label: 'Move & feel better', value: 'move_better' },
            { label: 'A stronger core', value: 'core' },
            { label: 'Honestly — just get started', value: 'just_start' },
        ],
    },
    {
        id: 'experience',
        prompt: 'Got it. And where are you at right now?',
        options: [
            { label: 'Brand new to training', value: 'new' },
            { label: "I've trained on and off", value: 'some' },
            { label: 'I train regularly', value: 'regular' },
            { label: 'I want a gentler pace', value: 'gentle', hint: 'returning from a break, or easing in later in life' },
        ],
    },
    {
        id: 'equipment',
        prompt: 'What do you have access to? Pick everything that applies.',
        multi: true,
        options: [
            { label: 'Just my body', value: 'bodyweight' },
            { label: 'Dumbbells', value: 'dumbbell' },
            { label: 'A barbell setup', value: 'barbell' },
            { label: 'Gym machines', value: 'machine' },
        ],
    },
    {
        id: 'daysPerWeek',
        prompt: 'How many days a week can you realistically show up? Be honest — consistency beats ambition.',
        options: [
            { label: '2 days', value: '2' },
            { label: '3 days', value: '3' },
            { label: '4 or more', value: '4' },
        ],
    },
    {
        id: 'limitations',
        prompt: 'Last one — anything I should work around?',
        multi: true,
        options: [
            { label: 'Sensitive knees', value: 'knees' },
            { label: 'Shoulder trouble', value: 'shoulders' },
            { label: 'Lower back', value: 'back' },
            { label: 'All good', value: 'none' },
        ],
    },
];

/** Shown with every recommendation — the coach filters, it never advises. */
export const SAFETY_NOTE =
    'If you have a medical condition or an injury, check with your doctor before starting a new routine.';

// ─── Scoring ─────────────────────────────────────────────────────────────────

const GOAL_AFFINITY: Record<Goal, string[]> = {
    build_muscle: ['dumbbell-sculptor', 'upper-body-builder', 'push-pull-legs', 'machine-muscle', 'barbell-basics'],
    get_stronger: ['beginner-strength', 'barbell-basics', 'leg-power', 'push-pull-legs'],
    lose_weight: ['cardio-burn', 'full-body-starter', 'core-abs-blast'],
    move_better: ['gentle-mobility', 'active-aging', 'full-body-starter'],
    core: ['core-strength', 'core-abs-blast'],
    just_start: ['beginner-strength', 'full-body-starter', 'gentle-mobility'],
};

const LEVEL_SCORE: Record<Experience, Record<Program['level'], number>> = {
    new:     { beginner: 3,  intermediate: -2, advanced: -4, senior: 0 },
    some:    { beginner: 1,  intermediate: 3,  advanced: -1, senior: -2 },
    regular: { beginner: -2, intermediate: 3,  advanced: 3,  senior: -4 },
    gentle:  { beginner: 1,  intermediate: -3, advanced: -5, senior: 4 },
};

/** Exercises to avoid per limitation (impact / overhead / hinge-loading) —
 *  derived from exerciseMeta contraindications, the single source of truth.
 *  The metadata was seeded from the lists that used to be hardcoded here. */
const LIMITATION_EXERCISES: Record<Exclude<Limitation, 'none'>, ExerciseId[]> = {
    knees: exercisesContraindicatedFor('knees'),
    shoulders: exercisesContraindicatedFor('shoulders'),
    back: exercisesContraindicatedFor('back'),
};

const EQUIPMENT_LABEL: Record<string, Equipment> = {
    'Dumbbell': 'dumbbell',
    'Barbell': 'barbell',
    'Machine': 'machine',
};

/** Cardio-category exercises that actually need gear (label says 'Cardio'). */
const CARDIO_EQUIPMENT: Partial<Record<ExerciseId, Equipment>> = {
    rowing_machine: 'machine',
    battle_ropes: 'machine',
    kettlebell_swing: 'dumbbell',
    farmers_walk: 'dumbbell',
};

function programExerciseIds(program: Program): ExerciseId[] {
    return program.weeks.flatMap((w) => w.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)));
}

/** Equipment types a program actually uses, with usage counts. */
function programEquipment(program: Program): Map<Equipment, number> {
    const counts = new Map<Equipment, number>();
    for (const id of programExerciseIds(program)) {
        const label = EXERCISES[id]?.categoryLabel;
        const eq = CARDIO_EQUIPMENT[id] ?? (label ? EQUIPMENT_LABEL[label] : undefined);
        if (eq) counts.set(eq, (counts.get(eq) ?? 0) + 1);
    }
    return counts;
}

export interface Recommendation {
    program: Program;
    reasons: string[];
    /** Runner-up, with the one-line reason someone might prefer it */
    alternative: Program | null;
    alternativeReason: string;
}

/** Exported for testability — the ranked scores behind recommendProgram. */
export function scorePrograms(answers: IntakeAnswers) {
    return PROGRAMS.map((program) => {
        let score = 0;
        const reasons: string[] = [];

        // Goal fit (earlier in the affinity list = stronger fit; steep enough
        // that the primary pick for a goal wins level/equipment ties)
        const affinity = GOAL_AFFINITY[answers.goal];
        const goalIdx = affinity.indexOf(program.id);
        if (goalIdx >= 0) {
            score += 7 - goalIdx * 1.5;
            reasons.push(goalReason(answers.goal));
        }

        // Level fit
        score += LEVEL_SCORE[answers.experience][program.level];
        if (LEVEL_SCORE[answers.experience][program.level] >= 3) {
            reasons.push(levelReason(answers.experience));
        }

        // Equipment fit — penalize by the SHARE of the program that needs gear
        // the user doesn't have, weighted by how substitutable that gear is:
        // dumbbell moves survive with household weights (0.7×), but a missing
        // barbell or machine is a genuine blocker (1.5×, plus a hard penalty
        // when they make up the bulk of the program).
        const SUBSTITUTABILITY: Record<Equipment, number> = {
            bodyweight: 0, dumbbell: 0.7, barbell: 1.5, machine: 1.5,
        };
        const equipment = programEquipment(program);
        const totalExercises = programExerciseIds(program).length || 1;
        let missingUse = 0;
        let weightedMissing = 0;
        let hardMissing = 0; // barbell/machine only
        for (const [eq, count] of equipment) {
            if (!answers.equipment.includes(eq)) {
                missingUse += count;
                weightedMissing += count * SUBSTITUTABILITY[eq];
                if (eq === 'barbell' || eq === 'machine') hardMissing += count;
            }
        }
        if (missingUse === 0) {
            score += 2;
            reasons.push(equipment.size === 0
                ? 'No equipment needed — you can do every session anywhere'
                : 'Every session uses gear you already have');
        } else {
            score -= (weightedMissing / totalExercises) * 12;
            if (hardMissing / totalExercises > 0.35) score -= 10; // the program IS the missing gear
        }

        // Schedule fit
        const programDays = program.weeks[0]?.days.length ?? 3;
        const dayDiff = Math.abs(answers.daysPerWeek - programDays);
        score += 2 - dayDiff * 1.5;
        if (dayDiff === 0) {
            reasons.push(`${programDays} sessions a week — exactly what you said you can commit to`);
        }

        // Limitation screening — count how much of the program hits a sore spot
        let flaggedCount = 0;
        const ids = programExerciseIds(program);
        for (const limitation of answers.limitations) {
            if (limitation === 'none') continue;
            const avoid = LIMITATION_EXERCISES[limitation];
            flaggedCount += ids.filter((id) => avoid.includes(id)).length;
        }
        if (flaggedCount > 0) {
            score -= Math.min(8, flaggedCount * 0.8);
        } else if (answers.limitations.some((l) => l !== 'none')) {
            reasons.push('Light on the movements you asked me to work around');
        }

        return { program, score, reasons };
    }).sort((a, b) => b.score - a.score);
}

export function recommendProgram(answers: IntakeAnswers): Recommendation {
    const scored = scorePrograms(answers);
    const best = scored[0];
    const runnerUp = scored[1] ?? null;

    return {
        program: best.program,
        reasons: best.reasons.slice(0, 4),
        alternative: runnerUp?.program ?? null,
        alternativeReason: runnerUp ? altReason(best.program, runnerUp.program) : '',
    };
}

function goalReason(goal: Goal): string {
    switch (goal) {
        case 'build_muscle': return 'Built around the muscle-building work you asked for';
        case 'get_stronger': return 'Centred on the strength basics that move the needle';
        case 'lose_weight': return 'High-effort sessions that burn — built for your goal';
        case 'move_better': return 'Focused on mobility and moving well day to day';
        case 'core': return 'Core work front and centre';
        case 'just_start': return 'A no-overthinking way to build the habit first';
    }
}

function levelReason(exp: Experience): string {
    switch (exp) {
        case 'new': return 'Paced for someone starting fresh — no assumed experience';
        case 'some': return 'Enough challenge to feel progress without burying you';
        case 'regular': return 'Matches the training rhythm you already have';
        case 'gentle': return 'Deliberately gentle pacing, easy on the joints';
    }
}

function altReason(best: Program, alt: Program): string {
    if (alt.level !== best.level) {
        return alt.level === 'beginner' || alt.level === 'senior'
            ? 'Prefer something easier to start with?'
            : 'Want more of a challenge?';
    }
    const altDays = alt.weeks[0]?.days.length ?? 3;
    const bestDays = best.weeks[0]?.days.length ?? 3;
    if (altDays !== bestDays) {
        return altDays < bestDays ? 'Fewer sessions per week' : 'More sessions per week';
    }
    return 'A different flavour of the same goal';
}

// ─── Persistence (device-local; move to Supabase to sync across devices) ────

export interface CoachPlan {
    answers: IntakeAnswers;
    programId: string;
    savedAt: string;
}

const PLAN_KEY = 'irontrack_coach_plan';

export function saveCoachPlan(plan: CoachPlan): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

export function getCoachPlan(): CoachPlan | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(PLAN_KEY);
        return raw ? (JSON.parse(raw) as CoachPlan) : null;
    } catch {
        return null;
    }
}

export function clearCoachPlan(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PLAN_KEY);
}
