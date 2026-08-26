/**
 * Coach cards — the tag protocol between the coach LLM and the chat UI.
 *
 * The coach embeds `[exercise:<id>]`, `[program:<id>]`, and `[food:<key>]`
 * tags in its plain-text replies (the system prompt teaches it the valid
 * ids). The chat parses replies into segments and renders each tag as a
 * tappable card — exercises start right from the chat, programs link to
 * their page, foods show a photo.
 *
 * Everything here is validated: unknown ids are silently dropped so a
 * hallucinated tag can never render a broken card.
 */

import { EXERCISES, ExerciseId } from '../exercises';
import { PROGRAMS } from '../programs';

// ─── Food library — curated foods the coach may recommend with a photo ──────

export interface FoodEntry {
    name: string;
    image: string;   // under public/foods/
}

export const FOOD_LIBRARY: Record<string, FoodEntry> = {
    chicken_breast: { name: 'Chicken breast', image: '/foods/chicken_breast.jpg' },
    salmon:         { name: 'Salmon',         image: '/foods/salmon.jpg' },
    eggs:           { name: 'Eggs',           image: '/foods/eggs.jpg' },
    greek_yogurt:   { name: 'Greek yogurt',   image: '/foods/greek_yogurt.jpg' },
    oatmeal:        { name: 'Oatmeal',        image: '/foods/oatmeal.jpg' },
    brown_rice:     { name: 'Brown rice',     image: '/foods/brown_rice.jpg' },
    sweet_potato:   { name: 'Sweet potato',   image: '/foods/sweet_potato.jpg' },
    broccoli:       { name: 'Broccoli',       image: '/foods/broccoli.jpg' },
    salad:          { name: 'Mixed salad',    image: '/foods/salad.jpg' },
    avocado:        { name: 'Avocado',        image: '/foods/avocado.jpg' },
    banana:         { name: 'Banana',         image: '/foods/banana.jpg' },
    apple:          { name: 'Apple',          image: '/foods/apple.jpg' },
    berries:        { name: 'Berries',        image: '/foods/berries.jpg' },
    nuts:           { name: 'Mixed nuts',     image: '/foods/nuts.jpg' },
    protein_shake:  { name: 'Protein shake',  image: '/foods/protein_shake.jpg' },
};

// ─── Reply parsing ───────────────────────────────────────────────────────────

export type CoachSegment =
    | { kind: 'text'; text: string }
    | { kind: 'exercise'; id: ExerciseId }
    | { kind: 'program'; id: string }
    | { kind: 'food'; id: string };

const TAG_RE = /\[(exercise|program|food):([a-z0-9_-]+)\]/g;

const PROGRAM_IDS = new Set(PROGRAMS.map((p) => p.id));

function isValidTag(kind: string, id: string): boolean {
    if (kind === 'exercise') return id in EXERCISES;
    if (kind === 'program') return PROGRAM_IDS.has(id);
    return id in FOOD_LIBRARY;
}

/**
 * Strip formatting the model sometimes sneaks in despite instructions —
 * backticks/bold around tags render as stray marks once the tag is extracted —
 * and drop a trailing tag left incomplete by output truncation.
 */
function sanitize(raw: string): string {
    return raw
        .replace(/`+/g, '')
        .replace(/\*\*/g, '')
        .replace(/\[(?:exercise|program|food)(?::[a-z0-9_-]*)?$/, '')
        .trim();
}

/** Split a coach reply into text and card segments. Unknown ids are dropped. */
export function parseCoachSegments(raw: string): CoachSegment[] {
    const content = sanitize(raw);
    const segments: CoachSegment[] = [];
    let last = 0;

    const pushText = (chunk: string) => {
        const text = chunk.replace(/^\s+|\s+$/g, '');
        // Skip leftovers that are only punctuation (e.g. the shell of a
        // stripped wrapper like "( )" around a tag)
        if (text && !/^[\s\[\]()*_#:>-]+$/.test(text)) segments.push({ kind: 'text', text });
    };

    for (const match of content.matchAll(TAG_RE)) {
        const [full, kind, id] = match;
        pushText(content.slice(last, match.index));
        last = match.index + full.length;
        if (!isValidTag(kind, id)) continue; // hallucinated id — drop the tag
        if (kind === 'exercise') segments.push({ kind: 'exercise', id: id as ExerciseId });
        else if (kind === 'program') segments.push({ kind: 'program', id });
        else segments.push({ kind: 'food', id });
    }
    pushText(content.slice(last));

    return segments.length > 0 ? segments : [{ kind: 'text', text: content || raw.trim() }];
}

/** Every valid exercise id referenced in a reply (for "start all" workouts). */
export function exerciseIdsIn(segments: CoachSegment[]): ExerciseId[] {
    return [...new Set(
        segments.filter((s): s is CoachSegment & { kind: 'exercise' } => s.kind === 'exercise').map((s) => s.id),
    )];
}
