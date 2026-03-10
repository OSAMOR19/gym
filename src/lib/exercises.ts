/**
 * Exercise Library — Full exercise definitions for 15 exercises
 *
 * Each exercise defines:
 *  - category (upper/lower/core)
 *  - tracked landmark indices (A, B vertex, C)
 *  - angle thresholds for rep detection
 *  - ideal ROM angles for form scoring
 *  - form correction rules (checked by formCorrection.ts)
 *  - description and emoji icon
 *
 * MediaPipe Pose landmark reference:
 *  11/12 = shoulders, 13/14 = elbows, 15/16 = wrists
 *  23/24 = hips, 25/26 = knees, 27/28 = ankles, 29/30 = heels, 31/32 = toes
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExerciseId =
    | 'bicep_curl' | 'hammer_curl' | 'pushup' | 'shoulder_press'
    | 'lateral_raise' | 'tricep_extension'
    | 'squat' | 'lunge' | 'jump_squat' | 'calf_raise'
    | 'plank' | 'situp' | 'mountain_climber';

export type ExerciseCategory = 'upper' | 'lower' | 'core';

export type RepMode = 'standard' | 'hold';
// 'standard' = angle oscillates between extended/contracted (reps)
// 'hold' = maintain position for time (e.g. plank)

export interface FormRule {
    id: string;
    description: string;             // e.g. "Knees collapsing inward"
    correctionMessage: string;       // e.g. "Push your knees outward"
    /** Check function built in formCorrection.ts — this is the rule key */
    ruleKey: string;
}

export interface ExerciseConfig {
    id: ExerciseId;
    name: string;
    icon: string;
    category: ExerciseCategory;
    description: string;
    repMode: RepMode;

    /** Landmark indices: [pointA, pointB (vertex), pointC] for primary angle */
    landmarkIndices: [number, number, number];

    /** Angle above which joint is "extended" (starting position) */
    extendedThreshold: number;
    /** Angle below which joint is "contracted" (peak of movement) */
    contractedThreshold: number;
    /** Ideal extended angle for 100% form score */
    idealExtended: number;
    /** Ideal contracted angle for 100% form score */
    idealContracted: number;

    /** Form correction rules evaluated each frame */
    formRules: FormRule[];
}

// ─── Exercise Definitions ────────────────────────────────────────────────────

export const EXERCISES: Record<ExerciseId, ExerciseConfig> = {
    // ─── Upper Body ──────────────────────────────────────────────────────────

    bicep_curl: {
        id: 'bicep_curl',
        name: 'Bicep Curl',
        icon: '💪',
        category: 'upper',
        description: 'Curl weight toward shoulder by bending at the elbow.',
        repMode: 'standard',
        landmarkIndices: [11, 13, 15], // shoulder → elbow → wrist
        extendedThreshold: 150,
        contractedThreshold: 50,
        idealExtended: 170,
        idealContracted: 35,
        formRules: [
            { id: 'curl_elbow_drift', description: 'Elbow moving too much', correctionMessage: 'Keep your elbows pinned to your sides', ruleKey: 'elbow_drift' },
            { id: 'curl_incomplete_rom', description: 'Incomplete range of motion', correctionMessage: 'Fully extend your arm at the bottom', ruleKey: 'incomplete_extension' },
        ],
    },

    hammer_curl: {
        id: 'hammer_curl',
        name: 'Hammer Curl',
        icon: '🔨',
        category: 'upper',
        description: 'Curl with neutral grip, targeting the brachialis.',
        repMode: 'standard',
        landmarkIndices: [11, 13, 15],
        extendedThreshold: 150,
        contractedThreshold: 50,
        idealExtended: 170,
        idealContracted: 40,
        formRules: [
            { id: 'hammer_elbow_drift', description: 'Elbow moving too much', correctionMessage: 'Keep your elbows pinned to your sides', ruleKey: 'elbow_drift' },
        ],
    },

    pushup: {
        id: 'pushup',
        name: 'Push-up',
        icon: '🫸',
        category: 'upper',
        description: 'Lower body to the floor and push back up.',
        repMode: 'standard',
        landmarkIndices: [11, 13, 15], // shoulder → elbow → wrist
        extendedThreshold: 150,
        contractedThreshold: 80,
        idealExtended: 170,
        idealContracted: 60,
        formRules: [
            { id: 'pushup_hip_sag', description: 'Hips sagging', correctionMessage: 'Keep your hips level — engage your core', ruleKey: 'hip_sag' },
            { id: 'pushup_elbow_flare', description: 'Elbows flaring too wide', correctionMessage: 'Tuck your elbows closer to your body', ruleKey: 'elbow_flare' },
        ],
    },

    shoulder_press: {
        id: 'shoulder_press',
        name: 'Shoulder Press',
        icon: '🏋️',
        category: 'upper',
        description: 'Press weight overhead from shoulder height.',
        repMode: 'standard',
        landmarkIndices: [23, 11, 13], // hip → shoulder → elbow
        extendedThreshold: 160,
        contractedThreshold: 80,
        idealExtended: 175,
        idealContracted: 70,
        formRules: [
            { id: 'press_back_arch', description: 'Excessive back arch', correctionMessage: 'Keep your back straight — engage your core', ruleKey: 'back_arch' },
        ],
    },

    lateral_raise: {
        id: 'lateral_raise',
        name: 'Lateral Raise',
        icon: '🦅',
        category: 'upper',
        description: 'Raise arms to the side until parallel with shoulders.',
        repMode: 'standard',
        landmarkIndices: [23, 11, 15], // hip → shoulder → wrist
        extendedThreshold: 140,
        contractedThreshold: 60,
        idealExtended: 160,
        idealContracted: 25,
        formRules: [
            { id: 'lateral_shrug', description: 'Shrugging shoulders', correctionMessage: 'Keep your shoulders down and relaxed', ruleKey: 'shoulder_shrug' },
        ],
    },

    tricep_extension: {
        id: 'tricep_extension',
        name: 'Tricep Extension',
        icon: '💎',
        category: 'upper',
        description: 'Extend arm overhead to work the triceps.',
        repMode: 'standard',
        landmarkIndices: [11, 13, 15],
        extendedThreshold: 150,
        contractedThreshold: 50,
        idealExtended: 170,
        idealContracted: 40,
        formRules: [
            { id: 'tricep_elbow_drift', description: 'Elbow moving too much', correctionMessage: 'Keep your upper arm still', ruleKey: 'elbow_drift' },
        ],
    },

    // ─── Lower Body ──────────────────────────────────────────────────────────

    squat: {
        id: 'squat',
        name: 'Squat',
        icon: '🦵',
        category: 'lower',
        description: 'Lower hips by bending knees while keeping chest upright.',
        repMode: 'standard',
        landmarkIndices: [23, 25, 27], // hip → knee → ankle
        extendedThreshold: 160,
        contractedThreshold: 90,
        idealExtended: 175,
        idealContracted: 70,
        formRules: [
            { id: 'squat_knee_valgus', description: 'Knees collapsing inward', correctionMessage: 'Push your knees outward over your toes', ruleKey: 'knee_valgus' },
            { id: 'squat_depth', description: 'Not going deep enough', correctionMessage: 'Go lower — aim for parallel or below', ruleKey: 'insufficient_depth' },
            { id: 'squat_lean', description: 'Leaning too far forward', correctionMessage: 'Keep your chest up and back straight', ruleKey: 'forward_lean' },
        ],
    },

    lunge: {
        id: 'lunge',
        name: 'Lunge',
        icon: '🚶',
        category: 'lower',
        description: 'Step forward and lower until knee is at 90°.',
        repMode: 'standard',
        landmarkIndices: [23, 25, 27],
        extendedThreshold: 160,
        contractedThreshold: 90,
        idealExtended: 175,
        idealContracted: 80,
        formRules: [
            { id: 'lunge_knee_past_toe', description: 'Knee going past toes', correctionMessage: 'Keep your front knee behind your toes', ruleKey: 'knee_past_toe' },
        ],
    },

    jump_squat: {
        id: 'jump_squat',
        name: 'Jump Squat',
        icon: '🦘',
        category: 'lower',
        description: 'Squat down then explode upward into a jump.',
        repMode: 'standard',
        landmarkIndices: [23, 25, 27],
        extendedThreshold: 160,
        contractedThreshold: 90,
        idealExtended: 175,
        idealContracted: 75,
        formRules: [
            { id: 'jump_squat_depth', description: 'Not going deep enough', correctionMessage: 'Sit deeper before jumping', ruleKey: 'insufficient_depth' },
        ],
    },

    calf_raise: {
        id: 'calf_raise',
        name: 'Calf Raise',
        icon: '🦶',
        category: 'lower',
        description: 'Rise onto your toes to work the calves.',
        repMode: 'standard',
        landmarkIndices: [25, 27, 31], // knee → ankle → foot index
        extendedThreshold: 170,
        contractedThreshold: 140,
        idealExtended: 175,
        idealContracted: 135,
        formRules: [],
    },

    // ─── Core ────────────────────────────────────────────────────────────────

    plank: {
        id: 'plank',
        name: 'Plank',
        icon: '🧘',
        category: 'core',
        description: 'Hold a straight body position on your forearms.',
        repMode: 'hold', // Timed hold, not reps
        landmarkIndices: [11, 23, 27], // shoulder → hip → ankle
        extendedThreshold: 170,  // good straight plank
        contractedThreshold: 140, // threshold for "breaking" position
        idealExtended: 175,
        idealContracted: 160,
        formRules: [
            { id: 'plank_hip_sag', description: 'Hips sagging', correctionMessage: 'Lift your hips — keep a straight line', ruleKey: 'hip_sag' },
            { id: 'plank_hip_pike', description: 'Hips too high', correctionMessage: 'Lower your hips into a straight line', ruleKey: 'hip_pike' },
        ],
    },

    situp: {
        id: 'situp',
        name: 'Sit-up',
        icon: '🔄',
        category: 'core',
        description: 'Curl torso upward from a lying position.',
        repMode: 'standard',
        landmarkIndices: [11, 23, 25], // shoulder → hip → knee
        extendedThreshold: 140,
        contractedThreshold: 70,
        idealExtended: 160,
        idealContracted: 50,
        formRules: [],
    },

    mountain_climber: {
        id: 'mountain_climber',
        name: 'Mountain Climber',
        icon: '⛰️',
        category: 'core',
        description: 'Alternate driving knees toward chest in plank position.',
        repMode: 'standard',
        landmarkIndices: [11, 23, 25], // shoulder → hip → knee
        extendedThreshold: 150,
        contractedThreshold: 80,
        idealExtended: 170,
        idealContracted: 60,
        formRules: [
            { id: 'mc_hip_sag', description: 'Hips sagging', correctionMessage: 'Keep your hips level', ruleKey: 'hip_sag' },
        ],
    },
};

// Helper to get exercises by category
export function getExercisesByCategory(category: ExerciseCategory): ExerciseConfig[] {
    return Object.values(EXERCISES).filter((e) => e.category === category);
}

export function getExerciseById(id: ExerciseId): ExerciseConfig {
    return EXERCISES[id];
}

export const ALL_EXERCISE_IDS = Object.keys(EXERCISES) as ExerciseId[];
