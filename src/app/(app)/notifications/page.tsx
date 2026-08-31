/**
 * Notifications — the user's activity feed, derived from the events stream.
 *
 * Two layers: "For you" (live coach nudges — actionable, tap to open the
 * coach) and the history feed (workouts, program days, cardio, replays,
 * coach adjustments) grouped by day. Opening the page marks everything
 * seen; items newer than the previous visit carry an accent dot.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
    AppNotification,
    fetchNotifications,
    getLastSeen,
    markAllSeen,
} from '../../../lib/notifications';
import { getCoachNudges, CoachNudge } from '../../../lib/coachNudges';
import { openCoachChat } from '../../../components/CoachChat';
import Skeleton from '../../../components/Skeleton';

/* ─── Per-kind icon chips ──────────────────────────────────────────────── */

const ICONS: Record<AppNotification['kind'], React.ReactNode> = {
    workout: <><path d="M6.5 6.5h-2a1 1 0 00-1 1v3a1 1 0 001 1h2" /><path d="M17.5 6.5h2a1 1 0 011 1v3a1 1 0 01-1 1h-2" /><rect x="6.5" y="4" width="11" height="10" rx="1" /><line x1="12" y1="14" x2="12" y2="20" /></>,
    program: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 14l2 2 4-4" /></>,
    cardio: <><path d="M20.4 12.6a5.5 5.5 0 00-8.4-7 5.5 5.5 0 00-8.4 7L12 21l4.2-4.2" /><polyline points="7,12 10,12 12,8 14,15 16,12 21,12" /></>,
    replay: <><circle cx="12" cy="12" r="9" /><polygon points="10,8 16,12 10,16" /></>,
    coach: <><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></>,
    pr: <><polygon points="12,2 15,8.5 22,9.3 17,14 18.5,21 12,17.5 5.5,21 7,14 2,9.3 9,8.5" /></>,
};

function KindIcon({ kind }: { kind: AppNotification['kind'] }) {
    return (
        <span className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                {ICONS[kind]}
            </svg>
        </span>
    );
}

/* ─── Day grouping ─────────────────────────────────────────────────────── */

function dayLabel(d: Date): string {
    const now = new Date();
    const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return 'This week';
    return 'Earlier';
}

function timeLabel(d: Date): string {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/* ─── Page ─────────────────────────────────────────────────────────────── */

export default function NotificationsPage() {
    const [notifs, setNotifs] = useState<AppNotification[] | null>(null);
    const [nudges, setNudges] = useState<CoachNudge[]>([]);
    // Capture the previous visit's watermark BEFORE marking seen, so the
    // "new" dots survive this render.
    const prevSeenRef = useRef(0);

    useEffect(() => {
        prevSeenRef.current = getLastSeen();
        let cancelled = false;
        Promise.allSettled([fetchNotifications(), getCoachNudges()]).then(([n, g]) => {
            if (cancelled) return;
            setNotifs(n.status === 'fulfilled' ? n.value : []);
            setNudges(g.status === 'fulfilled' ? g.value : []);
            markAllSeen();
        });
        return () => { cancelled = true; };
    }, []);

    const groups: Array<[string, AppNotification[]]> = [];
    if (notifs) {
        for (const n of notifs) {
            const label = dayLabel(n.createdAt);
            const last = groups[groups.length - 1];
            if (last && last[0] === label) last[1].push(n);
            else groups.push([label, [n]]);
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-8">
            <div className="hidden md:block mb-6">
                <h1 className="text-2xl font-bold text-ink font-display">Notifications</h1>
                <p className="text-xs text-ink/30 mt-1">What happened in your training, newest first.</p>
            </div>

            {/* ─── For you — live coach nudges ─────────────────────────── */}
            {nudges.length > 0 && (
                <section className="mb-7">
                    <h2 className="text-[10px] font-bold tracking-widest uppercase text-ink/30 mb-2.5">For you</h2>
                    <div className="space-y-2">
                        {nudges.map((nudge) => (
                            <button
                                key={nudge.id}
                                onClick={() => openCoachChat(nudge.action === 'intake' ? 'intake' : undefined)}
                                className="w-full flex items-center gap-3 glass-panel rounded-xl p-3.5 text-left hover:border-accent/30 transition-all cursor-pointer group"
                            >
                                <KindIcon kind="coach" />
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-semibold text-ink/85 group-hover:text-ink transition-colors">
                                        {nudge.label}
                                    </span>
                                    <span className="block text-[11px] text-ink/30 mt-0.5">From your coach — tap to talk it through</span>
                                </span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink/20 group-hover:text-accent transition-colors flex-shrink-0">
                                    <polyline points="9,18 15,12 9,6" />
                                </svg>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* ─── Feed ─────────────────────────────────────────────────── */}
            {notifs === null ? (
                <div className="space-y-2.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="glass-panel rounded-xl p-3.5 flex items-center gap-3">
                            <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-3 w-2/3 rounded" />
                                <Skeleton className="h-2.5 w-1/3 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : notifs.length === 0 ? (
                <div className="glass-panel rounded-2xl px-6 py-14 text-center">
                    <span className="mx-auto w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 01-3.46 0" />
                        </svg>
                    </span>
                    <p className="text-sm font-semibold text-ink/70 mt-4">Nothing here yet</p>
                    <p className="text-xs text-ink/30 mt-1.5 max-w-xs mx-auto">
                        Finish a workout and your milestones — completed days, records, highlight reels — will land here.
                    </p>
                    <Link
                        href="/workout"
                        className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-accent text-black text-xs font-bold hover:bg-accent-strong transition-colors"
                    >
                        Start training
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {groups.map(([label, items]) => (
                        <section key={label}>
                            <h2 className="text-[10px] font-bold tracking-widest uppercase text-ink/30 mb-2.5">{label}</h2>
                            <div className="space-y-2">
                                {items.map((n) => {
                                    const isNew = n.createdAt.getTime() > prevSeenRef.current;
                                    const inner = (
                                        <>
                                            <KindIcon kind={n.kind} />
                                            <span className="flex-1 min-w-0">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="text-sm font-semibold text-ink/85 truncate">{n.title}</span>
                                                    {isNew && <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" aria-label="New" />}
                                                </span>
                                                <span className="block text-[11px] text-ink/35 mt-0.5 truncate">{n.body}</span>
                                            </span>
                                            <span className="text-[10px] text-ink/25 flex-shrink-0 tabular-nums">{timeLabel(n.createdAt)}</span>
                                        </>
                                    );
                                    const cardClass = 'w-full flex items-center gap-3 glass-panel rounded-xl p-3.5 text-left transition-all';
                                    return n.href ? (
                                        <Link key={n.id} href={n.href} className={`${cardClass} hover:border-accent/30`}>
                                            {inner}
                                        </Link>
                                    ) : (
                                        <div key={n.id} className={cardClass}>{inner}</div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}
