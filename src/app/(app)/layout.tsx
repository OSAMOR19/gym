/**
 * Authenticated App Layout — wraps all /dashboard, /programs, /workout, /progress, /settings pages.
 * Redirects to /login if no active session.
 * Includes the Sidebar navigation. Main content offsets based on sidebar collapse state.
 * Owns the unseen-notification count: badge on the mobile top-bar bell and
 * on the desktop sidebar item, cleared live when the feed marks itself seen.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import Sidebar from '../../components/Sidebar';
import BrandLogo from '../../components/BrandLogo';
import CoachChat from '../../components/CoachChat';
import { fetchNotifications, countUnseen, NOTIFS_SEEN_EVENT } from '../../lib/notifications';

const SECTION_TITLES: Array<[prefix: string, title: string]> = [
    ['/dashboard', 'Dashboard'],
    ['/programs', 'Programs'],
    ['/workout', 'Workout'],
    ['/cardio', 'Cardio'],
    ['/replays', 'My Replays'],
    ['/progress', 'Progress'],
    ['/calendar', 'Calendar'],
    ['/notifications', 'Notifications'],
    ['/settings', 'Settings'],
    ['/profile', 'Settings'],
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [unseen, setUnseen] = useState(0);
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

    // Unseen notifications: count once signed in, refresh when the tab comes
    // back to the foreground (a workout may have just written events), and
    // clear instantly when the notifications page marks everything seen.
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        const refresh = () => {
            fetchNotifications(25).then((list) => {
                if (!cancelled) setUnseen(countUnseen(list));
            });
        };
        refresh();
        const onSeen = () => setUnseen(0);
        const onVisible = () => { if (!document.hidden) refresh(); };
        window.addEventListener(NOTIFS_SEEN_EVENT, onSeen);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            cancelled = true;
            window.removeEventListener(NOTIFS_SEEN_EVENT, onSeen);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [user]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-app flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-app bg-grid">
            {/* Single faint ambient glow — follows the chosen accent */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/3 rounded-full blur-[120px]" />
            </div>

            <Sidebar unseenNotifications={unseen} />

            {/* Main content area — offset dynamically by sidebar width */}
            <main
                className={`relative z-10 min-h-screen transition-all duration-300 ${isWorkout ? '' : 'pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-0'} ${sidebarCollapsed ? 'md:ml-[60px]' : 'md:ml-56'
                    }`}
            >
                {/* Consistent mobile top bar: brand anchor left, section +
                    notifications bell right. Every screen shares it (except
                    the immersive camera page), so the top of the app always
                    reads the same on phones. */}
                {!isWorkout && (
                    <header
                        className="md:hidden sticky top-0 z-30 bg-app/85 backdrop-blur-lg border-b border-ink/5"
                        style={{ paddingTop: 'env(safe-area-inset-top)' }}
                    >
                        <div className="flex items-center justify-between px-4 py-2.5">
                            <Link href="/dashboard" aria-label="IronTrack home">
                                <BrandLogo size="sm" />
                            </Link>
                            <div className="flex items-center gap-2.5">
                                <span className="text-[10px] font-bold tracking-widest uppercase text-ink/25">
                                    {SECTION_TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? ''}
                                </span>
                                <Link
                                    href="/notifications"
                                    aria-label={unseen > 0 ? `Notifications, ${unseen} new` : 'Notifications'}
                                    className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${pathname.startsWith('/notifications')
                                        ? 'text-accent bg-accent/10'
                                        : 'text-ink/40 hover:text-ink/70 hover:bg-ink/5'}`}
                                >
                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                        <path d="M13.73 21a2 2 0 01-3.46 0" />
                                    </svg>
                                    {unseen > 0 && (
                                        <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-accent text-black text-[9px] font-bold flex items-center justify-center">
                                            {unseen > 9 ? '9+' : unseen}
                                        </span>
                                    )}
                                </Link>
                            </div>
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
