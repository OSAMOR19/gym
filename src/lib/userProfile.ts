/**
 * User Profile — persistent user attributes in Supabase (`user_profiles`).
 *
 * Extends the auth user 1:1. Everything is nullable: the profile fills in
 * gradually as features collect information (today: the coach intake).
 * The deterministic intake stays the authority on WHAT is asked and how the
 * recommendation is scored — this module only persists the results.
 *
 * The coach plan keeps its localStorage copy as a device cache so pages can
 * render instantly; syncCoachPlan() reconciles it with the server so the plan
 * follows the user across devices.
 */

import { createClient } from '../utils/supabase/client';
import {
    IntakeAnswers, Goal, Experience, Equipment, Limitation,
    CoachPlan, getCoachPlan, saveCoachPlan,
} from './coachIntake';

export interface UserProfile {
    age: number | null;
    sex: string | null;
    heightCm: number | null;
    weightKg: number | null;
    fitnessExperience: Experience | null;
    primaryGoal: Goal | null;
    secondaryGoal: string | null;
    preferredWorkoutDays: number | null;
    preferredWorkoutDurationMin: number | null;
    equipment: Equipment[] | null;
    exercisePreferences: string[] | null;
    exerciseDislikes: string[] | null;
    limitations: Limitation[] | null;
    dietaryPreferences: string[] | null;
    recommendedProgramId: string | null;
    intakeCompletedAt: string | null;
}

/** Null when signed out, no row yet, or the migration isn't applied. */
export async function getUserProfile(): Promise<UserProfile | null> {
    if (typeof window === 'undefined') return null;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error || !data) return null;

    return {
        age: data.age,
        sex: data.sex,
        heightCm: data.height_cm,
        weightKg: data.weight_kg,
        fitnessExperience: data.fitness_experience,
        primaryGoal: data.primary_goal,
        secondaryGoal: data.secondary_goal,
        preferredWorkoutDays: data.preferred_workout_days,
        preferredWorkoutDurationMin: data.preferred_workout_duration_min,
        equipment: data.equipment,
        exercisePreferences: data.exercise_preferences,
        exerciseDislikes: data.exercise_dislikes,
        limitations: data.limitations,
        dietaryPreferences: data.dietary_preferences,
        recommendedProgramId: data.recommended_program_id,
        intakeCompletedAt: data.intake_completed_at,
    };
}

/** Save the user-editable basics from the profile editor. */
export async function saveBodyProfile(updates: {
    age?: number | null;
    sex?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
}): Promise<boolean> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
        .from('user_profiles')
        .upsert({
            user_id: user.id,
            ...(updates.age !== undefined && { age: updates.age }),
            ...(updates.sex !== undefined && { sex: updates.sex }),
            ...(updates.heightCm !== undefined && { height_cm: updates.heightCm }),
            ...(updates.weightKg !== undefined && { weight_kg: updates.weightKg }),
        }, { onConflict: 'user_id' });

    if (error) {
        console.warn('[userProfile] Could not save profile:', error.message);
        return false;
    }
    return true;
}

/** Downscale an image file to a square JPEG (center-cropped) for the avatar. */
async function resizeToSquareJpeg(file: File, size: number): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
        bitmap,
        (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side,
        0, 0, size, size,
    );
    bitmap.close();
    return new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process the image'))), 'image/jpeg', 0.85);
    });
}

/**
 * Upload a profile photo to the `avatars` storage bucket (own-folder path,
 * resized client-side) and return its public URL. The `?v=` cache-buster makes
 * the new photo show immediately even though the storage path is stable.
 */
export async function uploadAvatar(file: File): Promise<{ url?: string; error?: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not signed in' };

    let blob: Blob;
    try {
        blob = await resizeToSquareJpeg(file, 512);
    } catch {
        return { error: 'That file could not be read as an image.' };
    }

    const path = `${user.id}/avatar.jpg`;
    const { error } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (error) {
        console.warn('[userProfile] Avatar upload failed:', error.message);
        return { error: 'Could not upload the photo — is the avatars storage migration applied?' };
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return { url: `${data.publicUrl}?v=${Date.now()}` };
}

/**
 * Persist a completed coach intake into the profile.
 * `savedAt` keeps localStorage and server timestamps identical so
 * syncCoachPlan can tell which copy is newer.
 */
export async function saveIntakeProfile(
    answers: IntakeAnswers,
    programId: string,
    savedAt: string,
): Promise<boolean> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
        .from('user_profiles')
        .upsert({
            user_id: user.id,
            fitness_experience: answers.experience,
            primary_goal: answers.goal,
            preferred_workout_days: answers.daysPerWeek,
            equipment: answers.equipment,
            limitations: answers.limitations.filter((l) => l !== 'none'),
            recommended_program_id: programId,
            intake_completed_at: savedAt,
        }, { onConflict: 'user_id' });

    if (error) {
        console.warn('[userProfile] Could not persist intake:', error.message);
        return false;
    }
    return true;
}

/** Does this profile contain a full, restorable intake? */
function hasIntake(p: UserProfile): p is UserProfile & {
    primaryGoal: Goal; fitnessExperience: Experience; equipment: Equipment[];
    preferredWorkoutDays: number; recommendedProgramId: string; intakeCompletedAt: string;
} {
    return !!(p.primaryGoal && p.fitnessExperience && p.equipment
        && p.preferredWorkoutDays && p.recommendedProgramId && p.intakeCompletedAt);
}

function planFromProfile(p: UserProfile): CoachPlan | null {
    if (!hasIntake(p)) return null;
    return {
        answers: {
            goal: p.primaryGoal,
            experience: p.fitnessExperience,
            equipment: p.equipment,
            daysPerWeek: p.preferredWorkoutDays,
            limitations: p.limitations?.length ? p.limitations : ['none'],
        },
        programId: p.recommendedProgramId,
        savedAt: p.intakeCompletedAt,
    };
}

/**
 * Reconcile the coach plan between localStorage (cache) and Supabase (truth).
 * Newest copy wins; the other side is brought up to date. Returns the
 * effective plan — falls back to the local copy on any server trouble.
 */
export async function syncCoachPlan(): Promise<CoachPlan | null> {
    const local = getCoachPlan();
    try {
        const profile = await getUserProfile();
        const remote = profile ? planFromProfile(profile) : null;

        if (remote && (!local || new Date(remote.savedAt) > new Date(local.savedAt))) {
            saveCoachPlan(remote);
            return remote;
        }
        if (local && (!remote || new Date(local.savedAt) > new Date(remote.savedAt))) {
            void saveIntakeProfile(local.answers, local.programId, local.savedAt);
        }
        return local;
    } catch {
        return local;
    }
}
