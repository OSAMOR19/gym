/**
 * RepCounter — Large animated rep count with progress ring.
 * Shows current reps / target reps and a circular progress indicator.
 * Celebrates when target is reached.
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
    const [showCelebration, setShowCelebration] = useState(false);
    const prevCount = useRef(count);
    const celebratedRef = useRef(false);

    // Trigger pulse animation when count changes
    useEffect(() => {
        if (count > prevCount.current) {
            setIsPulsing(true);
            const timer = setTimeout(() => setIsPulsing(false), 400);
            prevCount.current = count;

            // Celebration when target is reached
            if (targetReps && count >= targetReps && !celebratedRef.current) {
                celebratedRef.current = true;
                setShowCelebration(true);
                setTimeout(() => setShowCelebration(false), 3000);
            }

            return () => clearTimeout(timer);
        }
        prevCount.current = count;
    }, [count, targetReps]);

    // Reset celebration flag when exercise changes
    useEffect(() => {
        if (count === 0) {
            celebratedRef.current = false;
            setShowCelebration(false);
        }
    }, [count]);

    const progress = targetReps && targetReps > 0 ? Math.min(count / targetReps, 1) : 0;
    const circumference = 2 * Math.PI * 70;
    const strokeDashoffset = circumference * (1 - progress);

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
            <div
                className={`
                    flex flex-col items-center transition-transform duration-300
                    ${isPulsing ? 'scale-125' : 'scale-100'}
                `}
            >
                {/* Progress ring (only when target is set) */}
                {targetReps && targetReps > 0 && isDetecting && (
                    <svg className="absolute w-48 h-48 -rotate-90" viewBox="0 0 160 160">
                        {/* Background ring */}
                        <circle
                            cx="80" cy="80" r="70"
                            fill="none"
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="4"
                        />
                        {/* Progress arc */}
                        <circle
                            cx="80" cy="80" r="70"
                            fill="none"
                            stroke={progress >= 1 ? '#22c55e' : '#38bdf8'}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-500"
                            style={{
                                filter: progress >= 1
                                    ? 'drop-shadow(0 0 8px rgba(34,197,94,0.6))'
                                    : 'drop-shadow(0 0 4px rgba(56,189,248,0.4))',
                            }}
                        />
                    </svg>
                )}

                {/* Rep count number */}
                <span
                    className={`
                        text-8xl md:text-9xl font-black tabular-nums
                        ${isDetecting ? 'text-[#22c55e]' : 'text-white/10'}
                        transition-all duration-300
                    `}
                    style={{
                        fontFamily: 'Orbitron, sans-serif',
                        textShadow: isDetecting
                            ? '0 0 40px rgba(34,197,94,0.6), 0 0 80px rgba(34,197,94,0.3), 0 0 120px rgba(34,197,94,0.1)'
                            : 'none',
                    }}
                >
                    {count}
                </span>

                {/* Label — shows target if set */}
                <span
                    className={`
                        text-sm font-semibold tracking-[0.3em] uppercase mt-1
                        ${isDetecting ? 'text-[#22c55e]/60' : 'text-white/10'}
                    `}
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                    {targetReps && targetReps > 0 ? `${count} / ${targetReps}` : 'REPS'}
                </span>

                {/* Celebration overlay */}
                {showCelebration && (
                    <div className="absolute -bottom-12 text-center animate-bounce">
                        <span className="text-2xl">🎉</span>
                        <p className="text-[10px] font-bold text-[#22c55e] tracking-widest uppercase mt-1">
                            Set Complete!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
