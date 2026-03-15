/**
 * useSpeechCoach — Text-to-speech voice coaching hook.
 *
 * Uses the browser's SpeechSynthesis API to provide voice guidance:
 *  - Says "Very good!" on good form reps
 *  - Rep milestones (halfway, last rep, complete)
 *  - Reads out the AI coach summary at workout end
 *
 * Kept minimal to avoid being annoying. Rate-limited heavily.
 */

'use client';

import { useCallback, useRef, useEffect } from 'react';
import type { CoachTip } from '../lib/aiCoach';

interface SpeechCoachOptions {
    enabled: boolean;
    targetReps?: number;
    currentSet?: number;
    totalSets?: number;
}

export function useSpeechCoach(options: SpeechCoachOptions) {
    const { enabled, targetReps, currentSet, totalSets } = options;
    const lastSpokenRepRef = useRef<number>(0);
    const lastSpokenTimeRef = useRef<number>(0);
    const isSpeakingRef = useRef<boolean>(false);

    // Speak a single utterance — no queue, just one at a time
    const speak = useCallback((text: string) => {
        if (!enabled) return;
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        const now = Date.now();
        // Rate limit: minimum 4 seconds between speeches
        if (now - lastSpokenTimeRef.current < 4000) return;
        if (isSpeakingRef.current) return;

        lastSpokenTimeRef.current = now;
        isSpeakingRef.current = true;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        // Try to use a natural voice
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Samantha'))
            || voices.find(v => v.lang.startsWith('en') && !v.name.includes('Google'))
            || voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) {
            utterance.voice = englishVoice;
        }

        utterance.onend = () => { isSpeakingRef.current = false; };
        utterance.onerror = () => { isSpeakingRef.current = false; };

        window.speechSynthesis.speak(utterance);
    }, [enabled]);

    // Handle rep count changes — only key milestones
    const onRepChange = useCallback((repCount: number) => {
        if (!enabled || repCount <= lastSpokenRepRef.current) return;
        lastSpokenRepRef.current = repCount;

        if (targetReps && targetReps > 0) {
            if (repCount === targetReps) {
                speak('Set complete! Great work!');
                return;
            }
            if (repCount === targetReps - 1) {
                speak('One more rep!');
                return;
            }
            if (repCount === Math.floor(targetReps / 2) && targetReps >= 6) {
                speak('Halfway there!');
                return;
            }
        }

        // Speak every 5 reps for free-form workouts
        if (repCount % 5 === 0 && repCount > 0) {
            speak(`${repCount} reps!`);
        }
    }, [enabled, targetReps, speak]);

    // Handle coach tips — ONLY speak "Very good!" on encouragement, skip everything else
    const onCoachTip = useCallback((tip: CoachTip | null) => {
        if (!enabled || !tip) return;

        if (tip.type === 'encouragement') {
            speak('Very good!');
        }
        // Don't speak warnings/technique tips — they show on screen already
    }, [enabled, speak]);

    // Handle form feedback — speak when form is poor
    const onFormFeedback = useCallback((feedback: string, formQuality: number) => {
        if (!enabled) return;
        if (formQuality < 50 && formQuality > 0) {
            speak('Watch your form!');
        }
    }, [enabled, speak]);

    // Speak the AI coach summary at the end of workout
    const speakSummary = useCallback((coachNotes: string[]) => {
        if (!enabled || coachNotes.length === 0) return;
        // Force speak even if recently spoke (workout just ended)
        lastSpokenTimeRef.current = 0;
        // Read the first note (most important one)
        speak(coachNotes[0]);
    }, [enabled, speak]);

    // Handle set completion
    const onSetComplete = useCallback(() => {
        if (!enabled) return;
        if (currentSet && totalSets) {
            if (currentSet >= totalSets) {
                speak('All sets complete! Amazing workout!');
            }
        }
    }, [enabled, currentSet, totalSets, speak]);

    // Reset
    const reset = useCallback(() => {
        lastSpokenRepRef.current = 0;
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        isSpeakingRef.current = false;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    return {
        onRepChange,
        onCoachTip,
        onFormFeedback,
        onSetComplete,
        speakSummary,
        reset,
    };
}
