/**
 * Admin server helpers — the ONLY place the service-role key is used.
 *
 * Every /api/admin/* route calls requireAdmin(): it authenticates the caller
 * from their session cookie, confirms they have an admin_users row, and only
 * then hands back a service-role client (which bypasses RLS — that's the
 * point of an admin). The service key lives in SUPABASE_SERVICE_ROLE_KEY,
 * server-side only; it must NEVER appear in a NEXT_PUBLIC_ variable.
 */

import { createClient as createServiceClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createSessionClient } from '../../utils/supabase/server';

export interface AdminContext {
    service: SupabaseClient;
    adminId: string;
    role: string;
}

export type AdminCheck =
    | { ok: true; ctx: AdminContext }
    | { ok: false; status: number; error: string };

let cachedService: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    if (!cachedService) {
        cachedService = createServiceClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
    }
    return cachedService;
}

export async function requireAdmin(): Promise<AdminCheck> {
    const service = getServiceClient();
    if (!service) {
        return {
            ok: false,
            status: 503,
            error: 'Admin portal is not configured — set SUPABASE_SERVICE_ROLE_KEY on the server.',
        };
    }

    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) return { ok: false, status: 401, error: 'Not signed in' };

    const { data: adminRow } = await service
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
    if (!adminRow) return { ok: false, status: 403, error: 'Not an admin' };

    return { ok: true, ctx: { service, adminId: user.id, role: adminRow.role } };
}

/** Fire-and-forget audit entry for every admin write. */
export function auditAction(
    ctx: AdminContext,
    action: string,
    target: string,
    metadata: Record<string, unknown> = {},
): void {
    void ctx.service
        .from('admin_actions')
        .insert({ admin_id: ctx.adminId, action, target, metadata })
        .then(({ error }) => {
            if (error) console.warn('[admin] audit write failed:', error.message);
        });
}
