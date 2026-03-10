/**
 * ExerciseCard — Renders exercise with monospaced code badge instead of emoji.
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
                flex items-center gap-3 rounded-lg border border-white/5 transition-all duration-200
                ${onClick ? 'cursor-pointer hover:border-white/10 hover:bg-white/[0.02]' : ''}
                ${compact ? 'p-2.5' : 'py-3 px-4'}
            `}
        >
            {/* Monospaced code badge */}
            <div
                className="w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0"
                style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}
            >
                <span
                    className="text-[10px] font-bold tracking-wider"
                    style={{ color, fontFamily: 'Orbitron, monospace' }}
                >
                    {exercise.icon}
                </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white/80 truncate">{exercise.name}</h4>
                {!compact && (
                    <p className="text-xs text-white/25 truncate">{exercise.description}</p>
                )}
            </div>

            {/* Target */}
            {(targetSets || targetReps || targetHold) && (
                <div className="text-right flex-shrink-0">
                    {targetHold ? (
                        <span className="text-xs font-bold text-[#38bdf8]" style={{ fontFamily: 'Orbitron, monospace' }}>{targetHold}s</span>
                    ) : (
                        <span className="text-xs font-bold text-white/40" style={{ fontFamily: 'Orbitron, monospace' }}>
                            {targetSets}&times;{targetReps}
                        </span>
                    )}
                </div>
            )}

            {/* Category tag */}
            {!targetSets && (
                <span
                    className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border flex-shrink-0"
                    style={{ borderColor: `${color}25`, color: `${color}90` }}
                >
                    {exercise.category}
                </span>
            )}
        </div>
    );
}
