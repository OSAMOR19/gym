/**
 * Cardio sessions — summaries in Supabase (`cardio_sessions`), estimates
 * labeled honestly.
 *
 * The engine's per-frame data never leaves the device. What we store is one
 * summary row per session; distance and calories carry an explicit source so
 * the UI can say "estimated" vs "from your treadmill speed".
 */

import { createClient } from '../../utils/supabase/client';
import { logEvent } from '../events';
import { CardioActivity } from './cardioEngine';

export interface CardioSummary {
    activity: CardioActivity;
    startedAt: string;            // ISO
    durationSeconds: number;      // measured (clock)
    steps: number;                // estimated (camera)
    avgCadence: number;           // estimated (camera)
    peakCadence: number;
    treadmillSpeedKmh: number | null;  // measured input (user-entered)
    distanceKm: number | null;
    distanceSource: 'treadmill_input' | 'estimated' | null;
    estCalories: number | null;   // always an estimate
    formScore: number;
}

/**
 * Distance: from user-entered treadmill speed when available (speed × time —
 * a measured input), otherwise a step-length estimate from height. Jump rope
 * has no meaningful distance.
 */
export function deriveDistance(
    activity: CardioActivity,
    durationSeconds: number,
    steps: number,
    treadmillSpeedKmh: number | null,
    heightCm: number | null,
): { distanceKm: number | null; source: 'treadmill_input' | 'estimated' | null } {
    if (treadmillSpeedKmh && treadmillSpeedKmh > 0) {
        return {
            distanceKm: Math.round(treadmillSpeedKmh * (durationSeconds / 3600) * 100) / 100,
            source: 'treadmill_input',
        };
    }
    if (activity === 'jump_rope' || steps < 20) return { distanceKm: null, source: null };
    // Pedometer-style step length: walking ≈ 0.414 × height, running ≈ 0.62 × height
    const h = (heightCm ?? 170) / 100;
    const stepMeters = activity === 'running' || activity === 'treadmill_run' ? h * 0.62 : h * 0.414;
    return { distanceKm: Math.round(steps * stepMeters / 10) / 100, source: 'estimated' };
}

/** MET-based calorie estimate. Always labeled "estimated" in the UI. */
export function estimateCalories(
    activity: CardioActivity,
    durationSeconds: number,
    avgCadence: number,
    weightKg: number | null,
): number | null {
    if (durationSeconds < 60) return null;
    const met = activity === 'jump_rope' ? 11
        : activity === 'running' || activity === 'treadmill_run' ? (avgCadence > 170 ? 10 : 8.5)
        : avgCadence > 110 ? 4.3 : 3.5;
    const kg = weightKg ?? 70;
    return Math.round(met * kg * (durationSeconds / 3600));
}

/** Insert the session summary. Returns the new row id, or null on failure. */
export async function saveCardioSession(summary: CardioSummary): Promise<string | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('cardio_sessions')
        .insert({
            user_id: user.id,
            activity_type: summary.activity,
            started_at: summary.startedAt,
            duration_seconds: summary.durationSeconds,
            steps: summary.steps || null,
            avg_cadence: summary.avgCadence || null,
            peak_cadence: summary.peakCadence || null,
            treadmill_speed_kmh: summary.treadmillSpeedKmh,
            distance_km: summary.distanceKm,
            distance_source: summary.distanceSource,
            est_calories: summary.estCalories,
            form_score: summary.formScore || null,
        })
        .select('id')
        .single();

    if (error || !data) {
        console.warn('[cardio] Could not save session:', error?.message);
        return null;
    }
    logEvent('CARDIO_COMPLETED', {
        metadata: {
            activity: summary.activity,
            duration_seconds: summary.durationSeconds,
            steps: summary.steps,
            distance_km: summary.distanceKm,
        },
    });
    return data.id;
}
