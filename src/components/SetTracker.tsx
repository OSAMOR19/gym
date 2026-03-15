/**
 * SetTracker — Compact pill showing set/rep progress.
 * Positioned below the rep counter on camera view.
 */

'use client';

interface SetTrackerProps {
    currentSet: number;
    totalSets: number;
    targetReps: number;
    currentReps: number;
    isDetecting: boolean;
}

export default function SetTracker({
    currentSet,
    totalSets,
    targetReps,
    currentReps,
    isDetecting,
}: SetTrackerProps) {
    if (!isDetecting) return null;

    const setProgress = currentSet / totalSets;
    const isLastSet = currentSet === totalSets;

    return (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded-full border border-white/10 px-4 py-2 flex items-center gap-3">
                {/* Set indicators */}
                <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalSets }, (_, i) => (
                        <div
                            key={i}
                            className={`
                                w-2 h-2 rounded-full transition-all duration-300
                                ${i < currentSet - 1
                                    ? 'bg-[#22c55e]'
                                    : i === currentSet - 1
                                        ? 'bg-[#38bdf8] shadow-[0_0_6px_rgba(56,189,248,0.5)]'
                                        : 'bg-white/10'
                                }
                            `}
                        />
                    ))}
                </div>

                {/* Text info */}
                <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider" style={{ fontFamily: 'Orbitron, monospace' }}>
                    <span className="text-white/40">SET</span>
                    <span className="text-[#38bdf8]">{currentSet}</span>
                    <span className="text-white/15">/</span>
                    <span className="text-white/30">{totalSets}</span>
                    <span className="w-px h-3 bg-white/10 mx-1" />
                    <span className="text-white/40">REPS</span>
                    <span className="text-[#22c55e]">{currentReps}</span>
                    <span className="text-white/15">/</span>
                    <span className="text-white/30">{targetReps}</span>
                </div>

                {/* Last set indicator */}
                {isLastSet && (
                    <span className="text-[8px] font-bold text-amber-400/80 tracking-wider uppercase">
                        FINAL
                    </span>
                )}
            </div>
        </div>
    );
}
