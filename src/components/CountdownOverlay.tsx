/**
 * CountdownOverlay — Full-screen "3, 2, 1, GO!" countdown before workout starts.
 * Animated number with shrink-to-grow-to-fade transitions.
 * Voice coach speaks each number aloud.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';

interface CountdownOverlayProps {
    onComplete: () => void;
    voiceEnabled: boolean;
}

export default function CountdownOverlay({ onComplete, voiceEnabled }: CountdownOverlayProps) {
    const [count, setCount] = useState(3);
    const [phase, setPhase] = useState<'number' | 'go' | 'done'>('number');

    const speak = useCallback((text: string) => {
        if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Samantha'))
            || voices.find(v => v.lang.startsWith('en'));
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
    }, [voiceEnabled]);

    useEffect(() => {
        speak(String(count));

        if (count > 0) {
            const timer = setTimeout(() => setCount(count - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            // Show "GO!" for 800ms
            setPhase('go');
            speak('Go!');
            const timer = setTimeout(() => {
                setPhase('done');
                onComplete();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [count, speak, onComplete]);

    if (phase === 'done') return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="text-center">
                {phase === 'number' && count > 0 ? (
                    <span
                        key={count}
                        className="text-[12rem] font-black text-white leading-none animate-countdown-pulse"
                        style={{
                            fontFamily: 'Orbitron, sans-serif',
                            textShadow: '0 0 60px rgba(34,197,94,0.5), 0 0 120px rgba(34,197,94,0.2)',
                        }}
                    >
                        {count}
                    </span>
                ) : (
                    <span
                        className="text-[10rem] font-black text-[#22c55e] leading-none animate-countdown-pulse"
                        style={{
                            fontFamily: 'Orbitron, sans-serif',
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
