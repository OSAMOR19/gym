/**
 * Admin portal shell — sidebar navigation (desktop) / top bar (mobile) + gate.
 *
 * Client gate: a signed-in user may read exactly their own admin_users row
 * (RLS), so non-admins bounce to /dashboard without any data exposure. Every
 * DATA request is separately re-verified server-side in /api/admin/* — this
 * layout is UX, not security.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

const NAV = [
    { href: '/admin', label: 'Overview', icon: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="4" rx="1" /><rect x="14" y="11" width="7" height="10" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></> },
    { href: '/admin/analytics', label: 'Analytics', icon: <><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></> },
    { href: '/admin/users', label: 'Users', icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></> },
    { href: '/admin/exercises', label: 'Exercises', icon: <><path d="M6.5 6.5h-2a1 1 0 00-1 1v3a1 1 0 001 1h2" /><path d="M17.5 6.5h2a1 1 0 011 1v3a1 1 0 01-1 1h-2" /><rect x="6.5" y="4" width="11" height="10" rx="1" /><line x1="12" y1="14" x2="12" y2="20" /></> },
    { href: '/admin/events', label: 'Events', icon: <><polyline points="22,12 18,12 15,21 9,3 6,12 2,12" /></> },
];

function NavLink({ href, label, icon, active, compact }: {
    href: string; label: string; icon: React.ReactNode; active: boolean; compact?: boolean;
}) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${compact ? 'px-3 py-1.5' : 'px-3 py-2.5'} ${active
                ? 'bg-accent/10 text-accent'
                : 'text-ink/40 hover:text-ink/70 hover:bg-ink/5'}`}
        >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                {icon}
            </svg>
            {label}
        </Link>
    );
}

function Brand() {
    return (
        <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-dark.png?v=2" alt="" className="brand-logo-dark h-7 w-auto select-none" draggable={false} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-light.png?v=2" alt="" className="brand-logo-light h-7 w-auto select-none" draggable={false} />
            <div className="leading-none">
                <span className="text-xs font-bold tracking-wider text-ink block font-display">
                    IRON<span className="text-accent">TRACK</span>
                </span>
                <span className="text-[9px] text-ink/30 tracking-[0.25em] uppercase">Admin</span>
            </div>
        </div>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [allowed, setAllowed] = useState<boolean | null>(null);
    const [role, setRole] = useState<string>('');

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) { router.replace('/login'); return; }
            const { data } = await supabase
                .from('admin_users')
                .select('role')
                .eq('user_id', user.id)
                .maybeSingle();
            if (!data) { router.replace('/dashboard'); return; }
            setRole(data.role);
            setAllowed(true);
        }).catch(() => router.replace('/dashboard'));
    }, [router]);

    if (allowed === null) {
        return (
            <div className="min-h-screen bg-app flex items-center justify-center">
                <span className="w-6 h-6 border-2 border-ink/15 border-t-accent rounded-full animate-spin" />
            </div>
        );
    }

    const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

    return (
        <div className="min-h-screen bg-app">
            {/* ─── Desktop sidebar ─────────────────────────────────────────── */}
            <aside className="hidden md:flex fixed inset-y-0 left-0 w-52 flex-col bg-panel border-r border-ink/5 z-20">
                <div className="px-4 py-5 border-b border-ink/5">
                    <Brand />
                </div>
                <nav className="flex-1 p-2.5 space-y-0.5">
                    {NAV.map((item) => (
                        <NavLink key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </nav>
                <div className="p-2.5 border-t border-ink/5 space-y-0.5">
                    <p className="px-3 pb-1 text-[9px] text-ink/20 tracking-widest uppercase">
                        Signed in as {role}
                    </p>
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-ink/40 hover:text-ink/70 hover:bg-ink/5 transition-all"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15,18 9,12 15,6" />
                        </svg>
                        Back to app
                    </Link>
                </div>
            </aside>

            {/* ─── Mobile top bar ──────────────────────────────────────────── */}
            <header
                className="md:hidden sticky top-0 z-20 bg-panel/90 backdrop-blur-lg border-b border-ink/5"
                style={{ paddingTop: 'env(safe-area-inset-top)' }}
            >
                <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                    <Brand />
                    <Link href="/dashboard" className="text-[11px] font-semibold text-ink/30 hover:text-ink/60">
                        ← App
                    </Link>
                </div>
                <nav className="flex items-center gap-1 px-3 pb-2 overflow-x-auto scrollbar-hide">
                    {NAV.map((item) => (
                        <NavLink key={item.href} {...item} active={isActive(item.href)} compact />
                    ))}
                </nav>
            </header>

            <main className="md:pl-52">
                <div className="max-w-6xl mx-auto p-4 md:p-8">{children}</div>
            </main>
        </div>
    );
}
