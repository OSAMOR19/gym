/**
 * /api/admin/exercises
 *   GET — per-exercise live flags + 30-day detection-quality signals
 *         (sessions, avg form score, form-issue rate). This is how the admin
 *         spots a broken CV config in the wild.
 *   PUT — flip an exercise live/off. Disabled exercises disappear from the
 *         app's exercise picker (existing program plans keep their days).
 */

import { NextResponse } from 'next/server';
import { requireAdmin, auditAction } from '../../../../lib/admin/adminServer';
import { EXERCISES, ExerciseId } from '../../../../lib/exercises';

export async function GET() {
    const check = await requireAdmin();
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
    const { service } = check.ctx;

    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [{ data: flags }, { data: sets }, { data: issues }] = await Promise.all([
        service.from('exercise_flags').select('exercise_id, enabled'),
        service.from('workout_sets')
            .select('exercise_id, form_score')
            .gte('completed_at', since)
            .limit(10_000),
        service.from('events')
            .select('exercise_id')
            .eq('event_type', 'FORM_ISSUE_DETECTED')
            .gte('created_at', since)
            .limit(10_000),
    ]);

    const disabled = new Set((flags ?? []).filter((f) => !f.enabled).map((f) => f.exercise_id));
    const setAgg = new Map<string, { sets: number; formSum: number; formN: number }>();
    for (const s of sets ?? []) {
        const a = setAgg.get(s.exercise_id) ?? { sets: 0, formSum: 0, formN: 0 };
        a.sets += 1;
        if (typeof s.form_score === 'number') { a.formSum += s.form_score; a.formN += 1; }
        setAgg.set(s.exercise_id, a);
    }
    const issueCounts = new Map<string, number>();
    for (const e of issues ?? []) {
        if (e.exercise_id) issueCounts.set(e.exercise_id, (issueCounts.get(e.exercise_id) ?? 0) + 1);
    }

    const exercises = (Object.keys(EXERCISES) as ExerciseId[]).map((id) => {
        const cfg = EXERCISES[id];
        const agg = setAgg.get(id);
        return {
            id,
            name: cfg.name,
            category: cfg.categoryLabel ?? cfg.category,
            repMode: cfg.repMode,
            enabled: !disabled.has(id),
            sets30d: agg?.sets ?? 0,
            avgForm30d: agg && agg.formN > 0 ? Math.round(agg.formSum / agg.formN) : null,
            formIssues30d: issueCounts.get(id) ?? 0,
        };
    });

    return NextResponse.json({ exercises });
}

export async function PUT(request: Request) {
    const check = await requireAdmin();
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
    const { service } = check.ctx;

    let body: { exerciseId?: string; enabled?: boolean };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { exerciseId, enabled } = body;
    if (!exerciseId || !(exerciseId in EXERCISES) || typeof enabled !== 'boolean') {
        return NextResponse.json({ error: 'A valid exerciseId and enabled flag are required' }, { status: 400 });
    }

    const { error } = await service
        .from('exercise_flags')
        .upsert({
            exercise_id: exerciseId,
            enabled,
            updated_at: new Date().toISOString(),
            updated_by: check.ctx.adminId,
        });
    if (error) {
        return NextResponse.json({ error: 'Could not update the flag — is the admin migration applied?' }, { status: 500 });
    }

    auditAction(check.ctx, enabled ? 'exercise.enable' : 'exercise.disable', exerciseId);
    return NextResponse.json({ ok: true });
}
