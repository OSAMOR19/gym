/**
 * Sidebar — Navigation component
 *
 * Desktop: vertical sidebar on the left
 * Mobile: horizontal bottom navigation bar
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/programs', label: 'Programs', icon: '📋' },
    { href: '/workout', label: 'Workout', icon: '🏋️' },
    { href: '/progress', label: 'Progress', icon: '📈' },
    { href: '/profile', label: 'Profile', icon: '👤' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    return (
        <>
            {/* ─── Desktop Sidebar ────────────────────────────────────────────── */}
            <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 lg:w-64 flex-col bg-[#0a0a0a] border-r border-white/5 z-40">
                {/* Logo */}
                <div className="p-4 lg:p-6 border-b border-white/5">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 min-w-[40px] rounded-xl bg-gradient-to-br from-[#22c55e] to-[#38bdf8] flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                            <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <span className="hidden lg:block text-lg font-bold tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            IRON<span className="text-[#22c55e]">TRACK</span>
                        </span>
                    </Link>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 py-4 space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                  flex items-center gap-3 px-4 lg:px-6 py-3 mx-2 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${isActive
                                        ? 'bg-[#22c55e]/10 text-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                                        : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                                    }
                `}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span className="hidden lg:block">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User + Logout */}
                <div className="p-4 lg:p-6 border-t border-white/5">
                    <div className="hidden lg:flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-[#22c55e]/20 flex items-center justify-center text-[#22c55e] text-sm font-bold">
                            {user?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-white/80 truncate">{user?.name}</p>
                            <p className="text-xs text-white/30 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full text-xs text-white/30 hover:text-red-400 transition-colors py-2 cursor-pointer"
                    >
                        <span className="lg:hidden text-xl">🚪</span>
                        <span className="hidden lg:inline">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* ─── Mobile Bottom Nav ──────────────────────────────────────────── */}
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
                  ${isActive
                                        ? 'text-[#22c55e]'
                                        : 'text-white/30 hover:text-white/60'
                                    }
                `}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
