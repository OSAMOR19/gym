/**
 * Training Config — the deterministic thresholds behind readiness and
 * progression, in one place instead of scattered through the UI.
 *
 * These are conservative coaching heuristics, not medical truths. Tune them
 * here; the engines (userState, workoutBuilder, progression) only read them.
 */

export const READINESS = {
    /** Up to this many days away → continue as planned. */
    continueMaxDays: 10,
    /** Up to this many days away → same workout, one set fewer. */
    reduceMaxDays: 21,
    /** Sets removed per exercise when easing back. */
    easeBackSetReduction: 1,
    /** Never reduce below this many sets. */
    minSets: 2,
} as const;

export const PROGRESSION = {
    /** Progress when every set hit target AND the hardest set felt ≤ this. */
    progressMaxRpe: 6,
    /** Regress/hold when any set felt ≥ this. */
    regressMinRpe: 9,
    /** Without RPE data, progress only on strong form evidence. */
    progressMinFormScore: 85,
    /** A set counts as clearly missed below this share of its target. */
    missedRepShare: 0.8,

    repIncrement: 1,
    repDecrement: 2,
    minTargetReps: 4,
    /** Cap on how far reps may drift above the program template. */
    maxRepIncrease: 3,

    holdIncrementSeconds: 5,
    holdDecrementSeconds: 5,
    minHoldSeconds: 15,
    /** Cap on how far holds may drift above the program template. */
    maxHoldIncreaseSeconds: 15,
} as const;

export const FORM_TREND = {
    /** Form counts as improving/declining beyond this many points of change. */
    threshold: 5,
} as const;
