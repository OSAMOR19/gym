/**
 * /api/voice — ElevenLabs text-to-speech proxy for the workout voice coach.
 *
 * The API key never reaches the browser: clients GET ?text=… and receive
 * audio/mpeg. Costs are protected three ways:
 *   1. auth required (a signed-in user, same as every data route),
 *   2. per-user rate limit,
 *   3. a server-side LRU keyed by phrase — workout cues repeat constantly
 *      ("Halfway there!", "3", "2", "1"), so most requests never reach
 *      ElevenLabs at all. Responses are also browser-cacheable (immutable),
 *      making repeat phrases on one device fully local.
 *
 * Missing key → 503; clients fall back to browser SpeechSynthesis silently.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../utils/supabase/server';

const MODEL_ID = 'eleven_flash_v2_5';           // lowest-latency ElevenLabs model
const OUTPUT_FORMAT = 'mp3_22050_32';           // small + fast, fine for short cues
// Premade "Adam" — available on every ElevenLabs plan via API.
const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB';
const MAX_TEXT_LENGTH = 220;

// ── Server-side phrase cache (LRU by insertion order) ─────────────────────
const CACHE_MAX = 300;
const phraseCache = new Map<string, ArrayBuffer>();

function cacheGet(key: string): ArrayBuffer | undefined {
    const hit = phraseCache.get(key);
    if (hit) {
        // refresh recency
        phraseCache.delete(key);
        phraseCache.set(key, hit);
    }
    return hit;
}

function cacheSet(key: string, value: ArrayBuffer): void {
    phraseCache.set(key, value);
    if (phraseCache.size > CACHE_MAX) {
        const oldest = phraseCache.keys().next().value;
        if (oldest !== undefined) phraseCache.delete(oldest);
    }
}

// ── Per-user rate limit (in-memory, per instance) ──────────────────────────
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
const usage = new Map<string, { windowStart: number; count: number }>();

function rateLimited(userId: string): boolean {
    const now = Date.now();
    const u = usage.get(userId);
    if (!u || now - u.windowStart > WINDOW_MS) {
        usage.set(userId, { windowStart: now, count: 1 });
        return false;
    }
    u.count += 1;
    return u.count > MAX_PER_WINDOW;
}

export async function GET(req: NextRequest) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'Voice is not configured.' }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }
    if (rateLimited(user.id)) {
        return NextResponse.json({ error: 'Too many voice requests — slow down.' }, { status: 429 });
    }

    const text = (req.nextUrl.searchParams.get('text') ?? '').trim();
    if (!text || text.length > MAX_TEXT_LENGTH) {
        return NextResponse.json({ error: 'text must be 1-220 characters.' }, { status: 400 });
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
    const cacheKey = `${voiceId}:${text}`;

    let audio = cacheGet(cacheKey);
    if (!audio) {
        const tts = (voice: string) => fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=${OUTPUT_FORMAT}`,
            {
                method: 'POST',
                headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    model_id: MODEL_ID,
                    voice_settings: { stability: 0.5, similarity_boost: 0.75 },
                }),
            },
        );
        let res = await tts(voiceId);
        // Library voices 402 on free plans — degrade to the premade default
        // instead of silencing the coach.
        if (res.status === 402 && voiceId !== DEFAULT_VOICE_ID) {
            console.warn('[voice] configured voice is plan-gated (402); using default voice');
            res = await tts(DEFAULT_VOICE_ID);
        }
        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            console.warn('[voice] ElevenLabs error', res.status, detail.slice(0, 200));
            return NextResponse.json({ error: 'Voice generation failed.' }, { status: 502 });
        }
        audio = await res.arrayBuffer();
        cacheSet(cacheKey, audio);
    }

    return new NextResponse(audio, {
        headers: {
            'Content-Type': 'audio/mpeg',
            // Same phrase = same audio forever — let each browser keep it.
            'Cache-Control': 'private, max-age=31536000, immutable',
        },
    });
}
