/**
 * RepCounter — Large animated rep count display.
 *
 * Shows the current rep count with a neon glow effect.
 * Pulses briefly on each rep increment for visual feedback.
 */

'use client';

import { useEffect, useState, useRef } from 'react';

interface RepCounterProps {
    count: number;
    isDetecting: boolean;
}

export default function RepCounterDisplay({ count, isDetecting }: RepCounterProps) {
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

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
            <div
                className={`
          flex flex-col items-center transition-transform duration-300
          ${isPulsing ? 'scale-125' : 'scale-100'}
        `}
            >
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

                {/* Label */}
                <span
                    className={`
            text-sm font-semibold tracking-[0.3em] uppercase mt-1
            ${isDetecting ? 'text-[#22c55e]/60' : 'text-white/10'}
          `}
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                    REPS
                </span>
            </div>
        </div>
    );
}
