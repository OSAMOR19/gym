/**
 * /api/admin/users
 *   GET  — user directory with plan, activity, and workout counts
 *   PUT  — set a user's plan ('free' | 'pro'); manual until payments land,
 *          after which Stripe webhooks will write the same field
 */

import { NextResponse } from 'next/server';
import { requireAdmin, auditAction } from '../../../../lib/admin/adminServer';

export async function GET() {
    const check = await requireAdmin();
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
    const { service } = check.ctx;

    const [{ data: userList }, { data: profiles }, { data: workoutEvents }] = await Promise.all([
        service.auth.admin.listUsers({ page: 1, perPage: 200 }),
        service.from('user_profiles').select('user_id, plan, intake_completed_at'),
        service.from('events')
            .select('user_id, created_at')
            .eq('event_type', 'WORKOUT_COMPLETED')
            .order('created_at', { ascending: false })
            .limit(5000),
    ]);

    const planByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    const workoutsByUser = new Map<string, { count: number; last: string }>();
    for (const e of workoutEvents ?? []) {
        const entry = workoutsByUser.get(e.user_id);
        if (entry) entry.count += 1;
        else workoutsByUser.set(e.user_id, { count: 1, last: e.created_at });
    }

    const users = (userList?.users ?? []).map((u) => ({
        id: u.id,
        email: u.email ?? '',
        name: (u.user_metadata as { full_name?: string })?.full_name ?? u.email?.split('@')[0] ?? '',
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
        plan: planByUser.get(u.id)?.plan ?? 'free',
        hasIntake: !!planByUser.get(u.id)?.intake_completed_at,
        workouts: workoutsByUser.get(u.id)?.count ?? 0,
        lastWorkout: workoutsByUser.get(u.id)?.last ?? null,
    })).sort((a, b) => (b.lastWorkout ?? b.createdAt).localeCompare(a.lastWorkout ?? a.createdAt));

    return NextResponse.json({ users });
}

export async function PUT(request: Request) {
    const check = await requireAdmin();
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
    const { service } = check.ctx;

    let body: { userId?: string; plan?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { userId, plan } = body;
    if (!userId || (plan !== 'free' && plan !== 'pro')) {
        return NextResponse.json({ error: 'userId and plan (free|pro) are required' }, { status: 400 });
    }

    const { error } = await service
        .from('user_profiles')
        .upsert(
            { user_id: userId, plan, plan_updated_at: new Date().toISOString() },
            { onConflict: 'user_id' },
        );
    if (error) {
        return NextResponse.json({ error: 'Could not update plan — is the admin migration applied?' }, { status: 500 });
    }

    auditAction(check.ctx, 'user.set_plan', userId, { plan });
    return NextResponse.json({ ok: true });
}
