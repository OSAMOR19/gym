/**
 * WorkoutSummary — Post-workout results screen.
 */

'use client';

import { WorkoutSummary as SummaryType } from '../lib/aiCoach';
import { Badge } from '../lib/gamification';

interface WorkoutSummaryProps {
    summary: SummaryType;
    xpGained: number;
    newBadges: Badge[];
    onClose: () => void;
}

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

export default function WorkoutSummaryDisplay({ summary, xpGained, newBadges, onClose }: WorkoutSummaryProps) {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-panel rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold text-white text-center mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Workout Complete! 🎉
                </h2>
                <p className="text-center text-[#22c55e] font-bold text-lg mb-6">+{xpGained} XP</p>

                {/* Score rings */}
                <div className="flex justify-around mb-8">
                    <ScoreRing score={summary.formScore} label="Form" color="#22c55e" />
                    <ScoreRing score={summary.romScore} label="ROM" color="#38bdf8" />
                    <ScoreRing score={summary.tempoScore} label="Tempo" color="#a855f7" />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="glass-panel rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-[#22c55e]" style={{ fontFamily: 'Orbitron, sans-serif' }}>{summary.totalReps}</p>
                        <p className="text-[10px] text-white/30 tracking-wider uppercase">Reps</p>
                    </div>
                    <div className="glass-panel rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-[#38bdf8]" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            {Math.floor(summary.duration / 60)}:{(summary.duration % 60).toString().padStart(2, '0')}
                        </p>
                        <p className="text-[10px] text-white/30 tracking-wider uppercase">Duration</p>
                    </div>
                </div>

                {/* New Badges */}
                {newBadges.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-white/60 mb-3">🏆 New Badges Unlocked!</h3>
                        <div className="flex gap-3">
                            {newBadges.map((b) => (
                                <div key={b.id} className="glass-panel rounded-xl p-3 text-center flex-1">
                                    <div className="text-2xl mb-1">{b.icon}</div>
                                    <p className="text-xs font-bold text-[#22c55e]">{b.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Coach Notes */}
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-white/60 mb-3">🤖 AI Coach Notes</h3>
                    <div className="space-y-2">
                        {summary.coachNotes.map((note, i) => (
                            <p key={i} className="text-sm text-white/50 pl-3 border-l-2 border-[#22c55e]/20">
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
