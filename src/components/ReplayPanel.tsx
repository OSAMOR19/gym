/**
 * ReplayPanel — the post-workout "Create Replay" flow.
 *
 * Lives inside the workout/cardio summary. Generation is user-initiated and
 * fully independent of the already-saved workout: composing happens on-device,
 * then the ~25s recap uploads to private storage. A composition or upload
 * failure never touches workout data — the panel just offers a retry, and a
 * successfully composed video stays watchable/shareable locally even when the
 * upload failed.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { HighlightClip } from '../lib/replay/highlightRecorder';
import { composeReplay, ReplayStats, ComposedReplay } from '../lib/replay/replayComposer';
import { uploadReplay, shareReplayBlob } from '../lib/replay/replayStore';

interface ReplayPanelProps {
    clips: HighlightClip[];
    stats: ReplayStats;
    links: { workoutId?: string | null; cardioSessionId?: string | null };
}

type Phase = 'idle' | 'generating' | 'ready' | 'error';

export default function ReplayPanel({ clips, stats, links }: ReplayPanelProps) {
    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState<string | null>(null);
    const [uploadNote, setUploadNote] = useState<string | null>(null);
    const [watching, setWatching] = useState(false);
    const composedRef = useRef<ComposedReplay | null>(null);
    const videoUrlRef = useRef<string | null>(null);
    const busyRef = useRef(false); // guards duplicate generation taps

    useEffect(() => () => {
        if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    }, []);

    const generate = useCallback(async () => {
        if (busyRef.current) return;
        busyRef.current = true;
        setPhase('generating');
        setError(null);
        setUploadNote(null);
        try {
            const composed = composedRef.current ?? await composeReplay(clips, stats);
            composedRef.current = composed;
            const { error: uploadError } = await uploadReplay(composed, stats, links);
            if (uploadError) setUploadNote(uploadError);
            if (!videoUrlRef.current) videoUrlRef.current = URL.createObjectURL(composed.blob);
            setPhase('ready');
        } catch (err) {
            console.warn('[replay] Generation failed:', err instanceof Error ? err.message : err);
            setError('Could not create the replay. Your workout is saved — you can try again.');
            setPhase('error');
        } finally {
            busyRef.current = false;
        }
    }, [clips, stats, links]);

    // Every workout gets its replay automatically — generation starts as soon
    // as the summary shows. It stays fully independent: the workout is already
    // saved before this panel even mounts, and a failure just offers a retry.
    useEffect(() => {
        generate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const share = useCallback(async () => {
        const composed = composedRef.current;
        if (!composed) return;
        const ext = composed.mimeType.includes('mp4') ? 'mp4' : 'webm';
        await shareReplayBlob(composed.blob, `irontrack-workout.${ext}`);
    }, []);

    const download = useCallback(() => {
        const composed = composedRef.current;
        if (!composed || !videoUrlRef.current) return;
        const a = document.createElement('a');
        a.href = videoUrlRef.current;
        a.download = `irontrack-workout.${composed.mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
        a.click();
    }, []);

    return (
        <div className="border border-ink/10 rounded-xl p-5 bg-ink/[0.02]">
            {phase === 'idle' && (
                <>
                    <div className="flex items-center gap-2.5 mb-2">
                        <span className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="23,7 16,12 23,17" /><rect x="1" y="5" width="15" height="14" rx="2" />
                            </svg>
                        </span>
                        <p className="text-sm font-bold text-ink font-display">Workout Replay</p>
                    </div>
                    <p className="text-xs text-ink/40 leading-relaxed mb-4">
                        {clips.length > 0
                            ? `Turn ${clips.length} highlight${clips.length > 1 ? 's' : ''} from this session into a ~25s recap you can share.`
                            : 'Create a short animated recap of this workout you can share.'}
                    </p>
                    <button
                        onClick={generate}
                        className="w-full py-3 rounded-xl bg-accent text-black text-sm font-bold hover:bg-accent-strong transition-all cursor-pointer"
                    >
                        Create Replay
                    </button>
                </>
            )}

            {phase === 'generating' && (
                <div className="flex items-center gap-3.5 py-3">
                    <span className="w-6 h-6 border-2 border-ink/15 border-t-accent rounded-full animate-spin flex-shrink-0" />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-ink">Creating your replay…</p>
                        <p className="text-[11px] text-ink/35 leading-relaxed">About half a minute — your workout is already saved.</p>
                    </div>
                </div>
            )}

            {phase === 'ready' && (
                <>
                    <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="23,7 16,12 23,17" /><rect x="1" y="5" width="15" height="14" rx="2" />
                            </svg>
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-ink font-display">Your replay is ready</p>
                            <p className="text-[11px] text-ink/35 mt-0.5">Watch it, share it, or save it to your device.</p>
                        </div>
                    </div>
                    {uploadNote && (
                        <p className="text-[11px] text-amber-400/90 leading-relaxed bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5 mt-3.5">
                            {uploadNote} It&apos;s still available right here to watch and share.
                        </p>
                    )}
                    {watching && videoUrlRef.current && (
                        <video
                            src={videoUrlRef.current}
                            controls
                            autoPlay
                            playsInline
                            className="w-full rounded-lg mt-4 bg-black aspect-[9/16] max-h-80 object-contain"
                        />
                    )}
                    <div className="grid grid-cols-3 gap-2.5 mt-4">
                        <button
                            onClick={() => setWatching((w) => !w)}
                            className="py-3 rounded-xl border border-ink/10 text-xs font-semibold text-ink/70 hover:bg-ink/5 transition-all cursor-pointer"
                        >
                            {watching ? 'Hide' : 'Watch'}
                        </button>
                        <button
                            onClick={share}
                            className="py-3 rounded-xl bg-accent text-black text-xs font-bold hover:bg-accent-strong transition-all cursor-pointer"
                        >
                            Share
                        </button>
                        <button
                            onClick={download}
                            className="py-3 rounded-xl border border-ink/10 text-xs font-semibold text-ink/70 hover:bg-ink/5 transition-all cursor-pointer"
                        >
                            Save
                        </button>
                    </div>
                </>
            )}

            {phase === 'error' && (
                <>
                    <p className="text-xs text-red-400 mb-3">{error}</p>
                    <button
                        onClick={generate}
                        className="w-full py-2.5 rounded-xl border border-ink/10 text-xs font-semibold text-ink/70 hover:bg-ink/5 transition-all cursor-pointer"
                    >
                        Try again
                    </button>
                </>
            )}
        </div>
    );
}
