/**
 * Admin › Analytics — activity and progress graphs.
 *
 * Palette (validated for the #0f0f0f surface, CVD-safe pair):
 *   strength #16a34a · cardio #0284c7 — identity is never color-alone: the
 *   two-series chart carries a legend, bars have 2px surface gaps, and all
 *   text wears ink colors, never series colors.
 * Wide charts scroll horizontally in their own container on phones.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Skeleton from '../../../components/Skeleton';
import { EXERCISES, ExerciseId } from '../../../lib/exercises';

const STRENGTH = '#16a34a';
const CARDIO = '#0284c7';
const GRID = 'rgba(255,255,255,0.06)';
const INK_MUTED = 'rgba(255,255,255,0.35)';

interface Day { date: string; label: string; strength: number; cardio: number; avgForm: number | null }
interface Analytics {
    days: Day[];
    topExercises: Array<{ id: string; sets: number }>;
    weeks: Array<{ label: string; signups: number }>;
}

interface TooltipState { x: number; y: number; lines: string[] }

/** Shared hover tooltip, positioned inside the chart's scroll container. */
function Tooltip({ tip }: { tip: TooltipState | null }) {
    if (!tip) return null;
    return (
        <div
            className="absolute z-10 pointer-events-none bg-surface border border-ink/15 rounded-lg px-2.5 py-1.5 shadow-xl"
            style={{ left: tip.x, top: tip.y, transform: 'translate(-50%, -110%)' }}
        >
            {tip.lines.map((line, i) => (
                <p key={i} className={`whitespace-nowrap ${i === 0 ? 'text-[10px] text-ink/40' : 'text-[11px] font-semibold text-ink/85'}`}>
                    {line}
                </p>
            ))}
        </div>
    );
}

function ChartCard({ title, subtitle, legend, children }: {
    title: string; subtitle?: string;
    legend?: Array<{ color: string; label: string }>;
    children: React.ReactNode;
}) {
    return (
        <div className="force-dark bg-panel border border-white/5 rounded-xl p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <div>
                    <h2 className="text-sm font-bold text-ink">{title}</h2>
                    {subtitle && <p className="text-[10px] text-ink/25 mt-0.5">{subtitle}</p>}
                </div>
                {legend && (
                    <div className="flex items-center gap-3">
                        {legend.map((l) => (
                            <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-ink/50">
                                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                                {l.label}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <div className="overflow-x-auto scrollbar-hide relative">{children}</div>
        </div>
    );
}

/** Daily workouts — stacked bars, strength + cardio. */
function DailyActivityChart({ days }: { days: Day[] }) {
    const [tip, setTip] = useState<TooltipState | null>(null);
    const W = 640, H = 190, padL = 26, padR = 6, padT = 14, padB = 22;
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const maxY = Math.max(...days.map((d) => d.strength + d.cardio), 4);
    const slot = innerW / days.length;
    const barW = Math.max(slot - 3, 4);
    const y = (v: number) => padT + innerH - (v / maxY) * innerH;

    return (
        <div className="relative min-w-[560px]">
            <svg width={W} height={H} className="block">
                {[0.5, 1].map((f) => (
                    <g key={f}>
                        <line x1={padL} x2={W - padR} y1={y(maxY * f)} y2={y(maxY * f)} stroke={GRID} />
                        <text x={padL - 5} y={y(maxY * f) + 3} textAnchor="end" fontSize="9" fill={INK_MUTED}>
                            {Math.round(maxY * f)}
                        </text>
                    </g>
                ))}
                <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.12)" />
                {days.map((d, i) => {
                    const x = padL + i * slot + (slot - barW) / 2;
                    const sH = (d.strength / maxY) * innerH;
                    const cH = (d.cardio / maxY) * innerH;
                    return (
                        <g key={d.date}>
                            {d.strength > 0 && (
                                <rect x={x} y={y(d.strength)} width={barW} height={sH} rx={2} fill={STRENGTH} />
                            )}
                            {d.cardio > 0 && (
                                // 2px surface gap between stacked segments
                                <rect x={x} y={y(d.strength + d.cardio) - (d.strength > 0 ? 2 : 0)} width={barW} height={cH} rx={2} fill={CARDIO} />
                            )}
                            {i % 7 === 0 && (
                                <text x={x + barW / 2} y={H - 7} textAnchor="middle" fontSize="9" fill={INK_MUTED}>
                                    {d.label}
                                </text>
                            )}
                            {/* hover target: the whole day column */}
                            <rect
                                x={padL + i * slot} y={padT} width={slot} height={innerH}
                                fill="transparent"
                                onMouseEnter={() => setTip({
                                    x: padL + i * slot + slot / 2,
                                    y: y(d.strength + d.cardio),
                                    lines: [d.label, `${d.strength} strength`, `${d.cardio} cardio`],
                                })}
                                onMouseLeave={() => setTip(null)}
                            />
                        </g>
                    );
                })}
            </svg>
            <Tooltip tip={tip} />
        </div>
    );
}

/** Average form score — single-series line over 30 days, gaps preserved. */
function FormTrendChart({ days }: { days: Day[] }) {
    const [tip, setTip] = useState<TooltipState | null>(null);
    const W = 640, H = 170, padL = 30, padR = 10, padT = 14, padB = 22;
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const x = (i: number) => padL + (i / (days.length - 1)) * innerW;
    const y = (v: number) => padT + innerH - (v / 100) * innerH;

    // Break the line where days have no sets (never interpolate over gaps)
    const segments: string[] = [];
    let current: string[] = [];
    days.forEach((d, i) => {
        if (d.avgForm === null) {
            if (current.length > 1) segments.push(current.join(' '));
            current = [];
        } else {
            current.push(`${current.length === 0 ? 'M' : 'L'}${x(i)},${y(d.avgForm)}`);
        }
    });
    if (current.length > 1) segments.push(current.join(' '));

    const points = days.map((d, i) => ({ d, i })).filter((p) => p.d.avgForm !== null);
    const last = points[points.length - 1];

    return (
        <div className="relative min-w-[560px]">
            <svg width={W} height={H} className="block">
                {[0, 50, 100].map((v) => (
                    <g key={v}>
                        <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={v === 0 ? 'rgba(255,255,255,0.12)' : GRID} />
                        <text x={padL - 5} y={y(v) + 3} textAnchor="end" fontSize="9" fill={INK_MUTED}>{v}</text>
                    </g>
                ))}
                {segments.map((path, i) => (
                    <path key={i} d={path} fill="none" stroke={STRENGTH} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                ))}
                {points.map(({ d, i }) => (
                    <circle
                        key={d.date} cx={x(i)} cy={y(d.avgForm!)} r={segments.length === 0 || points.length < 4 ? 3.5 : 2.5}
                        fill={STRENGTH} stroke="#0f0f0f" strokeWidth={2}
                        onMouseEnter={() => setTip({ x: x(i), y: y(d.avgForm!), lines: [d.label, `Form ${d.avgForm}%`] })}
                        onMouseLeave={() => setTip(null)}
                    />
                ))}
                {last && (
                    <text x={Math.min(x(last.i), W - padR - 4)} y={y(last.d.avgForm!) - 9} textAnchor="end" fontSize="10" fontWeight="700" fill="rgba(255,255,255,0.85)">
                        {last.d.avgForm}%
                    </text>
                )}
                {days.filter((_, i) => i % 7 === 0).map((d) => (
                    <text key={d.date} x={x(days.indexOf(d))} y={H - 7} textAnchor="middle" fontSize="9" fill={INK_MUTED}>
                        {d.label}
                    </text>
                ))}
            </svg>
            <Tooltip tip={tip} />
        </div>
    );
}

/** Top exercises — ranked horizontal bars, direct-labeled. */
function TopExercisesChart({ top }: { top: Array<{ id: string; sets: number }> }) {
    const max = Math.max(...top.map((t) => t.sets), 1);
    return (
        <div className="space-y-2 min-w-[320px]">
            {top.map((t) => {
                const name = (t.id in EXERCISES) ? EXERCISES[t.id as ExerciseId].name : t.id;
                return (
                    <div key={t.id} className="flex items-center gap-3">
                        <span className="w-32 text-[11px] text-ink/50 truncate flex-shrink-0 text-right">{name}</span>
                        <div className="flex-1 h-4 relative">
                            <div
                                className="absolute inset-y-0 left-0 rounded-r-[3px]"
                                style={{ width: `${(t.sets / max) * 100}%`, backgroundColor: STRENGTH, minWidth: 3 }}
                            />
                        </div>
                        <span className="w-10 text-[11px] font-semibold text-ink/70 flex-shrink-0" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                            {t.sets}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/** Weekly signups — single-series bars. */
function SignupsChart({ weeks }: { weeks: Array<{ label: string; signups: number }> }) {
    const [tip, setTip] = useState<TooltipState | null>(null);
    const W = 640, H = 160, padL = 26, padR = 6, padT = 14, padB = 22;
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const maxY = Math.max(...weeks.map((w) => w.signups), 2);
    const slot = innerW / weeks.length;
    const barW = Math.min(slot - 10, 46);
    const y = (v: number) => padT + innerH - (v / maxY) * innerH;

    return (
        <div className="relative min-w-[420px]">
            <svg width={W} height={H} className="block">
                <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.12)" />
                <line x1={padL} x2={W - padR} y1={y(maxY)} y2={y(maxY)} stroke={GRID} />
                <text x={padL - 5} y={y(maxY) + 3} textAnchor="end" fontSize="9" fill={INK_MUTED}>{maxY}</text>
                {weeks.map((w, i) => {
                    const x = padL + i * slot + (slot - barW) / 2;
                    return (
                        <g key={w.label}>
                            {w.signups > 0 && (
                                <rect x={x} y={y(w.signups)} width={barW} height={(w.signups / maxY) * innerH} rx={2} fill={STRENGTH} />
                            )}
                            <text x={x + barW / 2} y={H - 7} textAnchor="middle" fontSize="9" fill={INK_MUTED}>{w.label}</text>
                            <rect
                                x={padL + i * slot} y={padT} width={slot} height={innerH} fill="transparent"
                                onMouseEnter={() => setTip({ x: x + barW / 2, y: y(w.signups), lines: [`Week of ${w.label}`, `${w.signups} signup${w.signups === 1 ? '' : 's'}`] })}
                                onMouseLeave={() => setTip(null)}
                            />
                        </g>
                    );
                })}
            </svg>
            <Tooltip tip={tip} />
        </div>
    );
}

export default function AdminAnalyticsPage() {
    const [data, setData] = useState<Analytics | null>(null);
    const [error, setError] = useState<string | null>(null);
    const loadedRef = useRef(false);

    useEffect(() => {
        if (loadedRef.current) return;
        loadedRef.current = true;
        fetch('/api/admin/analytics')
            .then(async (res) => {
                const body = await res.json();
                if (!res.ok) throw new Error(body.error ?? 'Failed to load');
                setData(body);
            })
            .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
    }, []);

    if (error) {
        return <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>;
    }

    const hasActivity = data && data.days.some((d) => d.strength + d.cardio > 0);

    return (
        <>
            <h1 className="text-xl font-bold text-ink mb-1 font-display">Analytics</h1>
            <p className="text-xs text-ink/30 mb-6">Last 30 days of training activity and user progress.</p>

            {data === null && (
                <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}</div>
            )}

            {data !== null && (
                <div className="space-y-4">
                    <ChartCard
                        title="Workouts per day"
                        subtitle={hasActivity ? undefined : 'No workouts recorded yet — this fills in as users train'}
                        legend={[{ color: STRENGTH, label: 'Strength' }, { color: CARDIO, label: 'Cardio' }]}
                    >
                        <DailyActivityChart days={data.days} />
                    </ChartCard>

                    <ChartCard
                        title="Average form score"
                        subtitle="Daily mean across all camera-scored sets — the user-progress signal"
                    >
                        <FormTrendChart days={data.days} />
                    </ChartCard>

                    <div className="grid md:grid-cols-2 gap-4">
                        <ChartCard title="Top exercises" subtitle="By sets performed, last 30 days">
                            {data.topExercises.length > 0
                                ? <TopExercisesChart top={data.topExercises} />
                                : <p className="text-xs text-ink/25 py-6 text-center">No sets recorded yet.</p>}
                        </ChartCard>
                        <ChartCard title="Signups per week" subtitle="Last 8 weeks">
                            <SignupsChart weeks={data.weeks} />
                        </ChartCard>
                    </div>
                </div>
            )}
        </>
    );
}
