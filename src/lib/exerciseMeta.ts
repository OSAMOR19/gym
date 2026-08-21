/**
 * Exercise Metadata — the fitness-semantic layer of the exercise library.
 *
 * exercises.ts stays the CV/tracking config (landmarks, thresholds, form
 * rules) and is deliberately untouched; this file describes what each
 * exercise IS in training terms: muscles, movement pattern, equipment,
 * difficulty, demands, goals, and how exercises relate to each other.
 * Both layers share ExerciseId as the common key.
 *
 * Relationship model: `progressionOf: X` means "this exercise is the next
 * step up from X" (so X is its regression). Chains compose, e.g.
 *   squat → goblet_squat → front_squat → barbell_squat.
 * `alternatives` are hand-picked closest swaps; broader same-pattern /
 * same-muscle matches are derived in exerciseGraph.ts.
 *
 * Contraindications intentionally mirror the coach intake's original
 * limitation screening lists exactly (coachIntake now derives its lists from
 * here — single source of truth, identical behavior, verified by test).
 * Extending them is a deliberate tuning decision, not a data-entry one.
 */

import { ExerciseId } from './exercises';

// ─── Vocabularies ────────────────────────────────────────────────────────────

export type Muscle =
    | 'quadriceps' | 'hamstrings' | 'glutes' | 'calves' | 'hip_flexors' | 'adductors'
    | 'chest' | 'lats' | 'upper_back' | 'traps' | 'lower_back'
    | 'shoulders' | 'rear_delts' | 'biceps' | 'triceps' | 'forearms'
    | 'abs' | 'obliques';

export type MovementPattern =
    | 'squat' | 'hinge' | 'lunge'
    | 'push_horizontal' | 'push_vertical'
    | 'pull_horizontal' | 'pull_vertical'
    | 'elbow_flexion' | 'elbow_extension' | 'shoulder_raise'
    | 'knee_flexion' | 'knee_extension'
    | 'hip_extension' | 'calf_raise' | 'carry' | 'jump'
    | 'core_flexion' | 'core_rotation' | 'core_stability'
    | 'conditioning' | 'stretch';

/**
 * Everything an exercise physically requires. Deliberately finer-grained
 * than the intake's four answers — exerciseGraph.expandEquipment() maps the
 * intake vocabulary onto these tags.
 */
export type EquipmentTag =
    | 'bodyweight'   // nothing at all
    | 'dumbbell'
    | 'barbell'
    | 'machine'      // gym machines / cable stations / gym-only gear
    | 'bar'          // pull-up bar
    | 'bench'
    | 'box'          // plyo box or sturdy platform
    | 'jump_rope'
    | 'ab_wheel';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type Demand = 'low' | 'moderate' | 'high';

/** Same literals as the intake's trainable goals (Goal minus 'just_start'). */
export type GoalTag = 'build_muscle' | 'get_stronger' | 'lose_weight' | 'move_better' | 'core';

/** Same literals as the intake's Limitation (minus 'none'). */
export type LimitationArea = 'knees' | 'shoulders' | 'back';

export interface ExerciseMeta {
    primaryMuscles: Muscle[];
    secondaryMuscles: Muscle[];
    movementPattern: MovementPattern;
    equipment: EquipmentTag[];
    difficulty: Difficulty;
    impact: Demand;
    mobilityDemand: Demand;
    balanceDemand: Demand;
    strengthDemand: Demand;
    cardioDemand: Demand;
    goalTags: GoalTag[];
    contraindications?: LimitationArea[];
    /** This exercise is the harder next step after the referenced one. */
    progressionOf?: ExerciseId;
    /** Hand-picked closest swaps, best first. */
    alternatives?: ExerciseId[];
}

// ─── Metadata ────────────────────────────────────────────────────────────────
// Record<ExerciseId, ...> so the compiler enforces complete coverage.

export const EXERCISE_META: Record<ExerciseId, ExerciseMeta> = {

    // ─── Upper body — arms & shoulders ───────────────────────────────────────

    bicep_curl: {
        primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'],
        movementPattern: 'elbow_flexion', equipment: ['dumbbell'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle'],
        alternatives: ['hammer_curl', 'cable_bicep_curl'],
    },
    hammer_curl: {
        primaryMuscles: ['biceps', 'forearms'], secondaryMuscles: [],
        movementPattern: 'elbow_flexion', equipment: ['dumbbell'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle'],
        alternatives: ['bicep_curl', 'cable_bicep_curl'],
    },
    cable_bicep_curl: {
        primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'],
        movementPattern: 'elbow_flexion', equipment: ['machine'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle'],
        alternatives: ['bicep_curl', 'hammer_curl'],
    },
    tricep_extension: {
        primaryMuscles: ['triceps'], secondaryMuscles: [],
        movementPattern: 'elbow_extension', equipment: ['dumbbell'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle'],
        alternatives: ['overhead_tricep_ext', 'cable_tricep_pushdown', 'tricep_kickback'],
    },
    overhead_tricep_ext: {
        primaryMuscles: ['triceps'], secondaryMuscles: ['shoulders'],
        movementPattern: 'elbow_extension', equipment: ['dumbbell'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle'],
        contraindications: ['shoulders'],
        alternatives: ['tricep_extension', 'cable_tricep_pushdown'],
    },
    tricep_kickback: {
        primaryMuscles: ['triceps'], secondaryMuscles: [],
        movementPattern: 'elbow_extension', equipment: ['dumbbell'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle'],
        alternatives: ['tricep_extension', 'cable_tricep_pushdown'],
    },
    cable_tricep_pushdown: {
        primaryMuscles: ['triceps'], secondaryMuscles: [],
        movementPattern: 'elbow_extension', equipment: ['machine'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle'],
        alternatives: ['tricep_extension', 'tricep_kickback'],
    },
    shoulder_press: {
        primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps'],
        movementPattern: 'push_vertical', equipment: ['dumbbell'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'low', strengthDemand: 'moderate', cardioDemand: 'low',
        goalTags: ['build_muscle', 'get_stronger'],
        contraindications: ['shoulders'],
        alternatives: ['overhead_press', 'lateral_raise'],
    },
    overhead_press: {
        primaryMuscles: ['shoulders', 'triceps'], secondaryMuscles: ['traps', 'abs'],
        movementPattern: 'push_vertical', equipment: ['barbell'],
        difficulty: 'intermediate', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'low', strengthDemand: 'high', cardioDemand: 'low',
        goalTags: ['get_stronger', 'build_muscle'],
        contraindications: ['shoulders'],
        progressionOf: 'shoulder_press',
        alternatives: ['shoulder_press'],
    },
    lateral_raise: {
        primaryMuscles: ['shoulders'], secondaryMuscles: ['traps'],
        movementPattern: 'shoulder_raise', equipment: ['dumbbell'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle'],
        contraindications: ['shoulders'],
        alternatives: ['cable_lateral_raise', 'front_raise'],
    },
    cable_lateral_raise: {
        primaryMuscles: ['shoulders'], secondaryMuscles: ['traps'],
        movementPattern: 'shoulder_raise', equipment: ['machine'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle'],
        contraindications: ['shoulders'],
        alternatives: ['lateral_raise', 'front_raise'],
    },
    front_raise: {
        primaryMuscles: ['shoulders'], secondaryMuscles: [],
        movementPattern: 'shoulder_raise', equipment: ['dumbbell'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle'],
        contraindications: ['shoulders'],
        alternatives: ['lateral_raise'],
    },

    // ─── Upper body — pushing ────────────────────────────────────────────────

    knee_pushup: {
        primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders'],
        movementPattern: 'push_horizontal', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle', 'move_better'],
        alternatives: ['pushup', 'chest_press_machine'],
    },
    pushup: {
        primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders', 'abs'],
        movementPattern: 'push_horizontal', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'moderate', cardioDemand: 'low',
        goalTags: ['build_muscle', 'get_stronger'],
        progressionOf: 'knee_pushup',
        alternatives: ['chest_press', 'bench_press', 'chest_press_machine'],
    },
    chest_press: {
        primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders'],
        movementPattern: 'push_horizontal', equipment: ['dumbbell'], // floor press works without a bench
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'moderate', cardioDemand: 'low',
        goalTags: ['build_muscle', 'get_stronger'],
        alternatives: ['bench_press', 'chest_press_machine', 'pushup'],
    },
    bench_press: {
        primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders'],
        movementPattern: 'push_horizontal', equipment: ['barbell', 'bench'],
        difficulty: 'intermediate', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'high', cardioDemand: 'low',
        goalTags: ['get_stronger', 'build_muscle'],
        progressionOf: 'chest_press',
        alternatives: ['chest_press', 'chest_press_machine', 'pushup'],
    },
    incline_chest_press: {
        primaryMuscles: ['chest', 'shoulders'], secondaryMuscles: ['triceps'],
        movementPattern: 'push_horizontal', equipment: ['dumbbell', 'bench'],
        difficulty: 'intermediate', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'moderate', cardioDemand: 'low',
        goalTags: ['build_muscle'],
        alternatives: ['incline_bench_press', 'chest_press'],
    },
    incline_bench_press: {
        primaryMuscles: ['chest', 'shoulders'], secondaryMuscles: ['triceps'],
        movementPattern: 'push_horizontal', equipment: ['barbell', 'bench'],
        difficulty: 'intermediate', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'high', cardioDemand: 'low',
        goalTags: ['build_muscle', 'get_stronger'],
        alternatives: ['incline_chest_press', 'bench_press'],
    },
    dumbbell_fly: {
        primaryMuscles: ['chest'], secondaryMuscles: ['shoulders'],
        movementPattern: 'push_horizontal', equipment: ['dumbbell'], // floor fly works without a bench
        difficulty: 'intermediate', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle'],
        alternatives: ['pec_deck', 'chest_press'],
    },
    pec_deck: {
        primaryMuscles: ['chest'], secondaryMuscles: [],
        movementPattern: 'push_horizontal', equipment: ['machine'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle'],
        alternatives: ['dumbbell_fly', 'chest_press_machine'],
    },
    chest_press_machine: {
        primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders'],
        movementPattern: 'push_horizontal', equipment: ['machine'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle'],
        alternatives: ['chest_press', 'bench_press', 'pushup'],
    },

    // ─── Upper body — pulling ────────────────────────────────────────────────

    dumbbell_row: {
        primaryMuscles: ['lats', 'upper_back'], secondaryMuscles: ['biceps', 'rear_delts'],
        movementPattern: 'pull_horizontal', equipment: ['dumbbell'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'moderate', cardioDemand: 'low',
        goalTags: ['build_muscle', 'get_stronger'],
        alternatives: ['seated_row', 'barbell_row', 'lat_pulldown'],
    },
    barbell_row: {
        primaryMuscles: ['lats', 'upper_back'], secondaryMuscles: ['biceps', 'lower_back', 'rear_delts'],
        movementPattern: 'pull_horizontal', equipment: ['barbell'],
        difficulty: 'intermediate', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'low', strengthDemand: 'high', cardioDemand: 'low',
        goalTags: ['build_muscle', 'get_stronger'],
        contraindications: ['back'],
        progressionOf: 'dumbbell_row',
        alternatives: ['dumbbell_row', 'seated_row'],
    },
    seated_row: {
        primaryMuscles: ['upper_back', 'lats'], secondaryMuscles: ['biceps', 'rear_delts'],
        movementPattern: 'pull_horizontal', equipment: ['machine'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle', 'get_stronger'],
        alternatives: ['dumbbell_row', 'barbell_row', 'lat_pulldown'],
    },
    lat_pulldown: {
        primaryMuscles: ['lats'], secondaryMuscles: ['biceps', 'upper_back'],
        movementPattern: 'pull_vertical', equipment: ['machine'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle', 'get_stronger'],
        alternatives: ['pull_up', 'chin_up', 'seated_row'],
    },
    chin_up: {
        primaryMuscles: ['lats', 'biceps'], secondaryMuscles: ['upper_back', 'forearms'],
        movementPattern: 'pull_vertical', equipment: ['bar'],
        difficulty: 'intermediate', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'high', cardioDemand: 'low',
        goalTags: ['get_stronger', 'build_muscle'],
        contraindications: ['shoulders'],
        progressionOf: 'lat_pulldown',
        alternatives: ['pull_up', 'lat_pulldown'],
    },
    pull_up: {
        primaryMuscles: ['lats', 'upper_back'], secondaryMuscles: ['biceps', 'forearms'],
        movementPattern: 'pull_vertical', equipment: ['bar'],
        difficulty: 'advanced', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'high', cardioDemand: 'low',
        goalTags: ['get_stronger', 'build_muscle'],
        contraindications: ['shoulders'],
        progressionOf: 'chin_up',
        alternatives: ['chin_up', 'lat_pulldown'],
    },

    // ─── Lower body — squat / lunge / hinge ──────────────────────────────────

    squat: {
        primaryMuscles: ['quadriceps', 'glutes'], secondaryMuscles: ['hamstrings', 'abs'],
        movementPattern: 'squat', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['get_stronger', 'move_better', 'lose_weight'],
        alternatives: ['goblet_squat', 'leg_press'],
    },
    goblet_squat: {
        primaryMuscles: ['quadriceps', 'glutes'], secondaryMuscles: ['abs', 'forearms'],
        movementPattern: 'squat', equipment: ['dumbbell'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'low', strengthDemand: 'moderate', cardioDemand: 'low',
        goalTags: ['get_stronger', 'build_muscle', 'lose_weight'],
        progressionOf: 'squat',
        alternatives: ['squat', 'leg_press', 'front_squat'],
    },
    front_squat: {
        primaryMuscles: ['quadriceps'], secondaryMuscles: ['glutes', 'abs'],
        movementPattern: 'squat', equipment: ['barbell'],
        difficulty: 'advanced', impact: 'low',
        mobilityDemand: 'high', balanceDemand: 'moderate', strengthDemand: 'high', cardioDemand: 'low',
        goalTags: ['get_stronger', 'build_muscle'],
        progressionOf: 'goblet_squat',
        alternatives: ['goblet_squat', 'barbell_squat', 'leg_press'],
    },
    barbell_squat: {
        primaryMuscles: ['quadriceps', 'glutes'], secondaryMuscles: ['hamstrings', 'lower_back', 'abs'],
        movementPattern: 'squat', equipment: ['barbell'],
        difficulty: 'advanced', impact: 'low',
        mobilityDemand: 'high', balanceDemand: 'moderate', strengthDemand: 'high', cardioDemand: 'low',
        goalTags: ['get_stronger', 'build_muscle'],
        progressionOf: 'front_squat',
        alternatives: ['front_squat', 'leg_press', 'goblet_squat'],
    },
    leg_press: {
        primaryMuscles: ['quadriceps', 'glutes'], secondaryMuscles: ['hamstrings'],
        movementPattern: 'squat', equipment: ['machine'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'moderate', cardioDemand: 'low',
        goalTags: ['build_muscle', 'get_stronger'],
        alternatives: ['goblet_squat', 'squat', 'barbell_squat'],
    },
    lunge: {
        primaryMuscles: ['quadriceps', 'glutes'], secondaryMuscles: ['hamstrings', 'calves'],
        movementPattern: 'lunge', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'moderate',
        mobilityDemand: 'moderate', balanceDemand: 'moderate', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['move_better', 'get_stronger', 'lose_weight'],
        contraindications: ['knees'],
        alternatives: ['walking_lunges', 'squat', 'leg_press'],
    },
    walking_lunges: {
        primaryMuscles: ['quadriceps', 'glutes'], secondaryMuscles: ['hamstrings', 'calves'],
        movementPattern: 'lunge', equipment: ['bodyweight'],
        difficulty: 'intermediate', impact: 'moderate',
        mobilityDemand: 'moderate', balanceDemand: 'high', strengthDemand: 'moderate', cardioDemand: 'moderate',
        goalTags: ['move_better', 'lose_weight', 'get_stronger'],
        contraindications: ['knees'],
        progressionOf: 'lunge',
        alternatives: ['lunge', 'squat'],
    },
    dumbbell_deadlift: {
        primaryMuscles: ['hamstrings', 'glutes'], secondaryMuscles: ['lower_back', 'forearms'],
        movementPattern: 'hinge', equipment: ['dumbbell'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'low', strengthDemand: 'moderate', cardioDemand: 'low',
        goalTags: ['get_stronger', 'build_muscle'],
        contraindications: ['back'],
        alternatives: ['romanian_deadlift', 'deadlift', 'glute_bridge'],
    },
    romanian_deadlift: {
        primaryMuscles: ['hamstrings', 'glutes'], secondaryMuscles: ['lower_back'],
        movementPattern: 'hinge', equipment: ['barbell'],
        difficulty: 'intermediate', impact: 'low',
        mobilityDemand: 'high', balanceDemand: 'low', strengthDemand: 'moderate', cardioDemand: 'low',
        goalTags: ['build_muscle', 'get_stronger'],
        contraindications: ['back'],
        alternatives: ['deadlift', 'dumbbell_deadlift', 'leg_curl'],
    },
    deadlift: {
        primaryMuscles: ['hamstrings', 'glutes', 'lower_back'], secondaryMuscles: ['traps', 'forearms', 'quadriceps'],
        movementPattern: 'hinge', equipment: ['barbell'],
        difficulty: 'advanced', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'low', strengthDemand: 'high', cardioDemand: 'low',
        goalTags: ['get_stronger', 'build_muscle'],
        contraindications: ['back'],
        progressionOf: 'dumbbell_deadlift',
        alternatives: ['dumbbell_deadlift', 'romanian_deadlift'],
    },
    kettlebell_swing: {
        primaryMuscles: ['glutes', 'hamstrings'], secondaryMuscles: ['lower_back', 'shoulders', 'abs'],
        movementPattern: 'hinge', equipment: ['dumbbell'], // works fine with a dumbbell
        difficulty: 'intermediate', impact: 'moderate',
        mobilityDemand: 'moderate', balanceDemand: 'moderate', strengthDemand: 'moderate', cardioDemand: 'high',
        goalTags: ['lose_weight', 'get_stronger'],
        contraindications: ['back'],
        alternatives: ['dumbbell_deadlift', 'rowing_machine'],
    },

    // ─── Lower body — hip extension / isolation ──────────────────────────────

    glute_bridge: {
        primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings'],
        movementPattern: 'hip_extension', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['move_better', 'build_muscle'],
        alternatives: ['hip_thrust'],
    },
    hip_thrust: {
        primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings'],
        movementPattern: 'hip_extension', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle', 'move_better'],
        progressionOf: 'glute_bridge',
        alternatives: ['glute_bridge', 'hip_thrust_barbell'],
    },
    hip_thrust_barbell: {
        primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings', 'quadriceps'],
        movementPattern: 'hip_extension', equipment: ['barbell', 'bench'],
        difficulty: 'intermediate', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'moderate', cardioDemand: 'low',
        goalTags: ['build_muscle', 'get_stronger'],
        progressionOf: 'hip_thrust',
        alternatives: ['hip_thrust', 'glute_bridge'],
    },
    leg_curl: {
        primaryMuscles: ['hamstrings'], secondaryMuscles: [],
        movementPattern: 'knee_flexion', equipment: ['machine'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle'],
        alternatives: ['romanian_deadlift', 'glute_bridge'],
    },
    leg_extension: {
        primaryMuscles: ['quadriceps'], secondaryMuscles: [],
        movementPattern: 'knee_extension', equipment: ['machine'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['build_muscle'],
        alternatives: ['leg_press', 'squat'],
    },
    calf_raise: {
        primaryMuscles: ['calves'], secondaryMuscles: [],
        movementPattern: 'calf_raise', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'moderate', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['move_better', 'build_muscle'],
        alternatives: [],
    },

    // ─── Explosive / jump ────────────────────────────────────────────────────

    jump_squat: {
        primaryMuscles: ['quadriceps', 'glutes'], secondaryMuscles: ['calves'],
        movementPattern: 'jump', equipment: ['bodyweight'],
        difficulty: 'intermediate', impact: 'high',
        mobilityDemand: 'moderate', balanceDemand: 'moderate', strengthDemand: 'moderate', cardioDemand: 'high',
        goalTags: ['lose_weight', 'get_stronger'],
        contraindications: ['knees'],
        progressionOf: 'squat',
        alternatives: ['squat', 'box_jumps'],
    },
    box_jumps: {
        primaryMuscles: ['quadriceps', 'glutes'], secondaryMuscles: ['calves'],
        movementPattern: 'jump', equipment: ['box'],
        difficulty: 'intermediate', impact: 'high',
        mobilityDemand: 'moderate', balanceDemand: 'high', strengthDemand: 'moderate', cardioDemand: 'high',
        goalTags: ['lose_weight', 'get_stronger'],
        contraindications: ['knees'],
        alternatives: ['jump_squat', 'squat'],
    },

    // ─── Conditioning / cardio ───────────────────────────────────────────────

    jumping_jacks: {
        primaryMuscles: ['calves'], secondaryMuscles: ['shoulders', 'quadriceps'],
        movementPattern: 'conditioning', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'moderate',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'high',
        goalTags: ['lose_weight', 'move_better'],
        contraindications: ['knees'],
        alternatives: ['high_knees', 'jump_rope'],
    },
    high_knees: {
        primaryMuscles: ['hip_flexors', 'calves'], secondaryMuscles: ['quadriceps', 'abs'],
        movementPattern: 'conditioning', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'high',
        mobilityDemand: 'low', balanceDemand: 'moderate', strengthDemand: 'low', cardioDemand: 'high',
        goalTags: ['lose_weight'],
        contraindications: ['knees'],
        alternatives: ['jumping_jacks', 'mountain_climber'],
    },
    mountain_climber: {
        primaryMuscles: ['abs', 'hip_flexors'], secondaryMuscles: ['shoulders', 'quadriceps'],
        movementPattern: 'conditioning', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'moderate',
        mobilityDemand: 'moderate', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'high',
        goalTags: ['lose_weight', 'core'],
        contraindications: ['knees'],
        alternatives: ['high_knees', 'burpees'],
    },
    burpees: {
        primaryMuscles: ['quadriceps', 'chest'], secondaryMuscles: ['abs', 'shoulders', 'calves'],
        movementPattern: 'conditioning', equipment: ['bodyweight'],
        difficulty: 'intermediate', impact: 'high',
        mobilityDemand: 'moderate', balanceDemand: 'moderate', strengthDemand: 'moderate', cardioDemand: 'high',
        goalTags: ['lose_weight'],
        contraindications: ['knees'],
        alternatives: ['mountain_climber', 'jump_squat', 'jumping_jacks'],
    },
    jump_rope: {
        primaryMuscles: ['calves'], secondaryMuscles: ['forearms', 'shoulders'],
        movementPattern: 'conditioning', equipment: ['jump_rope'],
        difficulty: 'beginner', impact: 'high',
        mobilityDemand: 'low', balanceDemand: 'moderate', strengthDemand: 'low', cardioDemand: 'high',
        goalTags: ['lose_weight'],
        contraindications: ['knees'],
        alternatives: ['jumping_jacks', 'high_knees'],
    },
    battle_ropes: {
        primaryMuscles: ['shoulders', 'forearms'], secondaryMuscles: ['abs', 'upper_back'],
        movementPattern: 'conditioning', equipment: ['machine'], // gym-only gear
        difficulty: 'intermediate', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'moderate', cardioDemand: 'high',
        goalTags: ['lose_weight'],
        contraindications: ['shoulders'],
        alternatives: ['rowing_machine', 'jumping_jacks'],
    },
    rowing_machine: {
        primaryMuscles: ['lats', 'quadriceps'], secondaryMuscles: ['upper_back', 'biceps', 'hamstrings'],
        movementPattern: 'conditioning', equipment: ['machine'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'high',
        goalTags: ['lose_weight', 'move_better'],
        alternatives: ['battle_ropes', 'kettlebell_swing'],
    },
    farmers_walk: {
        primaryMuscles: ['forearms', 'traps'], secondaryMuscles: ['abs', 'calves', 'upper_back'],
        movementPattern: 'carry', equipment: ['dumbbell'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'moderate', strengthDemand: 'moderate', cardioDemand: 'moderate',
        goalTags: ['get_stronger', 'move_better'],
        alternatives: [],
    },

    // ─── Core ────────────────────────────────────────────────────────────────

    crunches: {
        primaryMuscles: ['abs'], secondaryMuscles: [],
        movementPattern: 'core_flexion', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['core'],
        alternatives: ['situp', 'reverse_crunch'],
    },
    situp: {
        primaryMuscles: ['abs'], secondaryMuscles: ['hip_flexors'],
        movementPattern: 'core_flexion', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['core'],
        contraindications: ['back'],
        progressionOf: 'crunches',
        alternatives: ['crunches', 'bicycle_crunch'],
    },
    bicycle_crunch: {
        primaryMuscles: ['abs', 'obliques'], secondaryMuscles: ['hip_flexors'],
        movementPattern: 'core_flexion', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['core'],
        alternatives: ['crunches', 'russian_twists'],
    },
    reverse_crunch: {
        primaryMuscles: ['abs'], secondaryMuscles: ['hip_flexors'],
        movementPattern: 'core_flexion', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['core'],
        alternatives: ['crunches', 'leg_raises'],
    },
    leg_raises: {
        primaryMuscles: ['abs', 'hip_flexors'], secondaryMuscles: [],
        movementPattern: 'core_flexion', equipment: ['bodyweight'],
        difficulty: 'intermediate', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['core'],
        progressionOf: 'reverse_crunch',
        alternatives: ['reverse_crunch', 'flutter_kicks'],
    },
    flutter_kicks: {
        primaryMuscles: ['abs', 'hip_flexors'], secondaryMuscles: [],
        movementPattern: 'core_flexion', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['core'],
        alternatives: ['leg_raises', 'reverse_crunch'],
    },
    hanging_leg_raises: {
        primaryMuscles: ['abs', 'hip_flexors'], secondaryMuscles: ['forearms', 'lats'],
        movementPattern: 'core_flexion', equipment: ['bar'],
        difficulty: 'advanced', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'low', strengthDemand: 'high', cardioDemand: 'low',
        goalTags: ['core', 'get_stronger'],
        progressionOf: 'leg_raises',
        alternatives: ['leg_raises', 'reverse_crunch'],
    },
    toe_touches: {
        primaryMuscles: ['abs'], secondaryMuscles: ['hip_flexors'],
        movementPattern: 'core_flexion', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['core'],
        contraindications: ['back'],
        alternatives: ['crunches', 'situp'],
    },
    russian_twists: {
        primaryMuscles: ['obliques'], secondaryMuscles: ['abs', 'hip_flexors'],
        movementPattern: 'core_rotation', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'moderate', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['core'],
        alternatives: ['bicycle_crunch', 'side_plank'],
    },
    plank: {
        primaryMuscles: ['abs'], secondaryMuscles: ['shoulders', 'obliques'],
        movementPattern: 'core_stability', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['core', 'move_better'],
        alternatives: ['side_plank', 'plank_shoulder_taps'],
    },
    side_plank: {
        primaryMuscles: ['obliques'], secondaryMuscles: ['abs', 'shoulders'],
        movementPattern: 'core_stability', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'moderate', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['core', 'move_better'],
        alternatives: ['plank'],
    },
    plank_shoulder_taps: {
        primaryMuscles: ['abs', 'shoulders'], secondaryMuscles: ['obliques'],
        movementPattern: 'core_stability', equipment: ['bodyweight'],
        difficulty: 'intermediate', impact: 'low',
        mobilityDemand: 'low', balanceDemand: 'moderate', strengthDemand: 'moderate', cardioDemand: 'low',
        goalTags: ['core'],
        progressionOf: 'plank',
        alternatives: ['plank', 'side_plank'],
    },
    ab_rollout: {
        primaryMuscles: ['abs'], secondaryMuscles: ['lats', 'shoulders'],
        movementPattern: 'core_stability', equipment: ['ab_wheel'],
        difficulty: 'advanced', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'moderate', strengthDemand: 'high', cardioDemand: 'low',
        goalTags: ['core', 'get_stronger'],
        progressionOf: 'plank',
        alternatives: ['plank', 'plank_shoulder_taps'],
    },

    // ─── Stretches (hold mode) ───────────────────────────────────────────────

    cobra_stretch: {
        primaryMuscles: ['abs', 'hip_flexors'], secondaryMuscles: ['lower_back'],
        movementPattern: 'stretch', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['move_better'],
        alternatives: ['hip_flexor_stretch'],
    },
    hamstring_stretch: {
        primaryMuscles: ['hamstrings'], secondaryMuscles: ['lower_back'],
        movementPattern: 'stretch', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['move_better'],
        alternatives: [],
    },
    hip_flexor_stretch: {
        primaryMuscles: ['hip_flexors'], secondaryMuscles: ['quadriceps'],
        movementPattern: 'stretch', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'moderate', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['move_better'],
        alternatives: ['cobra_stretch'],
    },
    quad_stretch: {
        primaryMuscles: ['quadriceps'], secondaryMuscles: ['hip_flexors'],
        movementPattern: 'stretch', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'moderate', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['move_better'],
        alternatives: [],
    },
    shoulder_stretch: {
        primaryMuscles: ['shoulders'], secondaryMuscles: ['upper_back'],
        movementPattern: 'stretch', equipment: ['bodyweight'],
        difficulty: 'beginner', impact: 'low',
        mobilityDemand: 'moderate', balanceDemand: 'low', strengthDemand: 'low', cardioDemand: 'low',
        goalTags: ['move_better'],
        alternatives: [],
    },
};

// ─── Simple accessors ────────────────────────────────────────────────────────

export function getExerciseMeta(id: ExerciseId): ExerciseMeta {
    return EXERCISE_META[id];
}

/** All exercises flagged for a limitation area — the intake derives its
 *  screening lists from this (was a hardcoded copy in coachIntake). */
export function exercisesContraindicatedFor(area: LimitationArea): ExerciseId[] {
    return (Object.keys(EXERCISE_META) as ExerciseId[])
        .filter((id) => EXERCISE_META[id].contraindications?.includes(area));
}
