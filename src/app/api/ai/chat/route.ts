/**
 * /api/ai/chat — the Iron Track AI Coach endpoint (Gemini Flash).
 *
 * Orchestration only — each concern lives in its own module:
 *   lib/ai/system-prompt.ts   the coach's identity and rules
 *   lib/ai/context-builder.ts fresh structured user context per request
 *   lib/ai/tools.ts           approved data lookups (user-scoped, sanitized)
 *   lib/ai/gemini.ts          the provider call + tool loop
 *
 * Flow: authenticate → validate → rate-limit → load/create conversation →
 * persist the user turn → build context + history → Gemini (may call tools,
 * which run server-side against Supabase under RLS) → persist + return.
 *
 * The browser never talks to Gemini; GEMINI_API_KEY stays server-side.
 */

import { NextResponse } from 'next/server';
import { createClient } from '../../../../utils/supabase/server';
import { COACH_SYSTEM_PROMPT } from '../../../../lib/ai/system-prompt';
import { buildCoachContext } from '../../../../lib/ai/context-builder';
import { TOOL_DECLARATIONS, executeTool } from '../../../../lib/ai/tools';
import { runCoachTurn, isGeminiConfigured, GeminiError } from '../../../../lib/ai/gemini';

const MAX_MESSAGE_CHARS = 2000;
const HISTORY_LIMIT = 20; // turns sent to the model (cost control)

// Best-effort per-user rate limit. In-memory, so it's per server instance —
// good enough to stop accidental hammering; move to a shared store if the
// app ever runs hot across many serverless instances.
const RATE_LIMIT = { windowMs: 60_000, maxRequests: 10 };
const requestLog = new Map<string, number[]>();

function rateLimited(userId: string): boolean {
    const now = Date.now();
    const recent = (requestLog.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
    if (recent.length >= RATE_LIMIT.maxRequests) return true;
    recent.push(now);
    requestLog.set(userId, recent);
    return false;
}

interface ChatBody {
    conversationId?: string;
    message?: string;
}

export async function POST(request: Request) {
    // ── Auth first: nothing is reachable signed out ──
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // ── Validate ──
    let body: ChatBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const message = (body.message ?? '').trim();
    if (!message) {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_CHARS) {
        return NextResponse.json({ error: `Message too long (max ${MAX_MESSAGE_CHARS} characters)` }, { status: 400 });
    }
    if (body.conversationId !== undefined && typeof body.conversationId !== 'string') {
        return NextResponse.json({ error: 'Invalid conversationId' }, { status: 400 });
    }

    if (!isGeminiConfigured()) {
        return NextResponse.json(
            { error: 'The coach is not configured yet — set GEMINI_API_KEY on the server.' },
            { status: 503 },
        );
    }

    if (rateLimited(user.id)) {
        return NextResponse.json({ error: 'Slow down a little — try again in a minute.' }, { status: 429 });
    }

    // ── Conversation (always scoped to the authenticated user) ──
    let conversationId = body.conversationId ?? null;
    if (conversationId) {
        const { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', conversationId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (!conv) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }
    } else {
        const { data: conv, error } = await supabase
            .from('conversations')
            .insert({ user_id: user.id, title: message.slice(0, 48) })
            .select('id')
            .single();
        if (error || !conv) {
            return NextResponse.json(
                { error: 'Could not start a conversation — is the chat migration applied?' },
                { status: 500 },
            );
        }
        conversationId = conv.id;
    }

    // ── Persist the user turn, then gather history + context in parallel ──
    const { error: insertError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'user',
        content: message,
    });
    if (insertError) {
        return NextResponse.json({ error: 'Could not save your message' }, { status: 500 });
    }

    const [{ data: historyRows }, context] = await Promise.all([
        supabase
            .from('messages')
            .select('role, content, created_at')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(HISTORY_LIMIT),
        buildCoachContext(supabase, user.id),
    ]);

    const history = (historyRows ?? [])
        .reverse() // newest-first query → oldest-first for the model
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content as string }));
    if (history.length === 0) history.push({ role: 'user', content: message });

    // ── Gemini turn (tools run here, server-side, user-scoped) ──
    let reply: string;
    let toolCallsMade: string[] = [];
    try {
        const result = await runCoachTurn({
            systemPrompt: COACH_SYSTEM_PROMPT,
            context,
            history,
            tools: TOOL_DECLARATIONS,
            executeTool: (name, args) => executeTool(supabase, user.id, name, args),
        });
        reply = result.text;
        toolCallsMade = result.toolCallsMade;
        if (!reply) reply = "I didn't manage to put an answer together — try rephrasing that.";
    } catch (error) {
        if (error instanceof GeminiError && error.kind === 'rate_limit') {
            return NextResponse.json({ error: 'The coach is busy right now — try again in a minute.' }, { status: 429 });
        }
        if (error instanceof GeminiError && error.kind === 'auth') {
            return NextResponse.json({ error: 'The coach is misconfigured (invalid API key).' }, { status: 503 });
        }
        console.error('[api/ai/chat] Gemini call failed:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'The coach could not respond — try again.' }, { status: 502 });
    }

    // Minimal observability without another service: one structured log line
    console.log(JSON.stringify({
        at: 'ai/chat', conv: conversationId, tools: toolCallsMade, in: message.length, out: reply.length,
    }));

    // ── Persist the assistant turn (best-effort) and bump the conversation ──
    await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'assistant',
        content: reply,
    });
    await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('user_id', user.id);

    return NextResponse.json({ conversationId, reply });
}
