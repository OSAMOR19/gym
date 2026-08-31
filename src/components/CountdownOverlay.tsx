/**
 * CountdownOverlay — Full-screen "3, 2, 1, GO!" countdown before workout starts.
 * Animated number with pulse effect.
 * Uses SpeechSynthesis to speak each number.
 *
 * FIX: Waits for voices to load before speaking, uses direct utterance creation.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { speakEleven, prefetchPhrases } from '../lib/voice/speak';

interface CountdownOverlayProps {
    onComplete: () => void;
    voiceEnabled: boolean;
    /** First number of the countdown. Default 3; cardio uses 5 so the user
     *  has time to walk back from the phone into frame. */
    startFrom?: number;
}

export default function CountdownOverlay({ onComplete, voiceEnabled, startFrom = 3 }: CountdownOverlayProps) {
    const [count, setCount] = useState(startFrom);
    const [phase, setPhase] = useState<'number' | 'go' | 'done'>('number');
    const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

    // Preload voice
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
            }
        };

        loadVoices();
        // addEventListener instead of assigning onvoiceschanged, so we don't
        // clobber useSpeechCoach's handler (both are mounted at the same time)
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

        return () => {
            window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        };
    }, []);

    const speak = useCallback((text: string) => {
        if (!voiceEnabled || typeof window === 'undefined') return;

        const utterFallback = () => {
            if (!window.speechSynthesis) return;
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.1;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            if (voiceRef.current) utterance.voice = voiceRef.current;
            window.speechSynthesis.speak(utterance);
        };

        // Branded voice when the phrase is already cached (or arrives fast);
        // the countdown beat can't wait longer than 350ms.
        window.speechSynthesis?.cancel();
        speakEleven(text, undefined, 350)
            .then((started) => { if (!started) utterFallback(); })
            .catch(() => utterFallback());
    }, [voiceEnabled]);

    // Warm the phrase cache the moment the overlay appears, so every beat
    // (and GO!) plays in the coach voice with zero added latency.
    useEffect(() => {
        if (!voiceEnabled) return;
        prefetchPhrases([
            ...Array.from({ length: startFrom }, (_, i) => String(startFrom - i)),
            'Go!',
        ]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [voiceEnabled]);

    // Keep the latest callbacks in refs so the countdown effect can depend on
    // `count` alone. With `phase`/`onComplete` in the deps, the setPhase('go')
    // re-render used to run the cleanup and clear the GO! timer before it
    // fired — onComplete never ran and the overlay locked the screen.
    const speakRef = useRef(speak);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => { speakRef.current = speak; }, [speak]);
    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

    useEffect(() => {
        if (count > 0) {
            speakRef.current(String(count));
            const timer = setTimeout(() => setCount(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
        // count reached 0 — show "GO!" for 800ms, then finish
        setPhase('go');
        speakRef.current('Go!');
        const timer = setTimeout(() => {
            setPhase('done');
            onCompleteRef.current();
        }, 800);
        return () => clearTimeout(timer);
    }, [count]);

    if (phase === 'done') return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="text-center">
                {phase === 'number' && count > 0 ? (
                    <span
                        key={count}
                        className="text-[12rem] font-black text-white leading-none animate-countdown-pulse"
                        style={{
                            fontFamily: 'var(--font-orbitron), sans-serif',
                            textShadow: '0 0 60px rgba(34,197,94,0.5), 0 0 120px rgba(34,197,94,0.2)',
                        }}
                    >
                        {count}
                    </span>
                ) : (
                    <span
                        className="text-[10rem] font-black text-[#22c55e] leading-none animate-countdown-pulse"
                        style={{
                            fontFamily: 'var(--font-orbitron), sans-serif',
                            textShadow: '0 0 80px rgba(34,197,94,0.6), 0 0 160px rgba(34,197,94,0.3)',
                        }}
                    >
                        GO!
                    </span>
                )}

                <p className="text-sm text-white/30 tracking-[0.3em] uppercase mt-4 font-medium">
                    {phase === 'go' ? 'Start moving!' : 'Get ready'}
                </p>
            </div>
        </div>
    );
}
