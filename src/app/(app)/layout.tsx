/**
 * Authenticated App Layout — wraps all /dashboard, /programs, /workout, /progress, /profile pages.
 * Redirects to /login if no active session.
 * Includes the Sidebar navigation. Main content offsets based on sidebar collapse state.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import Sidebar from '../../components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

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
            {/* Subtle gradient overlays */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#22c55e]/3 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-[600px] h-[300px] bg-[#38bdf8]/3 rounded-full blur-[120px]" />
            </div>

            <Sidebar />

            {/* Main content area — offset dynamically by sidebar width */}
            <main
                className={`relative z-10 pb-20 md:pb-0 min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'md:ml-[60px]' : 'md:ml-56'
                    }`}
            >
                {children}
            </main>
        </div>
    );
}
