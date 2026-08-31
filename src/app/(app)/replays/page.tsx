/**
 * My Replays — the personal workout highlight library.
 *
 * Grid of past ~25s recaps. Playback streams through short-lived signed URLs
 * (the bucket is private); share re-downloads the bytes and opens the device
 * share sheet; delete removes the storage objects first, then the row.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ReplayRow, listReplays, getReplayUrls, deleteReplay, downloadReplayBlob, shareReplayBlob } from '../../../lib/replay/replayStore';
import Skeleton from '../../../components/Skeleton';

function fmtClock(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.round(totalSeconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ReplaysPage() {
    const [rows, setRows] = useState<ReplayRow[] | null>(null);
    const [thumbs, setThumbs] = useState<Record<string, string>>({});
    const [playing, setPlaying] = useState<{ id: string; url: string } | null>(null);
    const [pendingDelete, setPendingDelete] = useState<ReplayRow | null>(null);
    const [busy, setBusy] = useState<string | null>(null); // replay id being shared/deleted

    useEffect(() => {
        listReplays().then(async (list) => {
            setRows(list);
            // Resolve poster thumbnails in the background
            const entries = await Promise.all(list.map(async (row) => {
                if (!row.thumbnail_path) return null;
                const { thumb } = await getReplayUrls(row);
                return thumb ? [row.id, thumb] as const : null;
            }));
            setThumbs(Object.fromEntries(entries.filter((e): e is readonly [string, string] => e !== null)));
        }).catch(() => setRows([]));
    }, []);

    const play = useCallback(async (row: ReplayRow) => {
        const { video } = await getReplayUrls(row);
        if (video) setPlaying({ id: row.id, url: video });
    }, []);

    const share = useCallback(async (row: ReplayRow) => {
        setBusy(row.id);
        const blob = await downloadReplayBlob(row);
        if (blob) {
            const ext = (row.metadata.mimeType ?? blob.type).includes('mp4') ? 'mp4' : 'webm';
            await shareReplayBlob(blob, `irontrack-workout.${ext}`);
        }
        setBusy(null);
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!pendingDelete) return;
        setBusy(pendingDelete.id);
        const ok = await deleteReplay(pendingDelete);
        if (ok) setRows((prev) => (prev ?? []).filter((r) => r.id !== pendingDelete.id));
        setBusy(null);
        setPendingDelete(null);
    }, [pendingDelete]);

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6">
            <h1 className="text-2xl font-bold text-ink mb-1 font-display">My Replays</h1>
            <p className="text-xs text-ink/30 mb-6">Your workout highlights — private until you share them.</p>

            {rows === null && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[9/16] rounded-xl" />)}
                </div>
            )}

            {rows !== null && rows.length === 0 && (
                <div className="flex flex-col items-center text-center pt-16 pb-10 px-6">
                    <div className="w-16 h-16 rounded-2xl bg-ink/[0.03] border border-ink/10 flex items-center justify-center mb-4">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-ink/25" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="23,7 16,12 23,17" /><rect x="1" y="5" width="15" height="14" rx="2" />
                        </svg>
                    </div>
                    <p className="text-sm font-semibold text-ink/60 mb-1">No replays yet</p>
                    <p className="text-xs text-ink/25 leading-relaxed max-w-xs mb-5">
                        Finish a workout or cardio session and tap Create Replay — your ~25 second highlight reel lands here.
                    </p>
                    <Link href="/workout" className="px-5 py-2.5 rounded-xl bg-accent text-black text-xs font-bold hover:bg-accent-strong transition-all">
                        Start a workout
                    </Link>
                </div>
            )}

            {rows !== null && rows.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {rows.map((row) => (
                        <div key={row.id} className="border border-ink/5 rounded-xl overflow-hidden group">
                            <button onClick={() => play(row)} className="force-dark relative block w-full aspect-[9/16] bg-black cursor-pointer">
                                {playing?.id === row.id ? (
                                    <video src={playing.url} controls autoPlay playsInline className="absolute inset-0 w-full h-full object-contain" />
                                ) : (
                                    <>
                                        {thumbs[row.id] ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={thumbs[row.id]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                                        ) : (
                                            <div className="absolute inset-0 bg-ink/[0.03]" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                                        <span className="absolute inset-0 flex items-center justify-center">
                                            <span className="w-12 h-12 rounded-full bg-black/50 border border-ink/20 flex items-center justify-center group-hover:bg-accent group-hover:text-black text-ink transition-all">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 21,12 6,21" /></svg>
                                            </span>
                                        </span>
                                        <span className="absolute top-2 right-2 text-[10px] font-bold text-ink/80 bg-black/50 rounded-full px-2 py-0.5">
                                            {fmtClock(Number(row.duration_seconds))}
                                        </span>
                                        <div className="absolute bottom-2 left-2.5 right-2.5">
                                            <p className="text-xs font-bold text-ink truncate">{row.metadata.title ?? 'Workout'}</p>
                                            <p className="text-[10px] text-ink/40">
                                                {new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                {' · '}{row.workout_type === 'cardio' ? 'Cardio' : 'Strength'}
                                                {row.metadata.durationSeconds ? ` · ${fmtClock(row.metadata.durationSeconds)}` : ''}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </button>
                            <div className="flex divide-x divide-ink/5 border-t border-ink/5">
                                <button
                                    onClick={() => share(row)}
                                    disabled={busy === row.id}
                                    className="flex-1 py-2 text-[11px] font-semibold text-ink/50 hover:text-accent transition-colors cursor-pointer disabled:opacity-40"
                                >
                                    {busy === row.id ? '…' : 'Share'}
                                </button>
                                <button
                                    onClick={() => setPendingDelete(row)}
                                    disabled={busy === row.id}
                                    className="flex-1 py-2 text-[11px] font-semibold text-ink/50 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-40"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete confirmation */}
            {pendingDelete && (
                <div
                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
                    onClick={() => busy === null && setPendingDelete(null)}
                >
                    <div
                        role="alertdialog" aria-modal="true"
                        className="w-full max-w-[320px] bg-surface border border-ink/10 rounded-2xl p-5 shadow-2xl animate-chat-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-sm font-bold text-ink mb-1.5 font-display">Delete this replay?</h3>
                        <p className="text-xs text-ink/40 leading-relaxed mb-5">
                            The video will be permanently deleted from your library and storage. This can&apos;t be undone.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPendingDelete(null)}
                                disabled={busy !== null}
                                className="flex-1 py-2.5 rounded-xl border border-ink/10 text-sm font-semibold text-ink/60 hover:bg-ink/5 transition-all cursor-pointer disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={busy !== null}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-bold text-ink hover:bg-red-600 transition-all cursor-pointer disabled:opacity-60"
                            >
                                {busy !== null ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
