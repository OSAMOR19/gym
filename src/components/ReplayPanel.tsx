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
        <div className="border border-white/10 rounded-xl p-4 bg-white/[0.02]">
            {phase === 'idle' && (
                <>
                    <div className="flex items-center gap-2 mb-1">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="23,7 16,12 23,17" /><rect x="1" y="5" width="15" height="14" rx="2" />
                        </svg>
                        <p className="text-sm font-bold text-white">Workout Replay</p>
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed mb-3">
                        {clips.length > 0
                            ? `Turn ${clips.length} highlight${clips.length > 1 ? 's' : ''} from this session into a ~25s recap you can share.`
                            : 'Create a short animated recap of this workout you can share.'}
                    </p>
                    <button
                        onClick={generate}
                        className="w-full py-3 rounded-xl bg-[#22c55e] text-black text-sm font-bold hover:bg-[#16a34a] transition-all cursor-pointer"
                    >
                        Create Replay
                    </button>
                </>
            )}

            {phase === 'generating' && (
                <div className="flex items-center gap-3 py-2">
                    <span className="w-5 h-5 border-2 border-white/15 border-t-[#22c55e] rounded-full animate-spin flex-shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-white">Creating your replay…</p>
                        <p className="text-[11px] text-white/35">About half a minute — your workout is already saved.</p>
                    </div>
                </div>
            )}

            {phase === 'ready' && (
                <>
                    <p className="text-sm font-bold text-white mb-1">Your Workout Replay is ready</p>
                    {uploadNote && (
                        <p className="text-[11px] text-amber-400/90 mb-2">
                            {uploadNote} It&apos;s still available right here to watch and share.
                        </p>
                    )}
                    {watching && videoUrlRef.current && (
                        <video
                            src={videoUrlRef.current}
                            controls
                            autoPlay
                            playsInline
                            className="w-full rounded-lg mb-3 bg-black aspect-[9/16] max-h-80 object-contain"
                        />
                    )}
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setWatching((w) => !w)}
                            className="py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-white/70 hover:bg-white/5 transition-all cursor-pointer"
                        >
                            {watching ? 'Hide' : 'Watch'}
                        </button>
                        <button
                            onClick={share}
                            className="py-2.5 rounded-xl bg-[#22c55e] text-black text-xs font-bold hover:bg-[#16a34a] transition-all cursor-pointer"
                        >
                            Share
                        </button>
                        <button
                            onClick={download}
                            className="py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-white/70 hover:bg-white/5 transition-all cursor-pointer"
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
                        className="w-full py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-white/70 hover:bg-white/5 transition-all cursor-pointer"
                    >
                        Try again
                    </button>
                </>
            )}
        </div>
    );
}
