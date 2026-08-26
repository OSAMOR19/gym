/**
 * CardioEngine — camera-derived cardio metrics from the pose stream.
 *
 * Counts steps (or jumps) from ankle/hip oscillation, derives cadence,
 * classifies walking vs running, and scores posture + rhythm consistency.
 * Pure and frame-driven like RepEngine: landmarks in, summary numbers out.
 * Nothing here is persisted per-frame — the engine keeps small rolling
 * windows and the caller stores only the final session summary.
 *
 * HONESTY RULE: everything camera-derived here is an ESTIMATE. The UI must
 * label cadence/steps/distance as estimated; only duration (a clock) and
 * user-entered treadmill speed are measured inputs.
 */

// MediaPipe Pose landmark indices used here
const L_SHOULDER = 11, R_SHOULDER = 12, L_HIP = 23, R_HIP = 24, L_ANKLE = 27, R_ANKLE = 28;

const MIN_VISIBILITY = 0.5;

export type CardioActivity = 'walking' | 'running' | 'treadmill_walk' | 'treadmill_run' | 'jump_rope';

export const CARDIO_ACTIVITIES: Record<CardioActivity, { name: string; treadmill: boolean }> = {
    walking:        { name: 'Walking',           treadmill: false },
    running:        { name: 'Running',           treadmill: false },
    treadmill_walk: { name: 'Treadmill Walk',    treadmill: true },
    treadmill_run:  { name: 'Treadmill Run',     treadmill: true },
    jump_rope:      { name: 'Jump Rope',         treadmill: false },
};

export interface CardioFrameResult {
    /** Camera-derived step (or jump) count — estimated. */
    steps: number;
    /** Steps/min over the recent window — estimated. */
    cadence: number;
    peakCadence: number;
    bodyVisible: boolean;
    /** 'running' | 'walking' — cadence-based classification (estimated). */
    gait: 'walking' | 'running' | null;
    /** Posture + rhythm blend, 0-100. */
    formScore: number;
    feedback: string | null;
    isMoving: boolean;
}

interface Point { x: number; y: number }

/** Peak-detecting oscillation counter with hysteresis + refractory period. */
class OscillationCounter {
    private baseline: number | null = null;
    private lifted = false;
    private lastCountAt = 0;
    public count = 0;
    public timestamps: number[] = [];

    constructor(
        private readonly liftThreshold: number,
        private readonly refractoryMs: number,
        private readonly baselineAlpha = 0.02,
    ) {}

    /** `value` should INCREASE when the tracked point lifts. */
    process(value: number, nowMs: number): boolean {
        if (this.baseline === null) {
            this.baseline = value;
            return false;
        }
        // Baseline follows slowly, and only while not lifted (so a long swing
        // phase doesn't drag the baseline up to the lifted position)
        if (!this.lifted) {
            this.baseline += (value - this.baseline) * this.baselineAlpha;
        }
        const lift = value - this.baseline;
        if (!this.lifted && lift > this.liftThreshold && nowMs - this.lastCountAt > this.refractoryMs) {
            this.lifted = true;
            this.lastCountAt = nowMs;
            this.count++;
            this.timestamps.push(nowMs);
            if (this.timestamps.length > 64) this.timestamps.shift();
            return true;
        }
        if (this.lifted && lift < this.liftThreshold * 0.4) {
            this.lifted = false;
        }
        return false;
    }

    reset(): void {
        this.baseline = null;
        this.lifted = false;
        this.lastCountAt = 0;
        this.count = 0;
        this.timestamps = [];
    }
}

const CADENCE_WINDOW_MS = 15_000;
const RUNNING_CADENCE = 130;   // spm above this reads as running

export class CardioEngine {
    private left: OscillationCounter;
    private right: OscillationCounter;
    private hips: OscillationCounter;    // jump rope: both feet leave together
    private peakCadence = 0;
    private leanFrames = 0;
    private postureScore = 100;          // EMA of "standing tall"

    constructor(private activity: CardioActivity) {
        // Thresholds are in torso-normalized units (see processFrame)
        this.left = new OscillationCounter(0.16, 250);
        this.right = new OscillationCounter(0.16, 250);
        this.hips = new OscillationCounter(0.055, 280);
    }

    getActivity(): CardioActivity {
        return this.activity;
    }

    processFrame(landmarks: Point[], visibility: number[], nowMs: number = Date.now()): CardioFrameResult {
        const visible = [L_SHOULDER, R_SHOULDER, L_HIP, R_HIP].every((i) => (visibility[i] ?? 0) >= MIN_VISIBILITY)
            && [L_ANKLE, R_ANKLE].some((i) => (visibility[i] ?? 0) >= MIN_VISIBILITY);
        if (!visible) {
            return this.result(false, 'Step back so your full body is visible', nowMs);
        }

        const hipY = (landmarks[L_HIP].y + landmarks[R_HIP].y) / 2;
        const shoulderY = (landmarks[L_SHOULDER].y + landmarks[R_SHOULDER].y) / 2;
        const torso = Math.max(Math.abs(hipY - shoulderY), 0.05); // scale normalizer

        if (this.activity === 'jump_rope') {
            // Whole-body bounce: hip center lifts (y decreases → invert)
            this.hips.process((0.5 - hipY) / torso, nowMs);
        } else {
            // Steps: each ankle lifts relative to its own baseline, torso-scaled
            if ((visibility[L_ANKLE] ?? 0) >= MIN_VISIBILITY) {
                this.left.process((1 - landmarks[L_ANKLE].y) / torso, nowMs);
            }
            if ((visibility[R_ANKLE] ?? 0) >= MIN_VISIBILITY) {
                this.right.process((1 - landmarks[R_ANKLE].y) / torso, nowMs);
            }
        }

        // Posture: shoulders should stack over hips (x-offset relative to torso)
        const hipX = (landmarks[L_HIP].x + landmarks[R_HIP].x) / 2;
        const shoulderX = (landmarks[L_SHOULDER].x + landmarks[R_SHOULDER].x) / 2;
        const lean = Math.abs(shoulderX - hipX) / torso;
        const leaning = lean > 0.45; // ~24° forward/sideways lean
        this.leanFrames = leaning ? this.leanFrames + 1 : 0;
        this.postureScore += ((leaning ? 55 : 100) - this.postureScore) * 0.03;

        const feedback = this.leanFrames > 45 ? 'Stand tall — keep your chest up' : null;
        return this.result(true, feedback, nowMs);
    }

    private stepTimestamps(): number[] {
        return this.activity === 'jump_rope'
            ? this.hips.timestamps
            : [...this.left.timestamps, ...this.right.timestamps].sort((a, b) => a - b);
    }

    private result(bodyVisible: boolean, feedback: string | null, nowMs: number): CardioFrameResult {
        const steps = this.activity === 'jump_rope'
            ? this.hips.count
            : this.left.count + this.right.count;

        const recent = this.stepTimestamps().filter((t) => nowMs - t <= CADENCE_WINDOW_MS);
        // Scale by actual window covered so cadence ramps up honestly at start
        const windowMs = recent.length >= 2 ? Math.max(nowMs - recent[0], 4000) : CADENCE_WINDOW_MS;
        const cadence = recent.length >= 4 ? Math.round((recent.length / windowMs) * 60_000) : 0;
        if (cadence > this.peakCadence) this.peakCadence = cadence;

        return {
            steps,
            cadence,
            peakCadence: this.peakCadence,
            bodyVisible,
            gait: cadence === 0 ? null : cadence >= RUNNING_CADENCE ? 'running' : 'walking',
            formScore: Math.round(this.postureScore * 0.6 + this.consistency() * 0.4),
            feedback,
            isMoving: recent.length >= 2 && nowMs - recent[recent.length - 1] < 3000,
        };
    }

    /** Rhythm consistency 0-100 from step-interval variation. */
    private consistency(): number {
        const ts = this.stepTimestamps().slice(-20);
        if (ts.length < 6) return 100;
        const intervals = ts.slice(1).map((t, i) => t - ts[i]);
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        if (mean <= 0) return 100;
        const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
        const cv = Math.sqrt(variance) / mean;
        return Math.round(Math.max(0, Math.min(100, 100 - cv * 120)));
    }

    reset(): void {
        this.left.reset();
        this.right.reset();
        this.hips.reset();
        this.peakCadence = 0;
        this.leanFrames = 0;
        this.postureScore = 100;
    }
}
