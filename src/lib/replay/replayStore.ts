/**
 * Replay store — the only place replay bytes touch the network.
 *
 * Upload happens once, after composition, and only for the final ~25s recap
 * (+ one JPEG thumbnail). The `replays` bucket is PRIVATE: playback and
 * sharing go through short-lived signed URLs, and RLS restricts both the
 * bucket folder and the metadata rows to the owner.
 *
 * A row is inserted only after its files are safely in storage (status
 * 'ready'), so the library never shows phantom entries; a failed generation
 * simply leaves nothing behind and the workout data is untouched.
 */

import { createClient } from '../../utils/supabase/client';
import { logEvent } from '../events';
import { ComposedReplay, ReplayStats } from './replayComposer';

export interface ReplayRow {
    id: string;
    workout_type: 'strength' | 'cardio';
    storage_path: string;
    thumbnail_path: string | null;
    duration_seconds: number;
    status: string;
    metadata: {
        title?: string;
        durationSeconds?: number;
        lines?: Array<{ value: string; label: string }>;
        mimeType?: string;
    };
    created_at: string;
}

function extensionFor(mime: string): string {
    return mime.includes('mp4') ? 'mp4' : 'webm';
}

/** Upload the composed replay + thumbnail, then record it. */
export async function uploadReplay(
    composed: ComposedReplay,
    stats: ReplayStats,
    links: { workoutId?: string | null; cardioSessionId?: string | null },
): Promise<{ row?: ReplayRow; error?: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not signed in' };

    const id = crypto.randomUUID();
    const videoPath = `${user.id}/${id}.${extensionFor(composed.mimeType)}`;
    const thumbPath = composed.thumbnail ? `${user.id}/${id}.jpg` : null;

    const { error: videoError } = await supabase.storage
        .from('replays')
        .upload(videoPath, composed.blob, { contentType: composed.mimeType });
    if (videoError) {
        console.warn('[replay] Video upload failed:', videoError.message);
        return { error: 'Could not upload the replay — check your connection and try again.' };
    }

    if (thumbPath && composed.thumbnail) {
        // Thumbnail is cosmetic — a failure shouldn't sink the replay
        await supabase.storage
            .from('replays')
            .upload(thumbPath, composed.thumbnail, { contentType: 'image/jpeg' })
            .catch(() => {});
    }

    const { data, error } = await supabase
        .from('workout_replays')
        .insert({
            id,
            user_id: user.id,
            workout_id: links.workoutId ?? null,
            cardio_session_id: links.cardioSessionId ?? null,
            workout_type: stats.workoutType,
            storage_path: videoPath,
            thumbnail_path: thumbPath,
            duration_seconds: composed.durationSeconds,
            status: 'ready',
            metadata: {
                title: stats.title,
                durationSeconds: stats.durationSeconds,
                lines: stats.lines,
                mimeType: composed.mimeType,
            },
        })
        .select('id, workout_type, storage_path, thumbnail_path, duration_seconds, status, metadata, created_at')
        .single();

    if (error || !data) {
        // Don't leave orphaned files behind the missing row
        await supabase.storage.from('replays').remove([videoPath, ...(thumbPath ? [thumbPath] : [])]).catch(() => {});
        console.warn('[replay] Row insert failed:', error?.message);
        return { error: 'Could not save the replay — is the replays migration applied?' };
    }

    logEvent('REPLAY_CREATED', { metadata: { replay_id: id, workout_type: stats.workoutType } });
    return { row: data as ReplayRow };
}

/** Newest-first library listing (ready replays only). */
export async function listReplays(): Promise<ReplayRow[]> {
    const supabase = createClient();
    const { data } = await supabase
        .from('workout_replays')
        .select('id, workout_type, storage_path, thumbnail_path, duration_seconds, status, metadata, created_at')
        .eq('status', 'ready')
        .order('created_at', { ascending: false })
        .limit(100);
    return (data ?? []) as ReplayRow[];
}

/** Short-lived signed playback/poster URLs (private bucket). */
export async function getReplayUrls(row: ReplayRow): Promise<{ video: string | null; thumb: string | null }> {
    const supabase = createClient();
    const paths = [row.storage_path, ...(row.thumbnail_path ? [row.thumbnail_path] : [])];
    const { data } = await supabase.storage.from('replays').createSignedUrls(paths, 3600);
    const video = data?.find((d) => d.path === row.storage_path)?.signedUrl ?? null;
    const thumb = row.thumbnail_path
        ? data?.find((d) => d.path === row.thumbnail_path)?.signedUrl ?? null
        : null;
    return { video, thumb };
}

/** Remove storage objects first, then the row. */
export async function deleteReplay(row: ReplayRow): Promise<boolean> {
    const supabase = createClient();
    const paths = [row.storage_path, ...(row.thumbnail_path ? [row.thumbnail_path] : [])];
    const { error: storageError } = await supabase.storage.from('replays').remove(paths);
    if (storageError) {
        console.warn('[replay] Storage delete failed:', storageError.message);
        return false;
    }
    const { error } = await supabase.from('workout_replays').delete().eq('id', row.id);
    return !error;
}

/**
 * Share via the device share sheet when it supports files (the mobile path
 * to WhatsApp/Instagram/TikTok); returns 'shared', or 'download' after
 * falling back to a plain download, or 'failed'.
 */
export async function shareReplayBlob(blob: Blob, filename: string): Promise<'shared' | 'download' | 'failed'> {
    const file = new File([blob], filename, { type: blob.type });
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: 'My Iron Track workout' });
            return 'shared';
        } catch (err) {
            if ((err as { name?: string })?.name === 'AbortError') return 'shared'; // user closed the sheet
        }
    }
    try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        return 'download';
    } catch {
        return 'failed';
    }
}

/** Fetch a stored replay's bytes (for re-sharing from the library). */
export async function downloadReplayBlob(row: ReplayRow): Promise<Blob | null> {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from('replays').download(row.storage_path);
    if (error || !data) return null;
    return data;
}
