/**
 * Calendar — the training month at a glance.
 *
 * Month grid fed by workout_sessions (strength, accent dot) and
 * cardio_sessions (cardio, info dot). Tap a day for what was logged there;
 * the "Up next" card surfaces the active program's next day so the page
 * works for planning, not just review.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../utils/supabase/client';
import { listStartedPrograms } from '../../../lib/programProgress';
import { getProgramById, Program } from '../../../lib/programs';
import Skeleton from '../../../components/Skeleton';

interface DayEntry {
    id: string;
    kind: 'strength' | 'cardio';
    name: string;
    meta: string;
    href: string;
}

interface UpNext {
    program: Program;
    dayIndex: number;
    dayName: string;
    doneDays: number;
    totalDays: number;
}

const CARDIO_LABELS: Record<string, string> = {
    walking: 'Walking',
    running: 'Running',
    treadmill_walk: 'Treadmill Walk',
    treadmill_run: 'Treadmill Run',
    jump_rope: 'Jump Rope',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function fmtDuration(secs: number | null): string {
    if (!secs) return '';
    return `${Math.max(1, Math.round(secs / 60))} min`;
}

export default function CalendarPage() {
    const today = useMemo(() => new Date(), []);
    const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
    const [entries, setEntries] = useState<Map<string, DayEntry[]> | null>(null);
    const [selected, setSelected] = useState<Date>(today);
    const [upNext, setUpNext] = useState<UpNext | null>(null);

    // ── Month data ──────────────────────────────────────────────────────
    const loadMonth = useCallback(async (monthStart: Date) => {
        setEntries(null);
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
        const map = new Map<string, DayEntry[]>();
        const push = (date: Date, entry: DayEntry) => {
            const key = dayKey(date);
            const list = map.get(key);
            if (list) list.push(entry);
            else map.set(key, [entry]);
        };
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setEntries(map); return; }

            const [strength, cardio] = await Promise.all([
                supabase
                    .from('workout_sessions')
                    .select('id, source, program_id, program_day_name, completed_at, total_reps, avg_form_score')
                    .eq('user_id', user.id)
                    .gte('completed_at', monthStart.toISOString())
                    .lt('completed_at', monthEnd.toISOString())
                    .order('completed_at', { ascending: true }),
                supabase
                    .from('cardio_sessions')
                    .select('id, activity_type, completed_at, duration_seconds, distance_km, steps')
                    .eq('user_id', user.id)
                    .gte('completed_at', monthStart.toISOString())
                    .lt('completed_at', monthEnd.toISOString())
                    .order('completed_at', { ascending: true }),
            ]);

            for (const s of strength.data ?? []) {
                const program = s.program_id ? getProgramById(s.program_id) : null;
                const parts: string[] = [];
                if (s.total_reps) parts.push(`${s.total_reps} reps`);
                if (s.avg_form_score) parts.push(`form ${s.avg_form_score}%`);
                push(new Date(s.completed_at), {
                    id: s.id,
                    kind: 'strength',
                    name: s.program_day_name ?? (program ? program.name : 'Workout'),
                    meta: parts.join(' · ') || 'Strength',
                    href: program ? `/programs/${program.id}` : '/progress',
                });
            }
            for (const c of cardio.data ?? []) {
                const parts: string[] = [fmtDuration(c.duration_seconds)];
                if (c.distance_km) parts.push(`${c.distance_km} km`);
                else if (c.steps) parts.push(`${c.steps} steps`);
                push(new Date(c.completed_at), {
                    id: c.id,
                    kind: 'cardio',
                    name: CARDIO_LABELS[c.activity_type] ?? 'Cardio',
                    meta: parts.filter(Boolean).join(' · '),
                    href: '/cardio',
                });
            }
        } catch {
            // Signed out / missing tables — an empty calendar is still usable
        }
        setEntries(map);
    }, []);

    useEffect(() => { loadMonth(cursor); }, [cursor, loadMonth]);

    // ── Up next: the active program's first uncompleted day ─────────────
    useEffect(() => {
        listStartedPrograms().then((started) => {
            for (const s of started) {
                const program = getProgramById(s.programId);
                if (!program) continue;
                const days = program.weeks.flatMap((w) => w.days);
                const nextIdx = days.findIndex((_, i) => !s.completedDays.includes(i));
                if (nextIdx < 0) continue;
                setUpNext({
                    program,
                    dayIndex: nextIdx,
                    dayName: days[nextIdx].name.replace(/^Day \d+:\s*/i, ''),
                    doneDays: s.completedDays.length,
                    totalDays: days.length,
                });
                return;
            }
        }).catch(() => { });
    }, []);

    // ── Grid math ────────────────────────────────────────────────────────
    const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const leadingBlanks = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
    const isCurrentMonth = cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();

    const activeDays = entries ? entries.size : 0;
    const totalSessions = entries ? Array.from(entries.values()).reduce((n, l) => n + l.length, 0) : 0;

    const selectedKey = dayKey(selected);
    const selectedEntries = entries?.get(selectedKey) ?? [];
    const selectedInMonth = selected.getFullYear() === cursor.getFullYear() && selected.getMonth() === cursor.getMonth();

    const changeMonth = (delta: number) => {
        const next = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
        setCursor(next);
        setSelected(
            next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth()
                ? today
                : new Date(next.getFullYear(), next.getMonth(), 1),
        );
    };

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-6">
            <div className="mb-5">
                <h1 className="text-2xl font-bold text-ink font-display">Calendar</h1>
                <p className="text-xs text-ink/30 mt-1">Your training, day by day — tap a date to see what you did.</p>
            </div>

            {/* ─── Up next — the planning hook ───────────────────────────── */}
            {upNext && (
                <Link
                    href={`/programs/${upNext.program.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 mb-5 transition-all"
                    style={{ borderColor: `${upNext.program.color}30`, backgroundColor: `${upNext.program.color}08` }}
                >
                    <div className="min-w-0">
                        <p className="text-[9px] font-bold tracking-widest uppercase text-ink/30 mb-0.5">Up next</p>
                        <p className="text-sm font-semibold text-ink truncate">
                            Day {upNext.dayIndex + 1} — {upNext.dayName}
                        </p>
                        <p className="text-[10px] text-ink/30 mt-0.5">
                            {upNext.program.name} · {upNext.doneDays}/{upNext.totalDays} days done
                        </p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink/25 flex-shrink-0">
                        <polyline points="9,18 15,12 9,6" />
                    </svg>
                </Link>
            )}

            {/* ─── Month grid ────────────────────────────────────────────── */}
            <div className="border border-ink/5 rounded-2xl p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => changeMonth(-1)}
                        aria-label="Previous month"
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-ink/10 text-ink/40 hover:text-ink/80 hover:border-ink/20 transition-all cursor-pointer"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15,18 9,12 15,6" /></svg>
                    </button>
                    <h2 className="text-sm font-bold text-ink font-display tracking-wide">{monthLabel}</h2>
                    <button
                        onClick={() => changeMonth(1)}
                        disabled={isCurrentMonth}
                        aria-label="Next month"
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-ink/10 text-ink/40 hover:text-ink/80 hover:border-ink/20 transition-all cursor-pointer disabled:opacity-25 disabled:cursor-default"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,18 15,12 9,6" /></svg>
                    </button>
                </div>

                <div className="grid grid-cols-7 mb-1.5">
                    {WEEKDAYS.map((d) => (
                        <span key={d} className="text-center text-[9px] font-bold tracking-widest uppercase text-ink/20">{d.charAt(0)}</span>
                    ))}
                </div>

                {entries === null ? (
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: 35 }, (_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: leadingBlanks }, (_, i) => <span key={`b${i}`} />)}
                        {Array.from({ length: daysInMonth }, (_, i) => {
                            const date = new Date(cursor.getFullYear(), cursor.getMonth(), i + 1);
                            const key = dayKey(date);
                            const dayEntries = entries.get(key) ?? [];
                            const hasStrength = dayEntries.some((e) => e.kind === 'strength');
                            const hasCardio = dayEntries.some((e) => e.kind === 'cardio');
                            const isToday = dayKey(today) === key;
                            const isSelected = selectedInMonth && selectedKey === key;
                            const isFuture = date.getTime() > today.getTime() && !isToday;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setSelected(date)}
                                    aria-label={date.toDateString()}
                                    className={`relative aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs transition-all cursor-pointer
                                        ${isSelected ? 'bg-accent/15 border border-accent/40' : 'border border-transparent hover:bg-ink/5'}
                                        ${isFuture ? 'opacity-35' : ''}`}
                                >
                                    <span className={`leading-none font-semibold ${isToday ? 'text-accent' : dayEntries.length > 0 ? 'text-ink/80' : 'text-ink/35'}`} style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                        {i + 1}
                                    </span>
                                    <span className="flex items-center gap-0.5 h-1.5">
                                        {hasStrength && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                                        {hasCardio && <span className="w-1.5 h-1.5 rounded-full bg-info" />}
                                    </span>
                                    {isToday && !isSelected && (
                                        <span className="absolute inset-0 rounded-lg border border-accent/30 pointer-events-none" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Legend + month tally */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-ink/5">
                    <div className="flex items-center gap-4 text-[10px] text-ink/30">
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-accent" /> Strength</span>
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-info" /> Cardio</span>
                    </div>
                    <p className="text-[10px] text-ink/30">
                        <span className="font-bold text-ink/60">{totalSessions}</span> session{totalSessions === 1 ? '' : 's'} · <span className="font-bold text-ink/60">{activeDays}</span> active day{activeDays === 1 ? '' : 's'}
                    </p>
                </div>
            </div>

            {/* ─── Selected day detail ───────────────────────────────────── */}
            <div className="mt-5">
                <h2 className="text-[10px] font-bold tracking-widest uppercase text-ink/30 mb-2.5">
                    {selected.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h2>
                {selectedEntries.length === 0 ? (
                    <div className="border border-ink/5 rounded-xl px-4 py-6 text-center">
                        <p className="text-xs text-ink/30">
                            {selected.getTime() > today.getTime()
                                ? 'Nothing planned here yet — days complete as you train.'
                                : 'Rest day — nothing logged.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {selectedEntries.map((e) => (
                            <Link
                                key={e.id}
                                href={e.href}
                                className="flex items-center gap-3 glass-panel rounded-xl p-3.5 hover:border-accent/30 transition-all"
                            >
                                <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${e.kind === 'cardio' ? 'bg-info/10 text-info' : 'bg-accent/10 text-accent'}`}>
                                    {e.kind === 'cardio' ? (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.4 12.6a5.5 5.5 0 00-8.4-7 5.5 5.5 0 00-8.4 7L12 21l4.2-4.2" /><polyline points="7,12 10,12 12,8 14,15 16,12 21,12" /></svg>
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h-2a1 1 0 00-1 1v3a1 1 0 001 1h2" /><path d="M17.5 6.5h2a1 1 0 011 1v3a1 1 0 01-1 1h-2" /><rect x="6.5" y="4" width="11" height="10" rx="1" /><line x1="12" y1="14" x2="12" y2="20" /></svg>
                                    )}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-semibold text-ink/85 truncate">{e.name}</span>
                                    <span className="block text-[11px] text-ink/35 mt-0.5 truncate">{e.meta}</span>
                                </span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink/20 flex-shrink-0"><polyline points="9,18 15,12 9,6" /></svg>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
