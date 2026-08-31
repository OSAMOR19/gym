/**
 * HighlightRecorder — keeps only the moments worth replaying.
 *
 * Records the camera stream in short standalone segments (~4s each, so every
 * segment is an independently playable file). A rolling window holds just the
 * current and previous segment; when the workout logic marks a highlight, the
 * segment covering that moment is pinned with a label. Everything unpinned is
 * discarded the moment it leaves the window — the full workout video never
 * exists anywhere.
 *
 * Pinned clips are capped and prioritized (PR > best form > set complete >
 * milestone > bookends), so a long workout still yields a handful of clips
 * for a ~25s recap.
 */

export type HighlightKind = 'pr' | 'best_form' | 'set_complete' | 'milestone' | 'start' | 'finish';

const KIND_PRIORITY: Record<HighlightKind, number> = {
    pr: 5, best_form: 4, set_complete: 3, milestone: 2, finish: 1, start: 0,
};

export interface HighlightClip {
    blob: Blob;
    kind: HighlightKind;
    /** Short line drawn over the clip in the replay, e.g. "SQUAT · FORM 94%". */
    label: string;
    at: number;          // ms timestamp when the highlight fired
}

const SEGMENT_MS = 4000;
const MAX_CLIPS = 6;

/** Top clips by priority, returned in chronological order (pure, testable). */
export function selectTopClips(clips: HighlightClip[], max: number = MAX_CLIPS): HighlightClip[] {
    return clips
        .slice()
        .sort((a, b) => KIND_PRIORITY[b.kind] - KIND_PRIORITY[a.kind] || b.at - a.at)
        .slice(0, max)
        .sort((a, b) => a.at - b.at);
}

/**
 * Best recording mime for this browser. Each browser gets its NATIVE format
 * first — Safari records mp4, everything else records webm — so the clips we
 * record are always ones the same browser can flawlessly decode again during
 * replay composition.
 */
export function pickRecordingMime(): string | null {
    if (typeof MediaRecorder === 'undefined') return null;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const mp4 = ['video/mp4;codecs=avc1', 'video/mp4'];
    const webm = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const candidates = isSafari ? [...mp4, ...webm] : [...webm, ...mp4];
    return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? null;
}

/**
 * Recording source: the CameraFeed overlay canvas, NOT the raw camera stream.
 * The canvas already composites the mirrored video + neon skeleton every
 * frame, so clips show exactly what the user sees — tracking overlay
 * included. It also survives per-set camera stops (a canvas track never
 * ends), which is what used to silently drop strength-workout segments.
 *
 * One stream per canvas, cached — captureStream() must not be called anew
 * for every set.
 */
const canvasStreams = new WeakMap<HTMLCanvasElement, MediaStream>();

export function canvasRecordingStream(canvas: HTMLCanvasElement | null): MediaStream | null {
    if (!canvas || typeof canvas.captureStream !== 'function') return null;
    const cached = canvasStreams.get(canvas);
    if (cached && cached.getVideoTracks().some((t) => t.readyState === 'live')) return cached;
    try {
        const stream = canvas.captureStream(30);
        canvasStreams.set(canvas, stream);
        return stream;
    } catch {
        return null;
    }
}

export class HighlightRecorder {
    private recorder: MediaRecorder | null = null;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private running = false;
    private mime: string | null = null;

    /** Highlights that fired during the segment currently being recorded. */
    private pendingMarks: Array<{ kind: HighlightKind; label: string; at: number }> = [];
    private clips: HighlightClip[] = [];

    /** True when this browser can record at all. */
    static supported(): boolean {
        return pickRecordingMime() !== null;
    }

    /**
     * Begin (or resume, e.g. for the next set) recording on this stream.
     * Clips pinned earlier in the workout are preserved across resumes.
     */
    start(stream: MediaStream): boolean {
        if (this.running) return true;
        this.mime = pickRecordingMime();
        if (!this.mime || stream.getVideoTracks().length === 0) return false;
        this.running = true;
        this.pendingMarks = [];
        this.recordSegment(stream);
        return true;
    }

    /** Pin the moment happening right now. */
    mark(kind: HighlightKind, label: string): void {
        if (!this.running) return;
        this.pendingMarks.push({ kind, label, at: Date.now() });
    }

    /**
     * Pause recording (set finished / camera stopping); the in-flight segment
     * is collected first so marks fired just before the stop still pin it.
     * Call start() again for the next set, or finalize() at workout end.
     */
    async stop(): Promise<void> {
        this.running = false;
        if (this.timer) clearTimeout(this.timer);
        const recorder = this.recorder;
        if (recorder && recorder.state !== 'inactive') {
            await new Promise<void>((resolve) => {
                const prev = recorder.onstop;
                recorder.onstop = (e) => {
                    (prev as ((ev: Event) => void) | null)?.call(recorder, e);
                    resolve();
                };
                try { recorder.stop(); } catch { resolve(); }
            });
        }
        this.recorder = null;
    }

    /** Final selection across the whole workout. */
    async finalize(): Promise<HighlightClip[]> {
        await this.stop();
        return this.selectClips();
    }

    /** Discard everything (user turned replay off / abandoned workout). */
    discard(): void {
        this.running = false;
        if (this.timer) clearTimeout(this.timer);
        try { this.recorder?.stop(); } catch {}
        this.recorder = null;
        this.clips = [];
        this.pendingMarks = [];
    }

    get clipCount(): number {
        return this.clips.length;
    }

    // ── internals ────────────────────────────────────────────────────────────

    private recordSegment(stream: MediaStream): void {
        if (!this.running || !this.mime) return;
        let recorder: MediaRecorder;
        try {
            recorder = new MediaRecorder(stream, {
                mimeType: this.mime,
                videoBitsPerSecond: 2_500_000,
            });
        } catch {
            this.running = false;
            return;
        }
        this.recorder = recorder;
        const marksForThisSegment = () => {
            const marks = this.pendingMarks;
            this.pendingMarks = [];
            return marks;
        };

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
            const marks = marksForThisSegment();
            if (marks.length > 0 && chunks.length > 0) {
                // Highest-priority mark labels the whole segment
                const best = marks.sort((a, b) => KIND_PRIORITY[b.kind] - KIND_PRIORITY[a.kind])[0];
                this.clips.push({
                    blob: new Blob(chunks, { type: this.mime! }),
                    kind: best.kind,
                    label: best.label,
                    at: best.at,
                });
                this.trim();
            }
            // Unmarked segments simply fall out of scope here — discarded.
            if (this.running) this.recordSegment(stream);
        };

        try {
            recorder.start();
        } catch {
            this.running = false;
            return;
        }
        this.timer = setTimeout(() => {
            if (recorder.state !== 'inactive') {
                try { recorder.stop(); } catch {}
            }
        }, SEGMENT_MS);
    }

    /** Keep memory bounded during long workouts. */
    private trim(): void {
        if (this.clips.length <= MAX_CLIPS + 2) return;
        this.clips = selectTopClips(this.clips, MAX_CLIPS + 2);
    }

    /** Final selection: top priority, chronological, capped for a ~25s recap. */
    private selectClips(): HighlightClip[] {
        return selectTopClips(this.clips, MAX_CLIPS);
    }
}
