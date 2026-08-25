/**
 * Coach Nudges — deterministic "the coach has something for you" signals.
 *
 * Derived from the user's actual journey state (userState + plan + program
 * position), never invented: each nudge exists only when the data says so.
 * They power the badge count on the floating coach button and become the
 * suggestion chips when the chat opens — tapping one sends its prompt, so
 * the conversation starts exactly where the user's journey is.
 */

import { getUserState } from './userState';
import { getCoachPlan } from './coachIntake';
import { getProgramById } from './programs';

export interface CoachNudge {
    id: string;
    /** Chip label shown in the chat's empty state. */
    label: string;
    /** Message sent to the coach when tapped ('' for action nudges). */
    prompt: string;
    /** 'intake' opens the find-my-plan flow instead of sending a message. */
    action?: 'intake';
}

const MAX_NUDGES = 3;

export async function getCoachNudges(): Promise<CoachNudge[]> {
    const nudges: CoachNudge[] = [];

    try {
        const plan = getCoachPlan();
        const state = await getUserState();

        // Away for a while → the comeback conversation
        if (state.daysSinceLastWorkout !== null && state.daysSinceLastWorkout >= 4) {
            nudges.push({
                id: 'comeback',
                label: `It's been ${state.daysSinceLastWorkout} days — plan my comeback`,
                prompt: `It's been ${state.daysSinceLastWorkout} days since my last workout. How should I get back into it?`,
            });
        }

        // On a plan with a day waiting → what's next
        if (plan && state.programPosition) {
            const program = getProgramById(state.programPosition.programId);
            const totalDays = program?.weeks.reduce((n, w) => n + w.days.length, 0) ?? 0;
            const nextIdx = state.programPosition.currentDayIndex ?? 0;
            if (program && nextIdx < totalDays) {
                nudges.push({
                    id: 'next-day',
                    label: `What's next in ${program.name}?`,
                    prompt: `What's coming up in my next ${program.name} day, and how should I approach it?`,
                });
            }
        }

        // Form slipping → a focused conversation, not a guilt trip
        if (state.formTrend === 'declining') {
            nudges.push({
                id: 'form',
                label: 'My form scores dropped — why?',
                prompt: 'My recent form scores have been lower than before. What should I focus on?',
            });
        }

        // No plan yet → the intake, right here in the chat
        if (!plan) {
            nudges.push({
                id: 'intake',
                label: 'Find my plan',
                prompt: '',
                action: 'intake',
            });
        }
    } catch {
        // Signed out / no data — no nudges, and that's fine
    }

    return nudges.slice(0, MAX_NUDGES);
}
