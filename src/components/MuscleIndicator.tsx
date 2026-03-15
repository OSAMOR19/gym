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

// Mapping of exercises to their targeted muscle groups
const EXERCISE_MUSCLES: Record<ExerciseId, { muscles: MuscleGroup[]; category: 'upper' | 'lower' | 'core' }> = {
    bicep_curl: {
        category: 'upper',
        muscles: [
            { name: 'Biceps', region: 'primary' },
            { name: 'Forearms', region: 'secondary' },
            { name: 'Brachialis', region: 'secondary' },
        ],
    },
    hammer_curl: {
        category: 'upper',
        muscles: [
            { name: 'Brachialis', region: 'primary' },
            { name: 'Biceps', region: 'primary' },
            { name: 'Forearms', region: 'secondary' },
        ],
    },
    pushup: {
        category: 'upper',
        muscles: [
            { name: 'Chest', region: 'primary' },
            { name: 'Triceps', region: 'primary' },
            { name: 'Shoulders', region: 'secondary' },
            { name: 'Core', region: 'secondary' },
        ],
    },
    shoulder_press: {
        category: 'upper',
        muscles: [
            { name: 'Shoulders', region: 'primary' },
            { name: 'Triceps', region: 'secondary' },
            { name: 'Upper Chest', region: 'secondary' },
        ],
    },
    lateral_raise: {
        category: 'upper',
        muscles: [
            { name: 'Side Delts', region: 'primary' },
            { name: 'Traps', region: 'secondary' },
        ],
    },
    tricep_extension: {
        category: 'upper',
        muscles: [
            { name: 'Triceps', region: 'primary' },
            { name: 'Shoulders', region: 'secondary' },
        ],
    },
    squat: {
        category: 'lower',
        muscles: [
            { name: 'Quads', region: 'primary' },
            { name: 'Glutes', region: 'primary' },
            { name: 'Hamstrings', region: 'secondary' },
            { name: 'Core', region: 'secondary' },
        ],
    },
    lunge: {
        category: 'lower',
        muscles: [
            { name: 'Quads', region: 'primary' },
            { name: 'Glutes', region: 'primary' },
            { name: 'Hamstrings', region: 'secondary' },
        ],
    },
    jump_squat: {
        category: 'lower',
        muscles: [
            { name: 'Quads', region: 'primary' },
            { name: 'Glutes', region: 'primary' },
            { name: 'Calves', region: 'secondary' },
        ],
    },
    calf_raise: {
        category: 'lower',
        muscles: [
            { name: 'Calves', region: 'primary' },
            { name: 'Soleus', region: 'secondary' },
        ],
    },
    plank: {
        category: 'core',
        muscles: [
            { name: 'Abs', region: 'primary' },
            { name: 'Obliques', region: 'primary' },
            { name: 'Lower Back', region: 'secondary' },
            { name: 'Shoulders', region: 'secondary' },
        ],
    },
    situp: {
        category: 'core',
        muscles: [
            { name: 'Abs', region: 'primary' },
            { name: 'Hip Flexors', region: 'secondary' },
            { name: 'Obliques', region: 'secondary' },
        ],
    },
    mountain_climber: {
        category: 'core',
        muscles: [
            { name: 'Abs', region: 'primary' },
            { name: 'Hip Flexors', region: 'primary' },
            { name: 'Shoulders', region: 'secondary' },
            { name: 'Quads', region: 'secondary' },
        ],
    },
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
