/**
 * ExerciseSelector — Toggle between curl, squat, and push-up modes.
 *
 * Active exercise gets a neon green glow; inactive buttons have
 * a muted glassmorphism appearance.
 */

'use client';

import { Exercise } from '../lib/repCounter';

interface ExerciseSelectorProps {
    currentExercise: Exercise;
    onSelect: (exercise: Exercise) => void;
    isDetecting: boolean;
}

const exercises: { id: Exercise; label: string; icon: string }[] = [
    { id: 'curl', label: 'Bicep Curl', icon: '💪' },
    { id: 'squat', label: 'Squat', icon: '🦵' },
    { id: 'pushup', label: 'Push-up', icon: '🫸' },
];

export default function ExerciseSelector({
    currentExercise,
    onSelect,
    isDetecting,
}: ExerciseSelectorProps) {
    return (
        <div className="flex gap-3">
            {exercises.map((ex) => {
                const isActive = currentExercise === ex.id;
                return (
                    <button
                        key={ex.id}
                        onClick={() => onSelect(ex.id)}
                        disabled={isDetecting}
                        className={`
              relative px-5 py-3 rounded-xl text-sm font-semibold tracking-wide
              transition-all duration-300 cursor-pointer
              ${isActive
                                ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/40 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                                : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70'
                            }
              ${isDetecting && !isActive ? 'opacity-40 cursor-not-allowed' : ''}
            `}
                    >
                        <span className="mr-2">{ex.icon}</span>
                        {ex.label}
                    </button>
                );
            })}
        </div>
    );
}
