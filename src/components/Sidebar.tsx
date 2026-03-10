/**
 * Sidebar — Fully collapsible. Collapsed = thin icon strip. Expanded = full nav.
 * State persisted in localStorage. Toggle button always visible.
 * Mobile: bottom nav (unchanged).
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';

function NavIcon({ name, active }: { name: string; active: boolean }) {
    const stroke = active ? '#22c55e' : 'currentColor';
    const props = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

    switch (name) {
        case 'dashboard':
            return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="4" rx="1" /><rect x="14" y="11" width="7" height="10" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>;
        case 'programs':
            return <svg {...props}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 14l2 2 4-4" /></svg>;
        case 'workout':
            return <svg {...props}><path d="M6.5 6.5h-2a1 1 0 00-1 1v3a1 1 0 001 1h2" /><path d="M17.5 6.5h2a1 1 0 011 1v3a1 1 0 01-1 1h-2" /><rect x="6.5" y="4" width="11" height="10" rx="1" /><line x1="12" y1="14" x2="12" y2="20" /><line x1="9" y1="20" x2="15" y2="20" /></svg>;
        case 'progress':
            return <svg {...props}><polyline points="22,12 18,12 15,21 9,3 6,12 2,12" /></svg>;
        case 'profile':
            return <svg {...props}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
        default:
            return null;
    }
}

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', iconKey: 'dashboard' },
    { href: '/programs', label: 'Programs', iconKey: 'programs' },
    { href: '/workout', label: 'Workout', iconKey: 'workout' },
    { href: '/progress', label: 'Progress', iconKey: 'progress' },
    { href: '/profile', label: 'Profile', iconKey: 'profile' },
];

export default function Sidebar() {
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
                    hidden md:flex fixed left-0 top-0 bottom-0 flex-col bg-[#0a0a0a] border-r border-white/5 z-40
                    transition-all duration-300
                    ${collapsed ? 'w-[60px]' : 'w-56'}
                `}
            >
                {/* Logo + Toggle */}
                <div className={`flex items-center border-b border-white/5 ${collapsed ? 'justify-center py-4' : 'justify-between px-4 py-4'}`}>
                    {!collapsed && (
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22c55e] to-[#38bdf8] flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.25)]">
                                <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className="text-sm font-bold tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                                IRON<span className="text-[#22c55e]">TRACK</span>
                            </span>
                        </Link>
                    )}
                    <button
                        onClick={toggle}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/25 hover:text-white/50 hover:bg-white/5 transition-all cursor-pointer"
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
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={collapsed ? item.label : undefined}
                                className={`
                                    flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                                    ${collapsed ? 'justify-center mx-2 px-0' : 'mx-2 px-3'}
                                    ${isActive
                                        ? 'bg-[#22c55e]/10 text-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.08)]'
                                        : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                                    }
                                `}
                            >
                                <NavIcon name={item.iconKey} active={isActive} />
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User + Logout */}
                <div className={`border-t border-white/5 py-3 ${collapsed ? 'px-2' : 'px-3'}`}>
                    {!collapsed && (
                        <div className="flex items-center gap-2.5 mb-2 px-1">
                            <div className="w-7 h-7 rounded-full bg-[#22c55e]/20 flex items-center justify-center text-[#22c55e] text-xs font-bold flex-shrink-0">
                                {user?.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-white/60 truncate">{user?.name}</p>
                                <p className="text-[10px] text-white/20 truncate">{user?.email}</p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={logout}
                        title={collapsed ? 'Sign Out' : undefined}
                        className={`
                            w-full text-xs text-white/20 hover:text-red-400 transition-colors py-2 cursor-pointer flex items-center gap-2
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

            {/* ─── Mobile Bottom Nav ──────────────────────────────────────── */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-white/5">
                <div className="flex items-center justify-around py-2 px-2">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    flex flex-col items-center gap-1 py-1 px-3 rounded-xl
                                    transition-all duration-200 text-center min-w-0
                                    ${isActive ? 'text-[#22c55e]' : 'text-white/30 hover:text-white/60'}
                                `}
                            >
                                <NavIcon name={item.iconKey} active={isActive} />
                                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
