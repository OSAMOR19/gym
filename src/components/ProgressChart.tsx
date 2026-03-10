/**
 * ProgressChart — SVG-based bar chart for weekly activity.
 * No external chart library — pure SVG for maximum performance.
 */

'use client';

import { WeeklyActivity } from '../lib/progressStore';

interface ProgressChartProps {
    data: WeeklyActivity[];
    height?: number;
}

export default function ProgressChart({ data, height = 160 }: ProgressChartProps) {
    const maxReps = Math.max(...data.map((d) => d.reps), 1);
    const barWidth = 32;
    const gap = 12;
    const chartWidth = data.length * (barWidth + gap);

    return (
        <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white/60 tracking-wider uppercase mb-4">
                Weekly Activity
            </h3>

            <div className="flex justify-center overflow-x-auto">
                <svg width={chartWidth} height={height + 30} className="overflow-visible">
                    {data.map((d, i) => {
                        const barHeight = (d.reps / maxReps) * height;
                        const x = i * (barWidth + gap);
                        const y = height - barHeight;
                        const hasActivity = d.reps > 0;

                        return (
                            <g key={d.day}>
                                {/* Background bar */}
                                <rect
                                    x={x}
                                    y={0}
                                    width={barWidth}
                                    height={height}
                                    rx={8}
                                    fill="rgba(255,255,255,0.03)"
                                />

                                {/* Activity bar */}
                                {hasActivity && (
                                    <rect
                                        x={x}
                                        y={y}
                                        width={barWidth}
                                        height={barHeight}
                                        rx={8}
                                        fill="url(#barGradient)"
                                        style={{ filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.3))' }}
                                    >
                                        <animate
                                            attributeName="height"
                                            from="0"
                                            to={barHeight}
                                            dur="0.6s"
                                            fill="freeze"
                                        />
                                        <animate
                                            attributeName="y"
                                            from={height}
                                            to={y}
                                            dur="0.6s"
                                            fill="freeze"
                                        />
                                    </rect>
                                )}

                                {/* Rep count label */}
                                {hasActivity && (
                                    <text
                                        x={x + barWidth / 2}
                                        y={y - 8}
                                        textAnchor="middle"
                                        className="text-[10px] font-bold"
                                        fill="#22c55e"
                                    >
                                        {d.reps}
                                    </text>
                                )}

                                {/* Day label */}
                                <text
                                    x={x + barWidth / 2}
                                    y={height + 20}
                                    textAnchor="middle"
                                    className="text-[10px]"
                                    fill="rgba(255,255,255,0.3)"
                                >
                                    {d.day}
                                </text>
                            </g>
                        );
                    })}

                    {/* Gradient definition */}
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.3" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        </div>
    );
}
