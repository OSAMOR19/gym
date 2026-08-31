/**
 * GET /api/admin/events?type=… — the live activity feed (latest 100 events,
 * optionally filtered by event type), with user emails resolved for context.
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin/adminServer';

export async function GET(request: Request) {
    const check = await requireAdmin();
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
    const { service } = check.ctx;

    const type = new URL(request.url).searchParams.get('type');
    let query = service
        .from('events')
        .select('id, user_id, event_type, exercise_id, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
    if (type) query = query.eq('event_type', type);

    const [{ data: events }, { data: userList }] = await Promise.all([
        query,
        service.auth.admin.listUsers({ page: 1, perPage: 200 }),
    ]);

    const emailById = new Map((userList?.users ?? []).map((u) => [u.id, u.email ?? '']));
    return NextResponse.json({
        events: (events ?? []).map((e) => ({ ...e, email: emailById.get(e.user_id) ?? '' })),
    });
}
