'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
}

interface ToastContextType {
    toast: (type: ToastType, title: string, message?: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | null>(null);

// ─── Icons ───────────────────────────────────────────────────────────────────

function ToastIcon({ type }: { type: ToastType }) {
    if (type === 'success') return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
        </svg>
    );
    if (type === 'error') return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    );
    if (type === 'warning') return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-warm" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
    // info
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-info" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    );
}

const ACCENT: Record<ToastType, { border: string; bg: string; bar: string }> = {
    success: { border: 'rgba(var(--accent-glow),0.25)',  bg: 'rgba(var(--accent-glow),0.06)',  bar: 'var(--accent)' },
    error:   { border: 'rgba(239,68,68,0.25)',  bg: 'rgba(239,68,68,0.06)',  bar: '#ef4444' },
    warning: { border: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.06)', bar: 'var(--warm)' },
    info:    { border: 'rgba(56,189,248,0.25)', bg: 'rgba(56,189,248,0.06)', bar: 'var(--info)' },
};

// ─── Single Toast Item ────────────────────────────────────────────────────────

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const accent = ACCENT[toast.type];

    return (
        <div
            className="animate-fade-in"
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                background: 'color-mix(in srgb, var(--surface) 97%, transparent)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${accent.border}`,
                borderLeft: `3px solid ${accent.bar}`,
                borderRadius: '12px',
                width: '320px',
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${accent.bg}`,
                overflow: 'hidden',
            }}
        >
            {/* Icon */}
            <div style={{ marginTop: '1px', flexShrink: 0 }}>
                <ToastIcon type={toast.type} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--ink)', lineHeight: '1.3' }}>
                    {toast.title}
                </p>
                {toast.message && (
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'color-mix(in srgb, var(--ink) 45%, transparent)', lineHeight: '1.4' }}>
                        {toast.message}
                    </p>
                )}
            </div>

            {/* Close */}
            <button
                onClick={() => onRemove(toast.id)}
                style={{
                    background: 'none',
                    border: 'none',
                    padding: '0',
                    cursor: 'pointer',
                    color: 'color-mix(in srgb, var(--ink) 25%, transparent)',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    marginTop: '1px',
                    transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'color-mix(in srgb, var(--ink) 55%, transparent)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'color-mix(in srgb, var(--ink) 25%, transparent)')}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>

            {/* Progress bar */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '2px',
                width: '100%',
                background: accent.bar,
                opacity: 0.3,
                animation: 'toast-shrink 4s linear forwards',
            }} />
        </div>
    );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((type: ToastType, title: string, message?: string) => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev.slice(-4), { id, type, title, message }]);
        setTimeout(() => removeToast(id), 4000);
    }, [removeToast]);

    const ctx: ToastContextType = {
        toast: addToast,
        success: (title, message) => addToast('success', title, message),
        error:   (title, message) => addToast('error',   title, message),
        info:    (title, message) => addToast('info',    title, message),
        warning: (title, message) => addToast('warning', title, message),
    };

    return (
        <ToastContext.Provider value={ctx}>
            {children}
            {/* Toast container — bottom right */}
            <div style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                alignItems: 'flex-end',
            }}>
                {toasts.map(t => (
                    <ToastItem key={t.id} toast={t} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextType {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
