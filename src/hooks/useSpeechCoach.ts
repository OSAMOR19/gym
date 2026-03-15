/**
 * useSpeechCoach — Text-to-speech voice coaching hook.
 *
 * Uses the browser's SpeechSynthesis API to provide voice guidance:
 *  - "3, 2, 1, Go!" countdown
 *  - Exercise name on start
 *  - Rep milestones (halfway, last rep, complete)
 *  - Form feedback when quality is low
 *  - AI coach summary at workout end
 *
 * FIXES:
 *  - Preloads voices via `voiceschanged` event (getVoices() returns [] initially)
 *  - Chrome workaround: resumes speechSynthesis every 10s to prevent hanging
 *  - Direct utterance creation bypasses rate limit for critical messages
 */

'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
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
    const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
    const resumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [voicesLoaded, setVoicesLoaded] = useState(false);

    // Preload voices — critical for first call
    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                voiceRef.current =
                    voices.find(v => v.lang.startsWith('en') && v.name.includes('Samantha'))
                    || voices.find(v => v.lang.startsWith('en') && v.name.includes('Daniel'))
                    || voices.find(v => v.lang.startsWith('en') && v.localService)
                    || voices.find(v => v.lang.startsWith('en'))
                    || voices[0];
                setVoicesLoaded(true);
            }
        };

        // Try immediately
        loadVoices();

        // Also listen for async voice loading
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    // Chrome workaround: resume speechSynthesis every 10s to prevent it from hanging
    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        resumeIntervalRef.current = setInterval(() => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.resume();
            }
        }, 10000);

        return () => {
            if (resumeIntervalRef.current) {
                clearInterval(resumeIntervalRef.current);
            }
        };
    }, []);

    // Core speak function
    const speak = useCallback((text: string, force: boolean = false) => {
        if (!enabled) return;
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        const now = Date.now();
        // Rate limit: minimum 3 seconds between speeches (unless forced)
        if (!force && now - lastSpokenTimeRef.current < 3000) return;
        if (!force && isSpeakingRef.current) return;

        // Cancel any pending speech first
        window.speechSynthesis.cancel();

        lastSpokenTimeRef.current = now;
        isSpeakingRef.current = true;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        utterance.volume = 1.0; // Max volume for clarity

        // Use the preloaded voice
        if (voiceRef.current) {
            utterance.voice = voiceRef.current;
        }

        utterance.onend = () => { isSpeakingRef.current = false; };
        utterance.onerror = () => { isSpeakingRef.current = false; };

        window.speechSynthesis.speak(utterance);
    }, [enabled]);

    // Speak exercise name when workout starts
    const announceExercise = useCallback((exerciseName: string) => {
        if (!enabled) return;
        speak(`Let's do ${exerciseName}. Get ready!`, true);
    }, [enabled, speak]);

    // Handle rep count changes — key milestones
    const onRepChange = useCallback((repCount: number) => {
        if (!enabled || repCount <= lastSpokenRepRef.current) return;
        lastSpokenRepRef.current = repCount;

        if (targetReps && targetReps > 0) {
            if (repCount === targetReps) {
                speak('Set complete! Great work!', true);
                return;
            }
            if (repCount === targetReps - 1) {
                speak('One more rep!', true);
                return;
            }
            if (repCount === Math.floor(targetReps / 2) && targetReps >= 6) {
                speak('Halfway there!');
                return;
            }
            // Announce every rep for small targets
            if (targetReps <= 6) {
                speak(`${repCount}`);
                return;
            }
        }

        // Speak every 5 reps for free-form or larger targets
        if (repCount % 5 === 0 && repCount > 0) {
            speak(`${repCount} reps!`);
        }
    }, [enabled, targetReps, speak]);

    // Handle coach tips
    const onCoachTip = useCallback((tip: CoachTip | null) => {
        if (!enabled || !tip) return;

        if (tip.type === 'encouragement') {
            speak('Very good!');
        }
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
        speak(coachNotes[0], true);
    }, [enabled, speak]);

    // Handle set completion
    const onSetComplete = useCallback(() => {
        if (!enabled) return;
        if (currentSet && totalSets) {
            if (currentSet >= totalSets) {
                speak('All sets complete! Amazing workout!', true);
            }
        }
    }, [enabled, currentSet, totalSets, speak]);

    // Reset
    const reset = useCallback(() => {
        lastSpokenRepRef.current = 0;
        lastSpokenTimeRef.current = 0;
        isSpeakingRef.current = false;
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            if (resumeIntervalRef.current) {
                clearInterval(resumeIntervalRef.current);
            }
        };
    }, []);

    return {
        onRepChange,
        onCoachTip,
        onFormFeedback,
        onSetComplete,
        speakSummary,
        announceExercise,
        reset,
        voicesLoaded,
    };
}
