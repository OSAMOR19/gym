/**
 * GET /api/admin/overview — the portal's headline metrics.
 * Aggregates over events + tables; nothing user-identifying leaves here.
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin/adminServer';

export async function GET() {
    const check = await requireAdmin();
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
    const { service } = check.ctx;

    const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

    const countEvents = async (type: string, since: string): Promise<number> => {
        const { count: n } = await service
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('event_type', type)
            .gte('created_at', since);
        return n ?? 0;
    };
    const countRows = async (table: string, sinceColumn?: string, since?: string): Promise<number> => {
        let query = service.from(table).select('*', { count: 'exact', head: true });
        if (sinceColumn && since) query = query.gte(sinceColumn, since);
        const { count: n } = await query;
        return n ?? 0;
    };

    const [
        usersResult,
        workouts7d, cardio7d, started30d, completed30d,
        replays, messages7d, recentActives,
    ] = await Promise.all([
        service.auth.admin.listUsers({ page: 1, perPage: 1 }),
        countEvents('WORKOUT_COMPLETED', daysAgo(7)),
        countRows('cardio_sessions', 'completed_at', daysAgo(7)),
        countEvents('WORKOUT_STARTED', daysAgo(30)),
        countEvents('WORKOUT_COMPLETED', daysAgo(30)),
        countRows('workout_replays'),
        countRows('messages', 'created_at', daysAgo(7)),
        service.from('events').select('user_id').gte('created_at', daysAgo(7)).limit(5000),
    ]);

    const totalUsers = (usersResult.data as unknown as { total?: number })?.total
        ?? usersResult.data?.users?.length ?? 0;
    const activeUsers7d = new Set((recentActives.data ?? []).map((r) => r.user_id)).size;

    return NextResponse.json({
        totalUsers,
        activeUsers7d,
        workouts7d: workouts7d + cardio7d,
        strengthWorkouts7d: workouts7d,
        cardioSessions7d: cardio7d,
        completionRate30d: started30d > 0 ? Math.round((completed30d / started30d) * 100) : null,
        replays,
        chatMessages7d: messages7d,
    });
}
