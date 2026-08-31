/**
 * EditProfileModal — let the user change what's theirs.
 *
 * Photo (uploaded to the `avatars` bucket, resized client-side), display name
 * (auth metadata), and body basics (age / sex / height / weight — the
 * `user_profiles` row the coach also reads). Everything optional; saving
 * writes only what changed.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { getUserProfile, saveBodyProfile, uploadAvatar } from '../lib/userProfile';

interface EditProfileModalProps {
    onClose: () => void;
}

export default function EditProfileModal({ onClose }: EditProfileModalProps) {
    const { user, updateProfile } = useAuth();
    const fileRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState(user?.name ?? '');
    const [age, setAge] = useState('');
    const [sex, setSex] = useState('');
    const [heightCm, setHeightCm] = useState('');
    const [weightKg, setWeightKg] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Pre-fill body stats from the existing profile row (may be empty)
    useEffect(() => {
        getUserProfile().then((p) => {
            if (!p) return;
            if (p.age != null) setAge(String(p.age));
            if (p.sex) setSex(p.sex);
            if (p.heightCm != null) setHeightCm(String(p.heightCm));
            if (p.weightKg != null) setWeightKg(String(p.weightKg));
        }).catch(() => {});
    }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const pickPhoto = () => fileRef.current?.click();

    const onPhotoChosen = async (file: File | undefined) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Please choose an image file.');
            return;
        }
        setError(null);
        setUploading(true);
        const { url, error: uploadError } = await uploadAvatar(file);
        if (uploadError || !url) {
            setError(uploadError ?? 'Could not upload the photo.');
        } else {
            const { error: saveError } = await updateProfile({ avatarUrl: url });
            if (saveError) setError(saveError);
        }
        setUploading(false);
        if (fileRef.current) fileRef.current.value = '';
    };

    const removePhoto = async () => {
        setError(null);
        setUploading(true);
        const { error: saveError } = await updateProfile({ avatarUrl: null });
        if (saveError) setError(saveError);
        setUploading(false);
    };

    const numOrNull = (s: string): number | null => {
        const n = parseFloat(s);
        return Number.isFinite(n) && n > 0 ? n : null;
    };

    const save = async () => {
        if (saving) return;
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Name cannot be empty.');
            return;
        }
        setError(null);
        setSaving(true);

        const tasks: Promise<unknown>[] = [
            saveBodyProfile({
                age: numOrNull(age),
                sex: sex || null,
                heightCm: numOrNull(heightCm),
                weightKg: numOrNull(weightKg),
            }),
        ];
        if (trimmedName !== user?.name) {
            tasks.push(updateProfile({ name: trimmedName }));
        }
        const results = await Promise.all(tasks);
        setSaving(false);

        const bodySaved = results[0] as boolean;
        const nameResult = results[1] as { error?: string } | undefined;
        if (nameResult?.error) {
            setError(nameResult.error);
            return;
        }
        if (!bodySaved) {
            setError('Your name was saved, but the body stats could not be — try again.');
            return;
        }
        onClose();
    };

    const inputClass = 'w-full bg-ink/5 border border-ink/10 rounded-xl px-3.5 py-2.5 text-base md:text-sm text-ink/90 placeholder:text-ink/20 focus:outline-none focus:border-accent/40';
    const labelClass = 'block text-[10px] text-ink/30 tracking-widest uppercase mb-1.5';

    return (
        <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !saving && !uploading && onClose()}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-profile-title"
                className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-surface border border-ink/10 rounded-2xl p-5 md:p-6 shadow-2xl animate-chat-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <h2 id="edit-profile-title" className="text-base font-bold text-ink">Edit profile</h2>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-ink/30 hover:text-ink/60 hover:bg-ink/5 transition-all cursor-pointer"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* ─── Photo ─────────────────────────────────────────────────── */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative w-16 h-16 flex-shrink-0">
                        {user?.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={user.avatarUrl} alt="Profile photo" className="w-16 h-16 rounded-full object-cover border border-ink/10" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                                <span className="text-black text-xl font-black" style={{ fontFamily: 'var(--font-orbitron), monospace' }}>
                                    {user?.name?.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
                        {uploading && (
                            <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                                <span className="w-4 h-4 border-2 border-ink/30 border-t-accent rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={pickPhoto}
                            disabled={uploading}
                            className="px-3.5 py-2 rounded-xl border border-ink/10 text-xs font-semibold text-ink/70 hover:border-accent/40 hover:text-accent transition-all cursor-pointer disabled:opacity-40"
                        >
                            {user?.avatarUrl ? 'Change photo' : 'Upload photo'}
                        </button>
                        {user?.avatarUrl && (
                            <button
                                onClick={removePhoto}
                                disabled={uploading}
                                className="px-3.5 py-2 rounded-xl border border-ink/10 text-xs font-semibold text-ink/40 hover:border-red-500/30 hover:text-red-400 transition-all cursor-pointer disabled:opacity-40"
                            >
                                Remove
                            </button>
                        )}
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => onPhotoChosen(e.target.files?.[0])}
                        />
                    </div>
                </div>

                {/* ─── Name ──────────────────────────────────────────────────── */}
                <div className="mb-4">
                    <label htmlFor="profile-name" className={labelClass}>Name</label>
                    <input
                        id="profile-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={60}
                        className={inputClass}
                    />
                </div>

                {/* ─── Body basics — the coach reads these too ───────────────── */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                        <label htmlFor="profile-age" className={labelClass}>Age</label>
                        <input
                            id="profile-age" type="number" inputMode="numeric" min={13} max={120}
                            value={age} onChange={(e) => setAge(e.target.value)}
                            placeholder="—" className={inputClass}
                        />
                    </div>
                    <div>
                        <label htmlFor="profile-sex" className={labelClass}>Sex</label>
                        <select
                            id="profile-sex" value={sex} onChange={(e) => setSex(e.target.value)}
                            className={`${inputClass} appearance-none cursor-pointer`}
                        >
                            <option value="" className="bg-surface">Prefer not to say</option>
                            <option value="male" className="bg-surface">Male</option>
                            <option value="female" className="bg-surface">Female</option>
                            <option value="other" className="bg-surface">Other</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="profile-height" className={labelClass}>Height (cm)</label>
                        <input
                            id="profile-height" type="number" inputMode="decimal" min={80} max={260}
                            value={heightCm} onChange={(e) => setHeightCm(e.target.value)}
                            placeholder="—" className={inputClass}
                        />
                    </div>
                    <div>
                        <label htmlFor="profile-weight" className={labelClass}>Weight (kg)</label>
                        <input
                            id="profile-weight" type="number" inputMode="decimal" min={25} max={400}
                            value={weightKg} onChange={(e) => setWeightKg(e.target.value)}
                            placeholder="—" className={inputClass}
                        />
                    </div>
                </div>

                {error && (
                    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 mb-4">
                        {error}
                    </p>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="flex-1 py-2.5 rounded-xl border border-ink/10 text-sm font-semibold text-ink/60 hover:bg-ink/5 transition-all cursor-pointer disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={save}
                        disabled={saving || uploading}
                        className="flex-1 py-2.5 rounded-xl bg-accent text-sm font-bold text-black hover:bg-accent-strong transition-all cursor-pointer disabled:opacity-60"
                    >
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
