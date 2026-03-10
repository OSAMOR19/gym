/**
 * CoachMessage — Displays AI coach tips with fade animation.
 */

'use client';

import { CoachTip } from '../lib/aiCoach';

interface CoachMessageProps {
    tip: CoachTip | null;
}

export default function CoachMessage({ tip }: CoachMessageProps) {
    if (!tip) return null;

    const colors = {
        encouragement: 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20',
        technique: 'bg-[#38bdf8]/10 text-[#38bdf8] border-[#38bdf8]/20',
        warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };

    return (
        <div
            className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
        border animate-fade-in transition-all duration-300
        ${colors[tip.type]}
      `}
        >
            <span>{tip.icon}</span>
            <span>{tip.message}</span>
        </div>
    );
}
