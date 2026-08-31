/**
 * Voice engine — ElevenLabs first, browser SpeechSynthesis as fallback.
 *
 * speakEleven() fetches short MP3 cues from /api/voice and plays them through
 * one shared <audio> element (new cue interrupts the current one, matching
 * the old speechSynthesis.cancel() behavior). Phrases are cached as object
 * URLs so repeated cues ("3", "2", "1", "Halfway there!") play instantly
 * and cost nothing after the first fetch.
 *
 * If the route is unavailable (no key, signed out, offline) the engine marks
 * itself down for a while and callers fall back to SpeechSynthesis — voice
 * coaching must never go silent because a network call failed.
 */

const CACHE_MAX = 100;
const urlCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

let audioEl: HTMLAudioElement | null = null;
/** When ElevenLabs last proved unusable; retried after a cool-off. */
let downUntil = 0;
const DOWN_MS = 5 * 60_000;

function getAudio(): HTMLAudioElement {
    if (!audioEl) {
        audioEl = new Audio();
        audioEl.preload = 'auto';
    }
    return audioEl;
}

function cachePut(key: string, url: string): void {
    urlCache.set(key, url);
    if (urlCache.size > CACHE_MAX) {
        const oldest = urlCache.keys().next().value;
        if (oldest !== undefined) {
            const old = urlCache.get(oldest);
            if (old) URL.revokeObjectURL(old);
            urlCache.delete(oldest);
        }
    }
}

async function fetchPhrase(text: string): Promise<string | null> {
    const cached = urlCache.get(text);
    if (cached) return cached;
    const pending = inflight.get(text);
    if (pending) return pending;

    const promise = (async (): Promise<string | null> => {
        try {
            const res = await fetch(`/api/voice?text=${encodeURIComponent(text)}`);
            if (!res.ok) {
                // 503 = not configured, 401 = signed out: stop trying for a while
                if (res.status === 503 || res.status === 401) downUntil = Date.now() + DOWN_MS;
                return null;
            }
            const blob = await res.blob();
            if (blob.size === 0) return null;
            const url = URL.createObjectURL(blob);
            cachePut(text, url);
            return url;
        } catch {
            downUntil = Date.now() + 60_000; // offline — retry sooner
            return null;
        } finally {
            inflight.delete(text);
        }
    })();
    inflight.set(text, promise);
    return promise;
}

/**
 * Speak via ElevenLabs. Resolves true when playback STARTED (callers skip
 * their fallback), false when the caller should use SpeechSynthesis instead.
 */
export async function speakEleven(text: string, onDone?: () => void, raceMs?: number): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (Date.now() < downUntil) return false;

    // Time-critical cues (countdown beats) can't wait on a fetch: race it —
    // on timeout the caller falls back while the fetch finishes in the
    // background and warms the cache for the next beat.
    const urlPromise = fetchPhrase(text);
    const url = raceMs
        ? await Promise.race([urlPromise, new Promise<null>((r) => setTimeout(() => r(null), raceMs))])
        : await urlPromise;
    if (!url) return false;

    try {
        const audio = getAudio();
        audio.pause();
        audio.muted = false;
        audio.onended = onDone ?? null;
        audio.onerror = onDone ?? null;
        audio.src = url;
        audio.currentTime = 0;
        await audio.play();
        return true;
    } catch {
        // Autoplay blocked (no user gesture yet) or decode issue — fall back.
        onDone?.();
        return false;
    }
}

/**
 * Unlock audio playback — call synchronously inside a user gesture (the
 * Start button). iOS/Safari only allow later programmatic play() on an
 * element that has played once during a gesture; a silent 1ms WAV does it.
 */
const SILENT_WAV = 'data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQgAAACAgICAgICAgA==';

export function primeAudio(): void {
    if (typeof window === 'undefined') return;
    try {
        const audio = getAudio();
        audio.muted = true;
        audio.src = SILENT_WAV;
        void audio.play().catch(() => { /* will fall back to speechSynthesis */ });
    } catch { /* ignore */ }
}

/** Stop any in-progress ElevenLabs playback. */
export function stopEleven(): void {
    if (audioEl) {
        audioEl.onended = null;
        audioEl.onerror = null;
        audioEl.pause();
    }
}

/** Warm the phrase cache (fire-and-forget) — e.g. countdown numbers. */
export function prefetchPhrases(texts: string[]): void {
    if (typeof window === 'undefined' || Date.now() < downUntil) return;
    for (const text of texts) void fetchPhrase(text);
}
