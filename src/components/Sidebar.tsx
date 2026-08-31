/**
 * Sidebar — Fully collapsible. Collapsed = thin icon strip. Expanded = full nav.
 * State persisted in localStorage. Toggle button always visible.
 * Mobile: bottom nav (unchanged). Notifications live in the desktop sidebar
 * only — on phones the bell sits in the shared top bar.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';
import BrandLogo from './BrandLogo';

function NavIcon({ name, active }: { name: string; active: boolean }) {
    const props = {
        width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
        style: active ? { stroke: 'var(--accent)' } : undefined,
    };

    switch (name) {
        case 'dashboard':
            return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="4" rx="1" /><rect x="14" y="11" width="7" height="10" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>;
        case 'programs':
            return <svg {...props}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 14l2 2 4-4" /></svg>;
        case 'workout':
            return <svg {...props}><path d="M6.5 6.5h-2a1 1 0 00-1 1v3a1 1 0 001 1h2" /><path d="M17.5 6.5h2a1 1 0 011 1v3a1 1 0 01-1 1h-2" /><rect x="6.5" y="4" width="11" height="10" rx="1" /><line x1="12" y1="14" x2="12" y2="20" /><line x1="9" y1="20" x2="15" y2="20" /></svg>;
        case 'cardio':
            return <svg {...props}><path d="M20.4 12.6a5.5 5.5 0 00-8.4-7 5.5 5.5 0 00-8.4 7L12 21l4.2-4.2" /><polyline points="7,12 10,12 12,8 14,15 16,12 21,12" /></svg>;
        case 'progress':
            return <svg {...props}><polyline points="22,12 18,12 15,21 9,3 6,12 2,12" /></svg>;
        case 'notifications':
            return <svg {...props}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>;
        case 'settings':
            return <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>;
        default:
            return null;
    }
}

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', iconKey: 'dashboard' },
    { href: '/programs', label: 'Programs', iconKey: 'programs' },
    { href: '/workout', label: 'Workout', iconKey: 'workout' },
    { href: '/cardio', label: 'Cardio', iconKey: 'cardio' },
    { href: '/progress', label: 'Progress', iconKey: 'progress' },
    // Desktop-only: the mobile bottom pill stays at 6 icons — the bell
    // lives in the mobile top bar instead.
    { href: '/notifications', label: 'Notifications', iconKey: 'notifications', desktopOnly: true },
    { href: '/settings', label: 'Settings', iconKey: 'settings' },
];

export default function Sidebar({ unseenNotifications = 0 }: { unseenNotifications?: number }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(true);

    // Persist collapse state
    useEffect(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        if (saved !== null) setCollapsed(saved === 'true');
    }, []);

    const toggle = () => {
        const next = !collapsed;
        setCollapsed(next);
        localStorage.setItem('sidebar-collapsed', String(next));
        // Dispatch event so layout can react
        window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: next } }));
    };

    return (
        <>
            {/* ─── Desktop Sidebar — collapsible ──────────────────────────── */}
            <aside
                className={`
                    hidden md:flex fixed left-0 top-0 bottom-0 flex-col bg-panel border-r border-ink/5 z-40
                    transition-all duration-300
                    ${collapsed ? 'w-[60px]' : 'w-56'}
                `}
            >
                {/* Logo + Toggle */}
                <div className={`flex items-center border-b border-ink/5 ${collapsed ? 'justify-center py-4' : 'justify-between px-4 py-4'}`}>
                    {!collapsed && (
                        <Link href="/dashboard" aria-label="IronTrack home">
                            <BrandLogo size="sm" />
                        </Link>
                    )}
                    <button
                        onClick={toggle}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-ink/25 hover:text-ink/50 hover:bg-ink/5 transition-all cursor-pointer"
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            {collapsed ? (
                                <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
                            ) : (
                                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                            )}
                        </svg>
                    </button>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 py-3 space-y-0.5">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const showBadge = item.iconKey === 'notifications' && unseenNotifications > 0;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={collapsed ? item.label : undefined}
                                className={`
                                    relative flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                                    ${collapsed ? 'justify-center mx-2 px-0' : 'mx-2 px-3'}
                                    ${isActive
                                        ? 'bg-accent/10 text-accent shadow-[0_0_12px_rgba(var(--accent-glow),0.08)]'
                                        : 'text-ink/30 hover:text-ink/60 hover:bg-ink/5'
                                    }
                                `}
                            >
                                <span className="relative">
                                    <NavIcon name={item.iconKey} active={isActive} />
                                    {showBadge && collapsed && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" aria-hidden="true" />
                                    )}
                                </span>
                                {!collapsed && <span className="flex-1">{item.label}</span>}
                                {!collapsed && showBadge && (
                                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-black text-[10px] font-bold flex items-center justify-center">
                                        {unseenNotifications > 9 ? '9+' : unseenNotifications}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* User + Logout */}
                <div className={`border-t border-ink/5 py-3 ${collapsed ? 'px-2' : 'px-3'}`}>
                    {!collapsed && (
                        <div className="flex items-center gap-2.5 mb-2 px-1">
                            {user?.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                            ) : (
                                <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">
                                    {user?.name?.charAt(0).toUpperCase() || '?'}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-ink/60 truncate">{user?.name}</p>
                                <p className="text-[10px] text-ink/20 truncate">{user?.email}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={logout}
                        title={collapsed ? 'Sign Out' : undefined}
                        className={`
                            w-full text-xs text-ink/20 hover:text-red-400 transition-colors py-2 cursor-pointer flex items-center gap-2
                            ${collapsed ? 'justify-center' : 'px-1'}
                        `}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        {!collapsed && <span>Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* ─── Mobile Bottom Nav — floating liquid-glass pill, hidden on
                 the immersive workout screen; sits above the home indicator ── */}
            <nav
                className={`md:hidden fixed left-3 right-3 z-40 rounded-[1.75rem] liquid-glass ${pathname.startsWith('/workout') ? 'hidden' : ''}`}
                style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
            >
                {/* Icons only — the glyphs are self-explanatory and labels
                    made the pill feel crowded; names stay as aria-labels */}
                <div className="flex items-center justify-around px-2 py-2">
                    {NAV_ITEMS.filter((item) => !item.desktopOnly).map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-label={item.label}
                                title={item.label}
                                className={`
                                    flex items-center justify-center w-12 h-11 rounded-2xl
                                    transition-all duration-200
                                    ${isActive
                                        ? 'text-accent bg-ink/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                                        : 'text-ink/35 hover:text-ink/60'}
                                `}
                            >
                                <NavIcon name={item.iconKey} active={isActive} />
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
