module.exports = [
"[project]/src/utils/angles.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Angle calculation utilities for pose estimation.
 *
 * These functions compute the angle between three body landmarks,
 * which is essential for determining joint angles (e.g. elbow, knee).
 *
 * A "landmark" is a point with x, y coordinates (normalised 0–1 by MediaPipe).
 */ __turbopack_context__.s([
    "calculateAngle",
    ()=>calculateAngle,
    "normalizeAngle",
    ()=>normalizeAngle
]);
function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180 / Math.PI);
    // Normalise: if angle > 180, reflect it so we always get the inner angle
    if (angle > 180) {
        angle = 360 - angle;
    }
    return angle;
}
function normalizeAngle(angle) {
    return Math.max(0, Math.min(180, angle));
}
}),
"[project]/src/utils/smoothing.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Smoothing utilities for pose landmark data.
 *
 * MediaPipe landmarks can jitter between frames. An Exponential Moving Average
 * (EMA) filter smooths the data by weighting the current frame's value against
 * the previous smoothed value:
 *
 *   smoothed = alpha * current + (1 - alpha) * previous
 *
 * Higher alpha (closer to 1) = more responsive but jittery.
 * Lower alpha (closer to 0) = smoother but more laggy.
 */ __turbopack_context__.s([
    "LandmarkSmoother",
    ()=>LandmarkSmoother,
    "smoothPoint",
    ()=>smoothPoint,
    "smoothValue",
    ()=>smoothValue
]);
function smoothValue(current, previous, alpha = 0.5) {
    if (previous === null) return current;
    return alpha * current + (1 - alpha) * previous;
}
function smoothPoint(current, previous, alpha = 0.5) {
    if (previous === null) return current;
    return {
        x: alpha * current.x + (1 - alpha) * previous.x,
        y: alpha * current.y + (1 - alpha) * previous.y
    };
}
class LandmarkSmoother {
    previousPoints = new Array(33).fill(null);
    alpha;
    constructor(alpha = 0.4){
        this.alpha = alpha;
    }
    smooth(landmarks) {
        const smoothed = landmarks.map((landmark, i)=>{
            const result = smoothPoint(landmark, this.previousPoints[i], this.alpha);
            this.previousPoints[i] = result;
            return result;
        });
        return smoothed;
    }
    reset() {
        this.previousPoints = new Array(33).fill(null);
    }
}
}),
"[project]/src/lib/exercises.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Exercise Library — Full exercise definitions
 *
 * Each exercise defines:
 *  - category (upper/lower/core)
 *  - tracked landmark indices (A, B vertex, C)
 *  - angle thresholds for rep detection
 *  - ideal ROM angles for form scoring
 *  - form correction rules (checked by formCorrection.ts)
 *  - description and short text code
 *
 * MediaPipe Pose landmark reference:
 *  11/12 = shoulders, 13/14 = elbows, 15/16 = wrists
 *  23/24 = hips, 25/26 = knees, 27/28 = ankles, 29/30 = heels, 31/32 = toes
 */ // ─── Types ───────────────────────────────────────────────────────────────────
__turbopack_context__.s([
    "ALL_EXERCISE_IDS",
    ()=>ALL_EXERCISE_IDS,
    "CATEGORY_LABELS",
    ()=>CATEGORY_LABELS,
    "EXERCISES",
    ()=>EXERCISES,
    "getExerciseById",
    ()=>getExerciseById,
    "getExercisesByCategory",
    ()=>getExercisesByCategory,
    "getExercisesByLabel",
    ()=>getExercisesByLabel
]);
const EXERCISES = {
    // ─── Original Upper Body ─────────────────────────────────────────────────
    bicep_curl: {
        id: 'bicep_curl',
        name: 'Bicep Curl',
        icon: 'BC',
        category: 'upper',
        description: 'Curl weight toward shoulder by bending at the elbow.',
        repMode: 'standard',
        categoryLabel: 'Dumbbell',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 150,
        contractedThreshold: 50,
        idealExtended: 170,
        idealContracted: 35,
        formRules: [
            {
                id: 'curl_elbow_drift',
                description: 'Elbow moving too much',
                correctionMessage: 'Keep your elbows pinned to your sides',
                ruleKey: 'elbow_drift'
            },
            {
                id: 'curl_incomplete_rom',
                description: 'Incomplete range of motion',
                correctionMessage: 'Fully extend your arm at the bottom',
                ruleKey: 'incomplete_extension'
            }
        ]
    },
    hammer_curl: {
        id: 'hammer_curl',
        name: 'Hammer Curl',
        icon: 'HC',
        category: 'upper',
        description: 'Curl with neutral grip, targeting the brachialis.',
        repMode: 'standard',
        categoryLabel: 'Dumbbell',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 150,
        contractedThreshold: 50,
        idealExtended: 170,
        idealContracted: 40,
        formRules: [
            {
                id: 'hammer_elbow_drift',
                description: 'Elbow moving too much',
                correctionMessage: 'Keep your elbows pinned to your sides',
                ruleKey: 'elbow_drift'
            }
        ]
    },
    pushup: {
        id: 'pushup',
        name: 'Push-up',
        icon: 'PU',
        category: 'upper',
        description: 'Lower body to the floor and push back up.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            11,
            13,
            15
        ],
        extendedThreshold: 150,
        contractedThreshold: 80,
        idealExtended: 170,
        idealContracted: 60,
        formRules: [
            {
                id: 'pushup_hip_sag',
                description: 'Hips sagging',
                correctionMessage: 'Keep your hips level — engage your core',
                ruleKey: 'hip_sag'
            },
            {
                id: 'pushup_elbow_flare',
                description: 'Elbows flaring too wide',
                correctionMessage: 'Tuck your elbows closer to your body',
                ruleKey: 'elbow_flare'
            }
        ]
    },
    shoulder_press: {
        id: 'shoulder_press',
        name: 'Shoulder Press',
        icon: 'SP',
        category: 'upper',
        description: 'Press weight overhead from shoulder height.',
        repMode: 'standard',
        categoryLabel: 'Dumbbell',
        landmarkIndices: [
            23,
            11,
            13
        ],
        secondaryLandmarkIndices: [
            24,
            12,
            14
        ],
        extendedThreshold: 160,
        contractedThreshold: 80,
        idealExtended: 175,
        idealContracted: 70,
        formRules: [
            {
                id: 'press_back_arch',
                description: 'Excessive back arch',
                correctionMessage: 'Keep your back straight — engage your core',
                ruleKey: 'back_arch'
            }
        ]
    },
    lateral_raise: {
        id: 'lateral_raise',
        name: 'Lateral Raise',
        icon: 'LR',
        category: 'upper',
        description: 'Raise arms to the side until parallel with shoulders.',
        repMode: 'standard',
        categoryLabel: 'Dumbbell',
        landmarkIndices: [
            23,
            11,
            15
        ],
        secondaryLandmarkIndices: [
            24,
            12,
            16
        ],
        extendedThreshold: 140,
        contractedThreshold: 60,
        idealExtended: 160,
        idealContracted: 25,
        formRules: [
            {
                id: 'lateral_shrug',
                description: 'Shrugging shoulders',
                correctionMessage: 'Keep your shoulders down and relaxed',
                ruleKey: 'shoulder_shrug'
            }
        ]
    },
    tricep_extension: {
        id: 'tricep_extension',
        name: 'Tricep Extension',
        icon: 'TE',
        category: 'upper',
        description: 'Extend arm overhead to work the triceps.',
        repMode: 'standard',
        categoryLabel: 'Dumbbell',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 150,
        contractedThreshold: 50,
        idealExtended: 170,
        idealContracted: 40,
        formRules: [
            {
                id: 'tricep_elbow_drift',
                description: 'Elbow moving too much',
                correctionMessage: 'Keep your upper arm still',
                ruleKey: 'elbow_drift'
            }
        ]
    },
    // ─── Original Lower Body ─────────────────────────────────────────────────
    squat: {
        id: 'squat',
        name: 'Squat',
        icon: 'SQ',
        category: 'lower',
        description: 'Lower hips by bending knees while keeping chest upright.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            23,
            25,
            27
        ],
        extendedThreshold: 160,
        contractedThreshold: 90,
        idealExtended: 175,
        idealContracted: 70,
        formRules: [
            {
                id: 'squat_knee_valgus',
                description: 'Knees collapsing inward',
                correctionMessage: 'Push your knees outward over your toes',
                ruleKey: 'knee_valgus'
            },
            {
                id: 'squat_depth',
                description: 'Not going deep enough',
                correctionMessage: 'Go lower — aim for parallel or below',
                ruleKey: 'insufficient_depth'
            },
            {
                id: 'squat_lean',
                description: 'Leaning too far forward',
                correctionMessage: 'Keep your chest up and back straight',
                ruleKey: 'forward_lean'
            }
        ]
    },
    lunge: {
        id: 'lunge',
        name: 'Lunge',
        icon: 'LU',
        category: 'lower',
        description: 'Step forward and lower until knee is at 90°.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            23,
            25,
            27
        ],
        extendedThreshold: 160,
        contractedThreshold: 90,
        idealExtended: 175,
        idealContracted: 80,
        formRules: [
            {
                id: 'lunge_knee_past_toe',
                description: 'Knee going past toes',
                correctionMessage: 'Keep your front knee behind your toes',
                ruleKey: 'knee_past_toe'
            }
        ]
    },
    jump_squat: {
        id: 'jump_squat',
        name: 'Jump Squat',
        icon: 'JS',
        category: 'lower',
        description: 'Squat down then explode upward into a jump.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            23,
            25,
            27
        ],
        extendedThreshold: 160,
        contractedThreshold: 90,
        idealExtended: 175,
        idealContracted: 75,
        formRules: [
            {
                id: 'jump_squat_depth',
                description: 'Not going deep enough',
                correctionMessage: 'Sit deeper before jumping',
                ruleKey: 'insufficient_depth'
            }
        ]
    },
    calf_raise: {
        id: 'calf_raise',
        name: 'Calf Raise',
        icon: 'CR',
        category: 'lower',
        description: 'Rise onto your toes to work the calves.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            23,
            25,
            27
        ],
        secondaryLandmarkIndices: [
            24,
            26,
            28
        ],
        extendedThreshold: 175,
        contractedThreshold: 155,
        idealExtended: 180,
        idealContracted: 155,
        formRules: []
    },
    // ─── Original Core ────────────────────────────────────────────────────────
    plank: {
        id: 'plank',
        name: 'Plank',
        icon: 'PL',
        category: 'core',
        description: 'Hold a straight body position on your forearms.',
        repMode: 'hold',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            11,
            23,
            27
        ],
        extendedThreshold: 170,
        contractedThreshold: 140,
        idealExtended: 175,
        idealContracted: 160,
        formRules: [
            {
                id: 'plank_hip_sag',
                description: 'Hips sagging',
                correctionMessage: 'Lift your hips — keep a straight line',
                ruleKey: 'hip_sag'
            },
            {
                id: 'plank_hip_pike',
                description: 'Hips too high',
                correctionMessage: 'Lower your hips into a straight line',
                ruleKey: 'hip_pike'
            }
        ]
    },
    situp: {
        id: 'situp',
        name: 'Sit-up',
        icon: 'SU',
        category: 'core',
        description: 'Curl torso upward from a lying position.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            11,
            23,
            25
        ],
        extendedThreshold: 140,
        contractedThreshold: 70,
        idealExtended: 160,
        idealContracted: 50,
        formRules: []
    },
    mountain_climber: {
        id: 'mountain_climber',
        name: 'Mountain Climber',
        icon: 'MC',
        category: 'core',
        description: 'Alternate driving knees toward chest in plank position.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            11,
            23,
            25
        ],
        extendedThreshold: 150,
        contractedThreshold: 80,
        idealExtended: 170,
        idealContracted: 60,
        formRules: [
            {
                id: 'mc_hip_sag',
                description: 'Hips sagging',
                correctionMessage: 'Keep your hips level',
                ruleKey: 'hip_sag'
            }
        ]
    },
    jumping_jacks: {
        id: 'jumping_jacks',
        name: 'Jumping Jacks',
        icon: 'JJ',
        category: 'core',
        description: 'Jump while spreading legs and raising arms overhead, then return.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            23,
            11,
            15
        ],
        secondaryLandmarkIndices: [
            24,
            12,
            16
        ],
        extendedThreshold: 140,
        contractedThreshold: 40,
        idealExtended: 160,
        idealContracted: 20,
        formRules: [
            {
                id: 'jj_sync',
                description: 'Arms not synchronized',
                correctionMessage: 'Raise both arms together',
                ruleKey: 'arm_sync'
            }
        ]
    },
    // ─── Barbell ──────────────────────────────────────────────────────────────
    barbell_squat: {
        id: 'barbell_squat',
        name: 'Barbell Squat',
        icon: 'BSQ',
        category: 'lower',
        description: 'Bar on traps, sit back and down keeping chest upright.',
        repMode: 'standard',
        categoryLabel: 'Barbell',
        landmarkIndices: [
            23,
            25,
            27
        ],
        secondaryLandmarkIndices: [
            24,
            26,
            28
        ],
        extendedThreshold: 160,
        contractedThreshold: 90,
        idealExtended: 175,
        idealContracted: 70,
        formRules: [
            {
                id: 'bsq_valgus',
                description: 'Knees caving in',
                correctionMessage: 'Drive knees out over your toes',
                ruleKey: 'knee_valgus'
            },
            {
                id: 'bsq_lean',
                description: 'Excessive forward lean',
                correctionMessage: 'Keep chest up, elbows forward',
                ruleKey: 'forward_lean'
            }
        ]
    },
    barbell_row: {
        id: 'barbell_row',
        name: 'Barbell Row',
        icon: 'BR',
        category: 'upper',
        description: 'Hinge at hips and row barbell to lower chest.',
        repMode: 'standard',
        categoryLabel: 'Barbell',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 150,
        contractedThreshold: 60,
        idealExtended: 170,
        idealContracted: 45,
        formRules: [
            {
                id: 'br_back',
                description: 'Back rounding',
                correctionMessage: 'Keep back flat, hinge from hips',
                ruleKey: 'back_arch'
            }
        ]
    },
    deadlift: {
        id: 'deadlift',
        name: 'Deadlift',
        icon: 'DL',
        category: 'lower',
        description: 'Hip hinge to lift barbell from floor, lock out hips at top.',
        repMode: 'standard',
        categoryLabel: 'Barbell',
        landmarkIndices: [
            11,
            23,
            25
        ],
        extendedThreshold: 160,
        contractedThreshold: 100,
        idealExtended: 175,
        idealContracted: 90,
        formRules: [
            {
                id: 'dl_back',
                description: 'Lower back rounding',
                correctionMessage: 'Neutral spine — brace your core hard',
                ruleKey: 'back_arch'
            }
        ]
    },
    bench_press: {
        id: 'bench_press',
        name: 'Bench Press',
        icon: 'BP',
        category: 'upper',
        description: 'Lower barbell to chest and press back up.',
        repMode: 'standard',
        categoryLabel: 'Barbell',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 150,
        contractedThreshold: 70,
        idealExtended: 170,
        idealContracted: 60,
        formRules: [
            {
                id: 'bp_flare',
                description: 'Elbows flaring wide',
                correctionMessage: 'Tuck elbows 45 degrees to protect shoulders',
                ruleKey: 'elbow_flare'
            }
        ]
    },
    overhead_press: {
        id: 'overhead_press',
        name: 'Overhead Press',
        icon: 'OP',
        category: 'upper',
        description: 'Press barbell from chin to full lockout overhead.',
        repMode: 'standard',
        categoryLabel: 'Barbell',
        landmarkIndices: [
            23,
            11,
            13
        ],
        secondaryLandmarkIndices: [
            24,
            12,
            14
        ],
        extendedThreshold: 160,
        contractedThreshold: 80,
        idealExtended: 175,
        idealContracted: 70,
        formRules: [
            {
                id: 'op_arch',
                description: 'Excessive back arch',
                correctionMessage: 'Brace core, keep ribs down',
                ruleKey: 'back_arch'
            }
        ]
    },
    romanian_deadlift: {
        id: 'romanian_deadlift',
        name: 'Romanian Deadlift',
        icon: 'RDL',
        category: 'lower',
        description: 'Hip hinge with soft knees to feel deep hamstring stretch.',
        repMode: 'standard',
        categoryLabel: 'Barbell',
        landmarkIndices: [
            11,
            23,
            25
        ],
        extendedThreshold: 155,
        contractedThreshold: 95,
        idealExtended: 170,
        idealContracted: 85,
        formRules: [
            {
                id: 'rdl_back',
                description: 'Rounding lower back',
                correctionMessage: 'Keep neutral spine throughout',
                ruleKey: 'back_arch'
            }
        ]
    },
    incline_bench_press: {
        id: 'incline_bench_press',
        name: 'Incline Bench Press',
        icon: 'IBP',
        category: 'upper',
        description: 'Inclined bench press targeting upper chest.',
        repMode: 'standard',
        categoryLabel: 'Barbell',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 150,
        contractedThreshold: 70,
        idealExtended: 170,
        idealContracted: 60,
        formRules: [
            {
                id: 'ibp_flare',
                description: 'Elbows too wide',
                correctionMessage: 'Keep elbows at 45-70 degrees',
                ruleKey: 'elbow_flare'
            }
        ]
    },
    front_squat: {
        id: 'front_squat',
        name: 'Front Squat',
        icon: 'FSQ',
        category: 'lower',
        description: 'Barbell on front rack, maintaining upright torso.',
        repMode: 'standard',
        categoryLabel: 'Barbell',
        landmarkIndices: [
            23,
            25,
            27
        ],
        secondaryLandmarkIndices: [
            24,
            26,
            28
        ],
        extendedThreshold: 160,
        contractedThreshold: 90,
        idealExtended: 175,
        idealContracted: 70,
        formRules: [
            {
                id: 'fsq_elbows',
                description: 'Elbows dropping',
                correctionMessage: 'Keep elbows up, parallel to floor',
                ruleKey: 'forward_lean'
            }
        ]
    },
    hip_thrust_barbell: {
        id: 'hip_thrust_barbell',
        name: 'Hip Thrust (Barbell)',
        icon: 'HTB',
        category: 'lower',
        description: 'Drive hips up with barbell across hips, squeeze glutes at top.',
        repMode: 'standard',
        categoryLabel: 'Barbell',
        landmarkIndices: [
            11,
            23,
            25
        ],
        extendedThreshold: 160,
        contractedThreshold: 100,
        idealExtended: 170,
        idealContracted: 95,
        formRules: []
    },
    // ─── Dumbbell ─────────────────────────────────────────────────────────────
    dumbbell_row: {
        id: 'dumbbell_row',
        name: 'Dumbbell Row',
        icon: 'DR',
        category: 'upper',
        description: 'One-arm row, elbow drives back past torso.',
        repMode: 'standard',
        categoryLabel: 'Dumbbell',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 150,
        contractedThreshold: 55,
        idealExtended: 170,
        idealContracted: 40,
        formRules: [
            {
                id: 'dr_rotation',
                description: 'Excessive torso rotation',
                correctionMessage: 'Keep hips square to bench',
                ruleKey: 'back_arch'
            }
        ]
    },
    goblet_squat: {
        id: 'goblet_squat',
        name: 'Goblet Squat',
        icon: 'GS',
        category: 'lower',
        description: 'Hold dumbbell at chest and squat deep with upright torso.',
        repMode: 'standard',
        categoryLabel: 'Dumbbell',
        landmarkIndices: [
            23,
            25,
            27
        ],
        secondaryLandmarkIndices: [
            24,
            26,
            28
        ],
        extendedThreshold: 160,
        contractedThreshold: 90,
        idealExtended: 175,
        idealContracted: 70,
        formRules: [
            {
                id: 'gs_valgus',
                description: 'Knees caving in',
                correctionMessage: 'Push knees out over toes',
                ruleKey: 'knee_valgus'
            }
        ]
    },
    dumbbell_deadlift: {
        id: 'dumbbell_deadlift',
        name: 'Dumbbell Deadlift',
        icon: 'DD',
        category: 'lower',
        description: 'Deadlift with dumbbells — great for hip hinge mechanics.',
        repMode: 'standard',
        categoryLabel: 'Dumbbell',
        landmarkIndices: [
            11,
            23,
            25
        ],
        extendedThreshold: 160,
        contractedThreshold: 100,
        idealExtended: 175,
        idealContracted: 90,
        formRules: [
            {
                id: 'dd_back',
                description: 'Rounding back',
                correctionMessage: 'Flat back, push the floor away',
                ruleKey: 'back_arch'
            }
        ]
    },
    overhead_tricep_ext: {
        id: 'overhead_tricep_ext',
        name: 'Overhead Tricep Ext.',
        icon: 'OTE',
        category: 'upper',
        description: 'Extend dumbbell overhead — keep upper arm vertical.',
        repMode: 'standard',
        categoryLabel: 'Dumbbell',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 150,
        contractedThreshold: 55,
        idealExtended: 170,
        idealContracted: 40,
        formRules: [
            {
                id: 'ote_drift',
                description: 'Upper arm moving',
                correctionMessage: 'Keep upper arm still and vertical',
                ruleKey: 'elbow_drift'
            }
        ]
    },
    chest_press: {
        id: 'chest_press',
        name: 'DB Chest Press',
        icon: 'CP',
        category: 'upper',
        description: 'Press dumbbells from chest to full extension.',
        repMode: 'standard',
        categoryLabel: 'Dumbbell',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 150,
        contractedThreshold: 70,
        idealExtended: 170,
        idealContracted: 55,
        formRules: [
            {
                id: 'cp_flare',
                description: 'Elbows too wide',
                correctionMessage: 'Bring elbows slightly inward',
                ruleKey: 'elbow_flare'
            }
        ]
    },
    dumbbell_fly: {
        id: 'dumbbell_fly',
        name: 'Dumbbell Fly',
        icon: 'DF',
        category: 'upper',
        description: 'Arc arms wide to stretch chest, then bring together.',
        repMode: 'standard',
        categoryLabel: 'Dumbbell',
        landmarkIndices: [
            23,
            11,
            15
        ],
        secondaryLandmarkIndices: [
            24,
            12,
            16
        ],
        extendedThreshold: 145,
        contractedThreshold: 55,
        idealExtended: 160,
        idealContracted: 20,
        formRules: []
    },
    front_raise: {
        id: 'front_raise',
        name: 'Front Raise',
        icon: 'FR',
        category: 'upper',
        description: 'Raise dumbbells front to shoulder height with straight arms.',
        repMode: 'standard',
        categoryLabel: 'Dumbbell',
        landmarkIndices: [
            23,
            11,
            15
        ],
        secondaryLandmarkIndices: [
            24,
            12,
            16
        ],
        extendedThreshold: 140,
        contractedThreshold: 55,
        idealExtended: 160,
        idealContracted: 20,
        formRules: [
            {
                id: 'fr_shrug',
                description: 'Shrugging shoulders',
                correctionMessage: 'Keep shoulders down and packed',
                ruleKey: 'shoulder_shrug'
            }
        ]
    },
    tricep_kickback: {
        id: 'tricep_kickback',
        name: 'Tricep Kickback',
        icon: 'TK',
        category: 'upper',
        description: 'Hinge forward, extend arm back fully.',
        repMode: 'standard',
        categoryLabel: 'Dumbbell',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 150,
        contractedThreshold: 65,
        idealExtended: 170,
        idealContracted: 50,
        formRules: [
            {
                id: 'tk_drift',
                description: 'Upper arm dropping',
                correctionMessage: 'Keep upper arm parallel to floor',
                ruleKey: 'elbow_drift'
            }
        ]
    },
    incline_chest_press: {
        id: 'incline_chest_press',
        name: 'Incline DB Press',
        icon: 'ICP',
        category: 'upper',
        description: 'Incline dumbbell press for upper chest.',
        repMode: 'standard',
        categoryLabel: 'Dumbbell',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 150,
        contractedThreshold: 70,
        idealExtended: 170,
        idealContracted: 55,
        formRules: []
    },
    // ─── Body-weight extras ───────────────────────────────────────────────────
    walking_lunges: {
        id: 'walking_lunges',
        name: 'Walking Lunges',
        icon: 'WL',
        category: 'lower',
        description: 'Step forward into lunge, alternate legs.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            23,
            25,
            27
        ],
        extendedThreshold: 160,
        contractedThreshold: 90,
        idealExtended: 175,
        idealContracted: 80,
        formRules: [
            {
                id: 'wl_knee',
                description: 'Knee past toes',
                correctionMessage: 'Keep front knee behind your toes',
                ruleKey: 'knee_past_toe'
            }
        ]
    },
    knee_pushup: {
        id: 'knee_pushup',
        name: 'Knee Push-up',
        icon: 'KPU',
        category: 'upper',
        description: 'Modified push-up from knees — great for beginners.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 150,
        contractedThreshold: 80,
        idealExtended: 170,
        idealContracted: 60,
        formRules: [
            {
                id: 'kpu_sag',
                description: 'Hips sagging',
                correctionMessage: 'Keep core engaged, body in straight line',
                ruleKey: 'hip_sag'
            }
        ]
    },
    side_plank: {
        id: 'side_plank',
        name: 'Side Plank',
        icon: 'SP2',
        category: 'core',
        description: 'Hold body in a lateral line on forearm and foot.',
        repMode: 'hold',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            11,
            23,
            27
        ],
        extendedThreshold: 165,
        contractedThreshold: 140,
        idealExtended: 175,
        idealContracted: 155,
        formRules: [
            {
                id: 'sp_sag',
                description: 'Hips dropping',
                correctionMessage: 'Lift hips — keep a straight line',
                ruleKey: 'hip_sag'
            }
        ]
    },
    bicycle_crunch: {
        id: 'bicycle_crunch',
        name: 'Bicycle Crunch',
        icon: 'BC2',
        category: 'core',
        description: 'Alternate elbow to opposite knee with rotation.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            11,
            23,
            25
        ],
        extendedThreshold: 150,
        contractedThreshold: 75,
        idealExtended: 165,
        idealContracted: 55,
        formRules: []
    },
    leg_raises: {
        id: 'leg_raises',
        name: 'Leg Raises',
        icon: 'LR2',
        category: 'core',
        description: 'Lying flat, raise straight legs to 90 degrees and lower.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            23,
            25,
            27
        ],
        extendedThreshold: 155,
        contractedThreshold: 85,
        idealExtended: 170,
        idealContracted: 75,
        formRules: [
            {
                id: 'lr_arch',
                description: 'Lower back lifting off floor',
                correctionMessage: 'Press lower back flat on floor',
                ruleKey: 'back_arch'
            }
        ]
    },
    glute_bridge: {
        id: 'glute_bridge',
        name: 'Glute Bridge',
        icon: 'GB',
        category: 'lower',
        description: 'Lying on back, drive hips to ceiling squeezing glutes.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            11,
            23,
            25
        ],
        extendedThreshold: 155,
        contractedThreshold: 100,
        idealExtended: 165,
        idealContracted: 90,
        formRules: []
    },
    hip_thrust: {
        id: 'hip_thrust',
        name: 'Hip Thrust',
        icon: 'HT',
        category: 'lower',
        description: 'Back on bench, drive hips to full extension.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            11,
            23,
            25
        ],
        extendedThreshold: 155,
        contractedThreshold: 100,
        idealExtended: 170,
        idealContracted: 90,
        formRules: []
    },
    high_knees: {
        id: 'high_knees',
        name: 'High Knees',
        icon: 'HK',
        category: 'core',
        description: 'Run in place driving knees to waist height.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            23,
            25,
            27
        ],
        extendedThreshold: 155,
        contractedThreshold: 75,
        idealExtended: 170,
        idealContracted: 60,
        formRules: []
    },
    chin_up: {
        id: 'chin_up',
        name: 'Chin-up',
        icon: 'CU',
        category: 'upper',
        description: 'Supinated grip pull-up — chin above bar.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 155,
        contractedThreshold: 60,
        idealExtended: 170,
        idealContracted: 45,
        formRules: [
            {
                id: 'cu_kip',
                description: 'Kipping / swinging',
                correctionMessage: 'Control the movement — no swinging',
                ruleKey: 'elbow_drift'
            }
        ]
    },
    pull_up: {
        id: 'pull_up',
        name: 'Pull-up',
        icon: 'PUP',
        category: 'upper',
        description: 'Pronated grip pull-up — chin over bar.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 155,
        contractedThreshold: 60,
        idealExtended: 170,
        idealContracted: 45,
        formRules: []
    },
    burpees: {
        id: 'burpees',
        name: 'Burpees',
        icon: 'BU',
        category: 'core',
        description: 'Full body: drop to push-up position, jump and clap.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            11,
            23,
            25
        ],
        extendedThreshold: 155,
        contractedThreshold: 80,
        idealExtended: 170,
        idealContracted: 65,
        formRules: []
    },
    crunches: {
        id: 'crunches',
        name: 'Crunches',
        icon: 'CR2',
        category: 'core',
        description: 'Curl shoulders toward knees, lower controlled.',
        repMode: 'standard',
        categoryLabel: 'Body-weight',
        landmarkIndices: [
            11,
            23,
            25
        ],
        extendedThreshold: 145,
        contractedThreshold: 75,
        idealExtended: 160,
        idealContracted: 60,
        formRules: []
    },
    // ─── Cardio / Functional ──────────────────────────────────────────────────
    battle_ropes: {
        id: 'battle_ropes',
        name: 'Battle Ropes',
        icon: 'BAT',
        category: 'upper',
        description: 'Alternate explosive arm waves with battle ropes.',
        repMode: 'standard',
        categoryLabel: 'Cardio',
        landmarkIndices: [
            23,
            11,
            15
        ],
        secondaryLandmarkIndices: [
            24,
            12,
            16
        ],
        extendedThreshold: 145,
        contractedThreshold: 50,
        idealExtended: 160,
        idealContracted: 20,
        formRules: [
            {
                id: 'bat_stance',
                description: 'Standing too upright',
                correctionMessage: 'Stay in athletic quarter-squat stance',
                ruleKey: 'back_arch'
            }
        ]
    },
    box_jumps: {
        id: 'box_jumps',
        name: 'Box Jumps',
        icon: 'BJ',
        category: 'lower',
        description: 'Explosive jump onto box, land softly, step down.',
        repMode: 'standard',
        categoryLabel: 'Cardio',
        landmarkIndices: [
            23,
            25,
            27
        ],
        secondaryLandmarkIndices: [
            24,
            26,
            28
        ],
        extendedThreshold: 160,
        contractedThreshold: 85,
        idealExtended: 175,
        idealContracted: 70,
        formRules: [
            {
                id: 'bj_landing',
                description: 'Stiff landing',
                correctionMessage: 'Land softly — bend knees to absorb',
                ruleKey: 'insufficient_depth'
            }
        ]
    },
    farmers_walk: {
        id: 'farmers_walk',
        name: "Farmer's Walk",
        icon: 'FW',
        category: 'lower',
        description: 'Walk with heavy dumbbells at sides — upright posture.',
        repMode: 'standard',
        categoryLabel: 'Cardio',
        landmarkIndices: [
            11,
            23,
            25
        ],
        extendedThreshold: 160,
        contractedThreshold: 120,
        idealExtended: 175,
        idealContracted: 155,
        formRules: [
            {
                id: 'fw_lean',
                description: 'Forward lean',
                correctionMessage: 'Tall posture, shoulders packed back',
                ruleKey: 'forward_lean'
            }
        ]
    },
    jump_rope: {
        id: 'jump_rope',
        name: 'Jump Rope',
        icon: 'JR',
        category: 'core',
        description: 'Skip rope with small bounces on balls of feet.',
        repMode: 'standard',
        categoryLabel: 'Cardio',
        landmarkIndices: [
            23,
            25,
            27
        ],
        extendedThreshold: 160,
        contractedThreshold: 130,
        idealExtended: 175,
        idealContracted: 145,
        formRules: []
    },
    kettlebell_swing: {
        id: 'kettlebell_swing',
        name: 'Kettlebell Swing',
        icon: 'KB',
        category: 'lower',
        description: 'Hip hinge power swing — this is a hinge, not a squat.',
        repMode: 'standard',
        categoryLabel: 'Cardio',
        landmarkIndices: [
            11,
            23,
            25
        ],
        extendedThreshold: 160,
        contractedThreshold: 95,
        idealExtended: 175,
        idealContracted: 80,
        formRules: [
            {
                id: 'kb_squat',
                description: 'Squatting instead of hinging',
                correctionMessage: 'Drive from hips — lead with the hinge',
                ruleKey: 'forward_lean'
            }
        ]
    },
    rowing_machine: {
        id: 'rowing_machine',
        name: 'Rowing Machine',
        icon: 'ROW',
        category: 'upper',
        description: 'Drive with legs, lean back, then pull handle to chest.',
        repMode: 'standard',
        categoryLabel: 'Cardio',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 155,
        contractedThreshold: 55,
        idealExtended: 170,
        idealContracted: 40,
        formRules: [
            {
                id: 'row_lean',
                description: 'Over-leaning back',
                correctionMessage: 'Stop lean at 11 o clock — do not go past',
                ruleKey: 'back_arch'
            }
        ]
    },
    // ─── Core / Abs ───────────────────────────────────────────────────────────
    ab_rollout: {
        id: 'ab_rollout',
        name: 'Ab Rollout',
        icon: 'ARO',
        category: 'core',
        description: 'Roll wheel out from knees, keeping hips in line.',
        repMode: 'standard',
        categoryLabel: 'Core',
        landmarkIndices: [
            11,
            23,
            25
        ],
        extendedThreshold: 155,
        contractedThreshold: 90,
        idealExtended: 165,
        idealContracted: 75,
        formRules: [
            {
                id: 'aro_arch',
                description: 'Lower back arching',
                correctionMessage: 'Do not let hips drop — brace hard',
                ruleKey: 'hip_sag'
            }
        ]
    },
    flutter_kicks: {
        id: 'flutter_kicks',
        name: 'Flutter Kicks',
        icon: 'FK',
        category: 'core',
        description: 'Alternate small leg kicks keeping lower back pressed flat.',
        repMode: 'standard',
        categoryLabel: 'Core',
        landmarkIndices: [
            23,
            25,
            27
        ],
        extendedThreshold: 155,
        contractedThreshold: 100,
        idealExtended: 170,
        idealContracted: 120,
        formRules: [
            {
                id: 'fk_arch',
                description: 'Lower back lifting',
                correctionMessage: 'Press lower back flat, engage core',
                ruleKey: 'back_arch'
            }
        ]
    },
    hanging_leg_raises: {
        id: 'hanging_leg_raises',
        name: 'Hanging Leg Raises',
        icon: 'HLR',
        category: 'core',
        description: 'Hang from bar and raise legs to 90 degrees or higher.',
        repMode: 'standard',
        categoryLabel: 'Core',
        landmarkIndices: [
            23,
            25,
            27
        ],
        extendedThreshold: 155,
        contractedThreshold: 80,
        idealExtended: 170,
        idealContracted: 70,
        formRules: [
            {
                id: 'hlr_swing',
                description: 'Swinging body',
                correctionMessage: 'Control the movement — no momentum',
                ruleKey: 'elbow_drift'
            }
        ]
    },
    plank_shoulder_taps: {
        id: 'plank_shoulder_taps',
        name: 'Plank Shoulder Taps',
        icon: 'PST',
        category: 'core',
        description: 'In push-up plank, alternate tapping opposite shoulder.',
        repMode: 'standard',
        categoryLabel: 'Core',
        landmarkIndices: [
            11,
            23,
            27
        ],
        extendedThreshold: 168,
        contractedThreshold: 140,
        idealExtended: 175,
        idealContracted: 155,
        formRules: [
            {
                id: 'pst_rotation',
                description: 'Hips rotating',
                correctionMessage: 'Brace core — minimize hip movement',
                ruleKey: 'back_arch'
            }
        ]
    },
    reverse_crunch: {
        id: 'reverse_crunch',
        name: 'Reverse Crunch',
        icon: 'RC',
        category: 'core',
        description: 'Curl hips and knees toward chest from lying position.',
        repMode: 'standard',
        categoryLabel: 'Core',
        landmarkIndices: [
            23,
            25,
            27
        ],
        extendedThreshold: 155,
        contractedThreshold: 80,
        idealExtended: 170,
        idealContracted: 65,
        formRules: []
    },
    russian_twists: {
        id: 'russian_twists',
        name: 'Russian Twists',
        icon: 'RT',
        category: 'core',
        description: 'Leaned back, rotate torso side to side.',
        repMode: 'standard',
        categoryLabel: 'Core',
        landmarkIndices: [
            23,
            11,
            15
        ],
        secondaryLandmarkIndices: [
            24,
            12,
            16
        ],
        extendedThreshold: 145,
        contractedThreshold: 55,
        idealExtended: 160,
        idealContracted: 25,
        formRules: []
    },
    toe_touches: {
        id: 'toe_touches',
        name: 'Toe Touches',
        icon: 'TT',
        category: 'core',
        description: 'Lying flat, reach fingertips up and touch toes.',
        repMode: 'standard',
        categoryLabel: 'Core',
        landmarkIndices: [
            11,
            23,
            25
        ],
        extendedThreshold: 145,
        contractedThreshold: 75,
        idealExtended: 160,
        idealContracted: 55,
        formRules: []
    },
    // ─── Machine exercises ────────────────────────────────────────────────────
    cable_bicep_curl: {
        id: 'cable_bicep_curl',
        name: 'Cable Bicep Curl',
        icon: 'CBC',
        category: 'upper',
        description: 'Cable curl for constant tension throughout range of motion.',
        repMode: 'standard',
        categoryLabel: 'Machine',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 150,
        contractedThreshold: 50,
        idealExtended: 170,
        idealContracted: 35,
        formRules: [
            {
                id: 'cbc_drift',
                description: 'Elbow drifting forward',
                correctionMessage: 'Keep elbows pinned — do not swing',
                ruleKey: 'elbow_drift'
            }
        ]
    },
    cable_lateral_raise: {
        id: 'cable_lateral_raise',
        name: 'Cable Lateral Raise',
        icon: 'CLR',
        category: 'upper',
        description: 'Single-arm cable raise for constant delt tension.',
        repMode: 'standard',
        categoryLabel: 'Machine',
        landmarkIndices: [
            23,
            11,
            15
        ],
        extendedThreshold: 140,
        contractedThreshold: 55,
        idealExtended: 160,
        idealContracted: 20,
        formRules: [
            {
                id: 'clr_shrug',
                description: 'Shrugging shoulder',
                correctionMessage: 'Keep shoulder depressed throughout',
                ruleKey: 'shoulder_shrug'
            }
        ]
    },
    cable_tricep_pushdown: {
        id: 'cable_tricep_pushdown',
        name: 'Cable Tricep Pushdown',
        icon: 'CTP',
        category: 'upper',
        description: 'Push rope or bar down, fully extending triceps.',
        repMode: 'standard',
        categoryLabel: 'Machine',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 150,
        contractedThreshold: 55,
        idealExtended: 170,
        idealContracted: 35,
        formRules: [
            {
                id: 'ctp_lean',
                description: 'Leaning into the cable',
                correctionMessage: 'Stand tall, elbows at sides',
                ruleKey: 'elbow_drift'
            }
        ]
    },
    chest_press_machine: {
        id: 'chest_press_machine',
        name: 'Chest Press Machine',
        icon: 'CPM',
        category: 'upper',
        description: 'Machine chest press — great for beginners to learn the pattern.',
        repMode: 'standard',
        categoryLabel: 'Machine',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 150,
        contractedThreshold: 70,
        idealExtended: 170,
        idealContracted: 55,
        formRules: []
    },
    lat_pulldown: {
        id: 'lat_pulldown',
        name: 'Lat Pulldown',
        icon: 'LPD',
        category: 'upper',
        description: 'Pull bar to upper chest, slight lean back.',
        repMode: 'standard',
        categoryLabel: 'Machine',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 155,
        contractedThreshold: 60,
        idealExtended: 170,
        idealContracted: 45,
        formRules: [
            {
                id: 'lpd_lean',
                description: 'Leaning too far back',
                correctionMessage: 'Slight 10-15 degree lean only — use your lats',
                ruleKey: 'back_arch'
            }
        ]
    },
    leg_curl: {
        id: 'leg_curl',
        name: 'Leg Curl',
        icon: 'LC',
        category: 'lower',
        description: 'Curl legs against pad tracking hamstring contraction.',
        repMode: 'standard',
        categoryLabel: 'Machine',
        landmarkIndices: [
            23,
            25,
            27
        ],
        secondaryLandmarkIndices: [
            24,
            26,
            28
        ],
        extendedThreshold: 155,
        contractedThreshold: 70,
        idealExtended: 170,
        idealContracted: 55,
        formRules: []
    },
    leg_press: {
        id: 'leg_press',
        name: 'Leg Press',
        icon: 'LP2',
        category: 'lower',
        description: 'Press platform away with feet hip-width, do not lock knees.',
        repMode: 'standard',
        categoryLabel: 'Machine',
        landmarkIndices: [
            23,
            25,
            27
        ],
        secondaryLandmarkIndices: [
            24,
            26,
            28
        ],
        extendedThreshold: 155,
        contractedThreshold: 80,
        idealExtended: 170,
        idealContracted: 65,
        formRules: [
            {
                id: 'lp2_lockout',
                description: 'Locking out knees',
                correctionMessage: 'Soft knees at top — do not fully lock out',
                ruleKey: 'insufficient_depth'
            }
        ]
    },
    pec_deck: {
        id: 'pec_deck',
        name: 'Pec Deck',
        icon: 'PD',
        category: 'upper',
        description: 'Machine fly that isolates the chest muscle.',
        repMode: 'standard',
        categoryLabel: 'Machine',
        landmarkIndices: [
            23,
            11,
            15
        ],
        secondaryLandmarkIndices: [
            24,
            12,
            16
        ],
        extendedThreshold: 145,
        contractedThreshold: 50,
        idealExtended: 160,
        idealContracted: 20,
        formRules: []
    },
    seated_row: {
        id: 'seated_row',
        name: 'Seated Row',
        icon: 'SR',
        category: 'upper',
        description: 'Pull handles to torso, squeeze shoulder blades together.',
        repMode: 'standard',
        categoryLabel: 'Machine',
        landmarkIndices: [
            11,
            13,
            15
        ],
        secondaryLandmarkIndices: [
            12,
            14,
            16
        ],
        extendedThreshold: 155,
        contractedThreshold: 55,
        idealExtended: 170,
        idealContracted: 40,
        formRules: [
            {
                id: 'sr_lean',
                description: 'Rocking torso',
                correctionMessage: 'Use your back, not momentum',
                ruleKey: 'back_arch'
            }
        ]
    },
    leg_extension: {
        id: 'leg_extension',
        name: 'Leg Extension',
        icon: 'LE',
        category: 'lower',
        description: 'Extend legs against pad to fully contract quads.',
        repMode: 'standard',
        categoryLabel: 'Machine',
        landmarkIndices: [
            23,
            25,
            27
        ],
        secondaryLandmarkIndices: [
            24,
            26,
            28
        ],
        extendedThreshold: 155,
        contractedThreshold: 80,
        idealExtended: 170,
        idealContracted: 170,
        formRules: []
    },
    // ─── Stretching / Mobility (hold mode) ───────────────────────────────────
    cobra_stretch: {
        id: 'cobra_stretch',
        name: 'Cobra Stretch',
        icon: 'COB',
        category: 'core',
        description: 'Press up gently from prone, arching the spine back.',
        repMode: 'hold',
        categoryLabel: 'Stretch',
        landmarkIndices: [
            11,
            23,
            27
        ],
        extendedThreshold: 160,
        contractedThreshold: 130,
        idealExtended: 170,
        idealContracted: 140,
        formRules: []
    },
    hamstring_stretch: {
        id: 'hamstring_stretch',
        name: 'Hamstring Stretch',
        icon: 'HST',
        category: 'lower',
        description: 'Hinge from hips over straight legs to stretch hamstrings.',
        repMode: 'hold',
        categoryLabel: 'Stretch',
        landmarkIndices: [
            11,
            23,
            25
        ],
        extendedThreshold: 130,
        contractedThreshold: 80,
        idealExtended: 140,
        idealContracted: 90,
        formRules: []
    },
    hip_flexor_stretch: {
        id: 'hip_flexor_stretch',
        name: 'Hip Flexor Stretch',
        icon: 'HFS',
        category: 'lower',
        description: 'Low lunge — push front hip forward to open up the hip flexor.',
        repMode: 'hold',
        categoryLabel: 'Stretch',
        landmarkIndices: [
            23,
            25,
            27
        ],
        extendedThreshold: 155,
        contractedThreshold: 100,
        idealExtended: 165,
        idealContracted: 110,
        formRules: []
    },
    quad_stretch: {
        id: 'quad_stretch',
        name: 'Quad Stretch',
        icon: 'QST',
        category: 'lower',
        description: 'Standing, pull heel to glute to stretch the quadriceps.',
        repMode: 'hold',
        categoryLabel: 'Stretch',
        landmarkIndices: [
            23,
            25,
            27
        ],
        extendedThreshold: 150,
        contractedThreshold: 70,
        idealExtended: 165,
        idealContracted: 80,
        formRules: []
    },
    shoulder_stretch: {
        id: 'shoulder_stretch',
        name: 'Shoulder Stretch',
        icon: 'SST',
        category: 'upper',
        description: 'Pull arm across the body to stretch the rear deltoid.',
        repMode: 'hold',
        categoryLabel: 'Stretch',
        landmarkIndices: [
            23,
            11,
            15
        ],
        secondaryLandmarkIndices: [
            24,
            12,
            16
        ],
        extendedThreshold: 140,
        contractedThreshold: 50,
        idealExtended: 155,
        idealContracted: 60,
        formRules: []
    }
};
function getExercisesByCategory(category) {
    return Object.values(EXERCISES).filter((e)=>e.category === category);
}
function getExercisesByLabel(label) {
    return Object.values(EXERCISES).filter((e)=>e.categoryLabel === label);
}
function getExerciseById(id) {
    return EXERCISES[id];
}
const ALL_EXERCISE_IDS = Object.keys(EXERCISES);
const CATEGORY_LABELS = [
    'Body-weight',
    'Dumbbell',
    'Barbell',
    'Machine',
    'Cardio',
    'Core',
    'Stretch'
];
}),
"[project]/src/lib/formCorrection.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "evaluateFormRules",
    ()=>evaluateFormRules
]);
/**
 * Form Correction System — Detects common form mistakes in real time
 *
 * Each exercise has form rules (defined in exercises.ts) that are evaluated
 * every frame. This module implements the actual rule checks using secondary
 * angle calculations and distance comparisons.
 *
 * Returns an array of correction messages that the UI displays in real time.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$angles$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/angles.ts [app-ssr] (ecmascript)");
;
// ─── Helper: distance between two points ─────────────────────────────────────
function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
const RULE_CHECKERS = {
    /**
     * Elbow drift: elbow moves away from torso during curls.
     * Checks if shoulder-to-elbow distance exceeds a threshold
     * relative to shoulder-to-hip distance (body proportional).
     */ elbow_drift: (lm)=>{
        const shoulderL = lm[11];
        const elbowL = lm[13];
        const hipL = lm[23];
        if (!shoulderL || !elbowL || !hipL) return false;
        const elbowDist = Math.abs(elbowL.x - shoulderL.x);
        const bodyWidth = Math.abs(shoulderL.x - hipL.x);
        // If elbow drifts more than 2× the body width horizontally, flag it
        return elbowDist > bodyWidth * 2.5;
    },
    /**
     * Incomplete extension: arm doesn't fully straighten.
     * This is handled by the main form quality score, but as an explicit
     * rule we flag if the max angle in a rep never exceeds 140°.
     */ incomplete_extension: (lm)=>{
        const angle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$angles$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["calculateAngle"])(lm[11], lm[13], lm[15]);
        // During IDLE state (arm should be extended), if angle is too low
        return angle > 60 && angle < 130;
    },
    /**
     * Hip sag: hips dropping below the shoulder-ankle line (push-ups/planks).
     * Checks the shoulder → hip → ankle angle — should be ~180° for good form.
     */ hip_sag: (lm)=>{
        const shoulder = lm[11];
        const hip = lm[23];
        const ankle = lm[27];
        if (!shoulder || !hip || !ankle) return false;
        const bodyAngle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$angles$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["calculateAngle"])(shoulder, hip, ankle);
        return bodyAngle < 155; // Hips are sagging
    },
    /**
     * Hip pike: hips too high (planks).
     */ hip_pike: (lm)=>{
        const shoulder = lm[11];
        const hip = lm[23];
        const ankle = lm[27];
        if (!shoulder || !hip || !ankle) return false;
        const bodyAngle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$angles$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["calculateAngle"])(shoulder, hip, ankle);
        return bodyAngle > 190 || hip.y < shoulder.y && hip.y < ankle.y;
    },
    /**
     * Elbow flare: elbows too far from body during push-ups.
     * Checks horizontal distance between wrist and shoulder.
     */ elbow_flare: (lm)=>{
        const shoulderL = lm[11];
        const shoulderR = lm[12];
        const wristL = lm[15];
        const wristR = lm[16];
        if (!shoulderL || !shoulderR || !wristL || !wristR) return false;
        const shoulderWidth = Math.abs(shoulderR.x - shoulderL.x);
        const wristWidth = Math.abs(wristR.x - wristL.x);
        // If wrists are much wider than shoulders, elbows are flaring
        return wristWidth > shoulderWidth * 1.8;
    },
    /**
     * Knee valgus: knees collapsing inward during squats.
     * Checks if knee horizontal distance is narrower than ankle distance.
     */ knee_valgus: (lm)=>{
        const kneeL = lm[25];
        const kneeR = lm[26];
        const ankleL = lm[27];
        const ankleR = lm[28];
        if (!kneeL || !kneeR || !ankleL || !ankleR) return false;
        const kneeWidth = Math.abs(kneeR.x - kneeL.x);
        const ankleWidth = Math.abs(ankleR.x - ankleL.x);
        return kneeWidth < ankleWidth * 0.7;
    },
    /**
     * Insufficient depth: not going deep enough in squats.
     * Checks if knee angle stays above 100° during the "down" phase.
     */ insufficient_depth: (lm)=>{
        const angle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$angles$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["calculateAngle"])(lm[23], lm[25], lm[27]);
        // If angle is between 90-120°, user is attempting but not deep enough
        return angle > 95 && angle < 120;
    },
    /**
     * Forward lean: torso leaning too far forward during squats.
     * Checks shoulder-hip-knee angle to detect excessive forward tilt.
     */ forward_lean: (lm)=>{
        const shoulder = lm[11];
        const hip = lm[23];
        if (!shoulder || !hip) return false;
        // If shoulder x is significantly ahead of hip x (leaning forward)
        const lean = shoulder.x - hip.x;
        return Math.abs(lean) > 0.1; // Normalised coords — 0.1 is significant
    },
    /**
     * Back arch: excessive arching during overhead presses.
     */ back_arch: (lm)=>{
        const shoulder = lm[11];
        const hip = lm[23];
        const knee = lm[25];
        if (!shoulder || !hip || !knee) return false;
        const torsoAngle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$angles$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["calculateAngle"])(shoulder, hip, knee);
        return torsoAngle < 160; // Back is arching
    },
    /**
     * Shoulder shrug: shoulders rising during lateral raises.
     */ shoulder_shrug: (lm)=>{
        const ear = lm[7]; // left ear
        const shoulder = lm[11];
        if (!ear || !shoulder) return false;
        const neckLength = distance(ear, shoulder);
        return neckLength < 0.06; // Shoulders too close to ears
    },
    /**
     * Knee past toes: front knee going past toe in lunges.
     */ knee_past_toe: (lm)=>{
        const knee = lm[25];
        const toe = lm[31];
        if (!knee || !toe) return false;
        return knee.x > toe.x + 0.03;
    },
    /**
     * Arm sync: arms not moving together during jumping jacks.
     * Checks if left and right wrist Y positions are significantly different.
     */ arm_sync: (lm)=>{
        const wristL = lm[15];
        const wristR = lm[16];
        if (!wristL || !wristR) return false;
        const yDiff = Math.abs(wristL.y - wristR.y);
        return yDiff > 0.12; // Significant difference in arm heights
    }
};
function evaluateFormRules(rules, landmarks) {
    const corrections = [];
    for (const rule of rules){
        const checker = RULE_CHECKERS[rule.ruleKey];
        if (checker && checker(landmarks)) {
            corrections.push({
                ruleId: rule.id,
                message: rule.correctionMessage,
                severity: 'warning'
            });
        }
    }
    return corrections;
}
}),
"[project]/src/lib/repEngine.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RepEngine",
    ()=>RepEngine
]);
/**
 * Rep Engine — Refactored rep counter using the new exercise library
 *
 * This replaces the original repCounter.ts with a more powerful engine that:
 *  - Uses ExerciseConfig from exercises.ts instead of hardcoded configs
 *  - Integrates form correction rules from formCorrection.ts
 *  - Supports both "standard" (rep counting) and "hold" (timed) modes
 *  - Returns detailed results including form corrections
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$angles$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/angles.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$smoothing$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/smoothing.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exercises$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/exercises.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formCorrection$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/formCorrection.ts [app-ssr] (ecmascript)");
;
;
;
;
class RepEngine {
    config;
    state = 'IDLE';
    repCount = 0;
    formScores = [];
    currentAngle = 0;
    smoothedAngle = null;
    tensionStartTime = null;
    totalTensionTime = 0;
    minAngleInRep = 180;
    maxAngleInRep = 0;
    lastCorrections = [];
    // Hold mode
    holdStartTime = null;
    totalHoldTime = 0;
    isHolding = false;
    constructor(exerciseId){
        this.config = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exercises$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EXERCISES"][exerciseId];
    }
    processFrame(landmarks) {
        const [iA, iB, iC] = this.config.landmarkIndices;
        const pointA = landmarks[iA];
        const pointB = landmarks[iB];
        const pointC = landmarks[iC];
        if (!pointA || !pointB || !pointC) {
            return this.getResult(false);
        }
        // Calculate primary angle
        const primaryAngle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$angles$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["calculateAngle"])(pointA, pointB, pointC);
        // If secondary landmarks exist (bilateral), calculate both angles
        // and use the more active one (lower angle = more contracted)
        let rawAngle = primaryAngle;
        if (this.config.secondaryLandmarkIndices) {
            const [iA2, iB2, iC2] = this.config.secondaryLandmarkIndices;
            const pA2 = landmarks[iA2];
            const pB2 = landmarks[iB2];
            const pC2 = landmarks[iC2];
            if (pA2 && pB2 && pC2) {
                const secondaryAngle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$angles$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["calculateAngle"])(pA2, pB2, pC2);
                // Use the MORE CONTRACTED angle (lower value) — whichever arm is curling
                rawAngle = Math.min(primaryAngle, secondaryAngle);
            }
        }
        this.currentAngle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$smoothing$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["smoothValue"])(rawAngle, this.smoothedAngle, 0.4);
        this.smoothedAngle = this.currentAngle;
        // Evaluate form correction rules each frame
        this.lastCorrections = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$formCorrection$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["evaluateFormRules"])(this.config.formRules, landmarks);
        // Track min/max angles within the current rep
        this.minAngleInRep = Math.min(this.minAngleInRep, this.currentAngle);
        this.maxAngleInRep = Math.max(this.maxAngleInRep, this.currentAngle);
        let repJustCounted = false;
        if (this.config.repMode === 'hold') {
            // ─── Hold mode (plank) ───────────────────────────────────────────
            const inGoodPosition = this.currentAngle >= this.config.contractedThreshold;
            if (inGoodPosition && !this.isHolding) {
                this.holdStartTime = Date.now();
                this.isHolding = true;
            } else if (!inGoodPosition && this.isHolding) {
                if (this.holdStartTime) {
                    this.totalHoldTime += (Date.now() - this.holdStartTime) / 1000;
                }
                this.holdStartTime = null;
                this.isHolding = false;
            }
        } else {
            // ─── Standard rep counting mode ──────────────────────────────────
            switch(this.state){
                case 'IDLE':
                    if (this.currentAngle < this.config.contractedThreshold) {
                        this.state = 'DOWN';
                        this.tensionStartTime = Date.now();
                        this.minAngleInRep = this.currentAngle;
                        this.maxAngleInRep = this.currentAngle;
                    }
                    break;
                case 'DOWN':
                    if (this.currentAngle > this.config.extendedThreshold) {
                        this.state = 'UP';
                        repJustCounted = true;
                    }
                    break;
                case 'UP':
                    this.repCount++;
                    const formScore = this.calculateFormScore();
                    this.formScores.push(formScore);
                    if (this.tensionStartTime) {
                        this.totalTensionTime += (Date.now() - this.tensionStartTime) / 1000;
                        this.tensionStartTime = null;
                    }
                    this.state = 'IDLE';
                    this.minAngleInRep = 180;
                    this.maxAngleInRep = 0;
                    break;
            }
            if (this.state === 'DOWN' && !this.tensionStartTime) {
                this.tensionStartTime = Date.now();
            }
        }
        return this.getResult(repJustCounted);
    }
    calculateFormScore() {
        const contractedScore = Math.max(0, 100 - Math.abs(this.minAngleInRep - this.config.idealContracted) * 2);
        const extendedScore = Math.max(0, 100 - Math.abs(this.maxAngleInRep - this.config.idealExtended) * 2);
        // Deduct for form corrections (each active correction removes 10 points)
        const correctionPenalty = this.lastCorrections.length * 10;
        return Math.max(0, Math.round((contractedScore + extendedScore) / 2 - correctionPenalty));
    }
    getResult(repJustCounted) {
        const avgForm = this.formScores.length > 0 ? Math.round(this.formScores.reduce((a, b)=>a + b, 0) / this.formScores.length) : 0;
        let currentTension = this.totalTensionTime;
        if (this.tensionStartTime) {
            currentTension += (Date.now() - this.tensionStartTime) / 1000;
        }
        let currentHold = this.totalHoldTime;
        if (this.holdStartTime) {
            currentHold += (Date.now() - this.holdStartTime) / 1000;
        }
        // Generate feedback based on form quality + corrections
        let feedback = 'Good Form';
        if (this.lastCorrections.length > 0) {
            feedback = this.lastCorrections[0].message;
        } else if (avgForm > 0 && avgForm < 70) {
            feedback = 'Fix Your Form';
        }
        return {
            repCount: this.repCount,
            currentAngle: Math.round(this.currentAngle),
            formQuality: avgForm,
            state: this.state,
            feedback,
            timeUnderTension: Math.round(currentTension * 10) / 10,
            formCorrections: this.lastCorrections,
            holdTime: Math.round(currentHold * 10) / 10,
            isHolding: this.isHolding,
            repJustCounted
        };
    }
    reset() {
        this.state = 'IDLE';
        this.repCount = 0;
        this.formScores = [];
        this.currentAngle = 0;
        this.smoothedAngle = null;
        this.tensionStartTime = null;
        this.totalTensionTime = 0;
        this.minAngleInRep = 180;
        this.maxAngleInRep = 0;
        this.lastCorrections = [];
        this.holdStartTime = null;
        this.totalHoldTime = 0;
        this.isHolding = false;
    }
    setExercise(exerciseId) {
        this.config = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exercises$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EXERCISES"][exerciseId];
        this.reset();
    }
    getExerciseId() {
        return this.config.id;
    }
}
}),
"[project]/src/utils/audio.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "playBeep",
    ()=>playBeep
]);
/**
 * Audio utilities for the rep counter.
 *
 * Uses the Web Audio API to generate a short beep programmatically —
 * no external audio file needed. The beep is a 880Hz sine wave
 * that lasts 100ms with a quick fade-out for a clean sound.
 */ let audioContext = null;
function getAudioContext() {
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    return audioContext;
}
function playBeep(frequency = 880, duration = 0.1) {
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
        // Start at full volume, fade out quickly for a clean beep
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    } catch  {
    // Silently fail if audio context is not available
    }
}
}),
"[project]/src/lib/aiCoach.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * AI Coach — Rule-based coaching feedback system
 *
 * Provides:
 *  1. Real-time tips during workout (based on rep state + form quality)
 *  2. Post-workout summary with scores and suggestions
 */ __turbopack_context__.s([
    "generateWorkoutSummary",
    ()=>generateWorkoutSummary,
    "getCoachTip",
    ()=>getCoachTip,
    "resetCoach",
    ()=>resetCoach
]);
// ─── Real-time coaching messages ─────────────────────────────────────────────
const ENCOURAGEMENT_MESSAGES = [
    {
        message: 'Great rep! 🔥',
        icon: '🔥'
    },
    {
        message: 'Perfect form!',
        icon: '✨'
    },
    {
        message: 'You\'re crushing it!',
        icon: '💪'
    },
    {
        message: 'Keep that energy!',
        icon: '⚡'
    },
    {
        message: 'Beast mode activated!',
        icon: '🦁'
    },
    {
        message: 'Excellent control!',
        icon: '🎯'
    }
];
const TECHNIQUE_TIPS = {
    slowDown: [
        {
            message: 'Slow down the lowering phase',
            type: 'technique',
            icon: '🐢'
        },
        {
            message: 'Control the eccentric — time under tension matters',
            type: 'technique',
            icon: '⏱️'
        }
    ],
    engageCore: [
        {
            message: 'Engage your core',
            type: 'technique',
            icon: '🎯'
        },
        {
            message: 'Brace your abs throughout the movement',
            type: 'technique',
            icon: '💎'
        }
    ],
    breathe: [
        {
            message: 'Remember to breathe — exhale on exertion',
            type: 'technique',
            icon: '💨'
        }
    ],
    fullRom: [
        {
            message: 'Focus on full range of motion',
            type: 'technique',
            icon: '📏'
        },
        {
            message: 'Go through the complete movement',
            type: 'technique',
            icon: '🔄'
        }
    ]
};
// ─── State tracking for coaching ─────────────────────────────────────────────
let lastTipTime = 0;
let lastRepTime = 0;
let repTimes = [];
let totalFormScores = [];
function resetCoach() {
    lastTipTime = 0;
    lastRepTime = 0;
    repTimes = [];
    totalFormScores = [];
}
function getCoachTip(result, exercise) {
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
    let tip = null;
    // If a rep was just counted, give encouragement for good form
    if (result.repJustCounted && result.formQuality >= 80) {
        const msg = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];
        tip = {
            ...msg,
            type: 'encouragement'
        };
    }
    // Form corrections take priority
    if (result.formCorrections.length > 0) {
        tip = {
            message: result.formCorrections[0].message,
            type: 'warning',
            icon: '⚠️'
        };
    }
    // If reps are too fast (less than 1.5s per rep), suggest slowing down
    if (repTimes.length >= 3) {
        const avgTime = repTimes.slice(-3).reduce((a, b)=>a + b, 0) / 3;
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
function generateWorkoutSummary(totalReps, formQuality, timeUnderTension, duration, exerciseName) {
    // ROM score: based on average form quality
    const romScore = Math.min(100, Math.max(0, formQuality * 1.1));
    // Tempo score: based on consistency of rep timing
    let tempoScore = 80; // default
    if (repTimes.length >= 3) {
        const avgTime = repTimes.reduce((a, b)=>a + b, 0) / repTimes.length;
        const variance = repTimes.reduce((sum, t)=>sum + (t - avgTime) ** 2, 0) / repTimes.length;
        const stdDev = Math.sqrt(variance);
        // Lower variance = better tempo consistency
        tempoScore = Math.max(0, Math.min(100, Math.round(100 - stdDev * 30)));
    }
    // Generate coach notes
    const notes = [];
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
        coachNotes: notes
    };
}
}),
"[project]/src/hooks/usePoseDetection.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "KEY_JOINTS",
    ()=>KEY_JOINTS,
    "SKELETON_CONNECTIONS",
    ()=>SKELETON_CONNECTIONS,
    "usePoseDetection",
    ()=>usePoseDetection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repEngine$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/repEngine.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exercises$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/exercises.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$smoothing$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/smoothing.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$audio$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/audio.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$aiCoach$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/aiCoach.ts [app-ssr] (ecmascript)");
/**
 * usePoseDetection V2 — Updated to use RepEngine + AI Coach
 *
 * Changes from V1:
 *  - Uses RepEngine (supports 15 exercises, form correction, hold mode)
 *  - Integrates AI Coach for real-time tips
 *  - Uses ExerciseId instead of the old Exercise type
 *  - Returns form corrections and coach tips
 */ 'use client';
;
;
;
;
;
;
const SKELETON_CONNECTIONS = [
    [
        11,
        12
    ],
    [
        11,
        23
    ],
    [
        12,
        24
    ],
    [
        23,
        24
    ],
    [
        11,
        13
    ],
    [
        13,
        15
    ],
    [
        12,
        14
    ],
    [
        14,
        16
    ],
    [
        23,
        25
    ],
    [
        25,
        27
    ],
    [
        24,
        26
    ],
    [
        26,
        28
    ]
];
const KEY_JOINTS = [
    11,
    12,
    13,
    14,
    15,
    16,
    23,
    24,
    25,
    26,
    27,
    28
];
function usePoseDetection() {
    const videoRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const canvasRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const repEngineRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$repEngine$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RepEngine"]('bicep_curl'));
    const smootherRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$smoothing$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LandmarkSmoother"](0.4));
    const prevRepCount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const animFrameRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const isRunningRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const poseRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        repCount: 0,
        currentAngle: 0,
        formQuality: 0,
        feedback: 'Good Form',
        timeUnderTension: 0,
        isDetecting: false,
        isLoading: false,
        error: null,
        exerciseId: 'bicep_curl',
        landmarks: null,
        formCorrections: [],
        coachTip: null,
        holdTime: 0,
        isHolding: false,
        workoutStartTime: null
    });
    const setExercise = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((exerciseId)=>{
        repEngineRef.current.setExercise(exerciseId);
        smootherRef.current.reset();
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$aiCoach$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resetCoach"])();
        prevRepCount.current = 0;
        setState((prev)=>({
                ...prev,
                exerciseId,
                repCount: 0,
                currentAngle: 0,
                formQuality: 0,
                feedback: 'Good Form',
                timeUnderTension: 0,
                landmarks: null,
                formCorrections: [],
                coachTip: null,
                holdTime: 0,
                isHolding: false,
                error: null
            }));
    }, []);
    const processLandmarks = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((landmarks)=>{
        const smoothed = smootherRef.current.smooth(landmarks.map((l)=>({
                x: l.x,
                y: l.y
            })));
        const result = repEngineRef.current.processFrame(smoothed);
        // Play beep if rep count increased
        if (result.repCount > prevRepCount.current) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$audio$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["playBeep"])();
            prevRepCount.current = result.repCount;
        }
        // Get coach tip
        const exerciseConfig = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exercises$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EXERCISES"][repEngineRef.current.getExerciseId()];
        const tip = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$aiCoach$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCoachTip"])(result, exerciseConfig);
        setState((prev)=>({
                ...prev,
                repCount: result.repCount,
                currentAngle: result.currentAngle,
                formQuality: result.formQuality,
                feedback: result.feedback,
                timeUnderTension: result.timeUnderTension,
                isDetecting: true,
                landmarks,
                formCorrections: result.formCorrections,
                coachTip: tip ?? prev.coachTip,
                holdTime: result.holdTime,
                isHolding: result.isHolding
            }));
    }, []);
    const startDetection = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        const video = videoRef.current;
        if (!video) return;
        setState((prev)=>({
                ...prev,
                isLoading: true,
                error: null
            }));
        try {
            // Step 1: Get camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: {
                        ideal: 1280
                    },
                    height: {
                        ideal: 720
                    },
                    facingMode: 'user'
                }
            });
            video.srcObject = stream;
            await video.play();
            isRunningRef.current = true;
            // Show camera feed immediately (before model loads)
            setState((prev)=>({
                    ...prev,
                    isDetecting: true,
                    workoutStartTime: Date.now()
                }));
            // Step 2: Load MediaPipe model
            const { Pose } = await __turbopack_context__.A("[project]/node_modules/@mediapipe/pose/pose.js [app-ssr] (ecmascript, async loader)");
            const pose = new Pose({
                locateFile: (file)=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
            });
            pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                minDetectionConfidence: 0.6,
                minTrackingConfidence: 0.5
            });
            pose.onResults((results)=>{
                if (results.poseLandmarks) {
                    processLandmarks(results.poseLandmarks);
                }
            });
            poseRef.current = pose;
            const processFrame = async ()=>{
                if (!isRunningRef.current) return;
                if (video.readyState >= 2) {
                    try {
                        await pose.send({
                            image: video
                        });
                    } catch  {
                    // Frame processing error — skip and continue
                    }
                }
                animFrameRef.current = requestAnimationFrame(processFrame);
            };
            processFrame();
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$aiCoach$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resetCoach"])();
            setState((prev)=>({
                    ...prev,
                    isLoading: false
                }));
        } catch (err) {
            console.error('Failed to start pose detection:', err);
            let errorMsg = 'Camera access failed. Please allow camera permission and try again.';
            if (err?.name === 'NotAllowedError') {
                errorMsg = 'Camera permission denied. Please allow camera access in your browser settings.';
            } else if (err?.name === 'NotFoundError') {
                errorMsg = 'No camera found. Please connect a camera and try again.';
            } else if (err?.name === 'NotReadableError' || err?.name === 'AbortError') {
                errorMsg = 'Camera is in use by another app or tab. Close other tabs and try again.';
            } else if (err?.message?.includes('model')) {
                errorMsg = 'Failed to load the AI model. Check your internet connection.';
            }
            setState((prev)=>({
                    ...prev,
                    isLoading: false,
                    isDetecting: false,
                    error: errorMsg
                }));
        }
    }, [
        processLandmarks
    ]);
    const stopDetection = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        isRunningRef.current = false;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        const video = videoRef.current;
        if (video && video.srcObject) {
            const stream = video.srcObject;
            stream.getTracks().forEach((track)=>track.stop());
            video.srcObject = null;
        }
        setState((prev)=>({
                ...prev,
                isDetecting: false,
                isLoading: false,
                landmarks: null,
                error: null
            }));
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        return ()=>{
            stopDetection();
        };
    }, [
        stopDetection
    ]);
    return {
        videoRef,
        canvasRef,
        ...state,
        setExercise,
        startDetection,
        stopDetection
    };
}
}),
"[project]/src/hooks/useSpeechCoach.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useSpeechCoach",
    ()=>useSpeechCoach
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
/**
 * useSpeechCoach — Text-to-speech voice coaching hook.
 *
 * Uses the browser's SpeechSynthesis API to provide voice guidance:
 *  - "3, 2, 1, Go!" countdown
 *  - Exercise name on start
 *  - Rep milestones (halfway, last rep, complete)
 *  - Form feedback when quality is low
 *  - AI coach summary at workout end
 *
 * FIXES:
 *  - Preloads voices via `voiceschanged` event (getVoices() returns [] initially)
 *  - Chrome workaround: resumes speechSynthesis every 10s to prevent hanging
 *  - Direct utterance creation bypasses rate limit for critical messages
 */ 'use client';
;
function useSpeechCoach(options) {
    const { enabled, targetReps, currentSet, totalSets } = options;
    const lastSpokenRepRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const lastSpokenTimeRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    const isSpeakingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const voiceRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const resumeIntervalRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [voicesLoaded, setVoicesLoaded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // Preload voices — critical for first call
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
        const loadVoices = undefined;
    }, []);
    // Chrome workaround: resume speechSynthesis every 10s to prevent it from hanging
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
    }, []);
    // Core speak function
    const speak = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((text, force = false)=>{
        if (!enabled) return;
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
        const now = undefined;
        const utterance = undefined;
    }, [
        enabled
    ]);
    // Speak exercise name when workout starts
    const announceExercise = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((exerciseName)=>{
        if (!enabled) return;
        speak(`Let's do ${exerciseName}. Get ready!`, true);
    }, [
        enabled,
        speak
    ]);
    // Handle rep count changes — key milestones
    const onRepChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((repCount)=>{
        if (!enabled || repCount <= lastSpokenRepRef.current) return;
        lastSpokenRepRef.current = repCount;
        if (targetReps && targetReps > 0) {
            if (repCount === targetReps) {
                speak('Set complete! Great work!', true);
                return;
            }
            if (repCount === targetReps - 1) {
                speak('One more rep!', true);
                return;
            }
            if (repCount === Math.floor(targetReps / 2) && targetReps >= 6) {
                speak('Halfway there!');
                return;
            }
            // Announce every rep for small targets
            if (targetReps <= 6) {
                speak(`${repCount}`);
                return;
            }
        }
        // Speak every 5 reps for free-form or larger targets
        if (repCount % 5 === 0 && repCount > 0) {
            speak(`${repCount} reps!`);
        }
    }, [
        enabled,
        targetReps,
        speak
    ]);
    // Handle coach tips
    const onCoachTip = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((tip)=>{
        if (!enabled || !tip) return;
        if (tip.type === 'encouragement') {
            speak('Very good!');
        }
    }, [
        enabled,
        speak
    ]);
    // Handle form feedback — speak when form is poor
    const onFormFeedback = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((feedback, formQuality)=>{
        if (!enabled) return;
        if (formQuality < 50 && formQuality > 0) {
            speak('Watch your form!');
        }
    }, [
        enabled,
        speak
    ]);
    // Speak the AI coach summary at the end of workout
    const speakSummary = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((coachNotes)=>{
        if (!enabled || coachNotes.length === 0) return;
        speak(coachNotes[0], true);
    }, [
        enabled,
        speak
    ]);
    // Handle set completion
    const onSetComplete = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        if (!enabled) return;
        if (currentSet && totalSets) {
            if (currentSet >= totalSets) {
                speak('All sets complete! Amazing workout!', true);
            }
        }
    }, [
        enabled,
        currentSet,
        totalSets,
        speak
    ]);
    // Reset
    const reset = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        lastSpokenRepRef.current = 0;
        lastSpokenTimeRef.current = 0;
        isSpeakingRef.current = false;
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
    }, []);
    // Cleanup on unmount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        return ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            if (resumeIntervalRef.current) {
                clearInterval(resumeIntervalRef.current);
            }
        };
    }, []);
    return {
        onRepChange,
        onCoachTip,
        onFormFeedback,
        onSetComplete,
        speakSummary,
        announceExercise,
        reset,
        voicesLoaded
    };
}
}),
"[project]/src/lib/gamification.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Gamification System — XP, Levels, Badges, Streaks
 *
 * XP formula: reps × (formScore / 50) × base multiplier
 * Levels: every 500 XP
 * Streaks: consecutive days with at least 1 workout
 * Badges: milestone achievements
 */ // ─── Types ───────────────────────────────────────────────────────────────────
__turbopack_context__.s([
    "BADGES",
    ()=>BADGES,
    "calculateXPForWorkout",
    ()=>calculateXPForWorkout,
    "getLevelFromXP",
    ()=>getLevelFromXP,
    "getXPForCurrentLevel",
    ()=>getXPForCurrentLevel,
    "loadStats",
    ()=>loadStats,
    "recordWorkout",
    ()=>recordWorkout,
    "saveStats",
    ()=>saveStats
]);
// ─── Constants ───────────────────────────────────────────────────────────────
const XP_PER_LEVEL = 500;
const STORAGE_KEY = 'irontrack_gamification';
const BADGES = [
    {
        id: 'first_workout',
        name: 'First Steps',
        description: 'Complete your first workout',
        icon: 'target',
        condition: (s)=>s.totalWorkouts >= 1
    },
    {
        id: 'ten_workouts',
        name: 'Dedicated',
        description: 'Complete 10 workouts',
        icon: 'trophy',
        condition: (s)=>s.totalWorkouts >= 10
    },
    {
        id: 'fifty_workouts',
        name: 'Iron Will',
        description: 'Complete 50 workouts',
        icon: 'medal',
        condition: (s)=>s.totalWorkouts >= 50
    },
    {
        id: 'hundred_reps',
        name: 'Century Club',
        description: 'Complete 100 total reps',
        icon: 'century',
        condition: (s)=>s.totalReps >= 100
    },
    {
        id: 'five_hundred_reps',
        name: 'Rep Machine',
        description: 'Complete 500 total reps',
        icon: 'gear',
        condition: (s)=>s.totalReps >= 500
    },
    {
        id: 'thousand_reps',
        name: 'Iron Legend',
        description: 'Complete 1,000 total reps',
        icon: 'crown',
        condition: (s)=>s.totalReps >= 1000
    },
    {
        id: 'perfect_form',
        name: 'Perfect Form',
        description: 'Complete 10 reps with 90%+ form score',
        icon: 'star',
        condition: (s)=>s.perfectFormReps >= 10
    },
    {
        id: 'three_day_streak',
        name: 'On a Roll',
        description: 'Maintain a 3-day workout streak',
        icon: 'flame',
        condition: (s)=>s.currentStreak >= 3
    },
    {
        id: 'seven_day_streak',
        name: 'Week Warrior',
        description: 'Maintain a 7-day workout streak',
        icon: 'bolt',
        condition: (s)=>s.longestStreak >= 7
    },
    {
        id: 'level_five',
        name: 'Rising Star',
        description: 'Reach level 5',
        icon: 'pentagon',
        condition: (s)=>s.level >= 5
    },
    {
        id: 'level_ten',
        name: 'Elite',
        description: 'Reach level 10',
        icon: 'diamond',
        condition: (s)=>s.level >= 10
    }
];
// ─── Default stats ───────────────────────────────────────────────────────────
function defaultStats() {
    return {
        totalXP: 0,
        level: 1,
        totalWorkouts: 0,
        totalReps: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: null,
        earnedBadges: [],
        perfectFormReps: 0
    };
}
function loadStats() {
    if ("TURBOPACK compile-time truthy", 1) return defaultStats();
    //TURBOPACK unreachable
    ;
}
function saveStats(stats) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}
function calculateXPForWorkout(reps, formQuality) {
    const formMultiplier = Math.max(0.5, formQuality / 50); // 0.5× at 0%, 2× at 100%
    return Math.round(reps * formMultiplier * 10); // Base 10 XP per rep
}
function getLevelFromXP(xp) {
    return Math.floor(xp / XP_PER_LEVEL) + 1;
}
function getXPForCurrentLevel(xp) {
    const currentLevelXP = xp % XP_PER_LEVEL;
    return {
        current: currentLevelXP,
        required: XP_PER_LEVEL
    };
}
// ─── Streak calculation ──────────────────────────────────────────────────────
function isConsecutiveDay(dateStr) {
    const last = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
    return diffHours < 48; // Within 48 hours counts as consecutive
}
function isToday(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    return date.toDateString() === now.toDateString();
}
function recordWorkout(reps, formQuality, perfectReps) {
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
    const newBadges = [];
    for (const badge of BADGES){
        if (!stats.earnedBadges.includes(badge.id) && badge.condition(stats)) {
            stats.earnedBadges.push(badge.id);
            newBadges.push(badge);
        }
    }
    saveStats(stats);
    return {
        stats,
        newBadges,
        xpGained
    };
}
}),
"[project]/src/lib/progressStore.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Progress Store — Workout history and stats tracking with localStorage
 *
 * Saves each completed workout as a record and provides
 * aggregation functions for the progress dashboard.
 */ __turbopack_context__.s([
    "getAllWorkouts",
    ()=>getAllWorkouts,
    "getProgressStats",
    ()=>getProgressStats,
    "saveWorkout",
    ()=>saveWorkout
]);
// ─── Storage ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'irontrack_progress';
function getRecords() {
    if ("TURBOPACK compile-time truthy", 1) return [];
    //TURBOPACK unreachable
    ;
}
function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
function saveWorkout(record) {
    const records = getRecords();
    const newRecord = {
        ...record,
        id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
        date: new Date().toISOString()
    };
    records.push(newRecord);
    saveRecords(records);
    return newRecord;
}
function getProgressStats() {
    const records = getRecords();
    const totalReps = records.reduce((sum, r)=>sum + r.reps, 0);
    const totalWorkouts = records.length;
    const totalDuration = records.reduce((sum, r)=>sum + r.duration, 0);
    const avgForm = records.length > 0 ? Math.round(records.reduce((sum, r)=>sum + r.formQuality, 0) / records.length) : 0;
    const bestForm = records.length > 0 ? Math.max(...records.map((r)=>r.formQuality)) : 0;
    // Weekly activity for the last 7 days
    const days = [
        'Sun',
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat'
    ];
    const now = new Date();
    const weeklyActivity = [];
    for(let i = 6; i >= 0; i--){
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayName = days[date.getDay()];
        const dateStr = date.toDateString();
        const dayRecords = records.filter((r)=>new Date(r.date).toDateString() === dateStr);
        weeklyActivity.push({
            day: dayName,
            reps: dayRecords.reduce((sum, r)=>sum + r.reps, 0),
            workouts: dayRecords.length
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
        recentWorkouts
    };
}
function getAllWorkouts() {
    return getRecords().reverse();
}
}),
"[project]/src/components/CameraFeed.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CameraFeed
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$usePoseDetection$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/usePoseDetection.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exercises$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/exercises.ts [app-ssr] (ecmascript)");
/**
 * CameraFeed — Renders the video + canvas overlay with neon skeleton.
 *
 * The video element captures the camera stream (hidden behind the canvas).
 * The canvas draws:
 *   1. The mirrored video frame as background
 *   2. Neon green/blue skeleton lines connecting key joints
 *   3. Glowing dots at each joint
 *   4. Current joint angle text near the relevant joint
 */ 'use client';
;
;
;
;
function CameraFeed({ videoRef, canvasRef, landmarks, currentAngle, exercise, isDetecting, isLoading, error }) {
    const animRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    /**
     * Get the landmark index where the angle label should appear.
     * Uses the exercise config's vertex joint (index [1] of landmarkIndices).
     */ const getAngleLandmarkIndex = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        const config = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exercises$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EXERCISES"][exercise];
        return config ? config.landmarkIndices[1] : 13; // vertex joint
    }, [
        exercise
    ]);
    /**
     * Draw the skeleton overlay on the canvas each frame.
     */ const drawFrame = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // Match canvas size to its display size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        const w = canvas.width;
        const h = canvas.height;
        // Clear the canvas
        ctx.clearRect(0, 0, w, h);
        // Draw the mirrored video frame — "object-fit: cover" behavior
        // preserves natural aspect ratio so people don't look squished
        const vw = video.videoWidth || w;
        const vh = video.videoHeight || h;
        const canvasAspect = w / h;
        const videoAspect = vw / vh;
        let sx = 0, sy = 0, sw = vw, sh = vh;
        if (videoAspect > canvasAspect) {
            // Video is wider than canvas — crop sides
            sw = vh * canvasAspect;
            sx = (vw - sw) / 2;
        } else {
            // Video is taller than canvas — crop top/bottom
            sh = vw / canvasAspect;
            sy = (vh - sh) / 2;
        }
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1); // Mirror horizontally for a natural selfie view
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
        ctx.restore();
        // If we have landmarks, draw the skeleton
        if (landmarks && landmarks.length > 0) {
            // ─── Draw connection lines ───────────────────────────────────────
            ctx.save();
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$usePoseDetection$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SKELETON_CONNECTIONS"].forEach(([startIdx, endIdx])=>{
                const start = landmarks[startIdx];
                const end = landmarks[endIdx];
                if (!start || !end) return;
                // Mirror x coordinates to match the flipped video
                const x1 = (1 - start.x) * w;
                const y1 = start.y * h;
                const x2 = (1 - end.x) * w;
                const y2 = end.y * h;
                // Neon glow effect
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#22c55e'; // neon green
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            });
            ctx.restore();
            // ─── Draw joint dots ─────────────────────────────────────────────
            ctx.save();
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$usePoseDetection$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["KEY_JOINTS"].forEach((idx)=>{
                const point = landmarks[idx];
                if (!point) return;
                const x = (1 - point.x) * w;
                const y = point.y * h;
                // Outer glow
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#38bdf8'; // electric blue
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fill();
                // Inner bright dot
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
            // ─── Draw angle label near the vertex joint ──────────────────────
            if (currentAngle > 0) {
                const angleIdx = getAngleLandmarkIndex();
                const joint = landmarks[angleIdx];
                if (joint) {
                    const x = (1 - joint.x) * w;
                    const y = joint.y * h;
                    ctx.save();
                    ctx.font = 'bold 18px Inter, sans-serif';
                    ctx.fillStyle = '#22c55e';
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#22c55e';
                    ctx.textAlign = 'center';
                    ctx.fillText(`${currentAngle}°`, x, y - 20);
                    ctx.restore();
                }
            }
        }
        animRef.current = requestAnimationFrame(drawFrame);
    }, [
        canvasRef,
        videoRef,
        landmarks,
        currentAngle,
        getAngleLandmarkIndex
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isDetecting) {
            animRef.current = requestAnimationFrame(drawFrame);
        }
        return ()=>{
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [
        isDetecting,
        drawFrame
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative w-full h-full overflow-hidden",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                ref: videoRef,
                className: "absolute inset-0 w-full h-full object-cover opacity-0",
                autoPlay: true,
                playsInline: true,
                muted: true
            }, void 0, false, {
                fileName: "[project]/src/components/CameraFeed.tsx",
                lineNumber: 186,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("canvas", {
                ref: canvasRef,
                className: "absolute inset-0 w-full h-full object-cover"
            }, void 0, false, {
                fileName: "[project]/src/components/CameraFeed.tsx",
                lineNumber: 195,
                columnNumber: 13
            }, this),
            !isDetecting && !error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0 flex items-center justify-center bg-[#0f0f0f]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center space-y-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "w-20 h-20 mx-auto rounded-full border-2 border-[#22c55e]/30 flex items-center justify-center",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                className: "w-10 h-10 text-[#22c55e]/50",
                                fill: "none",
                                viewBox: "0 0 24 24",
                                stroke: "currentColor",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    strokeWidth: 1.5,
                                    d: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/CameraFeed.tsx",
                                    lineNumber: 211,
                                    columnNumber: 33
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/CameraFeed.tsx",
                                lineNumber: 205,
                                columnNumber: 29
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/CameraFeed.tsx",
                            lineNumber: 204,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-white/40 text-sm font-medium tracking-wide",
                            children: "Camera feed will appear here"
                        }, void 0, false, {
                            fileName: "[project]/src/components/CameraFeed.tsx",
                            lineNumber: 219,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/CameraFeed.tsx",
                    lineNumber: 203,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/CameraFeed.tsx",
                lineNumber: 202,
                columnNumber: 17
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0 flex items-center justify-center bg-[#0f0f0f]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center space-y-4 max-w-sm px-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "w-16 h-16 mx-auto rounded-full border-2 border-red-500/40 flex items-center justify-center",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                className: "w-8 h-8 text-red-400",
                                fill: "none",
                                viewBox: "0 0 24 24",
                                stroke: "currentColor",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    strokeWidth: 1.5,
                                    d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/CameraFeed.tsx",
                                    lineNumber: 232,
                                    columnNumber: 33
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/CameraFeed.tsx",
                                lineNumber: 231,
                                columnNumber: 29
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/CameraFeed.tsx",
                            lineNumber: 230,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-red-400 text-sm font-medium",
                            children: error
                        }, void 0, false, {
                            fileName: "[project]/src/components/CameraFeed.tsx",
                            lineNumber: 235,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-white/30 text-xs",
                            children: "Close other browser tabs using the camera and try again."
                        }, void 0, false, {
                            fileName: "[project]/src/components/CameraFeed.tsx",
                            lineNumber: 236,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/CameraFeed.tsx",
                    lineNumber: 229,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/CameraFeed.tsx",
                lineNumber: 228,
                columnNumber: 17
            }, this),
            isDetecting && isLoading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0 flex items-center justify-center bg-black/40 z-10",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center space-y-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "w-10 h-10 mx-auto border-3 border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin"
                        }, void 0, false, {
                            fileName: "[project]/src/components/CameraFeed.tsx",
                            lineNumber: 245,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-white/60 text-xs tracking-[0.2em] uppercase",
                            children: "Loading AI model…"
                        }, void 0, false, {
                            fileName: "[project]/src/components/CameraFeed.tsx",
                            lineNumber: 246,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/CameraFeed.tsx",
                    lineNumber: 244,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/CameraFeed.tsx",
                lineNumber: 243,
                columnNumber: 17
            }, this),
            isDetecting && !isLoading && !landmarks && !error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0 flex items-center justify-center z-10 pointer-events-none",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center space-y-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mx-auto w-14 h-14 rounded-full border-2 border-[#22c55e]/50 animate-ping"
                        }, void 0, false, {
                            fileName: "[project]/src/components/CameraFeed.tsx",
                            lineNumber: 255,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-white/50 text-xs tracking-[0.25em] uppercase font-medium",
                            children: "Step into frame"
                        }, void 0, false, {
                            fileName: "[project]/src/components/CameraFeed.tsx",
                            lineNumber: 256,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-white/25 text-[10px] tracking-wider",
                            children: "Stand back so your full body is visible"
                        }, void 0, false, {
                            fileName: "[project]/src/components/CameraFeed.tsx",
                            lineNumber: 259,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/CameraFeed.tsx",
                    lineNumber: 254,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/CameraFeed.tsx",
                lineNumber: 253,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/CameraFeed.tsx",
        lineNumber: 184,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/RepCounter.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>RepCounterDisplay
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
/**
 * RepCounter — Clean rep count display with fitted progress ring.
 * Shows current reps / target reps with a properly centered circular progress indicator.
 */ 'use client';
;
;
function RepCounterDisplay({ count, isDetecting, targetReps }) {
    const [isPulsing, setIsPulsing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const prevCount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(count);
    // Trigger pulse animation when count changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (count > prevCount.current) {
            setIsPulsing(true);
            const timer = setTimeout(()=>setIsPulsing(false), 400);
            prevCount.current = count;
            return ()=>clearTimeout(timer);
        }
        prevCount.current = count;
    }, [
        count
    ]);
    const progress = targetReps && targetReps > 0 ? Math.min(count / targetReps, 1) : 0;
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);
    const isComplete = progress >= 1;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: `
                    relative flex flex-col items-center justify-center w-40 h-40
                    transition-transform duration-300
                    ${isPulsing ? 'scale-110' : 'scale-100'}
                `,
            children: [
                targetReps && targetReps > 0 && isDetecting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                    className: "absolute inset-0 w-full h-full -rotate-90",
                    viewBox: "0 0 140 140",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                            cx: "70",
                            cy: "70",
                            r: radius,
                            fill: "none",
                            stroke: "rgba(255,255,255,0.06)",
                            strokeWidth: "5"
                        }, void 0, false, {
                            fileName: "[project]/src/components/RepCounter.tsx",
                            lineNumber: 53,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                            cx: "70",
                            cy: "70",
                            r: radius,
                            fill: "none",
                            stroke: isComplete ? '#22c55e' : '#38bdf8',
                            strokeWidth: "5",
                            strokeLinecap: "round",
                            strokeDasharray: circumference,
                            strokeDashoffset: strokeDashoffset,
                            className: "transition-all duration-500 ease-out",
                            style: {
                                filter: isComplete ? 'drop-shadow(0 0 8px rgba(34,197,94,0.6))' : 'drop-shadow(0 0 4px rgba(56,189,248,0.3))'
                            }
                        }, void 0, false, {
                            fileName: "[project]/src/components/RepCounter.tsx",
                            lineNumber: 60,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/RepCounter.tsx",
                    lineNumber: 48,
                    columnNumber: 21
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: `
                        text-7xl font-black tabular-nums leading-none
                        ${isDetecting ? 'text-[#22c55e]' : 'text-white/10'}
                        transition-all duration-300
                    `,
                    style: {
                        fontFamily: 'Orbitron, sans-serif',
                        textShadow: isDetecting ? '0 0 40px rgba(34,197,94,0.5), 0 0 80px rgba(34,197,94,0.2)' : 'none'
                    },
                    children: count
                }, void 0, false, {
                    fileName: "[project]/src/components/RepCounter.tsx",
                    lineNumber: 79,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: `
                        text-[10px] font-bold tracking-[0.25em] uppercase mt-1
                        ${isDetecting ? 'text-[#22c55e]/50' : 'text-white/8'}
                    `,
                    style: {
                        fontFamily: 'Orbitron, sans-serif'
                    },
                    children: targetReps && targetReps > 0 ? `${count} / ${targetReps}` : 'REPS'
                }, void 0, false, {
                    fileName: "[project]/src/components/RepCounter.tsx",
                    lineNumber: 96,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/RepCounter.tsx",
            lineNumber: 39,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/RepCounter.tsx",
        lineNumber: 38,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/SetTracker.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SetTracker
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
/**
 * SetTracker — Compact pill showing set/rep progress.
 * Positioned below the rep counter on camera view.
 */ 'use client';
;
function SetTracker({ currentSet, totalSets, targetReps, currentReps, isDetecting }) {
    if (!isDetecting) return null;
    const setProgress = currentSet / totalSets;
    const isLastSet = currentSet === totalSets;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "absolute bottom-28 left-1/2 -translate-x-1/2 z-10 pointer-events-none",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-black/60 backdrop-blur-sm rounded-full border border-white/10 px-4 py-2 flex items-center gap-3",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-1.5",
                    children: Array.from({
                        length: totalSets
                    }, (_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: `
                                w-2 h-2 rounded-full transition-all duration-300
                                ${i < currentSet - 1 ? 'bg-[#22c55e]' : i === currentSet - 1 ? 'bg-[#38bdf8] shadow-[0_0_6px_rgba(56,189,248,0.5)]' : 'bg-white/10'}
                            `
                        }, i, false, {
                            fileName: "[project]/src/components/SetTracker.tsx",
                            lineNumber: 34,
                            columnNumber: 25
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/src/components/SetTracker.tsx",
                    lineNumber: 32,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-1.5 text-[10px] font-bold tracking-wider",
                    style: {
                        fontFamily: 'Orbitron, monospace'
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-white/40",
                            children: "SET"
                        }, void 0, false, {
                            fileName: "[project]/src/components/SetTracker.tsx",
                            lineNumber: 51,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-[#38bdf8]",
                            children: currentSet
                        }, void 0, false, {
                            fileName: "[project]/src/components/SetTracker.tsx",
                            lineNumber: 52,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-white/15",
                            children: "/"
                        }, void 0, false, {
                            fileName: "[project]/src/components/SetTracker.tsx",
                            lineNumber: 53,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-white/30",
                            children: totalSets
                        }, void 0, false, {
                            fileName: "[project]/src/components/SetTracker.tsx",
                            lineNumber: 54,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "w-px h-3 bg-white/10 mx-1"
                        }, void 0, false, {
                            fileName: "[project]/src/components/SetTracker.tsx",
                            lineNumber: 55,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-white/40",
                            children: "REPS"
                        }, void 0, false, {
                            fileName: "[project]/src/components/SetTracker.tsx",
                            lineNumber: 56,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-[#22c55e]",
                            children: currentReps
                        }, void 0, false, {
                            fileName: "[project]/src/components/SetTracker.tsx",
                            lineNumber: 57,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-white/15",
                            children: "/"
                        }, void 0, false, {
                            fileName: "[project]/src/components/SetTracker.tsx",
                            lineNumber: 58,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-white/30",
                            children: targetReps
                        }, void 0, false, {
                            fileName: "[project]/src/components/SetTracker.tsx",
                            lineNumber: 59,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/SetTracker.tsx",
                    lineNumber: 50,
                    columnNumber: 17
                }, this),
                isLastSet && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-[8px] font-bold text-amber-400/80 tracking-wider uppercase",
                    children: "FINAL"
                }, void 0, false, {
                    fileName: "[project]/src/components/SetTracker.tsx",
                    lineNumber: 64,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/SetTracker.tsx",
            lineNumber: 30,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/SetTracker.tsx",
        lineNumber: 29,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/FormFeedback.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>FormFeedback
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
/**
 * FormFeedback — Compact form quality indicator.
 * Small pill badge for overlaying on camera feed.
 */ 'use client';
;
function FormFeedback({ feedback, isDetecting }) {
    if (!isDetecting) return null;
    const isGood = feedback === 'Good Form';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide
                transition-all duration-500 animate-fade-in backdrop-blur-sm
                ${isGood ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/25' : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'}
            `,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "10",
                height: "10",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2.5",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                children: isGood ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                    points: "20,6 9,17 4,12"
                }, void 0, false, {
                    fileName: "[project]/src/components/FormFeedback.tsx",
                    lineNumber: 34,
                    columnNumber: 21
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                        }, void 0, false, {
                            fileName: "[project]/src/components/FormFeedback.tsx",
                            lineNumber: 36,
                            columnNumber: 23
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                            x1: "12",
                            y1: "9",
                            x2: "12",
                            y2: "13"
                        }, void 0, false, {
                            fileName: "[project]/src/components/FormFeedback.tsx",
                            lineNumber: 36,
                            columnNumber: 119
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                            x1: "12",
                            y1: "17",
                            x2: "12.01",
                            y2: "17"
                        }, void 0, false, {
                            fileName: "[project]/src/components/FormFeedback.tsx",
                            lineNumber: 36,
                            columnNumber: 158
                        }, this)
                    ]
                }, void 0, true)
            }, void 0, false, {
                fileName: "[project]/src/components/FormFeedback.tsx",
                lineNumber: 32,
                columnNumber: 13
            }, this),
            feedback
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/FormFeedback.tsx",
        lineNumber: 22,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/CoachMessage.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CoachMessage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
/**
 * CoachMessage — Compact AI coach tip pill.
 * Small enough to overlay on camera feed.
 */ 'use client';
;
function CoachMessage({ tip }) {
    if (!tip) return null;
    const colors = {
        encouragement: 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20',
        technique: 'bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20',
        warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    };
    const icons = {
        encouragement: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
            points: "20,6 9,17 4,12"
        }, void 0, false, {
            fileName: "[project]/src/components/CoachMessage.tsx",
            lineNumber: 24,
            columnNumber: 24
        }, this),
        technique: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                    cx: "12",
                    cy: "12",
                    r: "10"
                }, void 0, false, {
                    fileName: "[project]/src/components/CoachMessage.tsx",
                    lineNumber: 25,
                    columnNumber: 22
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                    x1: "12",
                    y1: "16",
                    x2: "12",
                    y2: "12"
                }, void 0, false, {
                    fileName: "[project]/src/components/CoachMessage.tsx",
                    lineNumber: 25,
                    columnNumber: 55
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                    x1: "12",
                    y1: "8",
                    x2: "12.01",
                    y2: "8"
                }, void 0, false, {
                    fileName: "[project]/src/components/CoachMessage.tsx",
                    lineNumber: 25,
                    columnNumber: 95
                }, this)
            ]
        }, void 0, true),
        warning: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                }, void 0, false, {
                    fileName: "[project]/src/components/CoachMessage.tsx",
                    lineNumber: 26,
                    columnNumber: 20
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                    x1: "12",
                    y1: "9",
                    x2: "12",
                    y2: "13"
                }, void 0, false, {
                    fileName: "[project]/src/components/CoachMessage.tsx",
                    lineNumber: 26,
                    columnNumber: 116
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                    x1: "12",
                    y1: "17",
                    x2: "12.01",
                    y2: "17"
                }, void 0, false, {
                    fileName: "[project]/src/components/CoachMessage.tsx",
                    lineNumber: 26,
                    columnNumber: 155
                }, this)
            ]
        }, void 0, true)
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium
                border animate-fade-in transition-all duration-300 backdrop-blur-sm max-w-xs truncate
                ${colors[tip.type]}
            `,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                width: "10",
                height: "10",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                className: "flex-shrink-0",
                children: icons[tip.type]
            }, void 0, false, {
                fileName: "[project]/src/components/CoachMessage.tsx",
                lineNumber: 37,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "truncate",
                children: tip.message
            }, void 0, false, {
                fileName: "[project]/src/components/CoachMessage.tsx",
                lineNumber: 40,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/CoachMessage.tsx",
        lineNumber: 30,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/ExerciseGuide.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EXERCISE_VIDEOS",
    ()=>EXERCISE_VIDEOS,
    "default",
    ()=>ExerciseGuide
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exercises$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/exercises.ts [app-ssr] (ecmascript)");
/**
 * ExerciseGuide — GIF-powered exercise illustration.
 *
 * Behaviour:
 *  1. When `showModal` is true  → renders a full-screen centred preview modal
 *     so the user can see exactly how the exercise is performed before starting.
 *  2. After dismissal           → collapses to a small looping GIF in the
 *     top-right corner (same position the old stick figure occupied).
 *  3. No GIF for this exercise  → shows a tasteful placeholder icon.
 */ 'use client';
;
;
;
;
const EXERCISE_VIDEOS = {
    // ── Existing exercises (body-weight / dumbbell) ─────────────────────────
    bicep_curl: '/videosillustrations/dumb-bell/dumb-bell-curl.gif',
    hammer_curl: '/videosillustrations/dumb-bell/hammer-curl.gif',
    pushup: '/videosillustrations/body-weight/push-up.gif',
    shoulder_press: '/videosillustrations/dumb-bell/shoulder-press.gif',
    lateral_raise: '/videosillustrations/dumb-bell/lateral-raise.gif',
    tricep_extension: '/videosillustrations/dumb-bell/Overhead Tricep Extension.gif',
    squat: '/videosillustrations/body-weight/squat.gif',
    lunge: '/videosillustrations/body-weight/lunges.gif',
    jump_squat: '/videosillustrations/body-weight/jump-squat.gif',
    calf_raise: '/videosillustrations/body-weight/crunches.gif',
    plank: '/videosillustrations/body-weight/plank.gif',
    situp: '/videosillustrations/body-weight/sit-up.gif',
    mountain_climber: '/videosillustrations/body-weight/mountain-climbers.gif',
    jumping_jacks: '/videosillustrations/body-weight/jumping-jacks.gif',
    // ── Barbell exercises ────────────────────────────────────────────────────
    barbell_row: '/videosillustrations/barbell-exercise/Barbell Row.gif',
    deadlift: '/videosillustrations/barbell-exercise/Deadlift.gif',
    bench_press: '/videosillustrations/barbell-exercise/Bench Press.gif',
    overhead_press: '/videosillustrations/barbell-exercise/Overhead Press.gif',
    romanian_deadlift: '/videosillustrations/barbell-exercise/Romanian Deadlift.gif',
    incline_bench_press: '/videosillustrations/barbell-exercise/Incline Bench Press.gif',
    front_squat: '/videosillustrations/barbell-exercise/Front Squat.gif',
    hip_thrust_barbell: '/videosillustrations/barbell-exercise/Hip Thrust (Barbell).gif',
    barbell_squat: '/videosillustrations/barbell-exercise/Barbell Squat.gif',
    // ── Dumbbell exercises ───────────────────────────────────────────────────
    dumbbell_row: '/videosillustrations/dumb-bell/Dumbbell Row (One-arm row).gif',
    goblet_squat: '/videosillustrations/dumb-bell/Goblet Squat.gif',
    dumbbell_deadlift: '/videosillustrations/dumb-bell/Dumbbell Deadlift.gif',
    overhead_tricep_ext: '/videosillustrations/dumb-bell/Overhead Tricep Extension.gif',
    chest_press: '/videosillustrations/dumb-bell/chest-press.gif',
    dumbbell_fly: '/videosillustrations/dumb-bell/dumbell-fly.gif',
    front_raise: '/videosillustrations/dumb-bell/front-raise.gif',
    tricep_kickback: '/videosillustrations/dumb-bell/tricep-kickback.gif',
    incline_chest_press: '/videosillustrations/dumb-bell/incline-chest-press.gif',
    // ── Body-weight additions ────────────────────────────────────────────────
    walking_lunges: '/videosillustrations/body-weight/walking-lunges.gif',
    knee_pushup: '/videosillustrations/body-weight/knee-push-up.gif',
    side_plank: '/videosillustrations/body-weight/side-plank.gif',
    bicycle_crunch: '/videosillustrations/body-weight/bicycle-crush.gif',
    leg_raises: '/videosillustrations/body-weight/leg-raises.gif',
    glute_bridge: '/videosillustrations/body-weight/glute-bridge.gif',
    hip_thrust: '/videosillustrations/body-weight/hip-thrust.gif',
    high_knees: '/videosillustrations/body-weight/high-knees.gif',
    chin_up: '/videosillustrations/body-weight/chin-up.gif',
    pull_up: '/videosillustrations/body-weight/pull-up.gif',
    burpees: '/videosillustrations/body-weight/Burpees.gif',
    // ── Cardio / Functional ──────────────────────────────────────────────────
    battle_ropes: '/videosillustrations/cardio-function/Battle Ropes.gif',
    box_jumps: '/videosillustrations/cardio-function/Box Jumps.gif',
    farmers_walk: "/videosillustrations/cardio-function/Farmer's Walk.gif",
    jump_rope: '/videosillustrations/cardio-function/Jump Rope.gif',
    kettlebell_swing: '/videosillustrations/cardio-function/Kettlebell Swings.gif',
    rowing_machine: '/videosillustrations/cardio-function/Rowing Machine.gif',
    // ── Core / Abs ───────────────────────────────────────────────────────────
    ab_rollout: '/videosillustrations/core-abs-focus/Ab Rollout.gif',
    flutter_kicks: '/videosillustrations/core-abs-focus/Flutter Kicks.gif',
    hanging_leg_raises: '/videosillustrations/core-abs-focus/Hanging Leg Raises.gif',
    plank_shoulder_taps: '/videosillustrations/core-abs-focus/Plank Shoulder Taps.gif',
    reverse_crunch: '/videosillustrations/core-abs-focus/Reverse Crunch.gif',
    russian_twists: '/videosillustrations/core-abs-focus/Russian Twists.gif',
    toe_touches: '/videosillustrations/core-abs-focus/Toe Touches.gif',
    crunches: '/videosillustrations/body-weight/crunches.gif',
    // ── Machine exercises ────────────────────────────────────────────────────
    cable_bicep_curl: '/videosillustrations/machine-exercise/Cable Bicep Curl.gif',
    cable_lateral_raise: '/videosillustrations/machine-exercise/Cable Lateral Raise.gif',
    cable_tricep_pushdown: '/videosillustrations/machine-exercise/Cable Tricep Pushdown.gif',
    chest_press_machine: '/videosillustrations/machine-exercise/Chest Press Machine.gif',
    lat_pulldown: '/videosillustrations/machine-exercise/Lat Pulldown.gif',
    leg_curl: '/videosillustrations/machine-exercise/Leg Curl.gif',
    leg_press: '/videosillustrations/machine-exercise/Leg Press.gif',
    pec_deck: '/videosillustrations/machine-exercise/Pec Deck (Chest Fly Machine).gif',
    seated_row: '/videosillustrations/machine-exercise/Seated Row Machine.gif',
    leg_extension: '/videosillustrations/machine-exercise/leg-extension.gif',
    // ── Stretching / Mobility ────────────────────────────────────────────────
    cobra_stretch: '/videosillustrations/stretching-mobility/Cobra Stretch.gif',
    hamstring_stretch: '/videosillustrations/stretching-mobility/Hamstring Stretch.gif',
    hip_flexor_stretch: '/videosillustrations/stretching-mobility/Hip Flexor Stretch.gif',
    quad_stretch: '/videosillustrations/stretching-mobility/Quad Stretch.gif',
    shoulder_stretch: '/videosillustrations/stretching-mobility/Shoulder Stretch.gif'
};
// ─── Tips ────────────────────────────────────────────────────────────────────
const EXERCISE_TIPS = {
    bicep_curl: 'Pin elbows to your sides throughout',
    hammer_curl: 'Neutral grip, keep upper arm still',
    pushup: 'Straight back, tuck elbows 45°',
    shoulder_press: 'Core tight, press directly overhead',
    lateral_raise: 'Lead with elbows, stop at shoulder height',
    tricep_extension: 'Keep upper arm vertical & still',
    squat: 'Knees over toes, chest up',
    lunge: 'Front knee stays behind toes',
    jump_squat: 'Explode up, land softly on heels',
    calf_raise: 'Rise onto toes, hold the peak',
    plank: 'Head-to-heel straight line, breathe steadily',
    situp: 'Curl with your core, not your neck',
    mountain_climber: 'Hips level, drive knees powerfully',
    jumping_jacks: 'Arms all the way up, land softly',
    deadlift: 'Hip hinge, back flat, push the floor away',
    bench_press: 'Retract shoulder blades, controlled descent',
    barbell_row: 'Hinge 45°, pull toward lower chest',
    overhead_press: 'Brace core hard, lock out at top',
    romanian_deadlift: 'Soft knees, feel the hamstring stretch',
    incline_bench_press: 'Set incline 30-45°, press to upper chest',
    front_squat: 'Elbows high, upright torso throughout',
    hip_thrust_barbell: 'Drive hips fully up, squeeze glutes',
    barbell_squat: 'Bar on traps, sit back and down',
    goblet_squat: 'Hold DB at chest, knees out',
    dumbbell_deadlift: 'Flat back, keep dumbbells close to shins',
    chest_press: 'DBs at chest level, full ROM',
    dumbbell_fly: 'Slight bend in elbows, stretch the chest',
    front_raise: 'Arms parallel to floor, controlled lowering',
    tricep_kickback: 'Upper arm parallel to floor, fully extend',
    walking_lunges: 'Long strides, upright posture',
    knee_pushup: 'Great for building to full push-ups',
    side_plank: 'Stack feet, keep hips high',
    bicycle_crunch: 'Slow & deliberate, full torso rotation',
    leg_raises: 'Lower back flat on floor, legs straight',
    glute_bridge: 'Squeeze glutes hard at the top',
    hip_thrust: 'Upper back on bench, drive hips up',
    high_knees: 'Drive knees to waist height, stay light on feet',
    chin_up: 'Supinated grip, drive elbows down',
    pull_up: 'Dead hang start, chin over bar',
    burpees: 'Chest to floor, jump and clap overhead',
    battle_ropes: 'Alternate arm waves, stay low',
    box_jumps: 'Full hip extension at top, land softly',
    farmers_walk: 'Tall posture, shoulders packed',
    jump_rope: 'Stay on balls of feet, small jumps',
    kettlebell_swing: 'Hip hinge power — not a squat!',
    rowing_machine: 'Legs → lean → arms on drive; reverse on return',
    ab_rollout: 'Keep hips in — don\'t let lower back arch',
    flutter_kicks: 'Lower back pressed flat, small fast kicks',
    hanging_leg_raises: 'Control the descent, no swinging',
    plank_shoulder_taps: 'Minimal hip rotation, brace the core',
    reverse_crunch: 'Curl hips toward ribs, not just legs up',
    russian_twists: 'Lean back slightly, rotate from hips',
    toe_touches: 'Reach fingertips to toes each rep',
    crunches: 'Chin off chest, exhale on the way up',
    cable_bicep_curl: 'Constant tension — don\'t let the stack drop',
    cable_lateral_raise: 'Smooth arc, stop at shoulder height',
    cable_tricep_pushdown: 'Lock upper arms, fully extend',
    chest_press_machine: 'Adjust seat so handles are at chest',
    lat_pulldown: 'Pull bar to upper chest, lean back slightly',
    leg_curl: 'Control the return, hamstrings fully stretch',
    leg_press: 'Feet hip-width, don\'t lock out knees',
    pec_deck: 'Slight bend in elbows, feel the chest stretch',
    seated_row: 'Pull elbows back, squeeze shoulder blades',
    leg_extension: 'Full extension, pause at top',
    cobra_stretch: 'Press up gently, keep hips on floor',
    hamstring_stretch: 'Hinge from hips, keep back flat',
    hip_flexor_stretch: 'Lunge low, push hip forward',
    quad_stretch: 'Stand tall, pull heel to glute',
    shoulder_stretch: 'Pull arm across body, keep shoulder down'
};
// ─── Placeholder icon ─────────────────────────────────────────────────────────
function PlaceholderIcon() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "w-full h-full flex flex-col items-center justify-center gap-1",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
            width: "32",
            height: "32",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "#22c55e",
            strokeWidth: "1.5",
            strokeLinecap: "round",
            opacity: "0.5",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                    cx: "12",
                    cy: "5",
                    r: "2"
                }, void 0, false, {
                    fileName: "[project]/src/components/ExerciseGuide.tsx",
                    lineNumber: 191,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                    x1: "12",
                    y1: "7",
                    x2: "12",
                    y2: "14"
                }, void 0, false, {
                    fileName: "[project]/src/components/ExerciseGuide.tsx",
                    lineNumber: 192,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                    x1: "12",
                    y1: "10",
                    x2: "8",
                    y2: "13"
                }, void 0, false, {
                    fileName: "[project]/src/components/ExerciseGuide.tsx",
                    lineNumber: 193,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                    x1: "12",
                    y1: "10",
                    x2: "16",
                    y2: "13"
                }, void 0, false, {
                    fileName: "[project]/src/components/ExerciseGuide.tsx",
                    lineNumber: 194,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                    x1: "12",
                    y1: "14",
                    x2: "9",
                    y2: "20"
                }, void 0, false, {
                    fileName: "[project]/src/components/ExerciseGuide.tsx",
                    lineNumber: 195,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                    x1: "12",
                    y1: "14",
                    x2: "15",
                    y2: "20"
                }, void 0, false, {
                    fileName: "[project]/src/components/ExerciseGuide.tsx",
                    lineNumber: 196,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ExerciseGuide.tsx",
            lineNumber: 190,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/ExerciseGuide.tsx",
        lineNumber: 189,
        columnNumber: 9
    }, this);
}
function ExerciseGuide({ exerciseId, isDetecting, showModal = false, onModalDismiss }) {
    const gifPath = EXERCISE_VIDEOS[exerciseId] ?? null;
    const tip = EXERCISE_TIPS[exerciseId] ?? 'Focus on controlled movement';
    const name = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exercises$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EXERCISES"][exerciseId]?.name ?? exerciseId;
    // Preload next – when gif path changes, reset "loaded" state
    const [imgLoaded, setImgLoaded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setImgLoaded(false);
    }, [
        gifPath
    ]);
    // ── Full-screen preview modal ─────────────────────────────────────────────
    if (showModal) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-300",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative max-w-sm w-full mx-4 flex flex-col items-center gap-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center space-y-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] font-bold tracking-[0.3em] uppercase text-[#22c55e]/60",
                                children: "Exercise Preview"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ExerciseGuide.tsx",
                                lineNumber: 230,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-2xl font-black text-white tracking-tight",
                                children: name
                            }, void 0, false, {
                                fileName: "[project]/src/components/ExerciseGuide.tsx",
                                lineNumber: 233,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ExerciseGuide.tsx",
                        lineNumber: 229,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative w-72 h-72 rounded-2xl overflow-hidden border border-white/10 bg-[#111] shadow-2xl",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute inset-0 bg-gradient-to-b from-[#22c55e]/5 to-transparent pointer-events-none z-10"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ExerciseGuide.tsx",
                                lineNumber: 239,
                                columnNumber: 25
                            }, this),
                            gifPath ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                src: gifPath,
                                alt: name,
                                fill: true,
                                unoptimized: true,
                                className: `object-contain transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`,
                                onLoad: ()=>setImgLoaded(true),
                                priority: true
                            }, void 0, false, {
                                fileName: "[project]/src/components/ExerciseGuide.tsx",
                                lineNumber: 242,
                                columnNumber: 29
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(PlaceholderIcon, {}, void 0, false, {
                                fileName: "[project]/src/components/ExerciseGuide.tsx",
                                lineNumber: 252,
                                columnNumber: 29
                            }, this),
                            !imgLoaded && gifPath && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ExerciseGuide.tsx",
                                lineNumber: 257,
                                columnNumber: 29
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ExerciseGuide.tsx",
                        lineNumber: 237,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-start gap-2.5 bg-white/5 border border-white/8 rounded-xl px-4 py-3 max-w-xs",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                width: "14",
                                height: "14",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "#22c55e",
                                strokeWidth: "2",
                                strokeLinecap: "round",
                                className: "flex-shrink-0 mt-0.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                        cx: "12",
                                        cy: "12",
                                        r: "10"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ExerciseGuide.tsx",
                                        lineNumber: 264,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "12",
                                        y1: "8",
                                        x2: "12",
                                        y2: "12"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ExerciseGuide.tsx",
                                        lineNumber: 265,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "12",
                                        y1: "16",
                                        x2: "12.01",
                                        y2: "16"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ExerciseGuide.tsx",
                                        lineNumber: 266,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ExerciseGuide.tsx",
                                lineNumber: 263,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-white/60 leading-snug",
                                children: tip
                            }, void 0, false, {
                                fileName: "[project]/src/components/ExerciseGuide.tsx",
                                lineNumber: 268,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ExerciseGuide.tsx",
                        lineNumber: 262,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onModalDismiss,
                        className: "w-full max-w-xs bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-sm tracking-wider uppercase py-3.5 rounded-xl transition-all shadow-[0_0_30px_rgba(34,197,94,0.35)] hover:shadow-[0_0_40px_rgba(34,197,94,0.5)] cursor-pointer",
                        children: "Got it — Let's Go!"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ExerciseGuide.tsx",
                        lineNumber: 272,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ExerciseGuide.tsx",
                lineNumber: 226,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/components/ExerciseGuide.tsx",
            lineNumber: 225,
            columnNumber: 13
        }, this);
    }
    // ── Compact looping GIF (top-right corner) ────────────────────────────────
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-black/70 backdrop-blur-sm rounded-2xl border border-white/10 p-2 w-36 animate-in fade-in duration-300 shadow-xl",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-[8px] font-bold tracking-widest uppercase text-center mb-1.5 truncate",
                style: {
                    color: '#22c55e90'
                },
                children: name
            }, void 0, false, {
                fileName: "[project]/src/components/ExerciseGuide.tsx",
                lineNumber: 287,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative w-32 h-32 rounded-xl overflow-hidden",
                children: [
                    gifPath ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        src: gifPath,
                        alt: name,
                        fill: true,
                        unoptimized: true,
                        className: `object-contain transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`,
                        onLoad: ()=>setImgLoaded(true)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ExerciseGuide.tsx",
                        lineNumber: 292,
                        columnNumber: 21
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(PlaceholderIcon, {}, void 0, false, {
                        fileName: "[project]/src/components/ExerciseGuide.tsx",
                        lineNumber: 301,
                        columnNumber: 21
                    }, this),
                    !imgLoaded && gifPath && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 bg-white/5 animate-pulse rounded-xl"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ExerciseGuide.tsx",
                        lineNumber: 304,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ExerciseGuide.tsx",
                lineNumber: 290,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-[7px] text-white/35 text-center mt-1.5 leading-tight font-medium px-0.5 line-clamp-2",
                children: tip
            }, void 0, false, {
                fileName: "[project]/src/components/ExerciseGuide.tsx",
                lineNumber: 307,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ExerciseGuide.tsx",
        lineNumber: 285,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/MuscleIndicator.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MuscleIndicator
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
/**
 * MuscleIndicator — Compact bottom-right overlay showing targeted muscles.
 * Displays muscle group names with color-coded dots.
 */ 'use client';
;
// Mapping of exercises to their targeted muscle groups
const EXERCISE_MUSCLES = {
    // ─── Original ────────────────────────────────────────────────────────────
    bicep_curl: {
        category: 'upper',
        muscles: [
            {
                name: 'Biceps',
                region: 'primary'
            },
            {
                name: 'Forearms',
                region: 'secondary'
            },
            {
                name: 'Brachialis',
                region: 'secondary'
            }
        ]
    },
    hammer_curl: {
        category: 'upper',
        muscles: [
            {
                name: 'Brachialis',
                region: 'primary'
            },
            {
                name: 'Biceps',
                region: 'primary'
            },
            {
                name: 'Forearms',
                region: 'secondary'
            }
        ]
    },
    pushup: {
        category: 'upper',
        muscles: [
            {
                name: 'Chest',
                region: 'primary'
            },
            {
                name: 'Triceps',
                region: 'primary'
            },
            {
                name: 'Shoulders',
                region: 'secondary'
            },
            {
                name: 'Core',
                region: 'secondary'
            }
        ]
    },
    shoulder_press: {
        category: 'upper',
        muscles: [
            {
                name: 'Shoulders',
                region: 'primary'
            },
            {
                name: 'Triceps',
                region: 'secondary'
            },
            {
                name: 'Upper Chest',
                region: 'secondary'
            }
        ]
    },
    lateral_raise: {
        category: 'upper',
        muscles: [
            {
                name: 'Side Delts',
                region: 'primary'
            },
            {
                name: 'Traps',
                region: 'secondary'
            }
        ]
    },
    tricep_extension: {
        category: 'upper',
        muscles: [
            {
                name: 'Triceps',
                region: 'primary'
            },
            {
                name: 'Shoulders',
                region: 'secondary'
            }
        ]
    },
    squat: {
        category: 'lower',
        muscles: [
            {
                name: 'Quads',
                region: 'primary'
            },
            {
                name: 'Glutes',
                region: 'primary'
            },
            {
                name: 'Hamstrings',
                region: 'secondary'
            },
            {
                name: 'Core',
                region: 'secondary'
            }
        ]
    },
    lunge: {
        category: 'lower',
        muscles: [
            {
                name: 'Quads',
                region: 'primary'
            },
            {
                name: 'Glutes',
                region: 'primary'
            },
            {
                name: 'Hamstrings',
                region: 'secondary'
            }
        ]
    },
    jump_squat: {
        category: 'lower',
        muscles: [
            {
                name: 'Quads',
                region: 'primary'
            },
            {
                name: 'Glutes',
                region: 'primary'
            },
            {
                name: 'Calves',
                region: 'secondary'
            }
        ]
    },
    calf_raise: {
        category: 'lower',
        muscles: [
            {
                name: 'Calves',
                region: 'primary'
            },
            {
                name: 'Soleus',
                region: 'secondary'
            }
        ]
    },
    plank: {
        category: 'core',
        muscles: [
            {
                name: 'Abs',
                region: 'primary'
            },
            {
                name: 'Obliques',
                region: 'primary'
            },
            {
                name: 'Lower Back',
                region: 'secondary'
            },
            {
                name: 'Shoulders',
                region: 'secondary'
            }
        ]
    },
    situp: {
        category: 'core',
        muscles: [
            {
                name: 'Abs',
                region: 'primary'
            },
            {
                name: 'Hip Flexors',
                region: 'secondary'
            },
            {
                name: 'Obliques',
                region: 'secondary'
            }
        ]
    },
    mountain_climber: {
        category: 'core',
        muscles: [
            {
                name: 'Abs',
                region: 'primary'
            },
            {
                name: 'Hip Flexors',
                region: 'primary'
            },
            {
                name: 'Shoulders',
                region: 'secondary'
            },
            {
                name: 'Quads',
                region: 'secondary'
            }
        ]
    },
    jumping_jacks: {
        category: 'core',
        muscles: [
            {
                name: 'Shoulders',
                region: 'primary'
            },
            {
                name: 'Calves',
                region: 'primary'
            },
            {
                name: 'Quads',
                region: 'secondary'
            },
            {
                name: 'Core',
                region: 'secondary'
            }
        ]
    },
    // ─── Barbell ─────────────────────────────────────────────────────────────
    barbell_squat: {
        category: 'lower',
        muscles: [
            {
                name: 'Quads',
                region: 'primary'
            },
            {
                name: 'Glutes',
                region: 'primary'
            },
            {
                name: 'Hamstrings',
                region: 'secondary'
            },
            {
                name: 'Core',
                region: 'secondary'
            }
        ]
    },
    barbell_row: {
        category: 'upper',
        muscles: [
            {
                name: 'Lats',
                region: 'primary'
            },
            {
                name: 'Rhomboids',
                region: 'primary'
            },
            {
                name: 'Biceps',
                region: 'secondary'
            }
        ]
    },
    deadlift: {
        category: 'lower',
        muscles: [
            {
                name: 'Hamstrings',
                region: 'primary'
            },
            {
                name: 'Glutes',
                region: 'primary'
            },
            {
                name: 'Lower Back',
                region: 'primary'
            },
            {
                name: 'Traps',
                region: 'secondary'
            }
        ]
    },
    bench_press: {
        category: 'upper',
        muscles: [
            {
                name: 'Chest',
                region: 'primary'
            },
            {
                name: 'Triceps',
                region: 'primary'
            },
            {
                name: 'Front Delts',
                region: 'secondary'
            }
        ]
    },
    overhead_press: {
        category: 'upper',
        muscles: [
            {
                name: 'Shoulders',
                region: 'primary'
            },
            {
                name: 'Triceps',
                region: 'secondary'
            },
            {
                name: 'Upper Chest',
                region: 'secondary'
            }
        ]
    },
    romanian_deadlift: {
        category: 'lower',
        muscles: [
            {
                name: 'Hamstrings',
                region: 'primary'
            },
            {
                name: 'Glutes',
                region: 'primary'
            },
            {
                name: 'Lower Back',
                region: 'secondary'
            }
        ]
    },
    incline_bench_press: {
        category: 'upper',
        muscles: [
            {
                name: 'Upper Chest',
                region: 'primary'
            },
            {
                name: 'Front Delts',
                region: 'secondary'
            },
            {
                name: 'Triceps',
                region: 'secondary'
            }
        ]
    },
    front_squat: {
        category: 'lower',
        muscles: [
            {
                name: 'Quads',
                region: 'primary'
            },
            {
                name: 'Glutes',
                region: 'secondary'
            },
            {
                name: 'Core',
                region: 'secondary'
            }
        ]
    },
    hip_thrust_barbell: {
        category: 'lower',
        muscles: [
            {
                name: 'Glutes',
                region: 'primary'
            },
            {
                name: 'Hamstrings',
                region: 'secondary'
            }
        ]
    },
    // ─── Dumbbell ────────────────────────────────────────────────────────────
    dumbbell_row: {
        category: 'upper',
        muscles: [
            {
                name: 'Lats',
                region: 'primary'
            },
            {
                name: 'Rhomboids',
                region: 'primary'
            },
            {
                name: 'Biceps',
                region: 'secondary'
            }
        ]
    },
    goblet_squat: {
        category: 'lower',
        muscles: [
            {
                name: 'Quads',
                region: 'primary'
            },
            {
                name: 'Glutes',
                region: 'primary'
            },
            {
                name: 'Core',
                region: 'secondary'
            }
        ]
    },
    dumbbell_deadlift: {
        category: 'lower',
        muscles: [
            {
                name: 'Hamstrings',
                region: 'primary'
            },
            {
                name: 'Glutes',
                region: 'primary'
            },
            {
                name: 'Back',
                region: 'secondary'
            }
        ]
    },
    overhead_tricep_ext: {
        category: 'upper',
        muscles: [
            {
                name: 'Triceps',
                region: 'primary'
            },
            {
                name: 'Shoulders',
                region: 'secondary'
            }
        ]
    },
    chest_press: {
        category: 'upper',
        muscles: [
            {
                name: 'Chest',
                region: 'primary'
            },
            {
                name: 'Triceps',
                region: 'secondary'
            },
            {
                name: 'Front Delts',
                region: 'secondary'
            }
        ]
    },
    dumbbell_fly: {
        category: 'upper',
        muscles: [
            {
                name: 'Chest',
                region: 'primary'
            },
            {
                name: 'Front Delts',
                region: 'secondary'
            }
        ]
    },
    front_raise: {
        category: 'upper',
        muscles: [
            {
                name: 'Front Delts',
                region: 'primary'
            },
            {
                name: 'Traps',
                region: 'secondary'
            }
        ]
    },
    tricep_kickback: {
        category: 'upper',
        muscles: [
            {
                name: 'Triceps',
                region: 'primary'
            }
        ]
    },
    incline_chest_press: {
        category: 'upper',
        muscles: [
            {
                name: 'Upper Chest',
                region: 'primary'
            },
            {
                name: 'Triceps',
                region: 'secondary'
            }
        ]
    },
    // ─── Body-weight extras ───────────────────────────────────────────────────
    walking_lunges: {
        category: 'lower',
        muscles: [
            {
                name: 'Quads',
                region: 'primary'
            },
            {
                name: 'Glutes',
                region: 'primary'
            },
            {
                name: 'Hamstrings',
                region: 'secondary'
            }
        ]
    },
    knee_pushup: {
        category: 'upper',
        muscles: [
            {
                name: 'Chest',
                region: 'primary'
            },
            {
                name: 'Triceps',
                region: 'primary'
            },
            {
                name: 'Core',
                region: 'secondary'
            }
        ]
    },
    side_plank: {
        category: 'core',
        muscles: [
            {
                name: 'Obliques',
                region: 'primary'
            },
            {
                name: 'Glutes',
                region: 'secondary'
            },
            {
                name: 'Shoulders',
                region: 'secondary'
            }
        ]
    },
    bicycle_crunch: {
        category: 'core',
        muscles: [
            {
                name: 'Obliques',
                region: 'primary'
            },
            {
                name: 'Abs',
                region: 'primary'
            },
            {
                name: 'Hip Flexors',
                region: 'secondary'
            }
        ]
    },
    leg_raises: {
        category: 'core',
        muscles: [
            {
                name: 'Lower Abs',
                region: 'primary'
            },
            {
                name: 'Hip Flexors',
                region: 'secondary'
            }
        ]
    },
    glute_bridge: {
        category: 'lower',
        muscles: [
            {
                name: 'Glutes',
                region: 'primary'
            },
            {
                name: 'Hamstrings',
                region: 'secondary'
            },
            {
                name: 'Core',
                region: 'secondary'
            }
        ]
    },
    hip_thrust: {
        category: 'lower',
        muscles: [
            {
                name: 'Glutes',
                region: 'primary'
            },
            {
                name: 'Hamstrings',
                region: 'secondary'
            }
        ]
    },
    high_knees: {
        category: 'core',
        muscles: [
            {
                name: 'Hip Flexors',
                region: 'primary'
            },
            {
                name: 'Quads',
                region: 'secondary'
            },
            {
                name: 'Core',
                region: 'secondary'
            }
        ]
    },
    chin_up: {
        category: 'upper',
        muscles: [
            {
                name: 'Biceps',
                region: 'primary'
            },
            {
                name: 'Lats',
                region: 'primary'
            },
            {
                name: 'Core',
                region: 'secondary'
            }
        ]
    },
    pull_up: {
        category: 'upper',
        muscles: [
            {
                name: 'Lats',
                region: 'primary'
            },
            {
                name: 'Rhomboids',
                region: 'primary'
            },
            {
                name: 'Biceps',
                region: 'secondary'
            }
        ]
    },
    burpees: {
        category: 'core',
        muscles: [
            {
                name: 'Full Body',
                region: 'primary'
            },
            {
                name: 'Chest',
                region: 'secondary'
            },
            {
                name: 'Quads',
                region: 'secondary'
            }
        ]
    },
    crunches: {
        category: 'core',
        muscles: [
            {
                name: 'Abs',
                region: 'primary'
            },
            {
                name: 'Obliques',
                region: 'secondary'
            }
        ]
    },
    // ─── Cardio ───────────────────────────────────────────────────────────────
    battle_ropes: {
        category: 'upper',
        muscles: [
            {
                name: 'Shoulders',
                region: 'primary'
            },
            {
                name: 'Arms',
                region: 'secondary'
            },
            {
                name: 'Core',
                region: 'secondary'
            }
        ]
    },
    box_jumps: {
        category: 'lower',
        muscles: [
            {
                name: 'Quads',
                region: 'primary'
            },
            {
                name: 'Glutes',
                region: 'primary'
            },
            {
                name: 'Calves',
                region: 'secondary'
            }
        ]
    },
    farmers_walk: {
        category: 'lower',
        muscles: [
            {
                name: 'Traps',
                region: 'primary'
            },
            {
                name: 'Forearms',
                region: 'primary'
            },
            {
                name: 'Core',
                region: 'secondary'
            }
        ]
    },
    jump_rope: {
        category: 'core',
        muscles: [
            {
                name: 'Calves',
                region: 'primary'
            },
            {
                name: 'Shoulders',
                region: 'secondary'
            },
            {
                name: 'Core',
                region: 'secondary'
            }
        ]
    },
    kettlebell_swing: {
        category: 'lower',
        muscles: [
            {
                name: 'Glutes',
                region: 'primary'
            },
            {
                name: 'Hamstrings',
                region: 'primary'
            },
            {
                name: 'Lower Back',
                region: 'secondary'
            }
        ]
    },
    rowing_machine: {
        category: 'upper',
        muscles: [
            {
                name: 'Lats',
                region: 'primary'
            },
            {
                name: 'Legs',
                region: 'primary'
            },
            {
                name: 'Core',
                region: 'secondary'
            }
        ]
    },
    // ─── Core / Abs ───────────────────────────────────────────────────────────
    ab_rollout: {
        category: 'core',
        muscles: [
            {
                name: 'Abs',
                region: 'primary'
            },
            {
                name: 'Lower Back',
                region: 'secondary'
            },
            {
                name: 'Shoulders',
                region: 'secondary'
            }
        ]
    },
    flutter_kicks: {
        category: 'core',
        muscles: [
            {
                name: 'Lower Abs',
                region: 'primary'
            },
            {
                name: 'Hip Flexors',
                region: 'secondary'
            }
        ]
    },
    hanging_leg_raises: {
        category: 'core',
        muscles: [
            {
                name: 'Lower Abs',
                region: 'primary'
            },
            {
                name: 'Hip Flexors',
                region: 'primary'
            },
            {
                name: 'Grip',
                region: 'secondary'
            }
        ]
    },
    plank_shoulder_taps: {
        category: 'core',
        muscles: [
            {
                name: 'Core',
                region: 'primary'
            },
            {
                name: 'Shoulders',
                region: 'secondary'
            },
            {
                name: 'Obliques',
                region: 'secondary'
            }
        ]
    },
    reverse_crunch: {
        category: 'core',
        muscles: [
            {
                name: 'Lower Abs',
                region: 'primary'
            },
            {
                name: 'Hip Flexors',
                region: 'secondary'
            }
        ]
    },
    russian_twists: {
        category: 'core',
        muscles: [
            {
                name: 'Obliques',
                region: 'primary'
            },
            {
                name: 'Abs',
                region: 'secondary'
            }
        ]
    },
    toe_touches: {
        category: 'core',
        muscles: [
            {
                name: 'Abs',
                region: 'primary'
            },
            {
                name: 'Hip Flexors',
                region: 'secondary'
            }
        ]
    },
    // ─── Machine ─────────────────────────────────────────────────────────────
    cable_bicep_curl: {
        category: 'upper',
        muscles: [
            {
                name: 'Biceps',
                region: 'primary'
            },
            {
                name: 'Forearms',
                region: 'secondary'
            }
        ]
    },
    cable_lateral_raise: {
        category: 'upper',
        muscles: [
            {
                name: 'Side Delts',
                region: 'primary'
            },
            {
                name: 'Traps',
                region: 'secondary'
            }
        ]
    },
    cable_tricep_pushdown: {
        category: 'upper',
        muscles: [
            {
                name: 'Triceps',
                region: 'primary'
            }
        ]
    },
    chest_press_machine: {
        category: 'upper',
        muscles: [
            {
                name: 'Chest',
                region: 'primary'
            },
            {
                name: 'Triceps',
                region: 'secondary'
            }
        ]
    },
    lat_pulldown: {
        category: 'upper',
        muscles: [
            {
                name: 'Lats',
                region: 'primary'
            },
            {
                name: 'Biceps',
                region: 'secondary'
            },
            {
                name: 'Rear Delts',
                region: 'secondary'
            }
        ]
    },
    leg_curl: {
        category: 'lower',
        muscles: [
            {
                name: 'Hamstrings',
                region: 'primary'
            },
            {
                name: 'Calves',
                region: 'secondary'
            }
        ]
    },
    leg_press: {
        category: 'lower',
        muscles: [
            {
                name: 'Quads',
                region: 'primary'
            },
            {
                name: 'Glutes',
                region: 'secondary'
            },
            {
                name: 'Hamstrings',
                region: 'secondary'
            }
        ]
    },
    pec_deck: {
        category: 'upper',
        muscles: [
            {
                name: 'Chest',
                region: 'primary'
            },
            {
                name: 'Front Delts',
                region: 'secondary'
            }
        ]
    },
    seated_row: {
        category: 'upper',
        muscles: [
            {
                name: 'Lats',
                region: 'primary'
            },
            {
                name: 'Rhomboids',
                region: 'primary'
            },
            {
                name: 'Biceps',
                region: 'secondary'
            }
        ]
    },
    leg_extension: {
        category: 'lower',
        muscles: [
            {
                name: 'Quads',
                region: 'primary'
            }
        ]
    },
    // ─── Stretching ──────────────────────────────────────────────────────────
    cobra_stretch: {
        category: 'core',
        muscles: [
            {
                name: 'Spine Extensors',
                region: 'primary'
            },
            {
                name: 'Abs',
                region: 'secondary'
            }
        ]
    },
    hamstring_stretch: {
        category: 'lower',
        muscles: [
            {
                name: 'Hamstrings',
                region: 'primary'
            },
            {
                name: 'Calves',
                region: 'secondary'
            }
        ]
    },
    hip_flexor_stretch: {
        category: 'lower',
        muscles: [
            {
                name: 'Hip Flexors',
                region: 'primary'
            },
            {
                name: 'Quads',
                region: 'secondary'
            }
        ]
    },
    quad_stretch: {
        category: 'lower',
        muscles: [
            {
                name: 'Quads',
                region: 'primary'
            }
        ]
    },
    shoulder_stretch: {
        category: 'upper',
        muscles: [
            {
                name: 'Rear Delts',
                region: 'primary'
            },
            {
                name: 'Traps',
                region: 'secondary'
            }
        ]
    }
};
const CATEGORY_COLORS = {
    upper: '#38bdf8',
    lower: '#22c55e',
    core: '#f59e0b'
};
function MuscleIndicator({ exerciseId }) {
    const data = EXERCISE_MUSCLES[exerciseId];
    if (!data) return null;
    const accentColor = CATEGORY_COLORS[data.category];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-black/60 backdrop-blur-sm rounded-xl border border-white/10 p-2.5 min-w-[100px] animate-fade-in",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-1.5 mb-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                        width: "10",
                        height: "10",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: accentColor,
                        strokeWidth: "2",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                        }, void 0, false, {
                            fileName: "[project]/src/components/MuscleIndicator.tsx",
                            lineNumber: 131,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/MuscleIndicator.tsx",
                        lineNumber: 130,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-[8px] font-bold tracking-widest uppercase",
                        style: {
                            color: accentColor
                        },
                        children: "Muscles"
                    }, void 0, false, {
                        fileName: "[project]/src/components/MuscleIndicator.tsx",
                        lineNumber: 133,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/MuscleIndicator.tsx",
                lineNumber: 129,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-1",
                children: data.muscles.map((muscle)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-1.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                style: {
                                    backgroundColor: muscle.region === 'primary' ? accentColor : `${accentColor}50`
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/MuscleIndicator.tsx",
                                lineNumber: 142,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: `text-[9px] font-medium ${muscle.region === 'primary' ? 'text-white/70' : 'text-white/30'}`,
                                children: muscle.name
                            }, void 0, false, {
                                fileName: "[project]/src/components/MuscleIndicator.tsx",
                                lineNumber: 148,
                                columnNumber: 25
                            }, this)
                        ]
                    }, muscle.name, true, {
                        fileName: "[project]/src/components/MuscleIndicator.tsx",
                        lineNumber: 141,
                        columnNumber: 21
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/MuscleIndicator.tsx",
                lineNumber: 139,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/MuscleIndicator.tsx",
        lineNumber: 127,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/SetCompleteModal.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SetCompleteModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
/**
 * SetCompleteModal — Full-screen modal shown when a set is complete.
 * Shows set results, feedback, and option to continue to next set or end workout.
 */ 'use client';
;
function SetCompleteModal({ currentSet, totalSets, repsCompleted, targetReps, formQuality, onNextSet, onEndWorkout }) {
    const isLastSet = currentSet >= totalSets;
    const formLabel = formQuality >= 80 ? 'Excellent' : formQuality >= 60 ? 'Good' : 'Needs Work';
    const formColor = formQuality >= 80 ? '#22c55e' : formQuality >= 60 ? '#f59e0b' : '#ef4444';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-[#111]/95 border border-white/10 rounded-2xl p-8 max-w-sm w-[90%] text-center shadow-2xl",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
                    style: {
                        backgroundColor: `${formColor}15`,
                        border: `2px solid ${formColor}40`
                    },
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                        width: "28",
                        height: "28",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: formColor,
                        strokeWidth: "2.5",
                        strokeLinecap: "round",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                            points: "20,6 9,17 4,12"
                        }, void 0, false, {
                            fileName: "[project]/src/components/SetCompleteModal.tsx",
                            lineNumber: 40,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/SetCompleteModal.tsx",
                        lineNumber: 39,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/SetCompleteModal.tsx",
                    lineNumber: 35,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    className: "text-xl font-bold text-white mb-1",
                    style: {
                        fontFamily: 'Orbitron, sans-serif'
                    },
                    children: [
                        "Set ",
                        currentSet,
                        " Complete"
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/SetCompleteModal.tsx",
                    lineNumber: 45,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-sm text-white/30 mb-6",
                    children: isLastSet ? 'Final set — great workout!' : `${totalSets - currentSet} set${totalSets - currentSet > 1 ? 's' : ''} remaining`
                }, void 0, false, {
                    fileName: "[project]/src/components/SetCompleteModal.tsx",
                    lineNumber: 48,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex justify-center gap-6 mb-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-2xl font-black text-white",
                                    style: {
                                        fontFamily: 'Orbitron, monospace'
                                    },
                                    children: repsCompleted
                                }, void 0, false, {
                                    fileName: "[project]/src/components/SetCompleteModal.tsx",
                                    lineNumber: 55,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[9px] text-white/25 tracking-widest uppercase mt-0.5",
                                    children: "Reps"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/SetCompleteModal.tsx",
                                    lineNumber: 58,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/SetCompleteModal.tsx",
                            lineNumber: 54,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "w-px bg-white/10"
                        }, void 0, false, {
                            fileName: "[project]/src/components/SetCompleteModal.tsx",
                            lineNumber: 60,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-2xl font-black",
                                    style: {
                                        fontFamily: 'Orbitron, monospace',
                                        color: formColor
                                    },
                                    children: [
                                        formQuality,
                                        "%"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/SetCompleteModal.tsx",
                                    lineNumber: 62,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[9px] tracking-widest uppercase mt-0.5",
                                    style: {
                                        color: `${formColor}80`
                                    },
                                    children: formLabel
                                }, void 0, false, {
                                    fileName: "[project]/src/components/SetCompleteModal.tsx",
                                    lineNumber: 65,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/SetCompleteModal.tsx",
                            lineNumber: 61,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/SetCompleteModal.tsx",
                    lineNumber: 53,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-col gap-2.5",
                    children: [
                        !isLastSet && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onNextSet,
                            className: "w-full py-3 rounded-xl font-bold text-sm tracking-wider uppercase bg-[#22c55e] text-black hover:bg-[#16a34a] transition-all cursor-pointer shadow-[0_0_25px_rgba(34,197,94,0.25)]",
                            children: "Next Set →"
                        }, void 0, false, {
                            fileName: "[project]/src/components/SetCompleteModal.tsx",
                            lineNumber: 74,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onEndWorkout,
                            className: `
                            w-full py-3 rounded-xl font-bold text-sm tracking-wider uppercase transition-all cursor-pointer
                            ${isLastSet ? 'bg-[#22c55e] text-black hover:bg-[#16a34a] shadow-[0_0_25px_rgba(34,197,94,0.25)]' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/60'}
                        `,
                            children: isLastSet ? 'View Summary' : 'End Workout'
                        }, void 0, false, {
                            fileName: "[project]/src/components/SetCompleteModal.tsx",
                            lineNumber: 81,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/SetCompleteModal.tsx",
                    lineNumber: 72,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/SetCompleteModal.tsx",
            lineNumber: 33,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/SetCompleteModal.tsx",
        lineNumber: 32,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/CountdownOverlay.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CountdownOverlay
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
/**
 * CountdownOverlay — Full-screen "3, 2, 1, GO!" countdown before workout starts.
 * Animated number with pulse effect.
 * Uses SpeechSynthesis to speak each number.
 *
 * FIX: Waits for voices to load before speaking, uses direct utterance creation.
 */ 'use client';
;
;
function CountdownOverlay({ onComplete, voiceEnabled }) {
    const [count, setCount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(3);
    const [phase, setPhase] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('number');
    const voiceRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Preload voice
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
        const loadVoices = undefined;
    }, []);
    const speak = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((text)=>{
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
        const utterance = undefined;
    }, [
        voiceEnabled
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (count > 0) {
            speak(String(count));
            const timer = setTimeout(()=>setCount(count - 1), 1000);
            return ()=>clearTimeout(timer);
        } else if (phase === 'number') {
            // Show "GO!" for 800ms
            setPhase('go');
            speak('Go!');
            const timer = setTimeout(()=>{
                setPhase('done');
                onComplete();
            }, 800);
            return ()=>clearTimeout(timer);
        }
    }, [
        count,
        phase,
        speak,
        onComplete
    ]);
    if (phase === 'done') return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-center",
            children: [
                phase === 'number' && count > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-[12rem] font-black text-white leading-none animate-countdown-pulse",
                    style: {
                        fontFamily: 'Orbitron, sans-serif',
                        textShadow: '0 0 60px rgba(34,197,94,0.5), 0 0 120px rgba(34,197,94,0.2)'
                    },
                    children: count
                }, count, false, {
                    fileName: "[project]/src/components/CountdownOverlay.tsx",
                    lineNumber: 88,
                    columnNumber: 21
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-[10rem] font-black text-[#22c55e] leading-none animate-countdown-pulse",
                    style: {
                        fontFamily: 'Orbitron, sans-serif',
                        textShadow: '0 0 80px rgba(34,197,94,0.6), 0 0 160px rgba(34,197,94,0.3)'
                    },
                    children: "GO!"
                }, void 0, false, {
                    fileName: "[project]/src/components/CountdownOverlay.tsx",
                    lineNumber: 99,
                    columnNumber: 21
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-sm text-white/30 tracking-[0.3em] uppercase mt-4 font-medium",
                    children: phase === 'go' ? 'Start moving!' : 'Get ready'
                }, void 0, false, {
                    fileName: "[project]/src/components/CountdownOverlay.tsx",
                    lineNumber: 110,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/CountdownOverlay.tsx",
            lineNumber: 86,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/CountdownOverlay.tsx",
        lineNumber: 85,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/WorkoutSummary.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>WorkoutSummaryDisplay
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
/**
 * WorkoutSummary — Post-workout results. No emojis. SVG icons only.
 */ 'use client';
;
function ScoreRing({ score, label, color }) {
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - score / 100 * circumference;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col items-center",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative w-[76px] h-[76px]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                        width: 76,
                        height: 76,
                        className: "transform -rotate-90",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                cx: 38,
                                cy: 38,
                                r: radius,
                                fill: "none",
                                stroke: "rgba(255,255,255,0.05)",
                                strokeWidth: 4
                            }, void 0, false, {
                                fileName: "[project]/src/components/WorkoutSummary.tsx",
                                lineNumber: 19,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                cx: 38,
                                cy: 38,
                                r: radius,
                                fill: "none",
                                stroke: color,
                                strokeWidth: 4,
                                strokeLinecap: "round",
                                strokeDasharray: circumference,
                                strokeDashoffset: offset,
                                style: {
                                    transition: 'stroke-dashoffset 1s ease',
                                    filter: `drop-shadow(0 0 4px ${color}80)`
                                }
                            }, void 0, false, {
                                fileName: "[project]/src/components/WorkoutSummary.tsx",
                                lineNumber: 20,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/WorkoutSummary.tsx",
                        lineNumber: 18,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "absolute inset-0 flex items-center justify-center text-lg font-bold text-white",
                        style: {
                            fontFamily: 'Orbitron, sans-serif'
                        },
                        children: score
                    }, void 0, false, {
                        fileName: "[project]/src/components/WorkoutSummary.tsx",
                        lineNumber: 26,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/WorkoutSummary.tsx",
                lineNumber: 17,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "text-[10px] text-white/40 mt-2 tracking-wider uppercase",
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/WorkoutSummary.tsx",
                lineNumber: 30,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/WorkoutSummary.tsx",
        lineNumber: 16,
        columnNumber: 9
    }, this);
}
function WorkoutSummaryDisplay({ summary, xpGained, newBadges, onClose }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-[#0f0f0f] border border-white/10 rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-between mb-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xl font-bold text-white",
                            style: {
                                fontFamily: 'Orbitron, sans-serif'
                            },
                            children: "WORKOUT COMPLETE"
                        }, void 0, false, {
                            fileName: "[project]/src/components/WorkoutSummary.tsx",
                            lineNumber: 46,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onClose,
                            className: "text-white/20 hover:text-white/50 transition-colors cursor-pointer",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                width: "18",
                                height: "18",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                strokeWidth: "1.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "18",
                                        y1: "6",
                                        x2: "6",
                                        y2: "18"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/WorkoutSummary.tsx",
                                        lineNumber: 50,
                                        columnNumber: 125
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                        x1: "6",
                                        y1: "6",
                                        x2: "18",
                                        y2: "18"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/WorkoutSummary.tsx",
                                        lineNumber: 50,
                                        columnNumber: 163
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/WorkoutSummary.tsx",
                                lineNumber: 50,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/WorkoutSummary.tsx",
                            lineNumber: 49,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/WorkoutSummary.tsx",
                    lineNumber: 45,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-center text-[#22c55e] font-bold text-lg mb-6",
                    style: {
                        fontFamily: 'Orbitron, monospace'
                    },
                    children: [
                        "+",
                        xpGained,
                        " XP"
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/WorkoutSummary.tsx",
                    lineNumber: 54,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex justify-around mb-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ScoreRing, {
                            score: summary.formScore,
                            label: "Form",
                            color: "#22c55e"
                        }, void 0, false, {
                            fileName: "[project]/src/components/WorkoutSummary.tsx",
                            lineNumber: 58,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ScoreRing, {
                            score: summary.romScore,
                            label: "ROM",
                            color: "#38bdf8"
                        }, void 0, false, {
                            fileName: "[project]/src/components/WorkoutSummary.tsx",
                            lineNumber: 59,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ScoreRing, {
                            score: summary.tempoScore,
                            label: "Tempo",
                            color: "#a855f7"
                        }, void 0, false, {
                            fileName: "[project]/src/components/WorkoutSummary.tsx",
                            lineNumber: 60,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/WorkoutSummary.tsx",
                    lineNumber: 57,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-2 gap-3 mb-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "border border-white/5 rounded-lg p-3 text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-2xl font-bold text-[#22c55e]",
                                    style: {
                                        fontFamily: 'Orbitron, monospace'
                                    },
                                    children: summary.totalReps
                                }, void 0, false, {
                                    fileName: "[project]/src/components/WorkoutSummary.tsx",
                                    lineNumber: 66,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] text-white/25 tracking-wider uppercase",
                                    children: "Reps"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/WorkoutSummary.tsx",
                                    lineNumber: 67,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/WorkoutSummary.tsx",
                            lineNumber: 65,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "border border-white/5 rounded-lg p-3 text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-2xl font-bold text-[#38bdf8]",
                                    style: {
                                        fontFamily: 'Orbitron, monospace'
                                    },
                                    children: [
                                        Math.floor(summary.duration / 60),
                                        ":",
                                        (summary.duration % 60).toString().padStart(2, '0')
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/WorkoutSummary.tsx",
                                    lineNumber: 70,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[10px] text-white/25 tracking-wider uppercase",
                                    children: "Duration"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/WorkoutSummary.tsx",
                                    lineNumber: 73,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/WorkoutSummary.tsx",
                            lineNumber: 69,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/WorkoutSummary.tsx",
                    lineNumber: 64,
                    columnNumber: 17
                }, this),
                newBadges.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "text-xs font-bold text-white/40 tracking-widest uppercase mb-3 flex items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    width: "14",
                                    height: "14",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "#22c55e",
                                    strokeWidth: "1.5",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("polygon", {
                                        points: "12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/WorkoutSummary.tsx",
                                        lineNumber: 81,
                                        columnNumber: 124
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/WorkoutSummary.tsx",
                                    lineNumber: 81,
                                    columnNumber: 29
                                }, this),
                                "Badges Unlocked"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/WorkoutSummary.tsx",
                            lineNumber: 80,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-2",
                            children: newBadges.map((b)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2 p-2 rounded-lg border border-[#22c55e]/15 bg-[#22c55e]/[0.03]",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs font-bold text-[#22c55e]",
                                        children: b.name
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/WorkoutSummary.tsx",
                                        lineNumber: 87,
                                        columnNumber: 37
                                    }, this)
                                }, b.id, false, {
                                    fileName: "[project]/src/components/WorkoutSummary.tsx",
                                    lineNumber: 86,
                                    columnNumber: 33
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/WorkoutSummary.tsx",
                            lineNumber: 84,
                            columnNumber: 25
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/WorkoutSummary.tsx",
                    lineNumber: 79,
                    columnNumber: 21
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "text-xs font-bold text-white/40 tracking-widest uppercase mb-3 flex items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    width: "14",
                                    height: "14",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "#38bdf8",
                                    strokeWidth: "1.5",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/WorkoutSummary.tsx",
                                        lineNumber: 97,
                                        columnNumber: 120
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/WorkoutSummary.tsx",
                                    lineNumber: 97,
                                    columnNumber: 25
                                }, this),
                                "AI Coach Notes"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/WorkoutSummary.tsx",
                            lineNumber: 96,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-2",
                            children: summary.coachNotes.map((note, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm text-white/40 pl-3 border-l-2 border-white/5",
                                    children: note
                                }, i, false, {
                                    fileName: "[project]/src/components/WorkoutSummary.tsx",
                                    lineNumber: 102,
                                    columnNumber: 29
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/WorkoutSummary.tsx",
                            lineNumber: 100,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/WorkoutSummary.tsx",
                    lineNumber: 95,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    onClick: onClose,
                    className: "w-full py-3 rounded-xl bg-[#22c55e]/15 text-[#22c55e] font-semibold border border-[#22c55e]/30 hover:bg-[#22c55e]/25 transition-all cursor-pointer",
                    children: "Done"
                }, void 0, false, {
                    fileName: "[project]/src/components/WorkoutSummary.tsx",
                    lineNumber: 110,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/WorkoutSummary.tsx",
            lineNumber: 43,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/WorkoutSummary.tsx",
        lineNumber: 42,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/app/(app)/workout/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>WorkoutPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$usePoseDetection$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/usePoseDetection.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useSpeechCoach$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useSpeechCoach.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exercises$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/exercises.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$aiCoach$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/aiCoach.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$gamification$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/gamification.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$progressStore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/progressStore.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CameraFeed$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/CameraFeed.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$RepCounter$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/RepCounter.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$SetTracker$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/SetTracker.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$FormFeedback$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/FormFeedback.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CoachMessage$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/CoachMessage.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ExerciseGuide$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ExerciseGuide.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$MuscleIndicator$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/MuscleIndicator.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$SetCompleteModal$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/SetCompleteModal.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CountdownOverlay$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/CountdownOverlay.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WorkoutSummary$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/WorkoutSummary.tsx [app-ssr] (ecmascript)");
/**
 * Workout Page — Camera-dominant layout with completion tracking & voice coaching.
 * Features: 3-2-1-GO countdown, reset button, set complete modal, voice coach.
 * Exercise guide, muscles, and stats visible BEFORE camera starts.
 */ 'use client';
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
function WorkoutPage() {
    const { videoRef, canvasRef, repCount, currentAngle, formQuality, feedback, timeUnderTension, isDetecting, isLoading, error, exerciseId, landmarks, formCorrections, coachTip, holdTime, isHolding, setExercise, startDetection, stopDetection, workoutStartTime } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$usePoseDetection$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePoseDetection"])();
    const [showSummary, setShowSummary] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [summary, setSummary] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [xpGained, setXpGained] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [newBadges, setNewBadges] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectorOpen, setSelectorOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // Set/rep tracking
    const [targetReps, setTargetReps] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(10);
    const [targetSets, setTargetSets] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(3);
    const [currentSet, setCurrentSet] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(1);
    const [showSetComplete, setShowSetComplete] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [setFormQuality, setSetFormQuality] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [totalRepsThisWorkout, setTotalRepsThisWorkout] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    // Countdown
    const [showCountdown, setShowCountdown] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // Video preview modal — shown when exercise first loads or changes
    const [showVideoModal, setShowVideoModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const prevExerciseRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(exerciseId);
    // Reset modal when exercise changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (exerciseId !== prevExerciseRef.current) {
            prevExerciseRef.current = exerciseId;
            setShowVideoModal(true);
        }
    }, [
        exerciseId
    ]);
    // Voice coach
    const [voiceEnabled, setVoiceEnabled] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const speechCoach = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useSpeechCoach$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSpeechCoach"])({
        enabled: voiceEnabled,
        targetReps,
        currentSet,
        totalSets: targetSets
    });
    const currentExercise = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exercises$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EXERCISES"][exerciseId];
    const prevRepCountRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(repCount);
    const setCompleteTriggeredRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    // When reps reach target → stop detection and show modal
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (repCount > prevRepCountRef.current) {
            speechCoach.onRepChange(repCount);
            if (repCount >= targetReps && !setCompleteTriggeredRef.current) {
                setCompleteTriggeredRef.current = true;
                setSetFormQuality(formQuality);
                setTotalRepsThisWorkout((prev)=>prev + repCount);
                setTimeout(()=>{
                    stopDetection();
                    setShowSetComplete(true);
                    speechCoach.onSetComplete();
                }, 600);
            }
        }
        prevRepCountRef.current = repCount;
    }, [
        repCount,
        targetReps,
        formQuality,
        speechCoach,
        stopDetection
    ]);
    // Feed coach tips to speech coach
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (coachTip) {
            speechCoach.onCoachTip(coachTip);
        }
    }, [
        coachTip,
        speechCoach
    ]);
    // Start with countdown
    const handleStart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        // Warm up speech synthesis with a silent call (Chrome fix)
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        setShowCountdown(true);
    }, []);
    // Called when countdown finishes
    const handleCountdownComplete = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        setShowCountdown(false);
        speechCoach.announceExercise(currentExercise.name);
        startDetection();
    }, [
        startDetection,
        speechCoach,
        currentExercise.name
    ]);
    // Reset current set (stops detection, resets rep count)
    const handleReset = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        stopDetection();
        setCompleteTriggeredRef.current = false;
        speechCoach.reset();
        // Brief pause then restart with countdown
        setTimeout(()=>{
            setShowCountdown(true);
        }, 300);
    }, [
        stopDetection,
        speechCoach
    ]);
    // Handle "Next Set" from the modal
    const handleNextSet = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        setShowSetComplete(false);
        setCurrentSet((prev)=>prev + 1);
        setCompleteTriggeredRef.current = false;
        // Start countdown for next set
        setTimeout(()=>{
            setShowCountdown(true);
        }, 300);
    }, []);
    // Handle "End Workout" (from modal or manual stop)
    const handleEndWorkout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        setShowSetComplete(false);
        stopDetection();
        const totalReps = totalRepsThisWorkout > 0 ? totalRepsThisWorkout : repCount;
        if (totalReps > 0) {
            const duration = workoutStartTime ? Math.round((Date.now() - workoutStartTime) / 1000) : 0;
            const ws = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$aiCoach$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["generateWorkoutSummary"])(totalReps, formQuality, timeUnderTension, duration, currentExercise.name);
            setSummary(ws);
            const perfectReps = formQuality >= 90 ? Math.round(totalReps * 0.3) : 0;
            const result = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$gamification$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["recordWorkout"])(totalReps, formQuality, perfectReps);
            setXpGained(result.xpGained);
            setNewBadges(result.newBadges);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$progressStore$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["saveWorkout"])({
                exerciseId,
                exerciseName: currentExercise.name,
                reps: totalReps,
                formQuality,
                timeUnderTension,
                duration,
                xpGained: result.xpGained
            });
            setShowSummary(true);
            speechCoach.speakSummary(ws.coachNotes);
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$aiCoach$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resetCoach"])();
        speechCoach.reset();
        setCurrentSet(1);
        setTotalRepsThisWorkout(0);
        setCompleteTriggeredRef.current = false;
    }, [
        stopDetection,
        totalRepsThisWorkout,
        repCount,
        formQuality,
        timeUnderTension,
        currentExercise,
        exerciseId,
        workoutStartTime,
        speechCoach
    ]);
    // Manual stop
    const handleManualStop = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        if (repCount > 0) {
            setTotalRepsThisWorkout((prev)=>prev + repCount);
        }
        handleEndWorkout();
    }, [
        repCount,
        handleEndWorkout
    ]);
    const labelColors = {
        'Body-weight': '#22c55e',
        'Dumbbell': '#38bdf8',
        'Barbell': '#f59e0b',
        'Machine': '#a855f7',
        'Cardio': '#ef4444',
        'Core': '#f97316',
        'Stretch': '#14b8a6'
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "h-screen flex flex-col overflow-hidden",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-none bg-[#0a0a0a] border-b border-white/5 z-20 relative",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between px-4 py-2.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>!isDetecting && setSelectorOpen(!selectorOpen),
                                disabled: isDetecting,
                                className: `
                            flex items-center gap-3 cursor-pointer transition-all
                            ${isDetecting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}
                        `,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[10px] font-black tracking-wider bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 rounded-md px-2 py-1",
                                        style: {
                                            fontFamily: 'Orbitron, monospace'
                                        },
                                        children: currentExercise.icon
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 214,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-sm font-semibold text-white",
                                        children: currentExercise.name
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 220,
                                        columnNumber: 25
                                    }, this),
                                    !isDetecting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        width: "12",
                                        height: "12",
                                        viewBox: "0 0 24 24",
                                        fill: "none",
                                        stroke: "currentColor",
                                        strokeWidth: "2",
                                        strokeLinecap: "round",
                                        className: `text-white/20 transition-transform ${selectorOpen ? 'rotate-180' : ''}`,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                                            points: "6,9 12,15 18,9"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(app)/workout/page.tsx",
                                            lineNumber: 224,
                                            columnNumber: 33
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 222,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                lineNumber: 206,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setVoiceEnabled(!voiceEnabled),
                                        className: `
                                p-2 rounded-lg transition-all cursor-pointer
                                ${voiceEnabled ? 'bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20' : 'bg-white/5 text-white/20 border border-white/5'}
                            `,
                                        title: voiceEnabled ? 'Voice coaching ON' : 'Voice coaching OFF',
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            width: "14",
                                            height: "14",
                                            viewBox: "0 0 24 24",
                                            fill: "none",
                                            stroke: "currentColor",
                                            strokeWidth: "2",
                                            strokeLinecap: "round",
                                            children: voiceEnabled ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("polygon", {
                                                        points: "11,5 6,9 2,9 2,15 6,15 11,19"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                        lineNumber: 245,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                        d: "M15.54 8.46a5 5 0 0 1 0 7.07"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                        lineNumber: 246,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                        d: "M19.07 4.93a10 10 0 0 1 0 14.14"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                        lineNumber: 247,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("polygon", {
                                                        points: "11,5 6,9 2,9 2,15 6,15 11,19"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                        lineNumber: 251,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                                        x1: "23",
                                                        y1: "9",
                                                        x2: "17",
                                                        y2: "15"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                        lineNumber: 252,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                                        x1: "17",
                                                        y1: "9",
                                                        x2: "23",
                                                        y2: "15"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                        lineNumber: 253,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true)
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(app)/workout/page.tsx",
                                            lineNumber: 242,
                                            columnNumber: 29
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 232,
                                        columnNumber: 25
                                    }, this),
                                    isDetecting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: handleReset,
                                        className: "p-2 rounded-lg transition-all cursor-pointer bg-white/5 text-white/30 border border-white/5 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/20",
                                        title: "Reset current set",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            width: "14",
                                            height: "14",
                                            viewBox: "0 0 24 24",
                                            fill: "none",
                                            stroke: "currentColor",
                                            strokeWidth: "2",
                                            strokeLinecap: "round",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("polyline", {
                                                    points: "1,4 1,10 7,10"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                    lineNumber: 267,
                                                    columnNumber: 37
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                    d: "M3.51 15a9 9 0 1 0 2.13-9.36L1 10"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                    lineNumber: 268,
                                                    columnNumber: 37
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(app)/workout/page.tsx",
                                            lineNumber: 266,
                                            columnNumber: 33
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 261,
                                        columnNumber: 29
                                    }, this),
                                    !isDetecting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-1 bg-white/5 rounded-lg border border-white/5 px-2 py-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[8px] text-white/25 tracking-wider uppercase mr-1",
                                                children: "Target"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                lineNumber: 276,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setTargetReps(Math.max(1, targetReps - 1)),
                                                className: "text-white/30 hover:text-white/60 w-5 h-5 flex items-center justify-center cursor-pointer",
                                                children: "-"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                lineNumber: 277,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[11px] font-bold text-[#22c55e] w-6 text-center",
                                                style: {
                                                    fontFamily: 'Orbitron, monospace'
                                                },
                                                children: targetReps
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                lineNumber: 279,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setTargetReps(targetReps + 1),
                                                className: "text-white/30 hover:text-white/60 w-5 h-5 flex items-center justify-center cursor-pointer",
                                                children: "+"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                lineNumber: 280,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[8px] text-white/15 mx-1",
                                                children: "×"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                lineNumber: 282,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setTargetSets(Math.max(1, targetSets - 1)),
                                                className: "text-white/30 hover:text-white/60 w-5 h-5 flex items-center justify-center cursor-pointer",
                                                children: "-"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                lineNumber: 283,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[11px] font-bold text-[#38bdf8] w-4 text-center",
                                                style: {
                                                    fontFamily: 'Orbitron, monospace'
                                                },
                                                children: targetSets
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                lineNumber: 285,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setTargetSets(targetSets + 1),
                                                className: "text-white/30 hover:text-white/60 w-5 h-5 flex items-center justify-center cursor-pointer",
                                                children: "+"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                lineNumber: 286,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[8px] text-white/25 tracking-wider uppercase ml-1",
                                                children: "sets"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                lineNumber: 288,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 275,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: isDetecting ? handleManualStop : handleStart,
                                        className: `
                                px-5 py-2 rounded-lg font-bold text-xs tracking-wider uppercase transition-all cursor-pointer
                                ${isDetecting ? 'bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25' : 'bg-[#22c55e] text-black hover:bg-[#16a34a] shadow-[0_0_25px_rgba(34,197,94,0.3)]'}
                            `,
                                        children: isDetecting ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "w-2 h-2 bg-red-400 rounded-full animate-pulse"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                    lineNumber: 304,
                                                    columnNumber: 37
                                                }, this),
                                                "Stop"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(app)/workout/page.tsx",
                                            lineNumber: 303,
                                            columnNumber: 33
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                                    width: "12",
                                                    height: "12",
                                                    viewBox: "0 0 24 24",
                                                    fill: "currentColor",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("polygon", {
                                                        points: "5,3 19,12 5,21"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                        lineNumber: 308,
                                                        columnNumber: 105
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                    lineNumber: 308,
                                                    columnNumber: 37
                                                }, this),
                                                "Start"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/app/(app)/workout/page.tsx",
                                            lineNumber: 307,
                                            columnNumber: 33
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 293,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                lineNumber: 230,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                        lineNumber: 204,
                        columnNumber: 17
                    }, this),
                    selectorOpen && !isDetecting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute top-full left-0 right-0 bg-[#0a0a0a]/98 backdrop-blur-xl border-b border-white/5 px-4 py-3 z-30 max-h-[50vh] overflow-y-auto",
                        children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exercises$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CATEGORY_LABELS"].map((label)=>{
                            const exercises = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$exercises$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getExercisesByLabel"])(label);
                            if (exercises.length === 0) return null;
                            const color = labelColors[label] ?? '#ffffff';
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-3 last:mb-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[8px] font-bold tracking-[0.25em] uppercase mb-1.5",
                                        style: {
                                            color: `${color}60`
                                        },
                                        children: label
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 325,
                                        columnNumber: 37
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-wrap gap-1.5",
                                        children: exercises.map((ex)=>{
                                            const isActive = exerciseId === ex.id;
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>{
                                                    setExercise(ex.id);
                                                    setSelectorOpen(false);
                                                    speechCoach.reset();
                                                    setCurrentSet(1);
                                                    setTotalRepsThisWorkout(0);
                                                    setCompleteTriggeredRef.current = false;
                                                },
                                                className: `
                                                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer
                                                        ${isActive ? 'border' : 'text-white/30 border border-white/5 hover:border-white/15 hover:text-white/50'}
                                                    `,
                                                style: isActive ? {
                                                    backgroundColor: `${color}18`,
                                                    color,
                                                    borderColor: `${color}40`
                                                } : {},
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-[8px] font-black tracking-wider opacity-50",
                                                        style: {
                                                            fontFamily: 'Orbitron, monospace'
                                                        },
                                                        children: ex.icon
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                        lineNumber: 350,
                                                        columnNumber: 53
                                                    }, this),
                                                    ex.name
                                                ]
                                            }, ex.id, true, {
                                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                lineNumber: 332,
                                                columnNumber: 49
                                            }, this);
                                        })
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 328,
                                        columnNumber: 37
                                    }, this)
                                ]
                            }, label, true, {
                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                lineNumber: 324,
                                columnNumber: 33
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                        lineNumber: 318,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(app)/workout/page.tsx",
                lineNumber: 203,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 relative overflow-hidden bg-black",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CameraFeed$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        videoRef: videoRef,
                        canvasRef: canvasRef,
                        landmarks: landmarks,
                        currentAngle: currentAngle,
                        exercise: exerciseId,
                        isDetecting: isDetecting,
                        isLoading: isLoading,
                        error: error
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                        lineNumber: 367,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$RepCounter$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        count: repCount,
                        isDetecting: isDetecting,
                        targetReps: targetReps
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                        lineNumber: 377,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$SetTracker$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        currentSet: currentSet,
                        totalSets: targetSets,
                        targetReps: targetReps,
                        currentReps: repCount,
                        isDetecting: isDetecting
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                        lineNumber: 380,
                        columnNumber: 17
                    }, this),
                    isDetecting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute top-3 left-3 flex flex-col gap-1.5 z-10",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$FormFeedback$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                feedback: feedback,
                                isDetecting: isDetecting
                            }, void 0, false, {
                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                lineNumber: 391,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CoachMessage$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                tip: coachTip
                            }, void 0, false, {
                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                lineNumber: 392,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                        lineNumber: 390,
                        columnNumber: 21
                    }, this),
                    isDetecting && formQuality < 40 && repCount > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute top-14 left-1/2 -translate-x-1/2 z-20 animate-pulse",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-lg px-4 py-2 flex items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    width: "14",
                                    height: "14",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "#ef4444",
                                    strokeWidth: "2",
                                    strokeLinecap: "round",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            d: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(app)/workout/page.tsx",
                                            lineNumber: 401,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                            x1: "12",
                                            y1: "9",
                                            x2: "12",
                                            y2: "13"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(app)/workout/page.tsx",
                                            lineNumber: 402,
                                            columnNumber: 33
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                            x1: "12",
                                            y1: "17",
                                            x2: "12.01",
                                            y2: "17"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(app)/workout/page.tsx",
                                            lineNumber: 402,
                                            columnNumber: 72
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(app)/workout/page.tsx",
                                    lineNumber: 400,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xs font-bold text-red-400",
                                    children: "Check your form — reps may not count"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(app)/workout/page.tsx",
                                    lineNumber: 404,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(app)/workout/page.tsx",
                            lineNumber: 399,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                        lineNumber: 398,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute right-3 z-10",
                        style: {
                            top: isDetecting ? '80px' : '12px'
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ExerciseGuide$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            exerciseId: exerciseId,
                            isDetecting: isDetecting,
                            showModal: showVideoModal && !isDetecting && !showCountdown,
                            onModalDismiss: ()=>setShowVideoModal(false)
                        }, void 0, false, {
                            fileName: "[project]/src/app/(app)/workout/page.tsx",
                            lineNumber: 411,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                        lineNumber: 410,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute bottom-4 right-3 z-10",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$MuscleIndicator$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            exerciseId: exerciseId,
                            isDetecting: isDetecting
                        }, void 0, false, {
                            fileName: "[project]/src/app/(app)/workout/page.tsx",
                            lineNumber: 421,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                        lineNumber: 420,
                        columnNumber: 17
                    }, this),
                    currentExercise.repMode === 'hold' && isDetecting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm rounded-full px-6 py-2.5 border border-white/10",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "font-bold text-xl flex items-center gap-2",
                            style: {
                                fontFamily: 'Orbitron, monospace'
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: `w-2.5 h-2.5 rounded-full ${isHolding ? 'bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-400'}`
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(app)/workout/page.tsx",
                                    lineNumber: 428,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: isHolding ? 'text-[#22c55e]' : 'text-red-400',
                                    children: [
                                        holdTime.toFixed(1),
                                        "s"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/app/(app)/workout/page.tsx",
                                    lineNumber: 429,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(app)/workout/page.tsx",
                            lineNumber: 427,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                        lineNumber: 426,
                        columnNumber: 21
                    }, this),
                    formCorrections.length > 0 && isDetecting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute bottom-4 left-4 space-y-1.5 max-w-sm",
                        children: formCorrections.map((fc)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-amber-500/20 rounded-lg px-3 py-1.5 text-xs text-amber-400/80",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        width: "12",
                                        height: "12",
                                        viewBox: "0 0 24 24",
                                        fill: "none",
                                        stroke: "currentColor",
                                        strokeWidth: "1.5",
                                        className: "flex-shrink-0",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                d: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                lineNumber: 440,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                                x1: "12",
                                                y1: "9",
                                                x2: "12",
                                                y2: "13"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                lineNumber: 441,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                                x1: "12",
                                                y1: "17",
                                                x2: "12.01",
                                                y2: "17"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                                lineNumber: 441,
                                                columnNumber: 76
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 439,
                                        columnNumber: 33
                                    }, this),
                                    fc.message
                                ]
                            }, fc.ruleId, true, {
                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                lineNumber: 438,
                                columnNumber: 29
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                        lineNumber: 436,
                        columnNumber: 21
                    }, this),
                    isDetecting && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-lg border border-white/5 px-3 py-2 space-y-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2 text-[10px]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-white/25 uppercase tracking-wider",
                                        children: "Form"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 453,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: `font-bold ${formQuality >= 80 ? 'text-[#22c55e]' : formQuality >= 60 ? 'text-amber-400' : 'text-red-400'}`,
                                        style: {
                                            fontFamily: 'Orbitron, monospace'
                                        },
                                        children: [
                                            formQuality,
                                            "%"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 454,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                lineNumber: 452,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2 text-[10px]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-white/25 uppercase tracking-wider",
                                        children: "TUT"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 460,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-white/60 font-bold",
                                        style: {
                                            fontFamily: 'Orbitron, monospace'
                                        },
                                        children: [
                                            timeUnderTension,
                                            "s"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 461,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                lineNumber: 459,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                        lineNumber: 451,
                        columnNumber: 21
                    }, this),
                    !isDetecting && !showSetComplete && !showSummary && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute top-3 left-3 bg-black/50 backdrop-blur-sm rounded-lg border border-white/5 px-3 py-2 z-10",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2 text-[10px]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-white/25 uppercase tracking-wider",
                                        children: "Set"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 472,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[#38bdf8] font-bold",
                                        style: {
                                            fontFamily: 'Orbitron, monospace'
                                        },
                                        children: [
                                            currentSet,
                                            " / ",
                                            targetSets
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 473,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                lineNumber: 471,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2 text-[10px] mt-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-white/25 uppercase tracking-wider",
                                        children: "Target"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 478,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[#22c55e] font-bold",
                                        style: {
                                            fontFamily: 'Orbitron, monospace'
                                        },
                                        children: [
                                            targetReps,
                                            " reps"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                                        lineNumber: 479,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(app)/workout/page.tsx",
                                lineNumber: 477,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(app)/workout/page.tsx",
                        lineNumber: 470,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(app)/workout/page.tsx",
                lineNumber: 366,
                columnNumber: 13
            }, this),
            showCountdown && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$CountdownOverlay$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                onComplete: handleCountdownComplete,
                voiceEnabled: voiceEnabled
            }, void 0, false, {
                fileName: "[project]/src/app/(app)/workout/page.tsx",
                lineNumber: 489,
                columnNumber: 17
            }, this),
            showSetComplete && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$SetCompleteModal$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                currentSet: currentSet,
                totalSets: targetSets,
                repsCompleted: repCount,
                targetReps: targetReps,
                formQuality: setFormQuality,
                onNextSet: handleNextSet,
                onEndWorkout: handleEndWorkout
            }, void 0, false, {
                fileName: "[project]/src/app/(app)/workout/page.tsx",
                lineNumber: 497,
                columnNumber: 17
            }, this),
            showSummary && summary && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$WorkoutSummary$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                summary: summary,
                xpGained: xpGained,
                newBadges: newBadges,
                onClose: ()=>setShowSummary(false)
            }, void 0, false, {
                fileName: "[project]/src/app/(app)/workout/page.tsx",
                lineNumber: 510,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(app)/workout/page.tsx",
        lineNumber: 201,
        columnNumber: 9
    }, this);
}
}),
];

//# sourceMappingURL=src_e94cf610._.js.map