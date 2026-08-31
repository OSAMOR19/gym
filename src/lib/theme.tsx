/**
 * Theme — app-wide appearance state (dark/light mode + accent color).
 *
 * The actual theming is pure CSS: globals.css defines every color as a
 * variable keyed off [data-theme] / [data-accent] on <html>. A tiny inline
 * boot script in the root layout applies the saved choice before first paint
 * (no flash), and this provider just mirrors it into React state so the
 * appearance picker can render and update it.
 *
 * The camera screens (workout / cardio) opt out via the .force-dark class —
 * their overlays sit on live video and always keep the dark neon look.
 */

'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';
export type AccentId = 'green' | 'pink' | 'blue' | 'purple' | 'orange';

export const THEME_STORAGE_KEY = 'irontrack_theme';
export const ACCENT_STORAGE_KEY = 'irontrack_accent';

/** Swatch colors shown in the appearance picker (dark/light theme values). */
export const ACCENTS: Array<{ id: AccentId; label: string; dark: string; light: string }> = [
    { id: 'green', label: 'Green', dark: '#22c55e', light: '#16a34a' },
    { id: 'pink', label: 'Pink', dark: '#ec4899', light: '#db2777' },
    { id: 'blue', label: 'Blue', dark: '#38bdf8', light: '#0284c7' },
    { id: 'purple', label: 'Purple', dark: '#a855f7', light: '#9333ea' },
    { id: 'orange', label: 'Orange', dark: '#f97316', light: '#ea580c' },
];

/** Browser-chrome color per mode (mirrors --background). */
const THEME_COLOR: Record<ThemeMode, string> = { dark: '#0f0f0f', light: '#f4f5f2' };

interface ThemeContextValue {
    mode: ThemeMode;
    accent: AccentId;
    setMode: (mode: ThemeMode) => void;
    setAccent: (accent: AccentId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    mode: 'dark',
    accent: 'green',
    setMode: () => { },
    setAccent: () => { },
});

function readDataset(): { mode: ThemeMode; accent: AccentId } {
    if (typeof document === 'undefined') return { mode: 'dark', accent: 'green' };
    const d = document.documentElement.dataset;
    const mode: ThemeMode = d.theme === 'light' ? 'light' : 'dark';
    const accent = ACCENTS.some((a) => a.id === d.accent) ? (d.accent as AccentId) : 'green';
    return { mode, accent };
}

function syncThemeColorMeta(mode: ThemeMode) {
    document
        .querySelectorAll('meta[name="theme-color"]')
        .forEach((m) => m.setAttribute('content', THEME_COLOR[mode]));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // The boot script already stamped <html> before hydration, so the lazy
    // initializer reads the real value on the client and 'dark' on the server.
    const [state, setState] = useState(readDataset);

    const setMode = useCallback((mode: ThemeMode) => {
        document.documentElement.dataset.theme = mode;
        try { localStorage.setItem(THEME_STORAGE_KEY, mode); } catch { /* private mode */ }
        syncThemeColorMeta(mode);
        setState((s) => ({ ...s, mode }));
    }, []);

    const setAccent = useCallback((accent: AccentId) => {
        document.documentElement.dataset.accent = accent;
        try { localStorage.setItem(ACCENT_STORAGE_KEY, accent); } catch { /* private mode */ }
        setState((s) => ({ ...s, accent }));
    }, []);

    // First client render happened with the server-default state when the
    // boot script chose differently — reconcile once after mount.
    useEffect(() => {
        const real = readDataset();
        syncThemeColorMeta(real.mode);
        setState((s) => (s.mode === real.mode && s.accent === real.accent ? s : real));
    }, []);

    return (
        <ThemeContext.Provider value={{ ...state, setMode, setAccent }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}

/**
 * Data-driven brand colors (per-program colors) are tuned for dark surfaces.
 * Wrap them in vividColor() wherever they render as text/icons on a THEMED
 * surface: dark mode keeps them as-is (--vivid: 100%), light mode mixes them
 * toward black for contrast on white. Inside .force-dark they stay as-is.
 */
export function vividColor(color: string): string {
    return `color-mix(in oklab, ${color} var(--vivid, 100%), black)`;
}
