/**
 * CoachRichMessage — renders a coach reply with its tappable cards.
 *
 * The coach embeds [exercise:id] / [program:id] / [food:key] tags in plain
 * text (see lib/ai/cards.ts). Here those become real UI: exercise cards with
 * the movement's animation that start the exercise on tap, program cards that
 * open the program page, food cards with photos. Two or more exercise cards
 * in one reply also get a single "start all" button — the collated-workout
 * case.
 */

'use client';

import { useMemo } from 'react';
import { EXERCISES, ExerciseId } from '../lib/exercises';
import { PROGRAMS, LEVEL_LABELS } from '../lib/programs';
import { EXERCISE_VIDEOS } from './ExerciseGuide';
import { FOOD_LIBRARY, parseCoachSegments, exerciseIdsIn, CoachSegment } from '../lib/ai/cards';

interface CoachRichMessageProps {
    content: string;
    onStartExercises: (ids: ExerciseId[]) => void;
    onNavigate: (path: string) => void;
}

/** Consecutive food cards render as a photo grid, everything else stacks. */
type Block =
    | { kind: 'text'; text: string }
    | { kind: 'exercise'; id: ExerciseId }
    | { kind: 'program'; id: string }
    | { kind: 'foods'; ids: string[] };

function toBlocks(segments: CoachSegment[]): Block[] {
    const blocks: Block[] = [];
    for (const s of segments) {
        if (s.kind === 'food') {
            const prev = blocks[blocks.length - 1];
            if (prev?.kind === 'foods') prev.ids.push(s.id);
            else blocks.push({ kind: 'foods', ids: [s.id] });
        } else {
            blocks.push(s);
        }
    }
    return blocks;
}

export default function CoachRichMessage({ content, onStartExercises, onNavigate }: CoachRichMessageProps) {
    const segments = useMemo(() => parseCoachSegments(content), [content]);
    const blocks = useMemo(() => toBlocks(segments), [segments]);
    const allExerciseIds = useMemo(() => exerciseIdsIn(segments), [segments]);

    return (
        <div className="space-y-2">
            {blocks.map((block, i) => {
                if (block.kind === 'text') {
                    return (
                        <p key={i} className="whitespace-pre-wrap break-words">
                            {block.text}
                        </p>
                    );
                }

                if (block.kind === 'exercise') {
                    const cfg = EXERCISES[block.id];
                    const gif = EXERCISE_VIDEOS[block.id];
                    return (
                        <button
                            key={i}
                            onClick={() => onStartExercises([block.id])}
                            className="w-64 max-w-full flex items-center gap-3 rounded-xl bg-ink/5 border border-ink/10 hover:border-accent/40 p-2 text-left transition-all cursor-pointer group"
                        >
                            {gif ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={gif} alt="" className="w-12 h-12 rounded-lg object-cover bg-white flex-shrink-0" loading="lazy" />
                            ) : (
                                <span className="w-12 h-12 rounded-lg bg-accent/15 text-accent text-xs font-black flex items-center justify-center flex-shrink-0">
                                    {cfg.icon}
                                </span>
                            )}
                            <span className="flex-1 min-w-0">
                                <span className="block text-[13px] font-semibold text-ink truncate">{cfg.name}</span>
                                <span className="block text-[10px] text-ink/30 truncate">
                                    {cfg.categoryLabel ?? cfg.category}
                                </span>
                            </span>
                            <span className="flex-shrink-0 text-[11px] font-bold text-accent opacity-80 group-hover:opacity-100 pr-1">
                                Start →
                            </span>
                        </button>
                    );
                }

                if (block.kind === 'program') {
                    const program = PROGRAMS.find((p) => p.id === block.id)!;
                    return (
                        <button
                            key={i}
                            onClick={() => onNavigate(`/programs/${program.id}`)}
                            className="w-64 max-w-full flex items-center gap-3 rounded-xl bg-ink/5 border border-ink/10 hover:border-ink/25 p-2 text-left transition-all cursor-pointer group"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={program.image} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                            <span className="flex-1 min-w-0">
                                <span className="block text-[13px] font-semibold text-ink truncate">{program.name}</span>
                                <span className="block text-[10px] text-ink/30 truncate">
                                    {LEVEL_LABELS[program.level]} · {program.durationWeeks} weeks
                                </span>
                            </span>
                            <span className="flex-shrink-0 text-[11px] font-bold opacity-80 group-hover:opacity-100 pr-1" style={{ color: program.color }}>
                                View →
                            </span>
                        </button>
                    );
                }

                // Foods — photo grid (single food gets one wide card)
                return (
                    <div key={i} className={`w-64 max-w-full grid gap-2 ${block.ids.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {block.ids.map((id) => {
                            const food = FOOD_LIBRARY[id];
                            return (
                                <div key={id} className="relative rounded-xl overflow-hidden border border-ink/10">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={food.image} alt={food.name} className="w-full h-20 object-cover" loading="lazy" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                                    <p className="absolute bottom-1.5 left-2 right-2 text-[11px] font-semibold text-white truncate">
                                        {food.name}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            {/* Collated workout: start every recommended exercise as one session */}
            {allExerciseIds.length > 1 && (
                <button
                    onClick={() => onStartExercises(allExerciseIds)}
                    className="w-64 max-w-full py-2.5 rounded-xl bg-accent text-black text-[13px] font-bold hover:bg-accent-strong transition-all cursor-pointer"
                >
                    Start all {allExerciseIds.length} as a workout →
                </button>
            )}
        </div>
    );
}
