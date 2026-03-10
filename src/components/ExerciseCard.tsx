/**
 * ExerciseCard — Compact card for displaying an exercise in a list.
 */

'use client';

import { ExerciseConfig } from '../lib/exercises';

interface ExerciseCardProps {
    exercise: ExerciseConfig;
    targetSets?: number;
    targetReps?: number;
    targetHold?: number;
    onClick?: () => void;
    compact?: boolean;
}

export default function ExerciseCard({
    exercise,
    targetSets,
    targetReps,
    targetHold,
    onClick,
    compact = false,
}: ExerciseCardProps) {
    const categoryColors = {
        upper: '#38bdf8',
        lower: '#22c55e',
        core: '#f59e0b',
    };
    const color = categoryColors[exercise.category];

    return (
        <div
            onClick={onClick}
            className={`
        glass-panel rounded-xl transition-all duration-200
        ${onClick ? 'cursor-pointer hover:bg-white/[0.06]' : ''}
        ${compact ? 'p-3' : 'p-4'}
      `}
        >
            <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: `${color}15` }}
                >
                    {exercise.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">{exercise.name}</h4>
                    {!compact && (
                        <p className="text-xs text-white/30 truncate">{exercise.description}</p>
                    )}
                </div>

                {/* Target */}
                {(targetSets || targetReps || targetHold) && (
                    <div className="text-right flex-shrink-0">
                        {targetHold ? (
                            <span className="text-sm font-bold text-[#38bdf8]">{targetHold}s</span>
                        ) : (
                            <span className="text-sm font-bold text-white/60">
                                {targetSets}×{targetReps}
                            </span>
                        )}
                    </div>
                )}

                {/* Category badge */}
                {!targetSets && (
                    <span
                        className="text-[10px] font-semibold tracking-wider uppercase px-2 py-1 rounded-full flex-shrink-0"
                        style={{ backgroundColor: `${color}15`, color }}
                    >
                        {exercise.category}
                    </span>
                )}
            </div>
        </div>
    );
}
