/**
 * StatsPanel — Displays workout statistics in a glassmorphism panel.
 *
 * Shows:
 *   - Total reps
 *   - Time under tension (seconds)
 *   - Form quality (percentage with animated progress ring)
 */

'use client';

interface StatsPanelProps {
    reps: number;
    timeUnderTension: number;
    formQuality: number;
}

function ProgressRing({
    percentage,
    size = 64,
    strokeWidth = 4,
}: {
    percentage: number;
    size?: number;
    strokeWidth?: number;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    // Color based on score
    const color =
        percentage >= 70
            ? '#22c55e'
            : percentage >= 40
                ? '#f59e0b'
                : '#ef4444';

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={strokeWidth}
            />
            {/* Progress circle */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                    transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease',
                    filter: `drop-shadow(0 0 6px ${color}80)`,
                }}
            />
        </svg>
    );
}

export default function StatsPanel({
    reps,
    timeUnderTension,
    formQuality,
}: StatsPanelProps) {
    return (
        <div className="grid grid-cols-3 gap-4 w-full">
            {/* Reps Card */}
            <div className="glass-panel p-4 rounded-2xl text-center">
                <p className="text-white/40 text-xs font-medium tracking-widest uppercase mb-2">
                    Reps
                </p>
                <p
                    className="text-3xl font-bold text-[#22c55e] tabular-nums"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                    {reps}
                </p>
            </div>

            {/* Time Under Tension Card */}
            <div className="glass-panel p-4 rounded-2xl text-center">
                <p className="text-white/40 text-xs font-medium tracking-widest uppercase mb-2">
                    Tension
                </p>
                <p
                    className="text-3xl font-bold text-[#38bdf8] tabular-nums"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                    {timeUnderTension.toFixed(1)}
                    <span className="text-lg text-[#38bdf8]/60">s</span>
                </p>
            </div>

            {/* Form Quality Card */}
            <div className="glass-panel p-4 rounded-2xl flex flex-col items-center">
                <p className="text-white/40 text-xs font-medium tracking-widest uppercase mb-2">
                    Form
                </p>
                <div className="relative">
                    <ProgressRing percentage={formQuality} />
                    <span
                        className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white tabular-nums"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        {formQuality || '—'}
                    </span>
                </div>
            </div>
        </div>
    );
}
