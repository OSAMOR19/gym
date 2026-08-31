/**
 * Web app manifest — makes IronTrack installable (PWA).
 *
 * Chrome/Android: manifest + HTTPS is all modern Chrome needs to offer
 * install (no service worker required since 2024 — deliberately none here:
 * a stale cache is a real hazard for a camera app that ships fixes daily).
 * iOS: installs via Share → Add to Home Screen; the apple-* metadata in
 * layout.tsx covers the home-screen icon and standalone chrome.
 *
 * `maskable` icons are the full-bleed square art (Android crops its own
 * shape); `any` icons are the rounded tile.
 */

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'IronTrack — Workout Tracker',
        short_name: 'IronTrack',
        description: 'Camera-powered workout tracking: rep counting, form scoring, cardio, and shareable workout replays.',
        id: '/',
        start_url: '/dashboard',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f0f0f',
        theme_color: '#0f0f0f',
        categories: ['fitness', 'health', 'sports'],
        icons: [
            { src: '/icon-192.png?v=3', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icon.png?v=3', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icon-maskable-192.png?v=3', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icon-maskable-512.png?v=3', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    };
}
