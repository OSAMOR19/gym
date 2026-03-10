/**
 * LevelProgress — XP bar and level display for gamification.
 */

'use client';

import { getXPForCurrentLevel, UserStats } from '../lib/gamification';

interface LevelProgressProps {
    stats: UserStats;
}

export default function LevelProgress({ stats }: LevelProgressProps) {
    const { current, required } = getXPForCurrentLevel(stats.totalXP);
    const percentage = (current / required) * 100;

    return (
        <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#22c55e] to-[#38bdf8] flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                        <span className="text-black font-black text-lg" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            {stats.level}
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">Level {stats.level}</p>
                        <p className="text-xs text-white/30">{stats.totalXP} Total XP</p>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-xs text-white/40">{current} / {required} XP</p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-[#22c55e] to-[#38bdf8] transition-all duration-700 ease-out"
                    style={{
                        width: `${percentage}%`,
                        boxShadow: '0 0 10px rgba(34,197,94,0.4)',
                    }}
                />
            </div>
        </div>
    );
}
