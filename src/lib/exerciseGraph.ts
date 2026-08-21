/**
 * Exercise Graph — relationship queries and substitution over EXERCISE_META.
 *
 * Answers the questions the workout engine needs:
 *   - what is one step easier / harder than this exercise?
 *   - which exercises share this movement pattern / target muscles?
 *   - can THIS user perform this exercise (equipment, limitations, level)?
 *   - what's the closest appropriate replacement for THIS user?
 *
 * Everything here is deterministic and explainable: findSubstitute returns
 * the reasons behind each candidate's score, so a future coach UI (or LLM)
 * can say WHY an exercise was swapped rather than inventing a justification.
 */

import { ExerciseId, EXERCISES } from './exercises';
import {
    EXERCISE_META, EquipmentTag, Difficulty, LimitationArea, MovementPattern, Demand,
} from './exerciseMeta';

const ALL_IDS = Object.keys(EXERCISE_META) as ExerciseId[];

const DIFFICULTY_ORDER: Record<Difficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 };
const IMPACT_ORDER: Record<Demand, number> = { low: 0, moderate: 1, high: 2 };

/** Patterns that train the same broad movement even though they differ
 *  mechanically — a hip hinge and a hip thrust are both posterior-chain
 *  hip extension; a squat and a lunge are both knee-dominant. */
const RELATED_PATTERNS: Partial<Record<MovementPattern, MovementPattern[]>> = {
    hinge: ['hip_extension', 'knee_flexion'],
    hip_extension: ['hinge'],
    knee_flexion: ['hinge'],
    squat: ['lunge', 'knee_extension'],
    lunge: ['squat'],
    knee_extension: ['squat'],
};

// ─── Progression / regression ────────────────────────────────────────────────

/** One step easier, if a regression is defined (inverse of progressionOf). */
export function getRegression(id: ExerciseId): ExerciseId | null {
    return EXERCISE_META[id].progressionOf ?? null;
}

/** One step harder: every exercise that declares this one as its base. */
export function getProgressions(id: ExerciseId): ExerciseId[] {
    return ALL_IDS.filter((other) => EXERCISE_META[other].progressionOf === id);
}

/** Full easy→hard chain through an exercise, e.g. squat for front_squat →
 *  [squat, goblet_squat, front_squat, barbell_squat]. */
export function getProgressionChain(id: ExerciseId): ExerciseId[] {
    const chain: ExerciseId[] = [id];
    // walk down (guard against accidental cycles in data)
    let cur = getRegression(id);
    while (cur && !chain.includes(cur)) { chain.unshift(cur); cur = getRegression(cur); }
    // walk up, first-listed progression at each step
    let up: ExerciseId | undefined = getProgressions(id)[0];
    while (up && !chain.includes(up)) { chain.push(up); up = getProgressions(up)[0]; }
    return chain;
}

// ─── Derived relationships ───────────────────────────────────────────────────

export function sameMovementPattern(id: ExerciseId): ExerciseId[] {
    const pattern = EXERCISE_META[id].movementPattern;
    return ALL_IDS.filter((other) => other !== id && EXERCISE_META[other].movementPattern === pattern);
}

export function sameTargetMuscles(id: ExerciseId): ExerciseId[] {
    const primary = new Set(EXERCISE_META[id].primaryMuscles);
    return ALL_IDS.filter((other) =>
        other !== id && EXERCISE_META[other].primaryMuscles.some((m) => primary.has(m)));
}

// ─── Availability ────────────────────────────────────────────────────────────

/** The intake's four equipment answers (same literals as coachIntake). */
export type IntakeEquipment = 'bodyweight' | 'dumbbell' | 'barbell' | 'machine';

/**
 * Map the intake's coarse answers onto concrete equipment tags.
 * "Gym machines" is read as full gym access; a barbell setup implies a bench.
 * Small home gear (pull-up bar, box, rope, wheel) is only assumed at a gym —
 * conservative, so we never prescribe gear someone may not have.
 */
export function expandEquipment(owned: IntakeEquipment[]): Set<EquipmentTag> {
    const available = new Set<EquipmentTag>(['bodyweight']);
    for (const eq of owned) {
        if (eq === 'dumbbell') available.add('dumbbell');
        if (eq === 'barbell') { available.add('barbell'); available.add('bench'); }
        if (eq === 'machine') {
            for (const tag of ['machine', 'bar', 'bench', 'box', 'jump_rope', 'ab_wheel'] as EquipmentTag[]) {
                available.add(tag);
            }
        }
    }
    return available;
}

export function canPerform(id: ExerciseId, available: Set<EquipmentTag>): boolean {
    return EXERCISE_META[id].equipment.every((tag) => available.has(tag));
}

export function isContraindicated(id: ExerciseId, limitations: LimitationArea[]): boolean {
    const contra = EXERCISE_META[id].contraindications;
    return !!contra && limitations.some((l) => contra.includes(l));
}

// ─── Substitution ────────────────────────────────────────────────────────────

export interface SubstituteConstraints {
    /** Concrete equipment the user can use (from expandEquipment). */
    available: Set<EquipmentTag>;
    /** Limitation areas to screen out (from intake / profile). */
    limitations?: LimitationArea[];
    /** Exercises to never suggest (dislikes, already in the workout, ...). */
    exclude?: ExerciseId[];
    /** Cap candidate difficulty (e.g. 'beginner' for new users). */
    maxDifficulty?: Difficulty;
    /** Only allow low-impact candidates. */
    lowImpactOnly?: boolean;
    /** Require the same rep mode (reps vs timed hold) — set when substituting
     *  inside a program day, where the set targets assume the mode. */
    sameRepModeOnly?: boolean;
}

export interface SubstituteCandidate {
    id: ExerciseId;
    score: number;
    reasons: string[];
}

/**
 * Rank replacements for an exercise the user can't (or shouldn't) do.
 * Scoring prefers, in order of weight: the curated alternatives list and
 * progression chain, same movement pattern, same primary muscles, matching
 * rep mode (a hold shouldn't replace reps mid-workout), similar difficulty,
 * and shared training goals. Deterministic: ties break alphabetically.
 */
export function findSubstitutes(
    id: ExerciseId,
    constraints: SubstituteConstraints,
    limit = 3,
): SubstituteCandidate[] {
    const source = EXERCISE_META[id];
    const sourceMode = EXERCISES[id].repMode;
    const limitations = constraints.limitations ?? [];
    const exclude = new Set(constraints.exclude ?? []);
    const curated = new Set(source.alternatives ?? []);
    const chain = new Set(getProgressionChain(id));

    const candidates: SubstituteCandidate[] = [];

    for (const other of ALL_IDS) {
        if (other === id || exclude.has(other)) continue;
        if (!canPerform(other, constraints.available)) continue;
        if (isContraindicated(other, limitations)) continue;

        const meta = EXERCISE_META[other];
        if (constraints.lowImpactOnly && meta.impact !== 'low') continue;
        if (constraints.sameRepModeOnly && EXERCISES[other].repMode !== sourceMode) continue;
        if (constraints.maxDifficulty !== undefined
            && DIFFICULTY_ORDER[meta.difficulty] > DIFFICULTY_ORDER[constraints.maxDifficulty]) continue;

        let score = 0;
        const reasons: string[] = [];

        if (curated.has(other)) { score += 5; reasons.push('listed alternative'); }
        if (chain.has(other)) { score += 4; reasons.push('same progression chain'); }
        if (meta.movementPattern === source.movementPattern) {
            score += 4; reasons.push('same movement pattern');
        } else if (RELATED_PATTERNS[source.movementPattern]?.includes(meta.movementPattern)) {
            score += 2; reasons.push('related movement pattern');
        }

        const sharedPrimary = meta.primaryMuscles.filter((m) => source.primaryMuscles.includes(m));
        if (sharedPrimary.length > 0) {
            score += 3 * (sharedPrimary.length / source.primaryMuscles.length);
            reasons.push(`targets ${sharedPrimary.join(', ')}`);
        }

        // Partial credit for overlap beyond primary↔primary (e.g. a muscle the
        // original loads primarily that the candidate hits as secondary)
        const sourceAll = new Set([...source.primaryMuscles, ...source.secondaryMuscles]);
        const otherMuscles = [...meta.primaryMuscles, ...meta.secondaryMuscles]
            .filter((m) => sourceAll.has(m) && !sharedPrimary.includes(m));
        score += Math.min(1.5, 0.5 * otherMuscles.length);

        if (EXERCISES[other].repMode === sourceMode) score += 2;
        else reasons.push(sourceMode === 'standard' ? 'timed hold instead of reps' : 'reps instead of a timed hold');

        const diffGap = Math.abs(DIFFICULTY_ORDER[meta.difficulty] - DIFFICULTY_ORDER[source.difficulty]);
        score += diffGap === 0 ? 2 : diffGap === 1 ? 1 : 0;

        const sharedGoals = meta.goalTags.filter((g) => source.goalTags.includes(g));
        score += 0.5 * sharedGoals.length;

        // Never trade impact upward for free: replacing a low-impact exercise
        // with a jumpier one is usually the wrong direction for a substitute
        const impactIncrease = IMPACT_ORDER[meta.impact] - IMPACT_ORDER[source.impact];
        if (impactIncrease > 0) {
            score -= 1.5 * impactIncrease;
            reasons.push('higher impact than the original');
        }

        // A substitute must actually resemble the original: require a real
        // link (pattern, muscles, chain, or curation), not just availability.
        if (score < 3) continue;

        candidates.push({ id: other, score, reasons });
    }

    return candidates
        .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
        .slice(0, limit);
}

/** Best single substitute, or null when nothing suitable exists. */
export function findSubstitute(
    id: ExerciseId,
    constraints: SubstituteConstraints,
): SubstituteCandidate | null {
    return findSubstitutes(id, constraints, 1)[0] ?? null;
}
