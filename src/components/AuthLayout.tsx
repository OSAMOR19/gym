/**
 * AuthLayout — Shared layout for login / signup / forgot-password pages.
 *
 * Split layout:
 *  - Left: auto-rotating image carousel with gym photos + dot indicators
 *  - Right: auth form (children)
 *
 * On mobile, the carousel is hidden and the form takes full width.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const SLIDES = [
    {
        image: '/images/gym1.png',
        title: 'Train Hard',
        subtitle: 'Push your limits with AI-powered form tracking',
    },
    {
        image: '/images/gym2.png',
        title: 'Build Strength',
        subtitle: 'Real-time rep counting and muscle analysis',
    },
    {
        image: '/images/gym3.png',
        title: 'Perfect Form',
        subtitle: 'Instant corrections to maximize every rep',
    },
    {
        image: '/images/gym4.png',
        title: 'Stay Consistent',
        subtitle: 'Track progress, earn badges, level up',
    },
];

interface AuthLayoutProps {
    children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const nextSlide = useCallback(() => {
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
            setIsTransitioning(false);
        }, 400);
    }, []);

    // Auto-rotate every 5 seconds
    useEffect(() => {
        const interval = setInterval(nextSlide, 5000);
        return () => clearInterval(interval);
    }, [nextSlide]);

    const slide = SLIDES[currentSlide];

    return (
        <main className="min-h-screen bg-[#0a0a0a] flex">
            {/* ─── LEFT: Image Carousel ─────────────────────────────────────── */}
            <div className="hidden lg:flex w-[45%] relative overflow-hidden">
                {/* Image */}
                <div
                    className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out ${isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
                        }`}
                    style={{ backgroundImage: `url(${slide.image})` }}
                />

                {/* Dark gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a0a0a]/80" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/40" />

                {/* Text overlay at the bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-10 z-10">
                    <h2
                        className={`text-3xl font-black text-white mb-2 transition-all duration-500 ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                            }`}
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        {slide.title}
                    </h2>
                    <p
                        className={`text-white/50 text-sm max-w-md transition-all duration-500 delay-100 ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
                            }`}
                    >
                        {slide.subtitle}
                    </p>

                    {/* Dot indicators */}
                    <div className="flex items-center gap-2 mt-6">
                        {SLIDES.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setIsTransitioning(true);
                                    setTimeout(() => {
                                        setCurrentSlide(i);
                                        setIsTransitioning(false);
                                    }, 400);
                                }}
                                className={`
                  h-2 rounded-full transition-all duration-300 cursor-pointer
                  ${i === currentSlide
                                        ? 'w-8 bg-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                                        : 'w-2 bg-white/20 hover:bg-white/40'
                                    }
                `}
                            />
                        ))}
                    </div>
                </div>

                {/* Logo in top-left */}
                <div className="absolute top-6 left-6 z-10">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22c55e] to-[#38bdf8] flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                            <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <span className="text-sm font-bold tracking-wider text-white/80" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            IRON<span className="text-[#22c55e]">TRACK</span>
                        </span>
                    </Link>
                </div>
            </div>

            {/* ─── RIGHT: Auth Form ─────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
                {/* Subtle glow */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#22c55e]/5 rounded-full blur-[120px]" />
                </div>

                {/* Mobile logo (hidden on desktop where carousel shows it) */}
                <div className="lg:hidden flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#22c55e] to-[#38bdf8] flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                        <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <span className="text-lg font-bold tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                        IRON<span className="text-[#22c55e]">TRACK</span> <span className="text-[#38bdf8]">AI</span>
                    </span>
                </div>

                {/* Form content */}
                <div className="w-full max-w-md relative z-10">
                    {children}
                </div>
            </div>
        </main>
    );
}
