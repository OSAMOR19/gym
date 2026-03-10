/**
 * AchievementBadge — Displays a gamification badge/achievement.
 */

'use client';

import { Badge } from '../lib/gamification';

interface AchievementBadgeProps {
    badge: Badge;
    earned: boolean;
}

export default function AchievementBadge({ badge, earned }: AchievementBadgeProps) {
    return (
        <div
            className={`
        glass-panel rounded-xl p-4 text-center transition-all duration-300
        ${earned ? 'border-[#22c55e]/20' : 'opacity-40 grayscale'}
      `}
        >
            <div className={`text-3xl mb-2 ${earned ? '' : 'saturate-0'}`}>{badge.icon}</div>
            <h4 className="text-xs font-bold text-white mb-1">{badge.name}</h4>
            <p className="text-[10px] text-white/30 leading-tight">{badge.description}</p>
        </div>
    );
}
