/**
 * WorkoutSummary — Post-workout results. No emojis. SVG icons only.
 */

'use client';

import { WorkoutSummary as SummaryType } from '../lib/aiCoach';
import { Badge } from '../lib/gamification';

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-[76px] h-[76px]">
                <svg width={76} height={76} className="transform -rotate-90">
                    <circle cx={38} cy={38} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={4} />
                    <circle
                        cx={38} cy={38} r={radius} fill="none" stroke={color} strokeWidth={4}
                        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 4px ${color}80)` }}
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    {score}
                </span>
            </div>
            <span className="text-[10px] text-white/40 mt-2 tracking-wider uppercase">{label}</span>
        </div>
    );
}

export default function WorkoutSummaryDisplay({ summary, xpGained, newBadges, onClose }: {
    summary: SummaryType;
    xpGained: number;
    newBadges: Badge[];
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                        WORKOUT COMPLETE
                    </h2>
                    <button onClick={onClose} className="text-white/20 hover:text-white/50 transition-colors cursor-pointer">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                <p className="text-center text-[#22c55e] font-bold text-lg mb-6" style={{ fontFamily: 'Orbitron, monospace' }}>+{xpGained} XP</p>

                {/* Score rings */}
                <div className="flex justify-around mb-8">
                    <ScoreRing score={summary.formScore} label="Form" color="#22c55e" />
                    <ScoreRing score={summary.romScore} label="ROM" color="#38bdf8" />
                    <ScoreRing score={summary.tempoScore} label="Tempo" color="#a855f7" />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="border border-white/5 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-[#22c55e]" style={{ fontFamily: 'Orbitron, monospace' }}>{summary.totalReps}</p>
                        <p className="text-[10px] text-white/25 tracking-wider uppercase">Reps</p>
                    </div>
                    <div className="border border-white/5 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-[#38bdf8]" style={{ fontFamily: 'Orbitron, monospace' }}>
                            {Math.floor(summary.duration / 60)}:{(summary.duration % 60).toString().padStart(2, '0')}
                        </p>
                        <p className="text-[10px] text-white/25 tracking-wider uppercase">Duration</p>
                    </div>
                </div>

                {/* New Badges */}
                {newBadges.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-xs font-bold text-white/40 tracking-widest uppercase mb-3 flex items-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>
                            Badges Unlocked
                        </h3>
                        <div className="space-y-2">
                            {newBadges.map((b) => (
                                <div key={b.id} className="flex items-center gap-2 p-2 rounded-lg border border-[#22c55e]/15 bg-[#22c55e]/[0.03]">
                                    <span className="text-xs font-bold text-[#22c55e]">{b.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Coach Notes */}
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-white/40 tracking-widest uppercase mb-3 flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                        AI Coach Notes
                    </h3>
                    <div className="space-y-2">
                        {summary.coachNotes.map((note, i) => (
                            <p key={i} className="text-sm text-white/40 pl-3 border-l-2 border-white/5">
                                {note}
                            </p>
                        ))}
                    </div>
                </div>

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl bg-[#22c55e]/15 text-[#22c55e] font-semibold border border-[#22c55e]/30 hover:bg-[#22c55e]/25 transition-all cursor-pointer"
                >
                    Done
                </button>
            </div>
        </div>
    );
}
