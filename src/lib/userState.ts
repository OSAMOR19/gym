/**
 * User State — the deterministic "how is this user doing right now" layer.
 *
 * Everything here is reproducible from persisted data (workout_records for
 * long history, workout_sets for RPE, program_progress for position, the
 * coach plan for intent). No LLM, no guesswork: pure calculations that
 * readiness, progression, and the future AI coach's context builder consume.
 */

import { createClient } from '../utils/supabase/client';
import { getAllWorkouts } from './progressStore';
import { getCoachPlan } from './coachIntake';
import { getProgramPosition } from './programProgress';
import { READINESS, FORM_TREND } from './trainingConfig';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProgramPositionState {
    programId: string;
    completedDayCount: number;
    currentDayIndex: number | null;
    lastSessionAt: string | null;
}

export interface UserState {
    daysSinceLastWorkout: number | null;   // null = never worked out
    workoutsLast7Days: number;
    workoutsLast28Days: number;
    repsLast7Days: number;
    repsLast28Days: number;
    avgFormLast7Days: number | null;
    avgFormPrev21Days: number | null;
    formTrend: 'improving' | 'steady' | 'declining' | null;
    avgRpeLast7Days: number | null;        // null until RPE data exists
    /** Workouts per week over the last 28 days vs the plan's preferred days;
     *  1 = fully on plan. Null without an intake plan. */
    adherence: number | null;
    programPosition: ProgramPositionState | null;
}

export type ReadinessLevel = 'ready' | 'light' | 'ease_back';

export interface Readiness {
    level: ReadinessLevel;
    daysAway: number | null;
    /** Shown to the user when not 'ready'. */
    message: string | null;
    /** Sets to remove per exercise when building the next workout. */
    setAdjustment: number;
}

// ─── State calculation ───────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getUserState(): Promise<UserState> {
    const records = await getAllWorkouts(); // newest first
    const now = Date.now();

    const inWindow = (dateStr: string, fromDaysAgo: number, toDaysAgo: number) => {
        const age = (now - new Date(dateStr).getTime()) / DAY_MS;
        return age >= fromDaysAgo && age < toDaysAgo;
    };

    const last7 = records.filter((r) => inWindow(r.date, 0, 7));
    const last28 = records.filter((r) => inWindow(r.date, 0, 28));
    const prev21 = records.filter((r) => inWindow(r.date, 7, 28));

    const avg = (nums: number[]) =>
        nums.length > 0 ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;

    const avgFormLast7Days = avg(last7.map((r) => r.formQuality));
    const avgFormPrev21Days = avg(prev21.map((r) => r.formQuality));

    let formTrend: UserState['formTrend'] = null;
    if (avgFormLast7Days !== null && avgFormPrev21Days !== null) {
        const delta = avgFormLast7Days - avgFormPrev21Days;
        formTrend = delta > FORM_TREND.threshold ? 'improving'
            : delta < -FORM_TREND.threshold ? 'declining' : 'steady';
    }

    const daysSinceLastWorkout = records.length > 0
        ? Math.floor((now - new Date(records[0].date).getTime()) / DAY_MS)
        : null;

    const plan = getCoachPlan();
    const adherence = plan && plan.answers.daysPerWeek > 0
        ? Math.round(((last28.length / 4) / plan.answers.daysPerWeek) * 100) / 100
        : null;

    let programPosition: ProgramPositionState | null = null;
    if (plan) {
        try {
            const pos = await getProgramPosition(plan.programId);
            if (pos) {
                programPosition = {
                    programId: plan.programId,
                    completedDayCount: pos.completedDays.length,
                    currentDayIndex: pos.currentDayIndex,
                    lastSessionAt: pos.lastSessionAt,
                };
            }
        } catch {
            // table unavailable — position simply unknown
        }
    }

    const avgRpeLast7Days = await getAvgRecentRpe();

    return {
        daysSinceLastWorkout,
        workoutsLast7Days: last7.length,
        workoutsLast28Days: last28.length,
        repsLast7Days: last7.reduce((s, r) => s + r.reps, 0),
        repsLast28Days: last28.reduce((s, r) => s + r.reps, 0),
        avgFormLast7Days,
        avgFormPrev21Days,
        formTrend,
        avgRpeLast7Days,
        adherence,
        programPosition,
    };
}

async function getAvgRecentRpe(): Promise<number | null> {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const since = new Date(Date.now() - 7 * DAY_MS).toISOString();
        const { data, error } = await supabase
            .from('workout_sets')
            .select('rpe')
            .eq('user_id', user.id)
            .not('rpe', 'is', null)
            .gte('completed_at', since);

        if (error || !data || data.length === 0) return null;
        const sum = data.reduce((s, row) => s + (row.rpe as number), 0);
        return Math.round((sum / data.length) * 10) / 10;
    } catch {
        return null;
    }
}

// ─── Readiness ("continue where I left off") ─────────────────────────────────

/**
 * Deterministic resume rules — conservative on purpose, thresholds live in
 * trainingConfig. Prevents blind continuation after a long break; it does
 * not diagnose anything.
 */
export function assessReadiness(state: UserState): Readiness {
    const days = state.daysSinceLastWorkout;

    // Never trained, or trained recently → proceed as planned
    if (days === null || days <= READINESS.continueMaxDays) {
        return { level: 'ready', daysAway: days, message: null, setAdjustment: 0 };
    }

    if (days <= READINESS.reduceMaxDays) {
        return {
            level: 'light',
            daysAway: days,
            message: `It's been ${days} days since your last workout — today's session is trimmed by one set per exercise so you can ease back in.`,
            setAdjustment: -READINESS.easeBackSetReduction,
        };
    }

    const weeks = Math.round(days / 7);
    return {
        level: 'ease_back',
        daysAway: days,
        message: `Welcome back — it's been about ${weeks} weeks. Start light: sets are reduced today, and repeating a day you've already done is a smart way back in.`,
        setAdjustment: -READINESS.easeBackSetReduction,
    };
}
