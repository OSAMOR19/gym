/**
 * /api/chat — the AI coach endpoint (IronTrack's first server-side LLM call).
 *
 * POST { conversationId?: string, message: string }
 *  → { conversationId, reply }
 *
 * Flow: authenticate → load/create the conversation → persist the user
 * message → build the data context (coachContext) → call Claude → persist
 * and return the reply. All DB access goes through the cookie-authenticated
 * Supabase server client, so RLS applies exactly as it does client-side.
 *
 * The LLM explains and coaches around the app's deterministic decisions
 * (intake scoring, substitution, progression, readiness) — it never makes
 * them. The API key stays server-side (ANTHROPIC_API_KEY, never NEXT_PUBLIC).
 */

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '../../../utils/supabase/server';
import { buildCoachContext } from '../../../lib/coachContext';

const MAX_MESSAGE_CHARS = 2000;
const HISTORY_LIMIT = 30;

const COACH_PERSONA = `You are the IronTrack coach — the in-app training coach of IronTrack, a camera-based workout tracker that counts reps and scores form with pose detection.

How to coach:
- Ground everything in the USER CONTEXT block. Reference their actual numbers, dates, exercises, and trends. If the data doesn't cover something, say so plainly instead of guessing.
- Be concise and conversational: a few short sentences, or a short list when comparing options. Plain text only — no markdown headings, bold, or emoji. No hype; encouragement must cite something real ("4 of your last 5 planned sessions" beats "great job").
- IronTrack's deterministic engines decide program matches, exercise substitutions, target adjustments, and ease-back trims. The RECENT APP EVENTS data shows what they did and why — explain those decisions; never claim you changed or will change them. Point users to the app instead: the Programs page to pick or start a plan, the "Find my plan" questions (they run right here in this chat — the button on the Programs or Profile page opens them), the workout page's exercise picker for free workouts.
- Practical personalization: respect their equipment, limitations, schedule, and goal from the profile. Suggest only exercises that fit what they have.
- Safety: you are not a medical professional and never diagnose. For pain (as opposed to normal soreness), injuries, pregnancy, or medical conditions, advise easing off and speaking to a doctor or physiotherapist. Keep training suggestions conservative after long breaks.
- Stay on topic: training, recovery, basic nutrition, and using IronTrack. Politely steer other topics back.`;

interface ChatBody {
    conversationId?: string;
    message?: string;
}

export async function POST(request: Request) {
    // ── Parse & validate ──
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

    if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json(
            { error: 'The coach is not configured yet — set ANTHROPIC_API_KEY on the server.' },
            { status: 503 },
        );
    }

    // ── Auth ──
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // ── Conversation ──
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

    // ── Persist the user turn, load history, build context ──
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
            .select('role, content')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(HISTORY_LIMIT),
        buildCoachContext(supabase, user.id),
    ]);

    const history: Anthropic.Beta.BetaMessageParam[] = (historyRows ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content as string,
    }));
    if (history.length === 0) history.push({ role: 'user', content: message });

    // ── Call Claude ──
    const anthropic = new Anthropic();
    let reply: string;
    try {
        const response = await anthropic.beta.messages.create({
            model: 'claude-opus-5',
            max_tokens: 2000, // chat replies are deliberately short
            output_config: { effort: 'low' }, // fast, cheap turns; context does the heavy lifting
            // Server-side refusal fallback: on a policy decline the API reruns
            // the request on the fallback model within the same call
            betas: ['server-side-fallback-2026-06-01'],
            fallbacks: [{ model: 'claude-opus-4-8' }],
            system: [
                { type: 'text', text: COACH_PERSONA, cache_control: { type: 'ephemeral' } },
                { type: 'text', text: `USER CONTEXT (fresh for this request):\n${context}` },
            ],
            messages: history,
        });

        if (response.stop_reason === 'refusal') {
            reply = "I can't help with that one. If it's about training, recovery, or using IronTrack, ask away.";
        } else {
            reply = response.content
                .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
                .map((b) => b.text)
                .join('\n')
                .trim();
        }
        if (!reply) reply = "I didn't manage to put an answer together — try rephrasing that.";
    } catch (error) {
        if (error instanceof Anthropic.AuthenticationError) {
            return NextResponse.json({ error: 'The coach is misconfigured (invalid API key).' }, { status: 503 });
        }
        if (error instanceof Anthropic.RateLimitError) {
            return NextResponse.json({ error: 'The coach is busy right now — try again in a minute.' }, { status: 429 });
        }
        console.error('[api/chat] Claude call failed:', error);
        return NextResponse.json({ error: 'The coach could not respond — try again.' }, { status: 502 });
    }

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
