/**
 * ExercisePickerModal — Full-screen exercise chooser.
 *
 * Replaces the old top-bar dropdown that dumped all 68 exercises as a wall of
 * text chips. Exercises are grouped by equipment tab, and each group is a
 * horizontally swipeable row of preview cards (CSS scroll-snap — native swipe
 * on touch, drag/trackpad on desktop, plus arrow buttons).
 */

'use client';

import { useRef, useState, useEffect } from 'react';
import { ExerciseId, ExerciseConfig, CATEGORY_LABELS, getExercisesByLabel } from '../lib/exercises';
import { getDisabledExercises } from '../lib/exerciseAvailability';
import { getCameraGuide } from '../lib/cameraGuide';
import { EXERCISE_VIDEOS } from './ExerciseGuide';

interface ExercisePickerModalProps {
    open: boolean;
    activeExerciseId: ExerciseId;
    onSelect: (id: ExerciseId) => void;
    onClose: () => void;
}

const LABEL_COLORS: Record<string, string> = {
    'Body-weight': '#22c55e',
    'Dumbbell':    '#38bdf8',
    'Barbell':     '#f59e0b',
    'Machine':     '#a855f7',
    'Cardio':      '#ef4444',
    'Core':        '#f97316',
    'Stretch':     '#14b8a6',
};

function ExerciseCard({
    exercise,
    color,
    isActive,
    onSelect,
}: {
    exercise: ExerciseConfig;
    color: string;
    isActive: boolean;
    onSelect: () => void;
}) {
    const gif = EXERCISE_VIDEOS[exercise.id] ?? null;
    const [gifLoaded, setGifLoaded] = useState(false);

    return (
        <button
            onClick={onSelect}
            className={`
                snap-start flex-shrink-0 w-56 md:w-64 text-left rounded-xl border overflow-hidden
                transition-all cursor-pointer group
                ${isActive
                    ? 'border-[var(--card-color)] bg-ink/[0.06]'
                    : 'border-ink/8 bg-ink/[0.03] hover:border-ink/20 hover:bg-ink/[0.05]'}
            `}
            style={{ '--card-color': color } as React.CSSProperties}
        >
            {/* Preview */}
            <div className="relative h-44 md:h-52 bg-surface flex items-center justify-center overflow-hidden">
                {gif ? (
                    <>
                        {!gifLoaded && <div className="absolute inset-0 bg-ink/5 animate-pulse" />}
                        <img
                            src={gif}
                            alt={exercise.name}
                            loading="lazy"
                            onLoad={() => setGifLoaded(true)}
                            className={`w-full h-full object-cover transition-opacity duration-300 ${gifLoaded ? 'opacity-100' : 'opacity-0'}`}
                        />
                    </>
                ) : (
                    <span
                        className="text-2xl font-black tracking-wider opacity-25"
                        style={{ color, fontFamily: 'var(--font-orbitron), monospace' }}
                    >
                        {exercise.icon}
                    </span>
                )}
                {isActive && (
                    <span
                        className="absolute top-2 right-2 text-[8px] font-bold tracking-widest uppercase rounded-full px-2 py-0.5"
                        style={{ backgroundColor: color, color: '#000' }}
                    >
                        Selected
                    </span>
                )}
                {/* Camera orientation badge */}
                <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[8px] font-bold tracking-wider uppercase text-ink/70 bg-black/60 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" />
                    </svg>
                    {getCameraGuide(exercise.id).label}
                </span>
            </div>

            {/* Info */}
            <div className="p-3">
                <p className="text-sm font-semibold text-ink leading-tight mb-1">{exercise.name}</p>
                <p className="text-[11px] text-ink/30 leading-snug line-clamp-2">{exercise.description}</p>
            </div>
        </button>
    );
}

export default function ExercisePickerModal({
    open,
    activeExerciseId,
    onSelect,
    onClose,
}: ExercisePickerModalProps) {
    const [tab, setTab] = useState<string>('Body-weight');
    const [disabledIds, setDisabledIds] = useState<Set<ExerciseId>>(new Set());
    const rowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        // Admin kill-switch: hide exercises flipped off in the portal
        getDisabledExercises().then(setDisabledIds).catch(() => {});
        // Find which tab holds the active exercise
        for (const label of CATEGORY_LABELS) {
            if (getExercisesByLabel(label).some((e) => e.id === activeExerciseId)) {
                setTab(label);
                break;
            }
        }
    }, [open, activeExerciseId]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const exercises = getExercisesByLabel(tab).filter((e) => !disabledIds.has(e.id));
    const color = LABEL_COLORS[tab] ?? '#22c55e';

    const scrollByCards = (dir: 1 | -1) => {
        rowRef.current?.scrollBy({ left: dir * (rowRef.current.clientWidth * 0.8), behavior: 'smooth' });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />

            {/* Panel */}
            <div
                className="relative w-full md:max-w-5xl bg-[#0d0d0d] border border-ink/10 md:rounded-2xl rounded-t-2xl shadow-2xl animate-fade-in max-h-[90dvh] flex flex-col"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3">
                    <div>
                        <h2 className="text-base font-bold text-ink font-display">Choose Exercise</h2>
                        <p className="text-[10px] text-ink/25 mt-0.5">Swipe through the cards, tap one to select</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full border border-ink/10 flex items-center justify-center text-ink/40 hover:text-ink hover:border-ink/25 transition-all cursor-pointer"
                        aria-label="Close"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Category tabs */}
                <div className="flex gap-1.5 px-5 pb-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {CATEGORY_LABELS.map((label) => {
                        const c = LABEL_COLORS[label] ?? '#fff';
                        const isTab = tab === label;
                        return (
                            <button
                                key={label}
                                onClick={() => setTab(label)}
                                className={`
                                    flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer border
                                    ${isTab ? '' : 'text-ink/35 border-ink/8 hover:text-ink/60 hover:border-ink/20'}
                                `}
                                style={isTab ? { backgroundColor: `${c}18`, color: c, borderColor: `${c}45` } : {}}
                            >
                                {label}
                                <span className="ml-1.5 opacity-50 text-[9px]">{getExercisesByLabel(label).filter((e) => !disabledIds.has(e.id)).length}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Swipeable card row */}
                <div className="relative pb-5">
                    <div
                        ref={rowRef}
                        className="flex gap-3 px-5 overflow-x-auto snap-x snap-mandatory scroll-px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {exercises.map((ex) => (
                            <ExerciseCard
                                key={ex.id}
                                exercise={ex}
                                color={color}
                                isActive={ex.id === activeExerciseId}
                                onSelect={() => { onSelect(ex.id); onClose(); }}
                            />
                        ))}
                        {/* trailing spacer so the last card can snap fully into view */}
                        <div className="flex-shrink-0 w-2" />
                    </div>

                    {/* Desktop arrows */}
                    <button
                        onClick={() => scrollByCards(-1)}
                        className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 border border-ink/10 items-center justify-center text-ink/50 hover:text-ink transition-all cursor-pointer"
                        aria-label="Scroll left"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,18 9,12 15,6" /></svg>
                    </button>
                    <button
                        onClick={() => scrollByCards(1)}
                        className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 border border-ink/10 items-center justify-center text-ink/50 hover:text-ink transition-all cursor-pointer"
                        aria-label="Scroll right"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9,18 15,12 9,6" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
