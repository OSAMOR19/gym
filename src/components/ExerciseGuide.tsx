/**
 * ExerciseGuide — GIF-powered exercise illustration.
 *
 * Behaviour:
 *  1. When `showModal` is true  → renders a full-screen centred preview modal
 *     so the user can see exactly how the exercise is performed before starting.
 *  2. After dismissal           → collapses to a small looping GIF in the
 *     top-right corner (same position the old stick figure occupied).
 *  3. No GIF for this exercise  → shows a tasteful placeholder icon.
 */

'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ExerciseId, EXERCISES } from '../lib/exercises';

// ─── Video / GIF map ────────────────────────────────────────────────────────
// Maps every ExerciseId to its GIF path under /public/videosillustrations/

export const EXERCISE_VIDEOS: Partial<Record<ExerciseId, string>> = {
    // ── Existing exercises (body-weight / dumbbell) ─────────────────────────
    bicep_curl:          '/videosillustrations/dumb-bell/dumb-bell-curl.gif',
    hammer_curl:         '/videosillustrations/dumb-bell/hammer-curl.gif',
    pushup:              '/videosillustrations/body-weight/push-up.gif',
    shoulder_press:      '/videosillustrations/dumb-bell/shoulder-press.gif',
    lateral_raise:       '/videosillustrations/dumb-bell/lateral-raise.gif',
    tricep_extension:    '/videosillustrations/dumb-bell/Overhead Tricep Extension.gif',
    squat:               '/videosillustrations/body-weight/squat.gif',
    lunge:               '/videosillustrations/body-weight/lunges.gif',
    jump_squat:          '/videosillustrations/body-weight/jump-squat.gif',
    calf_raise:          '/videosillustrations/body-weight/crunches.gif', // placeholder
    plank:               '/videosillustrations/body-weight/plank.gif',
    situp:               '/videosillustrations/body-weight/sit-up.gif',
    mountain_climber:    '/videosillustrations/body-weight/mountain-climbers.gif',
    jumping_jacks:       '/videosillustrations/body-weight/jumping-jacks.gif',

    // ── Barbell exercises ────────────────────────────────────────────────────
    barbell_row:          '/videosillustrations/barbell-exercise/Barbell Row.gif',
    deadlift:             '/videosillustrations/barbell-exercise/Deadlift.gif',
    bench_press:          '/videosillustrations/barbell-exercise/Bench Press.gif',
    overhead_press:       '/videosillustrations/barbell-exercise/Overhead Press.gif',
    romanian_deadlift:    '/videosillustrations/barbell-exercise/Romanian Deadlift.gif',
    incline_bench_press:  '/videosillustrations/barbell-exercise/Incline Bench Press.gif',
    front_squat:          '/videosillustrations/barbell-exercise/Front Squat.gif',
    hip_thrust_barbell:   '/videosillustrations/barbell-exercise/Hip Thrust (Barbell).gif',
    barbell_squat:        '/videosillustrations/barbell-exercise/Barbell Squat.gif',

    // ── Dumbbell exercises ───────────────────────────────────────────────────
    dumbbell_row:         '/videosillustrations/dumb-bell/Dumbbell Row (One-arm row).gif',
    goblet_squat:         '/videosillustrations/dumb-bell/Goblet Squat.gif',
    dumbbell_deadlift:    '/videosillustrations/dumb-bell/Dumbbell Deadlift.gif',
    overhead_tricep_ext:  '/videosillustrations/dumb-bell/Overhead Tricep Extension.gif',
    chest_press:          '/videosillustrations/dumb-bell/chest-press.gif',
    dumbbell_fly:         '/videosillustrations/dumb-bell/dumbell-fly.gif',
    front_raise:          '/videosillustrations/dumb-bell/front-raise.gif',
    tricep_kickback:      '/videosillustrations/dumb-bell/tricep-kickback.gif',
    incline_chest_press:  '/videosillustrations/dumb-bell/incline-chest-press.gif',

    // ── Body-weight additions ────────────────────────────────────────────────
    walking_lunges:   '/videosillustrations/body-weight/walking-lunges.gif',
    knee_pushup:      '/videosillustrations/body-weight/knee-push-up.gif',
    side_plank:       '/videosillustrations/body-weight/side-plank.gif',
    bicycle_crunch:   '/videosillustrations/body-weight/bicycle-crush.gif',
    leg_raises:       '/videosillustrations/body-weight/leg-raises.gif',
    glute_bridge:     '/videosillustrations/body-weight/glute-bridge.gif',
    hip_thrust:       '/videosillustrations/body-weight/hip-thrust.gif',
    high_knees:       '/videosillustrations/body-weight/high-knees.gif',
    chin_up:          '/videosillustrations/body-weight/chin-up.gif',
    pull_up:          '/videosillustrations/body-weight/pull-up.gif',
    burpees:          '/videosillustrations/body-weight/Burpees.gif',

    // ── Cardio / Functional ──────────────────────────────────────────────────
    battle_ropes:     '/videosillustrations/cardio-function/Battle Ropes.gif',
    box_jumps:        '/videosillustrations/cardio-function/Box Jumps.gif',
    farmers_walk:     "/videosillustrations/cardio-function/Farmer's Walk.gif",
    jump_rope:        '/videosillustrations/cardio-function/Jump Rope.gif',
    kettlebell_swing: '/videosillustrations/cardio-function/Kettlebell Swings.gif',
    rowing_machine:   '/videosillustrations/cardio-function/Rowing Machine.gif',

    // ── Core / Abs ───────────────────────────────────────────────────────────
    ab_rollout:          '/videosillustrations/core-abs-focus/Ab Rollout.gif',
    flutter_kicks:       '/videosillustrations/core-abs-focus/Flutter Kicks.gif',
    hanging_leg_raises:  '/videosillustrations/core-abs-focus/Hanging Leg Raises.gif',
    plank_shoulder_taps: '/videosillustrations/core-abs-focus/Plank Shoulder Taps.gif',
    reverse_crunch:      '/videosillustrations/core-abs-focus/Reverse Crunch.gif',
    russian_twists:      '/videosillustrations/core-abs-focus/Russian Twists.gif',
    toe_touches:         '/videosillustrations/core-abs-focus/Toe Touches.gif',
    crunches:            '/videosillustrations/body-weight/crunches.gif',

    // ── Machine exercises ────────────────────────────────────────────────────
    cable_bicep_curl:    '/videosillustrations/machine-exercise/Cable Bicep Curl.gif',
    cable_lateral_raise: '/videosillustrations/machine-exercise/Cable Lateral Raise.gif',
    cable_tricep_pushdown: '/videosillustrations/machine-exercise/Cable Tricep Pushdown.gif',
    chest_press_machine: '/videosillustrations/machine-exercise/Chest Press Machine.gif',
    lat_pulldown:        '/videosillustrations/machine-exercise/Lat Pulldown.gif',
    leg_curl:            '/videosillustrations/machine-exercise/Leg Curl.gif',
    leg_press:           '/videosillustrations/machine-exercise/Leg Press.gif',
    pec_deck:            '/videosillustrations/machine-exercise/Pec Deck (Chest Fly Machine).gif',
    seated_row:          '/videosillustrations/machine-exercise/Seated Row Machine.gif',
    leg_extension:       '/videosillustrations/machine-exercise/leg-extension.gif',

    // ── Stretching / Mobility ────────────────────────────────────────────────
    cobra_stretch:      '/videosillustrations/stretching-mobility/Cobra Stretch.gif',
    hamstring_stretch:  '/videosillustrations/stretching-mobility/Hamstring Stretch.gif',
    hip_flexor_stretch: '/videosillustrations/stretching-mobility/Hip Flexor Stretch.gif',
    quad_stretch:       '/videosillustrations/stretching-mobility/Quad Stretch.gif',
    shoulder_stretch:   '/videosillustrations/stretching-mobility/Shoulder Stretch.gif',
};

// ─── Tips ────────────────────────────────────────────────────────────────────

const EXERCISE_TIPS: Partial<Record<ExerciseId, string>> = {
    bicep_curl:          'Pin elbows to your sides throughout',
    hammer_curl:         'Neutral grip, keep upper arm still',
    pushup:              'Straight back, tuck elbows 45°',
    shoulder_press:      'Core tight, press directly overhead',
    lateral_raise:       'Lead with elbows, stop at shoulder height',
    tricep_extension:    'Keep upper arm vertical & still',
    squat:               'Knees over toes, chest up',
    lunge:               'Front knee stays behind toes',
    jump_squat:          'Explode up, land softly on heels',
    calf_raise:          'Rise onto toes, hold the peak',
    plank:               'Head-to-heel straight line, breathe steadily',
    situp:               'Curl with your core, not your neck',
    mountain_climber:    'Hips level, drive knees powerfully',
    jumping_jacks:       'Arms all the way up, land softly',
    deadlift:            'Hip hinge, back flat, push the floor away',
    bench_press:         'Retract shoulder blades, controlled descent',
    barbell_row:         'Hinge 45°, pull toward lower chest',
    overhead_press:      'Brace core hard, lock out at top',
    romanian_deadlift:   'Soft knees, feel the hamstring stretch',
    incline_bench_press: 'Set incline 30-45°, press to upper chest',
    front_squat:         'Elbows high, upright torso throughout',
    hip_thrust_barbell:  'Drive hips fully up, squeeze glutes',
    barbell_squat:       'Bar on traps, sit back and down',
    goblet_squat:        'Hold DB at chest, knees out',
    dumbbell_deadlift:   'Flat back, keep dumbbells close to shins',
    chest_press:         'DBs at chest level, full ROM',
    dumbbell_fly:        'Slight bend in elbows, stretch the chest',
    front_raise:         'Arms parallel to floor, controlled lowering',
    tricep_kickback:     'Upper arm parallel to floor, fully extend',
    walking_lunges:      'Long strides, upright posture',
    knee_pushup:         'Great for building to full push-ups',
    side_plank:          'Stack feet, keep hips high',
    bicycle_crunch:      'Slow & deliberate, full torso rotation',
    leg_raises:          'Lower back flat on floor, legs straight',
    glute_bridge:        'Squeeze glutes hard at the top',
    hip_thrust:          'Upper back on bench, drive hips up',
    high_knees:          'Drive knees to waist height, stay light on feet',
    chin_up:             'Supinated grip, drive elbows down',
    pull_up:             'Dead hang start, chin over bar',
    burpees:             'Chest to floor, jump and clap overhead',
    battle_ropes:        'Alternate arm waves, stay low',
    box_jumps:           'Full hip extension at top, land softly',
    farmers_walk:        'Tall posture, shoulders packed',
    jump_rope:           'Stay on balls of feet, small jumps',
    kettlebell_swing:    'Hip hinge power — not a squat!',
    rowing_machine:      'Legs → lean → arms on drive; reverse on return',
    ab_rollout:          'Keep hips in — don\'t let lower back arch',
    flutter_kicks:       'Lower back pressed flat, small fast kicks',
    hanging_leg_raises:  'Control the descent, no swinging',
    plank_shoulder_taps: 'Minimal hip rotation, brace the core',
    reverse_crunch:      'Curl hips toward ribs, not just legs up',
    russian_twists:      'Lean back slightly, rotate from hips',
    toe_touches:         'Reach fingertips to toes each rep',
    crunches:            'Chin off chest, exhale on the way up',
    cable_bicep_curl:    'Constant tension — don\'t let the stack drop',
    cable_lateral_raise: 'Smooth arc, stop at shoulder height',
    cable_tricep_pushdown: 'Lock upper arms, fully extend',
    chest_press_machine: 'Adjust seat so handles are at chest',
    lat_pulldown:        'Pull bar to upper chest, lean back slightly',
    leg_curl:            'Control the return, hamstrings fully stretch',
    leg_press:           'Feet hip-width, don\'t lock out knees',
    pec_deck:            'Slight bend in elbows, feel the chest stretch',
    seated_row:          'Pull elbows back, squeeze shoulder blades',
    leg_extension:       'Full extension, pause at top',
    cobra_stretch:       'Press up gently, keep hips on floor',
    hamstring_stretch:   'Hinge from hips, keep back flat',
    hip_flexor_stretch:  'Lunge low, push hip forward',
    quad_stretch:        'Stand tall, pull heel to glute',
    shoulder_stretch:    'Pull arm across body, keep shoulder down',
};

// ─── Placeholder icon ─────────────────────────────────────────────────────────

function PlaceholderIcon() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" opacity="0.5">
                <circle cx="12" cy="5" r="2" />
                <line x1="12" y1="7" x2="12" y2="14" />
                <line x1="12" y1="10" x2="8" y2="13" />
                <line x1="12" y1="10" x2="16" y2="13" />
                <line x1="12" y1="14" x2="9" y2="20" />
                <line x1="12" y1="14" x2="15" y2="20" />
            </svg>
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExerciseGuideProps {
    exerciseId: ExerciseId;
    isDetecting: boolean;
    showModal?: boolean;
    onModalDismiss?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExerciseGuide({ exerciseId, isDetecting, showModal = false, onModalDismiss }: ExerciseGuideProps) {
    const gifPath = EXERCISE_VIDEOS[exerciseId] ?? null;
    const tip     = EXERCISE_TIPS[exerciseId] ?? 'Focus on controlled movement';
    const name    = EXERCISES[exerciseId]?.name ?? exerciseId;

    // Preload next – when gif path changes, reset "loaded" state
    const [imgLoaded, setImgLoaded] = useState(false);
    useEffect(() => { setImgLoaded(false); }, [gifPath]);

    // ── Full-screen preview modal ─────────────────────────────────────────────
    if (showModal) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
                <div className="relative max-w-sm w-full mx-4 flex flex-col items-center gap-6">

                    {/* Title */}
                    <div className="text-center space-y-1">
                        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#22c55e]/60">
                            Exercise Preview
                        </p>
                        <h2 className="text-2xl font-black text-white tracking-tight">{name}</h2>
                    </div>

                    {/* GIF frame */}
                    <div className="relative w-72 h-72 rounded-2xl overflow-hidden border border-white/10 bg-[#111] shadow-2xl">
                        {/* Subtle green glow behind the gif */}
                        <div className="absolute inset-0 bg-gradient-to-b from-[#22c55e]/5 to-transparent pointer-events-none z-10" />

                        {gifPath ? (
                            <Image
                                src={gifPath}
                                alt={name}
                                fill
                                unoptimized          // allow GIF animation
                                className={`object-contain transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                                onLoad={() => setImgLoaded(true)}
                                priority
                            />
                        ) : (
                            <PlaceholderIcon />
                        )}

                        {/* Loading shimmer */}
                        {!imgLoaded && gifPath && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
                        )}
                    </div>

                    {/* Tip */}
                    <div className="flex items-start gap-2.5 bg-white/5 border border-white/8 rounded-xl px-4 py-3 max-w-xs">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <p className="text-sm text-white/60 leading-snug">{tip}</p>
                    </div>

                    {/* Dismiss button */}
                    <button
                        onClick={onModalDismiss}
                        className="w-full max-w-xs bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-sm tracking-wider uppercase py-3.5 rounded-xl transition-all shadow-[0_0_30px_rgba(34,197,94,0.35)] hover:shadow-[0_0_40px_rgba(34,197,94,0.5)] cursor-pointer"
                    >
                        Got it — Let's Go!
                    </button>
                </div>
            </div>
        );
    }

    // ── Compact looping GIF (top-right corner) ────────────────────────────────
    return (
        <div className="bg-black/70 backdrop-blur-sm rounded-2xl border border-white/10 p-2 w-36 animate-in fade-in duration-300 shadow-xl">
            {/* Exercise name label */}
            <p className="text-[8px] font-bold tracking-widest uppercase text-center mb-1.5 truncate" style={{ color: '#22c55e90' }}>
                {name}
            </p>
            <div className="relative w-32 h-32 rounded-xl overflow-hidden">
                {gifPath ? (
                    <Image
                        src={gifPath}
                        alt={name}
                        fill
                        unoptimized
                        className={`object-contain transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                        onLoad={() => setImgLoaded(true)}
                    />
                ) : (
                    <PlaceholderIcon />
                )}
                {!imgLoaded && gifPath && (
                    <div className="absolute inset-0 bg-white/5 animate-pulse rounded-xl" />
                )}
            </div>
            <p className="text-[7px] text-white/35 text-center mt-1.5 leading-tight font-medium px-0.5 line-clamp-2">
                {tip}
            </p>
        </div>
    );
}
