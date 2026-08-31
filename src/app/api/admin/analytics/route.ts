/**
 * GET /api/admin/analytics — time-series + rankings for the analytics page.
 *
 * Buckets the last 30 days of activity (strength workouts, cardio sessions,
 * average form score), the top exercises by sets, and 8 weeks of signups.
 * All aggregation happens here in one pass; the client only draws.
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin/adminServer';

const DAY_MS = 86_400_000;

function dayKey(iso: string): string {
    return iso.slice(0, 10); // YYYY-MM-DD
}

export async function GET() {
    const check = await requireAdmin();
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
    const { service } = check.ctx;

    const since30 = new Date(Date.now() - 30 * DAY_MS).toISOString();

    const [{ data: workoutEvents }, { data: cardioRows }, { data: sets }, usersResult] = await Promise.all([
        service.from('events')
            .select('created_at')
            .eq('event_type', 'WORKOUT_COMPLETED')
            .gte('created_at', since30)
            .limit(10_000),
        service.from('cardio_sessions')
            .select('completed_at')
            .gte('completed_at', since30)
            .limit(10_000),
        service.from('workout_sets')
            .select('exercise_id, form_score, completed_at')
            .gte('completed_at', since30)
            .limit(10_000),
        service.auth.admin.listUsers({ page: 1, perPage: 200 }),
    ]);

    // ── daily series, oldest → newest ──
    const strengthByDay = new Map<string, number>();
    for (const e of workoutEvents ?? []) {
        const k = dayKey(e.created_at);
        strengthByDay.set(k, (strengthByDay.get(k) ?? 0) + 1);
    }
    const cardioByDay = new Map<string, number>();
    for (const c of cardioRows ?? []) {
        const k = dayKey(c.completed_at);
        cardioByDay.set(k, (cardioByDay.get(k) ?? 0) + 1);
    }
    const formByDay = new Map<string, { sum: number; n: number }>();
    const setsByExercise = new Map<string, number>();
    for (const s of sets ?? []) {
        setsByExercise.set(s.exercise_id, (setsByExercise.get(s.exercise_id) ?? 0) + 1);
        if (typeof s.form_score === 'number') {
            const k = dayKey(s.completed_at);
            const agg = formByDay.get(k) ?? { sum: 0, n: 0 };
            agg.sum += s.form_score;
            agg.n += 1;
            formByDay.set(k, agg);
        }
    }

    const days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(Date.now() - (29 - i) * DAY_MS);
        const k = date.toISOString().slice(0, 10);
        const form = formByDay.get(k);
        return {
            date: k,
            label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            strength: strengthByDay.get(k) ?? 0,
            cardio: cardioByDay.get(k) ?? 0,
            avgForm: form && form.n > 0 ? Math.round(form.sum / form.n) : null,
        };
    });

    // ── top exercises by sets ──
    const topExercises = [...setsByExercise.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id, count]) => ({ id, sets: count }));

    // ── weekly signups, last 8 weeks ──
    const users = usersResult.data?.users ?? [];
    const weeks = Array.from({ length: 8 }, (_, i) => {
        const start = new Date(Date.now() - (7 - i) * 7 * DAY_MS);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getTime() + 7 * DAY_MS);
        return {
            label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            signups: users.filter((u) => {
                const created = new Date(u.created_at);
                return created >= start && created < end;
            }).length,
        };
    });

    return NextResponse.json({ days, topExercises, weeks });
}
