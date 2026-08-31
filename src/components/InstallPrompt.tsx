/**
 * InstallPrompt — "get the app" card for the profile page.
 *
 * Chrome/Android/desktop: captures `beforeinstallprompt` and offers a real
 * one-tap Install button. iOS Safari has no install API, so it gets the
 * Share → Add to Home Screen steps instead. Hidden once the app is already
 * running installed (standalone) or after the user dismisses it.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'irontrack_install_dismissed';

function isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches
        || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function isIOS(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function eligible(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return !isStandalone() && localStorage.getItem(DISMISS_KEY) !== '1';
    } catch {
        return false;
    }
}

export default function InstallPrompt() {
    const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [hidden, setHidden] = useState(false);
    // iOS has no install API — its steps card shows on eligibility alone.
    // Lazy initializer: this only renders client-side behind the auth gate.
    const [showIOSSteps] = useState(() => eligible() && isIOS());

    // Chrome-family: the install button appears when the browser offers it
    useEffect(() => {
        if (!eligible() || isIOS()) return;
        const handler = (e: Event) => {
            e.preventDefault();
            setInstallEvent(e as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const install = useCallback(async () => {
        if (!installEvent) return;
        await installEvent.prompt();
        const { outcome } = await installEvent.userChoice;
        if (outcome === 'accepted') setHidden(true);
    }, [installEvent]);

    const dismiss = useCallback(() => {
        try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
        setHidden(true);
    }, []);

    if (hidden || (!showIOSSteps && !installEvent)) return null;

    return (
        <div className="border border-accent/20 bg-accent/5 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink">Install IronTrack</p>
                    {showIOSSteps ? (
                        <p className="text-xs text-ink/45 mt-1 leading-relaxed">
                            Get the full-screen app: tap the <span className="text-ink/70 font-semibold">Share</span> button
                            in Safari, then <span className="text-ink/70 font-semibold">Add to Home Screen</span>.
                        </p>
                    ) : (
                        <p className="text-xs text-ink/45 mt-1 leading-relaxed">
                            Put IronTrack on your home screen — full-screen, one tap from your workout.
                        </p>
                    )}
                    <div className="flex gap-2 mt-3">
                        {!showIOSSteps && (
                            <button
                                onClick={install}
                                className="px-4 py-2 rounded-lg bg-accent text-black text-xs font-bold hover:bg-accent-strong transition-all cursor-pointer"
                            >
                                Install app
                            </button>
                        )}
                        <button
                            onClick={dismiss}
                            className="px-4 py-2 rounded-lg text-xs font-semibold text-ink/40 hover:text-ink/70 transition-colors cursor-pointer"
                        >
                            {showIOSSteps ? 'Got it' : 'Not now'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
