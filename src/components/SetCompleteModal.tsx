/**
 * SetCompleteModal — Full-screen modal shown when a set is complete.
 * Shows set results, feedback, and option to continue to next set or end workout.
 */

'use client';

interface SetCompleteModalProps {
    currentSet: number;
    totalSets: number;
    repsCompleted: number;
    targetReps: number;
    formQuality: number;
    onNextSet: () => void;
    onEndWorkout: () => void;
}

export default function SetCompleteModal({
    currentSet,
    totalSets,
    repsCompleted,
    targetReps,
    formQuality,
    onNextSet,
    onEndWorkout,
}: SetCompleteModalProps) {
    const isLastSet = currentSet >= totalSets;
    const formLabel = formQuality >= 80 ? 'Excellent' : formQuality >= 60 ? 'Good' : 'Needs Work';
    const formColor = formQuality >= 80 ? '#22c55e' : formQuality >= 60 ? '#f59e0b' : '#ef4444';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-[#111]/95 border border-white/10 rounded-2xl p-8 max-w-sm w-[90%] text-center shadow-2xl">
                {/* Status icon */}
                <div
                    className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{ backgroundColor: `${formColor}15`, border: `2px solid ${formColor}40` }}
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={formColor} strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20,6 9,17 4,12" />
                    </svg>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Set {currentSet} Complete
                </h2>
                <p className="text-sm text-white/30 mb-6">
                    {isLastSet ? 'Final set — great workout!' : `${totalSets - currentSet} set${totalSets - currentSet > 1 ? 's' : ''} remaining`}
                </p>

                {/* Stats row */}
                <div className="flex justify-center gap-6 mb-6">
                    <div className="text-center">
                        <p className="text-2xl font-black text-white" style={{ fontFamily: 'Orbitron, monospace' }}>
                            {repsCompleted}
                        </p>
                        <p className="text-[9px] text-white/25 tracking-widest uppercase mt-0.5">Reps</p>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div className="text-center">
                        <p className="text-2xl font-black" style={{ fontFamily: 'Orbitron, monospace', color: formColor }}>
                            {formQuality}%
                        </p>
                        <p className="text-[9px] tracking-widest uppercase mt-0.5" style={{ color: `${formColor}80` }}>
                            {formLabel}
                        </p>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2.5">
                    {!isLastSet && (
                        <button
                            onClick={onNextSet}
                            className="w-full py-3 rounded-xl font-bold text-sm tracking-wider uppercase bg-[#22c55e] text-black hover:bg-[#16a34a] transition-all cursor-pointer shadow-[0_0_25px_rgba(34,197,94,0.25)]"
                        >
                            Next Set →
                        </button>
                    )}
                    <button
                        onClick={onEndWorkout}
                        className={`
                            w-full py-3 rounded-xl font-bold text-sm tracking-wider uppercase transition-all cursor-pointer
                            ${isLastSet
                                ? 'bg-[#22c55e] text-black hover:bg-[#16a34a] shadow-[0_0_25px_rgba(34,197,94,0.25)]'
                                : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/60'
                            }
                        `}
                    >
                        {isLastSet ? 'View Summary' : 'End Workout'}
                    </button>
                </div>
            </div>
        </div>
    );
}
