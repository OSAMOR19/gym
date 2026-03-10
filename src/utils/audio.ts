/**
 * Audio utilities for the rep counter.
 *
 * Uses the Web Audio API to generate a short beep programmatically —
 * no external audio file needed. The beep is a 880Hz sine wave
 * that lasts 100ms with a quick fade-out for a clean sound.
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    return audioContext;
}

/**
 * Play a short beep sound.
 * @param frequency Hz — default 880 (A5, a satisfying "ding")
 * @param duration  Seconds — default 0.1
 */
export function playBeep(frequency: number = 880, duration: number = 0.1): void {
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

        // Start at full volume, fade out quickly for a clean beep
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    } catch {
        // Silently fail if audio context is not available
    }
}
