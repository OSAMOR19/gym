/**
 * MuscleIndicator — Compact bottom-right overlay showing targeted muscles.
 * Displays muscle group names with color-coded dots.
 */

'use client';

import { ExerciseId } from '../lib/exercises';

interface MuscleIndicatorProps {
    exerciseId: ExerciseId;
    isDetecting: boolean;
}

interface MuscleGroup {
    name: string;
    region: 'primary' | 'secondary';
}

type MuscleData = { muscles: MuscleGroup[]; category: 'upper' | 'lower' | 'core' };

// Mapping of exercises to their targeted muscle groups
const EXERCISE_MUSCLES: Partial<Record<ExerciseId, MuscleData>> = {
    // ─── Original ────────────────────────────────────────────────────────────
    bicep_curl:       { category: 'upper', muscles: [{ name: 'Biceps', region: 'primary' }, { name: 'Forearms', region: 'secondary' }, { name: 'Brachialis', region: 'secondary' }] },
    hammer_curl:      { category: 'upper', muscles: [{ name: 'Brachialis', region: 'primary' }, { name: 'Biceps', region: 'primary' }, { name: 'Forearms', region: 'secondary' }] },
    pushup:           { category: 'upper', muscles: [{ name: 'Chest', region: 'primary' }, { name: 'Triceps', region: 'primary' }, { name: 'Shoulders', region: 'secondary' }, { name: 'Core', region: 'secondary' }] },
    shoulder_press:   { category: 'upper', muscles: [{ name: 'Shoulders', region: 'primary' }, { name: 'Triceps', region: 'secondary' }, { name: 'Upper Chest', region: 'secondary' }] },
    lateral_raise:    { category: 'upper', muscles: [{ name: 'Side Delts', region: 'primary' }, { name: 'Traps', region: 'secondary' }] },
    tricep_extension: { category: 'upper', muscles: [{ name: 'Triceps', region: 'primary' }, { name: 'Shoulders', region: 'secondary' }] },
    squat:            { category: 'lower', muscles: [{ name: 'Quads', region: 'primary' }, { name: 'Glutes', region: 'primary' }, { name: 'Hamstrings', region: 'secondary' }, { name: 'Core', region: 'secondary' }] },
    lunge:            { category: 'lower', muscles: [{ name: 'Quads', region: 'primary' }, { name: 'Glutes', region: 'primary' }, { name: 'Hamstrings', region: 'secondary' }] },
    jump_squat:       { category: 'lower', muscles: [{ name: 'Quads', region: 'primary' }, { name: 'Glutes', region: 'primary' }, { name: 'Calves', region: 'secondary' }] },
    calf_raise:       { category: 'lower', muscles: [{ name: 'Calves', region: 'primary' }, { name: 'Soleus', region: 'secondary' }] },
    plank:            { category: 'core',  muscles: [{ name: 'Abs', region: 'primary' }, { name: 'Obliques', region: 'primary' }, { name: 'Lower Back', region: 'secondary' }, { name: 'Shoulders', region: 'secondary' }] },
    situp:            { category: 'core',  muscles: [{ name: 'Abs', region: 'primary' }, { name: 'Hip Flexors', region: 'secondary' }, { name: 'Obliques', region: 'secondary' }] },
    mountain_climber: { category: 'core',  muscles: [{ name: 'Abs', region: 'primary' }, { name: 'Hip Flexors', region: 'primary' }, { name: 'Shoulders', region: 'secondary' }, { name: 'Quads', region: 'secondary' }] },
    jumping_jacks:    { category: 'core',  muscles: [{ name: 'Shoulders', region: 'primary' }, { name: 'Calves', region: 'primary' }, { name: 'Quads', region: 'secondary' }, { name: 'Core', region: 'secondary' }] },

    // ─── Barbell ─────────────────────────────────────────────────────────────
    barbell_squat:      { category: 'lower', muscles: [{ name: 'Quads', region: 'primary' }, { name: 'Glutes', region: 'primary' }, { name: 'Hamstrings', region: 'secondary' }, { name: 'Core', region: 'secondary' }] },
    barbell_row:        { category: 'upper', muscles: [{ name: 'Lats', region: 'primary' }, { name: 'Rhomboids', region: 'primary' }, { name: 'Biceps', region: 'secondary' }] },
    deadlift:           { category: 'lower', muscles: [{ name: 'Hamstrings', region: 'primary' }, { name: 'Glutes', region: 'primary' }, { name: 'Lower Back', region: 'primary' }, { name: 'Traps', region: 'secondary' }] },
    bench_press:        { category: 'upper', muscles: [{ name: 'Chest', region: 'primary' }, { name: 'Triceps', region: 'primary' }, { name: 'Front Delts', region: 'secondary' }] },
    overhead_press:     { category: 'upper', muscles: [{ name: 'Shoulders', region: 'primary' }, { name: 'Triceps', region: 'secondary' }, { name: 'Upper Chest', region: 'secondary' }] },
    romanian_deadlift:  { category: 'lower', muscles: [{ name: 'Hamstrings', region: 'primary' }, { name: 'Glutes', region: 'primary' }, { name: 'Lower Back', region: 'secondary' }] },
    incline_bench_press:{ category: 'upper', muscles: [{ name: 'Upper Chest', region: 'primary' }, { name: 'Front Delts', region: 'secondary' }, { name: 'Triceps', region: 'secondary' }] },
    front_squat:        { category: 'lower', muscles: [{ name: 'Quads', region: 'primary' }, { name: 'Glutes', region: 'secondary' }, { name: 'Core', region: 'secondary' }] },
    hip_thrust_barbell: { category: 'lower', muscles: [{ name: 'Glutes', region: 'primary' }, { name: 'Hamstrings', region: 'secondary' }] },

    // ─── Dumbbell ────────────────────────────────────────────────────────────
    dumbbell_row:        { category: 'upper', muscles: [{ name: 'Lats', region: 'primary' }, { name: 'Rhomboids', region: 'primary' }, { name: 'Biceps', region: 'secondary' }] },
    goblet_squat:        { category: 'lower', muscles: [{ name: 'Quads', region: 'primary' }, { name: 'Glutes', region: 'primary' }, { name: 'Core', region: 'secondary' }] },
    dumbbell_deadlift:   { category: 'lower', muscles: [{ name: 'Hamstrings', region: 'primary' }, { name: 'Glutes', region: 'primary' }, { name: 'Back', region: 'secondary' }] },
    overhead_tricep_ext: { category: 'upper', muscles: [{ name: 'Triceps', region: 'primary' }, { name: 'Shoulders', region: 'secondary' }] },
    chest_press:         { category: 'upper', muscles: [{ name: 'Chest', region: 'primary' }, { name: 'Triceps', region: 'secondary' }, { name: 'Front Delts', region: 'secondary' }] },
    dumbbell_fly:        { category: 'upper', muscles: [{ name: 'Chest', region: 'primary' }, { name: 'Front Delts', region: 'secondary' }] },
    front_raise:         { category: 'upper', muscles: [{ name: 'Front Delts', region: 'primary' }, { name: 'Traps', region: 'secondary' }] },
    tricep_kickback:     { category: 'upper', muscles: [{ name: 'Triceps', region: 'primary' }] },
    incline_chest_press: { category: 'upper', muscles: [{ name: 'Upper Chest', region: 'primary' }, { name: 'Triceps', region: 'secondary' }] },

    // ─── Body-weight extras ───────────────────────────────────────────────────
    walking_lunges: { category: 'lower', muscles: [{ name: 'Quads', region: 'primary' }, { name: 'Glutes', region: 'primary' }, { name: 'Hamstrings', region: 'secondary' }] },
    knee_pushup:    { category: 'upper', muscles: [{ name: 'Chest', region: 'primary' }, { name: 'Triceps', region: 'primary' }, { name: 'Core', region: 'secondary' }] },
    side_plank:     { category: 'core',  muscles: [{ name: 'Obliques', region: 'primary' }, { name: 'Glutes', region: 'secondary' }, { name: 'Shoulders', region: 'secondary' }] },
    bicycle_crunch: { category: 'core',  muscles: [{ name: 'Obliques', region: 'primary' }, { name: 'Abs', region: 'primary' }, { name: 'Hip Flexors', region: 'secondary' }] },
    leg_raises:     { category: 'core',  muscles: [{ name: 'Lower Abs', region: 'primary' }, { name: 'Hip Flexors', region: 'secondary' }] },
    glute_bridge:   { category: 'lower', muscles: [{ name: 'Glutes', region: 'primary' }, { name: 'Hamstrings', region: 'secondary' }, { name: 'Core', region: 'secondary' }] },
    hip_thrust:     { category: 'lower', muscles: [{ name: 'Glutes', region: 'primary' }, { name: 'Hamstrings', region: 'secondary' }] },
    high_knees:     { category: 'core',  muscles: [{ name: 'Hip Flexors', region: 'primary' }, { name: 'Quads', region: 'secondary' }, { name: 'Core', region: 'secondary' }] },
    chin_up:        { category: 'upper', muscles: [{ name: 'Biceps', region: 'primary' }, { name: 'Lats', region: 'primary' }, { name: 'Core', region: 'secondary' }] },
    pull_up:        { category: 'upper', muscles: [{ name: 'Lats', region: 'primary' }, { name: 'Rhomboids', region: 'primary' }, { name: 'Biceps', region: 'secondary' }] },
    burpees:        { category: 'core',  muscles: [{ name: 'Full Body', region: 'primary' }, { name: 'Chest', region: 'secondary' }, { name: 'Quads', region: 'secondary' }] },
    crunches:       { category: 'core',  muscles: [{ name: 'Abs', region: 'primary' }, { name: 'Obliques', region: 'secondary' }] },

    // ─── Cardio ───────────────────────────────────────────────────────────────
    battle_ropes:    { category: 'upper', muscles: [{ name: 'Shoulders', region: 'primary' }, { name: 'Arms', region: 'secondary' }, { name: 'Core', region: 'secondary' }] },
    box_jumps:       { category: 'lower', muscles: [{ name: 'Quads', region: 'primary' }, { name: 'Glutes', region: 'primary' }, { name: 'Calves', region: 'secondary' }] },
    farmers_walk:    { category: 'lower', muscles: [{ name: 'Traps', region: 'primary' }, { name: 'Forearms', region: 'primary' }, { name: 'Core', region: 'secondary' }] },
    jump_rope:       { category: 'core',  muscles: [{ name: 'Calves', region: 'primary' }, { name: 'Shoulders', region: 'secondary' }, { name: 'Core', region: 'secondary' }] },
    kettlebell_swing:{ category: 'lower', muscles: [{ name: 'Glutes', region: 'primary' }, { name: 'Hamstrings', region: 'primary' }, { name: 'Lower Back', region: 'secondary' }] },
    rowing_machine:  { category: 'upper', muscles: [{ name: 'Lats', region: 'primary' }, { name: 'Legs', region: 'primary' }, { name: 'Core', region: 'secondary' }] },

    // ─── Core / Abs ───────────────────────────────────────────────────────────
    ab_rollout:          { category: 'core', muscles: [{ name: 'Abs', region: 'primary' }, { name: 'Lower Back', region: 'secondary' }, { name: 'Shoulders', region: 'secondary' }] },
    flutter_kicks:       { category: 'core', muscles: [{ name: 'Lower Abs', region: 'primary' }, { name: 'Hip Flexors', region: 'secondary' }] },
    hanging_leg_raises:  { category: 'core', muscles: [{ name: 'Lower Abs', region: 'primary' }, { name: 'Hip Flexors', region: 'primary' }, { name: 'Grip', region: 'secondary' }] },
    plank_shoulder_taps: { category: 'core', muscles: [{ name: 'Core', region: 'primary' }, { name: 'Shoulders', region: 'secondary' }, { name: 'Obliques', region: 'secondary' }] },
    reverse_crunch:      { category: 'core', muscles: [{ name: 'Lower Abs', region: 'primary' }, { name: 'Hip Flexors', region: 'secondary' }] },
    russian_twists:      { category: 'core', muscles: [{ name: 'Obliques', region: 'primary' }, { name: 'Abs', region: 'secondary' }] },
    toe_touches:         { category: 'core', muscles: [{ name: 'Abs', region: 'primary' }, { name: 'Hip Flexors', region: 'secondary' }] },

    // ─── Machine ─────────────────────────────────────────────────────────────
    cable_bicep_curl:      { category: 'upper', muscles: [{ name: 'Biceps', region: 'primary' }, { name: 'Forearms', region: 'secondary' }] },
    cable_lateral_raise:   { category: 'upper', muscles: [{ name: 'Side Delts', region: 'primary' }, { name: 'Traps', region: 'secondary' }] },
    cable_tricep_pushdown: { category: 'upper', muscles: [{ name: 'Triceps', region: 'primary' }] },
    chest_press_machine:   { category: 'upper', muscles: [{ name: 'Chest', region: 'primary' }, { name: 'Triceps', region: 'secondary' }] },
    lat_pulldown:          { category: 'upper', muscles: [{ name: 'Lats', region: 'primary' }, { name: 'Biceps', region: 'secondary' }, { name: 'Rear Delts', region: 'secondary' }] },
    leg_curl:              { category: 'lower', muscles: [{ name: 'Hamstrings', region: 'primary' }, { name: 'Calves', region: 'secondary' }] },
    leg_press:             { category: 'lower', muscles: [{ name: 'Quads', region: 'primary' }, { name: 'Glutes', region: 'secondary' }, { name: 'Hamstrings', region: 'secondary' }] },
    pec_deck:              { category: 'upper', muscles: [{ name: 'Chest', region: 'primary' }, { name: 'Front Delts', region: 'secondary' }] },
    seated_row:            { category: 'upper', muscles: [{ name: 'Lats', region: 'primary' }, { name: 'Rhomboids', region: 'primary' }, { name: 'Biceps', region: 'secondary' }] },
    leg_extension:         { category: 'lower', muscles: [{ name: 'Quads', region: 'primary' }] },

    // ─── Stretching ──────────────────────────────────────────────────────────
    cobra_stretch:      { category: 'core',  muscles: [{ name: 'Spine Extensors', region: 'primary' }, { name: 'Abs', region: 'secondary' }] },
    hamstring_stretch:  { category: 'lower', muscles: [{ name: 'Hamstrings', region: 'primary' }, { name: 'Calves', region: 'secondary' }] },
    hip_flexor_stretch: { category: 'lower', muscles: [{ name: 'Hip Flexors', region: 'primary' }, { name: 'Quads', region: 'secondary' }] },
    quad_stretch:       { category: 'lower', muscles: [{ name: 'Quads', region: 'primary' }] },
    shoulder_stretch:   { category: 'upper', muscles: [{ name: 'Rear Delts', region: 'primary' }, { name: 'Traps', region: 'secondary' }] },
};

const CATEGORY_COLORS = {
    upper: '#38bdf8',
    lower: '#22c55e',
    core: '#f59e0b',
};

export default function MuscleIndicator({ exerciseId }: MuscleIndicatorProps) {

    const data = EXERCISE_MUSCLES[exerciseId];
    if (!data) return null;

    const accentColor = CATEGORY_COLORS[data.category];

    return (
        <div className="bg-black/60 backdrop-blur-sm rounded-xl border border-white/10 p-2.5 min-w-[100px] animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-1.5 mb-2">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span className="text-[8px] font-bold tracking-widest uppercase" style={{ color: accentColor }}>
                    Muscles
                </span>
            </div>

            {/* Muscle list */}
            <div className="space-y-1">
                {data.muscles.map((muscle) => (
                    <div key={muscle.name} className="flex items-center gap-1.5">
                        <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{
                                backgroundColor: muscle.region === 'primary' ? accentColor : `${accentColor}50`,
                            }}
                        />
                        <span
                            className={`text-[9px] font-medium ${muscle.region === 'primary' ? 'text-white/70' : 'text-white/30'}`}
                        >
                            {muscle.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
