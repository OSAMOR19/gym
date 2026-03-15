/**
 * DayNode — Pathway node for one workout day.
 * Shows day number, name, exercise count.
 * Visual states: completed, current (pulsing), available, locked.
 */

'use client';

interface DayNodeProps {
    dayNumber: number;
    dayName: string;
    exerciseCount: number;
    state: 'completed' | 'current' | 'available' | 'locked';
    color: string;
    isSelected: boolean;
    onClick: () => void;
}

export default function DayNode({
    dayNumber,
    dayName,
    exerciseCount,
    state,
    color,
    isSelected,
    onClick,
}: DayNodeProps) {
    return (
        <div
            className={`flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 ${state === 'locked' ? 'opacity-40' : 'opacity-100'}`}
            onClick={onClick}
        >
            {/* Main circle */}
            <div
                className={`
                    relative w-16 h-16 rounded-full border-2 flex items-center justify-center
                    transition-all duration-300
                    ${state === 'current' ? 'animate-node-pulse' : ''}
                    ${isSelected ? 'scale-110' : 'hover:scale-105'}
                `}
                style={{
                    borderColor: state === 'locked'
                        ? 'rgba(255,255,255,0.1)'
                        : `${color}${state === 'current' ? 'CC' : '60'}`,
                    backgroundColor: state === 'locked'
                        ? 'rgba(255,255,255,0.03)'
                        : isSelected
                            ? `${color}25`
                            : `${color}${state === 'current' ? '15' : '08'}`,
                    ['--pulse-color' as string]: `${color}50`,
                }}
            >
                {/* Completed checkmark */}
                {state === 'completed' ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20,6 9,17 4,12" />
                    </svg>
                ) : (
                    <span
                        className="text-sm font-black"
                        style={{
                            color: state === 'locked' ? 'rgba(255,255,255,0.2)' : color,
                            fontFamily: 'Orbitron, monospace',
                        }}
                    >
                        {dayNumber}
                    </span>
                )}

                {/* Lock icon for locked state */}
                {state === 'locked' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#0f0f0f] border border-white/10 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>
                )}

                {/* Exercise count badge */}
                {state !== 'locked' && (
                    <div
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{ backgroundColor: color, color: '#0f0f0f' }}
                    >
                        {exerciseCount}
                    </div>
                )}
            </div>

            {/* Day name */}
            <div className="text-center max-w-[80px]">
                <p
                    className="text-[10px] font-bold tracking-wider uppercase truncate"
                    style={{ color: state === 'locked' ? 'rgba(255,255,255,0.15)' : `${color}CC` }}
                >
                    Day {dayNumber}
                </p>
                <p className="text-[9px] text-white/20 truncate leading-tight mt-0.5">
                    {dayName.replace(/^Day \d+:\s*/, '')}
                </p>
            </div>
        </div>
    );
}
