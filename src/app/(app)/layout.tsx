/**
 * Authenticated App Layout — wraps all /dashboard, /programs, /workout, /progress, /profile pages.
 * Redirects to /login if no active session.
 * Includes the Sidebar navigation. Main content offsets based on sidebar collapse state.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import Sidebar from '../../components/Sidebar';
import CoachChat from '../../components/CoachChat';

const SECTION_TITLES: Array<[prefix: string, title: string]> = [
    ['/dashboard', 'Dashboard'],
    ['/programs', 'Programs'],
    ['/workout', 'Workout'],
    ['/progress', 'Progress'],
    ['/profile', 'Profile'],
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    // The workout screen is immersive: it owns the full viewport, the mobile
    // bottom nav is hidden there (Sidebar does the same check), so no bottom
    // padding — this is what stopped overlays from hiding behind the nav.
    const isWorkout = pathname.startsWith('/workout');

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    // Sync with sidebar toggle events
    useEffect(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        if (saved !== null) setSidebarCollapsed(saved === 'true');

        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            setSidebarCollapsed(detail.collapsed);
        };
        window.addEventListener('sidebar-toggle', handler);
        return () => window.removeEventListener('sidebar-toggle', handler);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#0f0f0f] bg-grid">
            {/* Single faint ambient glow — flat brand green only */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#22c55e]/3 rounded-full blur-[120px]" />
            </div>

            <Sidebar />

            {/* Main content area — offset dynamically by sidebar width */}
            <main
                className={`relative z-10 min-h-screen transition-all duration-300 ${isWorkout ? '' : 'pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-0'} ${sidebarCollapsed ? 'md:ml-[60px]' : 'md:ml-56'
                    }`}
            >
                {/* Consistent mobile top bar: brand anchor left, section right.
                    Every screen shares it (except the immersive camera page),
                    so the top of the app always reads the same on phones. */}
                {!isWorkout && (
                    <header
                        className="md:hidden sticky top-0 z-30 bg-[#0f0f0f]/85 backdrop-blur-lg border-b border-white/5"
                        style={{ paddingTop: 'env(safe-area-inset-top)' }}
                    >
                        <div className="flex items-center justify-between px-4 py-2.5">
                            <Link href="/dashboard" className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-[#22c55e] flex items-center justify-center shadow-[0_0_12px_rgba(34,197,94,0.25)]">
                                    <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <span className="text-xs font-bold tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                                    IRON<span className="text-[#22c55e]">TRACK</span>
                                </span>
                            </Link>
                            <span className="text-[10px] font-bold tracking-widest uppercase text-white/25">
                                {SECTION_TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? ''}
                            </span>
                        </div>
                    </header>
                )}
                {children}
            </main>

            {/* AI coach — floating button on every screen except the camera */}
            <CoachChat />
        </div>
    );
}
