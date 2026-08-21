/**
 * Camera Guide — per-exercise camera positioning.
 *
 * The tracker computes 2D joint angles from the camera's point of view, so
 * orientation decides whether reps are visible at all: a push-up filmed
 * head-on barely changes any on-screen angle, while side-on the elbow sweep
 * is unmistakable. Movements in the sagittal plane (squats, hinges, push-ups,
 * crunches) need a SIDE view; frontal-plane movements (lateral raises,
 * jumping jacks, presses overhead) read best FACING the camera; standing
 * curls are clearest at a slight ANGLE so the forearm doesn't foreshorten.
 *
 * Used in three places: the pre-workout preview (read it), the voice coach
 * (hear it), and the rep engine's live facing check (get corrected when
 * you're standing wrong anyway).
 */

import { ExerciseId } from './exercises';

export type CameraView = 'front' | 'side' | 'angle';

export interface CameraGuide {
    view: CameraView;
    /** Short instruction shown in the UI */
    tip: string;
    /** One clause the voice coach appends when announcing the exercise */
    speech: string;
    /** Chip label for cards/badges */
    label: string;
}

/**
 * Frontal-plane (or camera-facing) movements. Everything NOT listed here or
 * in ANGLE_VIEW defaults to a side view — the sagittal majority.
 */
const FRONT_VIEW: ExerciseId[] = [
    'lateral_raise', 'cable_lateral_raise', 'jumping_jacks', 'battle_ropes',
    'pec_deck', 'dumbbell_fly', 'shoulder_press', 'overhead_press',
    'russian_twists', 'shoulder_stretch', 'pull_up', 'chin_up', 'side_plank',
];

/** Standing elbow-flexion — best at ~45° so the forearm stays visible. */
const ANGLE_VIEW: ExerciseId[] = ['bicep_curl', 'hammer_curl', 'cable_bicep_curl'];

/** Exercise-specific wording where the generic tip isn't quite right. */
const TIP_OVERRIDES: Partial<Record<ExerciseId, string>> = {
    plank: 'Place the camera side-on so your whole body line is visible.',
    side_plank: 'Lie with your chest facing the camera so your body line is visible.',
    bench_press: 'Camera side-on to the bench, arms in profile.',
    incline_bench_press: 'Camera side-on to the bench, arms in profile.',
    chest_press: 'Camera side-on to the bench, arms in profile.',
    incline_chest_press: 'Camera side-on to the bench, arms in profile.',
    chest_press_machine: 'Camera side-on to the machine, arms in profile.',
    lat_pulldown: 'Camera side-on to the machine so your arms are in profile.',
    seated_row: 'Camera side-on to the machine so the rowing motion is visible.',
    rowing_machine: 'Camera side-on to the rower — the full stroke should be visible.',
    farmers_walk: 'Walk across the frame, side-on to the camera.',
    pull_up: 'Face the camera on the bar so both arms are visible.',
    chin_up: 'Face the camera on the bar so both arms are visible.',
};

const VIEW_TEXT: Record<CameraView, { tip: string; speech: string; label: string }> = {
    side: {
        tip: 'Turn side-on to the camera, with your whole body in frame.',
        speech: 'Set up side-on to the camera.',
        label: 'Side-on',
    },
    front: {
        tip: 'Face the camera straight on, with your whole body in frame.',
        speech: 'Face the camera.',
        label: 'Face camera',
    },
    angle: {
        tip: 'Stand at a slight angle (about 45°) so your working arm stays clearly visible.',
        speech: 'Stand at a slight angle to the camera.',
        label: '45° angle',
    },
};

export function getCameraGuide(id: ExerciseId): CameraGuide {
    const view: CameraView = ANGLE_VIEW.includes(id) ? 'angle'
        : FRONT_VIEW.includes(id) ? 'front'
        : 'side';
    const base = VIEW_TEXT[view];
    return {
        view,
        tip: TIP_OVERRIDES[id] ?? base.tip,
        speech: base.speech,
        label: base.label,
    };
}
