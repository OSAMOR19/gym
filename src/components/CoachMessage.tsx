/**
 * CoachMessage — Compact AI coach tip pill.
 * Small enough to overlay on camera feed.
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

    const icons = {
        encouragement: <polyline points="20,6 9,17 4,12" />,
        technique: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>,
        warning: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
    };

    return (
        <div
            className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium
                border animate-fade-in transition-all duration-300 backdrop-blur-sm max-w-xs truncate
                ${colors[tip.type]}
            `}
        >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                {icons[tip.type]}
            </svg>
            <span className="truncate">{tip.message}</span>
        </div>
    );
}
