/**
 * RepCounter — Clean rep count display with fitted progress ring.
 * Shows current reps / target reps with a properly centered circular progress indicator.
 */

'use client';

import { useEffect, useState, useRef } from 'react';

interface RepCounterProps {
    count: number;
    isDetecting: boolean;
    targetReps?: number;
}

export default function RepCounterDisplay({ count, isDetecting, targetReps }: RepCounterProps) {
    const [isPulsing, setIsPulsing] = useState(false);
    const prevCount = useRef(count);

    // Trigger pulse animation when count changes
    useEffect(() => {
        if (count > prevCount.current) {
            setIsPulsing(true);
            const timer = setTimeout(() => setIsPulsing(false), 400);
            prevCount.current = count;
            return () => clearTimeout(timer);
        }
        prevCount.current = count;
    }, [count]);

    const progress = targetReps && targetReps > 0 ? Math.min(count / targetReps, 1) : 0;
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);
    const isComplete = progress >= 1;

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
            <div
                className={`
                    relative flex flex-col items-center justify-center w-40 h-40
                    transition-transform duration-300
                    ${isPulsing ? 'scale-110' : 'scale-100'}
                `}
            >
                {/* Progress ring — always visible when detecting with target */}
                {targetReps && targetReps > 0 && isDetecting && (
                    <svg
                        className="absolute inset-0 w-full h-full -rotate-90"
                        viewBox="0 0 140 140"
                    >
                        {/* Background ring */}
                        <circle
                            cx="70" cy="70" r={radius}
                            fill="none"
                            stroke="rgba(255,255,255,0.06)"
                            strokeWidth="5"
                        />
                        {/* Progress arc */}
                        <circle
                            cx="70" cy="70" r={radius}
                            fill="none"
                            stroke={isComplete ? '#22c55e' : '#38bdf8'}
                            strokeWidth="5"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-500 ease-out"
                            style={{
                                filter: isComplete
                                    ? 'drop-shadow(0 0 8px rgba(34,197,94,0.6))'
                                    : 'drop-shadow(0 0 4px rgba(56,189,248,0.3))',
                            }}
                        />
                    </svg>
                )}

                {/* Rep count number — centered */}
                <span
                    className={`
                        text-7xl font-black tabular-nums leading-none
                        ${isDetecting ? 'text-[#22c55e]' : 'text-white/10'}
                        transition-all duration-300
                    `}
                    style={{
                        fontFamily: 'Orbitron, sans-serif',
                        textShadow: isDetecting
                            ? '0 0 40px rgba(34,197,94,0.5), 0 0 80px rgba(34,197,94,0.2)'
                            : 'none',
                    }}
                >
                    {count}
                </span>

                {/* Label — shows target if set */}
                <span
                    className={`
                        text-[10px] font-bold tracking-[0.25em] uppercase mt-1
                        ${isDetecting ? 'text-[#22c55e]/50' : 'text-white/8'}
                    `}
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                    {targetReps && targetReps > 0 ? `${count} / ${targetReps}` : 'REPS'}
                </span>
            </div>
        </div>
    );
}
