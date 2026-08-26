/**
 * Replay composer — renders the ~25s branded recap entirely on-device.
 *
 * The design principle: THE USER IS THE STAR. Highlight clips play full-bleed
 * (cover-cropped to the 720×1280 portrait canvas) with a slow Ken Burns zoom;
 * type and stats sit on gradient scrims OVER the footage, never beside it.
 * Intro and outro are dark branded cards. MediaRecorder captures the canvas
 * stream into the final video — no server renders anything.
 *
 * Timing: intro 2.2s + up to 5 clips × 3.8s + outro 4s ≈ 25.2s max.
 * With no clips at all it still produces an animated stats-only recap, so
 * generation never blocks on footage.
 */

import { HighlightClip, HighlightKind, pickRecordingMime } from './highlightRecorder';

const W = 720;
const H = 1280;
const FPS = 30;
const GREEN = '#22c55e';
const BG = '#0f0f0f';

const INTRO_MS = 2200;
const CLIP_MS = 3800;
const CARD_MS = 3200;   // stats-only fallback cards
const OUTRO_MS = 4000;
const FADE_MS = 320;    // fade from/to black at section edges
const MAX_CLIPS_IN_REPLAY = 5;

const KIND_TITLES: Record<HighlightKind, string> = {
    pr: 'NEW RECORD',
    best_form: 'BEST FORM',
    set_complete: 'SET COMPLETE',
    milestone: 'MILESTONE',
    start: 'LET’S GO',
    finish: 'STRONG FINISH',
};

export interface ReplayStats {
    title: string;                                   // "Push Day" / "Treadmill Run"
    workoutType: 'strength' | 'cardio';
    durationSeconds: number;
    /** Outro rows, e.g. { value: '126', label: 'REPS' }. Max 4 used. */
    lines: Array<{ value: string; label: string }>;
    dateISO: string;
}

export interface ComposedReplay {
    blob: Blob;
    thumbnail: Blob | null;
    durationSeconds: number;
    mimeType: string;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

function fmtClock(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.round(totalSeconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

/** Preload a clip blob into a playable, muted, looping video element. */
async function loadClipVideo(blob: Blob): Promise<HTMLVideoElement | null> {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.src = URL.createObjectURL(blob);
    try {
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('clip load timeout')), 6000);
            video.onloadeddata = () => { clearTimeout(timeout); resolve(); };
            video.onerror = () => { clearTimeout(timeout); reject(new Error('clip load error')); };
        });
        return video;
    } catch {
        URL.revokeObjectURL(video.src);
        return null;
    }
}

export async function composeReplay(
    clips: HighlightClip[],
    stats: ReplayStats,
): Promise<ComposedReplay> {
    const mime = pickRecordingMime();
    if (!mime) throw new Error('This browser cannot record video.');
    await document.fonts.ready.catch(() => {});

    // Load whatever clips actually decode; broken ones just drop out
    const usable = (await Promise.all(
        clips.slice(0, MAX_CLIPS_IN_REPLAY).map(async (c) => ({ clip: c, video: await loadClipVideo(c.blob) })),
    )).filter((c): c is { clip: HighlightClip; video: HTMLVideoElement } => c.video !== null);

    // Build the section timeline
    type Section =
        | { type: 'intro'; ms: number }
        | { type: 'clip'; ms: number; clip: HighlightClip; video: HTMLVideoElement }
        | { type: 'card'; ms: number; index: number }
        | { type: 'outro'; ms: number };
    const sections: Section[] = [{ type: 'intro', ms: INTRO_MS }];
    if (usable.length > 0) {
        for (const u of usable) sections.push({ type: 'clip', ms: CLIP_MS, clip: u.clip, video: u.video });
    } else {
        stats.lines.slice(0, 3).forEach((_, i) => sections.push({ type: 'card', ms: CARD_MS, index: i }));
    }
    sections.push({ type: 'outro', ms: OUTRO_MS });
    const totalMs = sections.reduce((a, s) => a + s.ms, 0);

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const stream = canvas.captureStream(FPS);
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    const done = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

    let thumbnail: Blob | null = null;
    const captureThumb = () => new Promise<void>((resolve) => {
        canvas.toBlob((b) => { thumbnail = b; resolve(); }, 'image/jpeg', 0.82);
    });

    // ── drawing helpers ──────────────────────────────────────────────────────

    const font = (weight: number, px: number) => `${weight} ${px}px Orbitron, monospace`;
    const sysFont = (weight: number, px: number) =>
        `${weight} ${px}px -apple-system, 'Inter', sans-serif`;

    const boltPath = new Path2D('M13 10V3L4 14h7v7l9-11h-7z');

    /** Bolt tile + IRONTRACK wordmark, centered at (cx, cy). */
    function drawBrand(cx: number, cy: number, scale = 1, alpha = 1) {
        ctx.save();
        ctx.globalAlpha = alpha;
        const tile = 42 * scale;
        ctx.font = font(700, 24 * scale);
        const wordW = ctx.measureText('IRONTRACK').width;
        const total = tile + 12 * scale + wordW;
        ctx.translate(cx - total / 2, cy - tile / 2);
        ctx.fillStyle = GREEN;
        ctx.beginPath();
        ctx.roundRect(0, 0, tile, tile, 10 * scale);
        ctx.fill();
        ctx.save();
        ctx.translate(tile * 0.16, tile * 0.16);
        ctx.scale((tile * 0.68) / 24, (tile * 0.68) / 24);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke(boltPath);
        ctx.restore();
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff';
        ctx.fillText('IRON', tile + 12 * scale, tile / 2 + 1);
        const ironW = ctx.measureText('IRON').width;
        ctx.fillStyle = GREEN;
        ctx.fillText('TRACK', tile + 12 * scale + ironW, tile / 2 + 1);
        ctx.restore();
    }

    function drawBackground() {
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(255,255,255,0.025)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= W; x += 72) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y <= H; y += 72) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    }

    function drawProgress(elapsed: number) {
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fillRect(0, H - 5, W, 5);
        ctx.fillStyle = GREEN;
        ctx.fillRect(0, H - 5, W * clamp01(elapsed / totalMs), 5);
    }

    /** Centered text that shrinks to fit within maxWidth. */
    function fitText(text: string, y: number, fontPx: number, weight: number, useBrandFont: boolean, color: string, alpha = 1, maxWidth = W - 80) {
        ctx.save();
        ctx.globalAlpha = alpha;
        let px = fontPx;
        const setFont = () => { ctx.font = useBrandFont ? font(weight, px) : sysFont(weight, px); };
        setFont();
        while (px > 16 && ctx.measureText(text).width > maxWidth) { px -= 2; setFont(); }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(text, W / 2, y);
        ctx.restore();
    }

    /** Letter-spaced kicker line (canvas has no letter-spacing — do it manually). */
    function kicker(text: string, y: number, color: string, alpha = 1) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = sysFont(700, 19);
        ctx.textBaseline = 'middle';
        const spacing = 7;
        const chars = text.split('');
        const total = chars.reduce((a, c) => a + ctx.measureText(c).width + spacing, -spacing);
        let x = W / 2 - total / 2;
        ctx.textAlign = 'left';
        ctx.fillStyle = color;
        for (const c of chars) {
            ctx.fillText(c, x, y);
            x += ctx.measureText(c).width + spacing;
        }
        ctx.restore();
    }

    /** Full-bleed cover-crop of the clip with a slow Ken Burns push-in. */
    function drawClipFrame(video: HTMLVideoElement, t: number) {
        const vw = video.videoWidth || 1280;
        const vh = video.videoHeight || 720;
        const zoom = 1.04 + 0.08 * t; // slow push-in across the clip
        const canvasAspect = W / H;
        const videoAspect = vw / vh;
        let sw: number, sh: number;
        if (videoAspect > canvasAspect) {
            sh = vh / zoom;
            sw = sh * canvasAspect;
        } else {
            sw = vw / zoom;
            sh = sw / canvasAspect;
        }
        const sx = (vw - sw) / 2;
        const sy = (vh - sh) / 2;
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H);
    }

    function drawScrims() {
        const top = ctx.createLinearGradient(0, 0, 0, H * 0.28);
        top.addColorStop(0, 'rgba(0,0,0,0.72)');
        top.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = top;
        ctx.fillRect(0, 0, W, H * 0.28);
        const bottom = ctx.createLinearGradient(0, H * 0.62, 0, H);
        bottom.addColorStop(0, 'rgba(0,0,0,0)');
        bottom.addColorStop(1, 'rgba(0,0,0,0.82)');
        ctx.fillStyle = bottom;
        ctx.fillRect(0, H * 0.62, W, H * 0.38);
    }

    function drawSection(section: Section, t: number, elapsed: number, sectionMs: number) {
        const inT = easeOut(clamp01((t * sectionMs) / 420));  // entrance ease
        const rise = (1 - inT) * 30;

        if (section.type === 'intro') {
            drawBackground();
            // green accent line sweeps open behind the brand
            const lineW = easeOut(clamp01(t * 2)) * (W - 200);
            ctx.fillStyle = 'rgba(34,197,94,0.25)';
            ctx.fillRect(W / 2 - lineW / 2, H * 0.355, lineW, 2);
            drawBrand(W / 2, H * 0.30 - rise, 1.7, inT);
            fitText('WORKOUT', H * 0.44, 64, 900, true, '#fff', inT);
            fitText('COMPLETE', H * 0.505, 64, 900, true, GREEN, inT);
            kicker(stats.title.toUpperCase(), H * 0.585 + rise, 'rgba(255,255,255,0.6)', inT);
            fitText(
                new Date(stats.dateISO).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                H * 0.635, 19, 500, false, 'rgba(255,255,255,0.3)', inT,
            );
        }

        if (section.type === 'clip') {
            // The user, full screen — everything else is an overlay
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, W, H);
            if (section.video.readyState >= 2) {
                drawClipFrame(section.video, t);
            }
            drawScrims();
            drawBrand(W / 2, 64, 0.75, 0.85);
            kicker(KIND_TITLES[section.clip.kind], H * 0.115 + rise, GREEN, inT);
            // label chip near the bottom, over the scrim
            fitText(section.clip.label.toUpperCase(), H * 0.855 + rise, 40, 900, true, '#fff', inT);
        }

        if (section.type === 'card') {
            drawBackground();
            const line = stats.lines[section.index];
            if (line) {
                fitText(line.value, H * 0.46 - rise, 120, 900, true, GREEN, inT);
                kicker(line.label.toUpperCase(), H * 0.56 + rise, 'rgba(255,255,255,0.7)', inT);
            }
            drawBrand(W / 2, H - 110, 0.8, 0.5);
        }

        if (section.type === 'outro') {
            drawBackground();
            fitText(fmtClock(stats.durationSeconds), H * 0.22 - rise, 104, 900, true, '#fff', inT);
            kicker('WORKOUT TIME', H * 0.285, 'rgba(255,255,255,0.4)', inT);
            const rows = stats.lines.slice(0, 4);
            rows.forEach((line, i) => {
                const y = H * 0.40 + i * 108;
                fitText(line.value, y - 16 + rise, 56, 900, true, GREEN, inT);
                kicker(line.label.toUpperCase(), y + 34 + rise, 'rgba(255,255,255,0.45)', inT);
                if (i < rows.length - 1) {
                    ctx.fillStyle = 'rgba(255,255,255,0.06)';
                    ctx.fillRect(W / 2 - 60, y + 62, 120, 1);
                }
            });
            drawBrand(W / 2, H * 0.885, 1.1, inT);
            fitText('Tracked with Iron Track', H * 0.93, 19, 500, false, 'rgba(255,255,255,0.35)', inT);
        }

        // fade from/to black at section boundaries — smooth cuts
        const msIn = t * sectionMs;
        const msOut = sectionMs - msIn;
        const fade = Math.min(msIn / FADE_MS, msOut / FADE_MS, 1);
        if (fade < 1) {
            ctx.fillStyle = `rgba(0,0,0,${(1 - fade).toFixed(3)})`;
            ctx.fillRect(0, 0, W, H);
        }

        drawProgress(elapsed);
    }

    // ── render loop ──────────────────────────────────────────────────────────

    recorder.start();
    const startedAt = performance.now();
    let thumbTaken = false;

    await new Promise<void>((resolve) => {
        const frame = async () => {
            const elapsed = performance.now() - startedAt;
            if (elapsed >= totalMs) { resolve(); return; }

            let acc = 0;
            let active: Section = sections[sections.length - 1];
            for (const s of sections) {
                if (elapsed < acc + s.ms) { active = s; break; }
                acc += s.ms;
            }
            const t = clamp01((elapsed - acc) / active.ms);

            if (active.type === 'clip' && active.video.paused) {
                active.video.play().catch(() => {});
            }
            drawSection(active, t, elapsed, active.ms);

            // thumbnail: mid-first-clip (the user, full frame), or mid-intro
            if (!thumbTaken) {
                const thumbAt = usable.length > 0 ? INTRO_MS + CLIP_MS / 2 : INTRO_MS / 2;
                if (elapsed >= thumbAt) {
                    thumbTaken = true;
                    await captureThumb();
                }
            }
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    });

    recorder.stop();
    await done;

    for (const u of usable) {
        u.video.pause();
        URL.revokeObjectURL(u.video.src);
        u.video.src = '';
    }
    stream.getTracks().forEach((t) => t.stop());

    const blob = new Blob(chunks, { type: mime });
    if (blob.size === 0) throw new Error('Replay rendering produced no video.');
    return { blob, thumbnail, durationSeconds: Math.round(totalMs / 1000), mimeType: mime };
}
