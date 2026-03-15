/**
 * useSpeechCoach — Text-to-speech voice coaching hook.
 *
 * Uses the browser's SpeechSynthesis API to provide voice guidance:
 *  - Rep milestones (every 5 reps, halfway, last rep)
 *  - Form corrections
 *  - Encouragement from coach tips
 *  - Set completion announcements
 *
 * Rate-limited to one utterance at a time to avoid overlap.
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
    const queueRef = useRef<string[]>([]);
    const isSpeakingRef = useRef<boolean>(false);

    // Process the speech queue
    const processQueue = useCallback(() => {
        if (!enabled || isSpeakingRef.current || queueRef.current.length === 0) return;
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        const text = queueRef.current.shift();
        if (!text) return;

        isSpeakingRef.current = true;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        // Try to use a natural voice if available
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Samantha'))
            || voices.find(v => v.lang.startsWith('en') && !v.name.includes('Google'))
            || voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) {
            utterance.voice = englishVoice;
        }

        utterance.onend = () => {
            isSpeakingRef.current = false;
            // Process next item after a short pause
            setTimeout(processQueue, 300);
        };

        utterance.onerror = () => {
            isSpeakingRef.current = false;
            setTimeout(processQueue, 300);
        };

        window.speechSynthesis.speak(utterance);
    }, [enabled]);

    // Add text to the speech queue (rate-limited)
    const speak = useCallback((text: string) => {
        if (!enabled) return;
        const now = Date.now();
        // Rate limit: minimum 2 seconds between speeches
        if (now - lastSpokenTimeRef.current < 2000) return;
        lastSpokenTimeRef.current = now;

        queueRef.current.push(text);
        processQueue();
    }, [enabled, processQueue]);

    // Handle rep count changes
    const onRepChange = useCallback((repCount: number) => {
        if (!enabled || repCount <= lastSpokenRepRef.current) return;
        lastSpokenRepRef.current = repCount;

        if (targetReps && targetReps > 0) {
            // Target-based announcements
            if (repCount === targetReps) {
                speak('Set complete! Great work!');
                return;
            }
            if (repCount === targetReps - 1) {
                speak('One more rep!');
                return;
            }
            if (repCount === Math.floor(targetReps / 2)) {
                speak('Halfway there! Keep going!');
                return;
            }
        }

        // Milestone announcements (every 5 reps)
        if (repCount % 5 === 0 && repCount > 0) {
            speak(`${repCount} reps!`);
        }
    }, [enabled, targetReps, speak]);

    // Handle coach tips
    const onCoachTip = useCallback((tip: CoachTip | null) => {
        if (!enabled || !tip) return;

        if (tip.type === 'warning') {
            speak(tip.message);
        } else if (tip.type === 'encouragement' && Math.random() > 0.5) {
            // Speak encouragement sometimes
            speak(tip.message.replace(/[🔥✨💪⚡🦁🎯]/g, '').trim());
        }
    }, [enabled, speak]);

    // Handle form feedback
    const onFormFeedback = useCallback((feedback: string, formQuality: number) => {
        if (!enabled) return;
        if (formQuality < 40 && feedback !== 'Good Form') {
            speak('Check your form');
        }
    }, [enabled, speak]);

    // Handle set completion
    const onSetComplete = useCallback(() => {
        if (!enabled) return;
        if (currentSet && totalSets) {
            if (currentSet < totalSets) {
                speak(`Set ${currentSet} complete. Take a rest.`);
            } else {
                speak('All sets complete! Great workout!');
            }
        }
    }, [enabled, currentSet, totalSets, speak]);

    // Reset on exercise change
    const reset = useCallback(() => {
        lastSpokenRepRef.current = 0;
        queueRef.current = [];
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
        reset,
    };
}
