/**
 * Cardio — camera-tracked aerobic sessions (treadmill, walking, running,
 * jump rope).
 *
 * Flow: pick activity → mount the phone + optional treadmill speed → live
 * tracking HUD → summary saved to `cardio_sessions` + optional replay.
 * Duration is measured; camera-derived steps/cadence/distance are always
 * labeled estimated. Landmarks are processed frame-by-frame and discarded.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useCardioTracking } from '../../../hooks/useCardioTracking';
import { CardioActivity, CARDIO_ACTIVITIES } from '../../../lib/cardio/cardioEngine';
import { saveCardioSession, deriveDistance, estimateCalories, CardioSummary } from '../../../lib/cardio/cardioSession';
import { getUserProfile } from '../../../lib/userProfile';
import { HighlightRecorder, HighlightClip } from '../../../lib/replay/highlightRecorder';
import { ReplayStats } from '../../../lib/replay/replayComposer';
import ReplayPanel from '../../../components/ReplayPanel';
import CameraFeed from '../../../components/CameraFeed';

type Step = 'select' | 'setup' | 'live' | 'summary';

const ACTIVITY_ICONS: Record<CardioActivity, string> = {
    walking: 'M13 4a2 2 0 100-4 2 2 0 000 4zM8 22l3-7-2-2-2 4H4m9-11l-2.5 6L13 14l3 8m-4-14l3 2 3-1',
    running: 'M14 4a2 2 0 100-4 2 2 0 000 4zM6 22l4-8-2-3m3-4l-3 2-2 4m6-6l3 3 4 1m-7 3l2 3v5',
    treadmill_walk: 'M3 17h18M5 17l1.5-9h11L19 17M9 8V5h6v3',
    treadmill_run: 'M3 17h18M5 17l1.5-9h11L19 17M12 5v3',
    jump_rope: 'M12 3a4 4 0 014 4v10a2 2 0 11-4 0V7a4 4 0 00-8 0v6',
};

function fmtClock(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CardioPage() {
    const [step, setStep] = useState<Step>('select');
    const [activity, setActivity] = useState<CardioActivity>('treadmill_walk');
    const [speedInput, setSpeedInput] = useState('');
    const [elapsed, setElapsed] = useState(0);
    const [summary, setSummary] = useState<CardioSummary | null>(null);
    const [cardioSessionId, setCardioSessionId] = useState<string | null>(null);
    const [saveFailed, setSaveFailed] = useState(false);
    const [clips, setClips] = useState<HighlightClip[]>([]);
    const [profile, setProfile] = useState<{ heightCm: number | null; weightKg: number | null }>({ heightCm: null, weightKg: null });

    const tracking = useCardioTracking(activity);
    const recorderRef = useRef<HighlightRecorder | null>(null);
    const lastMilestoneRef = useRef(0);
    const startedAtRef = useRef<string>('');
    const finishingRef = useRef(false);

    useEffect(() => {
        getUserProfile().then((p) => {
            if (p) setProfile({ heightCm: p.heightCm, weightKg: p.weightKg });
        }).catch(() => {});
    }, []);

    // Session clock (measured)
    useEffect(() => {
        if (!tracking.isTracking || !tracking.startedAt) return;
        const t = setInterval(() => {
            setElapsed(Math.floor((Date.now() - tracking.startedAt!) / 1000));
        }, 1000);
        return () => clearInterval(t);
    }, [tracking.isTracking, tracking.startedAt]);

    // Step milestones become replay highlights
    const steps = tracking.result?.steps ?? 0;
    useEffect(() => {
        const milestone = activity === 'jump_rope' ? 100 : 250;
        if (steps > 0 && steps - lastMilestoneRef.current >= milestone) {
            lastMilestoneRef.current = steps;
            recorderRef.current?.mark('milestone', `${steps} ${activity === 'jump_rope' ? 'JUMPS' : 'STEPS'}`);
        }
    }, [steps, activity]);

    const begin = useCallback(async () => {
        setElapsed(0);
        lastMilestoneRef.current = 0;
        startedAtRef.current = new Date().toISOString();
        await tracking.start();
    }, [tracking]);

    // Start the camera only AFTER the live view has rendered — the <video>
    // element doesn't exist until then, so calling begin() from the Start
    // button's click handler found videoRef empty and silently did nothing
    // (black feed, clock stuck at 0:00).
    const beganRef = useRef(false);
    useEffect(() => {
        if (step !== 'live') {
            beganRef.current = false;
            return;
        }
        if (!beganRef.current) {
            beganRef.current = true;
            begin();
        }
    }, [step, begin]);

    // Attach the highlight recorder once the camera is live
    useEffect(() => {
        if (!tracking.isTracking) return;
        const stream = tracking.videoRef.current?.srcObject as MediaStream | undefined;
        if (stream && HighlightRecorder.supported()) {
            const recorder = new HighlightRecorder();
            if (recorder.start(stream)) {
                recorderRef.current = recorder;
                setTimeout(() => recorder.mark('start', CARDIO_ACTIVITIES[activity].name.toUpperCase()), 1500);
            }
        }
        return () => {
            // camera stopped without finish (unmount/interruption) — drop footage
            if (recorderRef.current && !finishingRef.current) {
                recorderRef.current.discard();
                recorderRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tracking.isTracking]);

    const finish = useCallback(async () => {
        if (finishingRef.current) return;
        finishingRef.current = true;

        recorderRef.current?.mark('finish', 'STRONG FINISH');
        const recorder = recorderRef.current;
        recorderRef.current = null;

        const final = tracking.stop();
        const durationSeconds = tracking.startedAt ? Math.floor((Date.now() - tracking.startedAt) / 1000) : elapsed;
        const speed = parseFloat(speedInput);
        const treadmillSpeedKmh = CARDIO_ACTIVITIES[activity].treadmill && Number.isFinite(speed) && speed > 0 ? speed : null;
        const { distanceKm, source } = deriveDistance(activity, durationSeconds, final?.steps ?? 0, treadmillSpeedKmh, profile.heightCm);

        const s: CardioSummary = {
            activity,
            startedAt: startedAtRef.current || new Date().toISOString(),
            durationSeconds,
            steps: final?.steps ?? 0,
            avgCadence: final?.cadence ?? 0,
            peakCadence: final?.peakCadence ?? 0,
            treadmillSpeedKmh,
            distanceKm,
            distanceSource: source,
            estCalories: estimateCalories(activity, durationSeconds, final?.cadence ?? 0, profile.weightKg),
            formScore: final?.formScore ?? 0,
        };
        setSummary(s);
        setStep('summary');

        // Save first (replay is optional and independent)
        const id = await saveCardioSession(s);
        setCardioSessionId(id);
        setSaveFailed(id === null);

        if (recorder) setClips(await recorder.finalize());
        finishingRef.current = false;
    }, [tracking, elapsed, speedInput, activity, profile]);

    const result = tracking.result;
    const isJump = activity === 'jump_rope';
    const unit = isJump ? 'jumps' : 'steps';

    const liveDistance = summaryless(step) && result
        ? deriveDistance(activity, elapsed, result.steps,
            CARDIO_ACTIVITIES[activity].treadmill && parseFloat(speedInput) > 0 ? parseFloat(speedInput) : null,
            profile.heightCm)
        : null;

    const replayStats: ReplayStats | null = summary ? {
        title: CARDIO_ACTIVITIES[summary.activity].name,
        workoutType: 'cardio',
        durationSeconds: summary.durationSeconds,
        dateISO: summary.startedAt,
        lines: [
            { value: String(summary.steps), label: isJump ? 'jumps (est.)' : 'steps (est.)' },
            ...(summary.distanceKm ? [{
                value: `${summary.distanceKm} km`,
                label: summary.distanceSource === 'treadmill_input' ? 'distance' : 'distance (est.)',
            }] : []),
            ...(summary.avgCadence ? [{ value: String(summary.avgCadence), label: `${unit}/min (est.)` }] : []),
            ...(summary.estCalories ? [{ value: String(summary.estCalories), label: 'kcal (est.)' }] : []),
        ].slice(0, 4),
    } : null;

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-6">
            {/* ─── Select activity ─────────────────────────────────────────── */}
            {step === 'select' && (
                <>
                    <h1 className="text-2xl font-bold text-white mb-1">Cardio</h1>
                    <p className="text-xs text-white/30 mb-6">Camera-tracked aerobic training — pick your activity.</p>
                    <div className="grid grid-cols-2 gap-3">
                        {(Object.keys(CARDIO_ACTIVITIES) as CardioActivity[]).map((a) => (
                            <button
                                key={a}
                                onClick={() => { setActivity(a); setStep('setup'); }}
                                className="border border-white/5 rounded-xl p-5 text-left hover:border-[#22c55e]/40 transition-all cursor-pointer group"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-white/30 group-hover:text-[#22c55e] transition-colors mb-3">
                                    <path d={ACTIVITY_ICONS[a]} />
                                </svg>
                                <p className="text-sm font-bold text-white">{CARDIO_ACTIVITIES[a].name}</p>
                                <p className="text-[10px] text-white/25 mt-0.5">
                                    {CARDIO_ACTIVITIES[a].treadmill ? 'Mount phone on treadmill' : 'Camera tracks your movement'}
                                </p>
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* ─── Setup ───────────────────────────────────────────────────── */}
            {step === 'setup' && (
                <>
                    <button onClick={() => setStep('select')} className="text-xs text-white/30 hover:text-white/60 mb-4 cursor-pointer">← Back</button>
                    <h1 className="text-xl font-bold text-white mb-4">{CARDIO_ACTIVITIES[activity].name}</h1>
                    <div className="border border-white/5 rounded-xl p-4 mb-4 space-y-3">
                        <p className="text-[10px] text-white/25 tracking-widest uppercase">Camera setup</p>
                        {[
                            CARDIO_ACTIVITIES[activity].treadmill
                                ? 'Mount your phone securely on the treadmill console or a stand'
                                : 'Prop your phone upright, about 2–3 meters away',
                            'Position it so your whole body is visible',
                            'Good lighting helps tracking accuracy',
                        ].map((tip, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-[#22c55e]/10 text-[#22c55e] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                <p className="text-xs text-white/60 leading-relaxed">{tip}</p>
                            </div>
                        ))}
                    </div>
                    {CARDIO_ACTIVITIES[activity].treadmill && (
                        <div className="border border-white/5 rounded-xl p-4 mb-4">
                            <label htmlFor="treadmill-speed" className="block text-[10px] text-white/25 tracking-widest uppercase mb-1.5">
                                Treadmill speed (km/h) — optional
                            </label>
                            <input
                                id="treadmill-speed" type="number" inputMode="decimal" min={0.5} max={25} step={0.1}
                                value={speedInput} onChange={(e) => setSpeedInput(e.target.value)}
                                placeholder="e.g. 5.5"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-base md:text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-[#22c55e]/40"
                            />
                            <p className="text-[10px] text-white/25 mt-1.5">
                                With your treadmill&apos;s speed, distance is calculated from it. Without it, distance is a camera-based estimate.
                            </p>
                        </div>
                    )}
                    <button
                        onClick={() => setStep('live')}
                        className="w-full py-3.5 rounded-xl bg-[#22c55e] text-black font-bold text-sm hover:bg-[#16a34a] transition-all cursor-pointer"
                    >
                        Start {CARDIO_ACTIVITIES[activity].name}
                    </button>
                </>
            )}

            {/* ─── Live ────────────────────────────────────────────────────── */}
            {step === 'live' && (
                <div className="space-y-4">
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black aspect-[3/4] sm:aspect-video">
                        {/* Same neon skeleton overlay as the strength workout —
                            the whole-body tracking IS the product */}
                        <CameraFeed
                            videoRef={tracking.videoRef}
                            canvasRef={tracking.canvasRef}
                            landmarksRef={tracking.landmarksRef}
                            angleRef={tracking.angleRef}
                            hasBody={true} /* the page has its own large not-in-frame overlay */
                            isDetecting={tracking.isTracking}
                            isLoading={tracking.isLoading}
                            error={tracking.error}
                        />
                        {tracking.error && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                                <button onClick={begin} className="text-xs font-bold text-red-100 bg-red-500/30 border border-red-500/40 rounded-lg px-5 py-2.5 cursor-pointer">
                                    Retry camera
                                </button>
                            </div>
                        )}
                        {tracking.modelError && !tracking.error && (
                            <div className="absolute inset-x-3 top-3 bg-amber-500/15 border border-amber-500/30 rounded-lg px-3 py-2">
                                <p className="text-[11px] text-amber-300">{tracking.modelError}</p>
                            </div>
                        )}
                        {tracking.isTracking && result && !result.bodyVisible && (
                            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
                                <div className="bg-black/70 backdrop-blur-md border border-white/15 rounded-2xl px-6 py-5 text-center max-w-sm">
                                    <p className="text-xl font-black text-white">Step back</p>
                                    <p className="text-sm text-white/70 mt-1.5">Make sure your whole body is visible</p>
                                </div>
                            </div>
                        )}
                        {tracking.isTracking && result?.feedback && result.bodyVisible && (
                            <div className="absolute inset-x-3 top-3 flex justify-center">
                                <span className="bg-amber-500/15 backdrop-blur-sm border border-amber-500/30 rounded-full px-4 py-1.5 text-xs font-bold text-amber-400">
                                    {result.feedback}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* HUD */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="border border-white/5 rounded-xl p-4 col-span-2 text-center">
                            <p className="text-4xl font-black text-white" style={{ fontFamily: 'Orbitron, monospace' }}>{fmtClock(elapsed)}</p>
                            <p className="text-[10px] text-white/25 tracking-widest uppercase mt-1">Time</p>
                        </div>
                        <div className="border border-white/5 rounded-xl p-4 text-center">
                            <p className="text-2xl font-black text-[#22c55e]" style={{ fontFamily: 'Orbitron, monospace' }}>{result?.steps ?? 0}</p>
                            <p className="text-[10px] text-white/25 tracking-widest uppercase mt-1">{unit} · est.</p>
                        </div>
                        <div className="border border-white/5 rounded-xl p-4 text-center">
                            <p className="text-2xl font-black text-[#22c55e]" style={{ fontFamily: 'Orbitron, monospace' }}>{result?.cadence ?? 0}</p>
                            <p className="text-[10px] text-white/25 tracking-widest uppercase mt-1">{unit}/min · est.</p>
                        </div>
                        {liveDistance?.distanceKm != null && (
                            <div className="border border-white/5 rounded-xl p-4 text-center col-span-2">
                                <p className="text-2xl font-black text-white" style={{ fontFamily: 'Orbitron, monospace' }}>{liveDistance.distanceKm} km</p>
                                <p className="text-[10px] text-white/25 tracking-widest uppercase mt-1">
                                    {liveDistance.source === 'treadmill_input' ? 'distance · from treadmill speed' : 'distance · estimated'}
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={finish}
                        className="w-full py-3.5 rounded-xl bg-red-500/90 text-white font-bold text-sm hover:bg-red-500 transition-all cursor-pointer"
                    >
                        Finish Session
                    </button>
                </div>
            )}

            {/* ─── Summary ─────────────────────────────────────────────────── */}
            {step === 'summary' && summary && (
                <div className="space-y-4">
                    <div className="text-center pt-4">
                        <p className="text-[10px] text-[#22c55e] tracking-[0.25em] uppercase font-bold">Session complete</p>
                        <h1 className="text-2xl font-bold text-white mt-1">{CARDIO_ACTIVITIES[summary.activity].name}</h1>
                        <p className="text-5xl font-black text-white mt-4" style={{ fontFamily: 'Orbitron, monospace' }}>
                            {fmtClock(summary.durationSeconds)}
                        </p>
                    </div>
                    {saveFailed && (
                        <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2.5">
                            Could not save this session to your history — is the cardio migration applied?
                        </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="border border-white/5 rounded-xl p-4">
                            <p className="text-xl font-black text-[#22c55e]" style={{ fontFamily: 'Orbitron, monospace' }}>{summary.steps}</p>
                            <p className="text-[10px] text-white/25 tracking-widest uppercase mt-0.5">{unit} (estimated)</p>
                        </div>
                        <div className="border border-white/5 rounded-xl p-4">
                            <p className="text-xl font-black text-[#22c55e]" style={{ fontFamily: 'Orbitron, monospace' }}>{summary.avgCadence || '—'}</p>
                            <p className="text-[10px] text-white/25 tracking-widest uppercase mt-0.5">{unit}/min (estimated)</p>
                        </div>
                        {summary.distanceKm != null && (
                            <div className="border border-white/5 rounded-xl p-4">
                                <p className="text-xl font-black text-white" style={{ fontFamily: 'Orbitron, monospace' }}>{summary.distanceKm} km</p>
                                <p className="text-[10px] text-white/25 tracking-widest uppercase mt-0.5">
                                    {summary.distanceSource === 'treadmill_input' ? 'distance (from speed)' : 'distance (estimated)'}
                                </p>
                            </div>
                        )}
                        {summary.estCalories != null && (
                            <div className="border border-white/5 rounded-xl p-4">
                                <p className="text-xl font-black text-white" style={{ fontFamily: 'Orbitron, monospace' }}>{summary.estCalories}</p>
                                <p className="text-[10px] text-white/25 tracking-widest uppercase mt-0.5">kcal (estimated)</p>
                            </div>
                        )}
                    </div>

                    {replayStats && <ReplayPanel clips={clips} stats={replayStats} links={{ cardioSessionId }} />}

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => { setSummary(null); setClips([]); setCardioSessionId(null); setStep('select'); }}
                            className="py-3 rounded-xl border border-white/10 text-sm font-semibold text-white/60 hover:bg-white/5 transition-all cursor-pointer"
                        >
                            New Session
                        </button>
                        <Link
                            href="/dashboard"
                            className="py-3 rounded-xl bg-[#22c55e] text-black text-sm font-bold text-center hover:bg-[#16a34a] transition-all"
                        >
                            Done
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

function summaryless(step: Step): boolean {
    return step === 'live';
}
