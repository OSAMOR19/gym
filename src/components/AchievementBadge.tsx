/**
 * AchievementBadge — SVG-based geometric icons for badges instead of emojis.
 */

'use client';

import { Badge } from '../lib/gamification';

function BadgeIcon({ iconKey, earned }: { iconKey: string; earned: boolean }) {
    const color = earned ? '#22c55e' : 'rgba(255,255,255,0.15)';
    const props = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

    switch (iconKey) {
        case 'target':
            return <svg {...props}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" fill={earned ? color : 'none'} /></svg>;
        case 'trophy':
            return <svg {...props}><path d="M6 9H4.5a2.5 2.5 0 010-5H6" /><path d="M18 9h1.5a2.5 2.5 0 000-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 006 6 6 6 0 006-6V2z" /></svg>;
        case 'medal':
            return <svg {...props}><path d="M7.21 15L2.66 7.14a2 2 0 01.13-2.2L4.4 2.8A2 2 0 016 2h12a2 2 0 011.6.8l1.6 2.14a2 2 0 01.14 2.2L16.79 15" /><path d="M11 12L5.12 2.2" /><path d="M13 12l5.88-9.8" /><circle cx="12" cy="17" r="5" /><path d="M12 14v6" /><path d="M9 17h6" /></svg>;
        case 'century':
            return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2" /><text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill={color} stroke="none" fontFamily="Orbitron, monospace">100</text></svg>;
        case 'gear':
            return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>;
        case 'crown':
            return <svg {...props}><path d="M2 4l3 12h14l3-12-5 4-5-4-5 4-3-4z" /><line x1="5" y1="20" x2="19" y2="20" /></svg>;
        case 'star':
            return <svg {...props}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>;
        case 'flame':
            return <svg {...props}><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>;
        case 'bolt':
            return <svg {...props}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>;
        case 'pentagon':
            return <svg {...props}><polygon points="12,2 22,8.5 19,19.5 5,19.5 2,8.5" /></svg>;
        case 'diamond':
            return <svg {...props}><polygon points="12,2 22,12 12,22 2,12" /></svg>;
        default:
            return <svg {...props}><circle cx="12" cy="12" r="8" /></svg>;
    }
}

interface AchievementBadgeProps {
    badge: Badge;
    earned: boolean;
}

export default function AchievementBadge({ badge, earned }: AchievementBadgeProps) {
    return (
        <div
            className={`
                flex items-center gap-3 p-3 rounded-lg border transition-all duration-300
                ${earned
                    ? 'border-[#22c55e]/15 bg-[#22c55e]/[0.03]'
                    : 'border-white/5 opacity-35'
                }
            `}
        >
            <div className="flex-shrink-0">
                <BadgeIcon iconKey={badge.icon} earned={earned} />
            </div>
            <div className="min-w-0">
                <h4 className="text-xs font-bold text-white/80 truncate">{badge.name}</h4>
                <p className="text-[10px] text-white/25 leading-tight truncate">{badge.description}</p>
            </div>
        </div>
    );
}
