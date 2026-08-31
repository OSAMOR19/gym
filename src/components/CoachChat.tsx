/**
 * CoachChat — the AI coach, one tap away on every screen.
 *
 * A floating button (bottom-right, above the mobile nav) opens the coach:
 * full-screen sheet on mobile, compact panel on desktop, sliding in from the
 * button's corner. The button breathes and carries a counter only when the
 * coach genuinely has something for the user (coachNudges — derived from
 * their real journey state), so the animation stays meaningful.
 *
 * Views: chat (grounded in the user's data via /api/chat), history (open,
 * continue, delete past conversations), and intake — the deterministic
 * "Find my plan" flow now lives HERE; pages open it with openCoachChat().
 *
 * Hidden on /workout — that screen is camera-dominant and has the voice
 * coach; overlaying a chat button on the workout controls would fight it.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../utils/supabase/client';
import { getCoachNudges, CoachNudge } from '../lib/coachNudges';
import { EXERCISES, ExerciseId } from '../lib/exercises';
import { setWorkoutQueue } from '../lib/workoutQueue';
import CoachIntakeFlow from './CoachIntakeFlow';
import CoachRichMessage from './CoachRichMessage';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    error?: boolean;
}

interface ConversationRow {
    id: string;
    title: string;
    updated_at: string;
}

const DEFAULT_SUGGESTIONS = [
    'What should I do today?',
    'I only have 20 minutes',
    "I'm sore from last time",
    'How am I progressing?',
];

const SEEN_KEY = 'irontrack_coach_seen';

/** Open the coach from anywhere in the app (e.g. the Find-my-plan buttons). */
export function openCoachChat(mode: 'chat' | 'intake' = 'chat'): void {
    window.dispatchEvent(new CustomEvent('irontrack-open-coach', { detail: { mode } }));
}

function relativeDate(iso: string): string {
    const date = new Date(iso);
    // Compare CALENDAR days, not elapsed 24h blocks — otherwise yesterday
    // evening reads as "Today" all morning
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
    if (days <= 0) {
        return `Today · ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function CoachChat() {
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<'chat' | 'history' | 'intake'>('chat');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [conversations, setConversations] = useState<ConversationRow[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<ConversationRow | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [nudges, setNudges] = useState<CoachNudge[]>([]);
    const [seen, setSeen] = useState(true); // assume seen until localStorage says otherwise
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Journey-aware nudges drive the button's counter and the suggestion chips
    const refreshNudges = useCallback(() => {
        getCoachNudges().then(setNudges).catch(() => {});
    }, []);

    useEffect(() => {
        setSeen(localStorage.getItem(SEEN_KEY) === '1');
        refreshNudges();
    }, [refreshNudges]);

    const openPanel = useCallback((mode: 'chat' | 'intake' = 'chat') => {
        setOpen(true);
        setView(mode);
        setSeen(true);
        localStorage.setItem(SEEN_KEY, '1');
    }, []);

    // Anywhere in the app can open the coach (Find-my-plan buttons do)
    useEffect(() => {
        const handler = (e: Event) => {
            const mode = (e as CustomEvent).detail?.mode === 'intake' ? 'intake' : 'chat';
            openPanel(mode);
        };
        window.addEventListener('irontrack-open-coach', handler);
        return () => window.removeEventListener('irontrack-open-coach', handler);
    }, [openPanel]);

    const closePanel = useCallback(() => {
        setOpen(false);
        setPendingDelete(null);
        refreshNudges(); // state may have changed (e.g. plan chosen)
    }, [refreshNudges]);

    // Escape dismisses the delete confirmation
    useEffect(() => {
        if (!pendingDelete) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPendingDelete(null);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [pendingDelete]);

    // Keep the newest message in view
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, sending, open, view]);

    const loadConversations = useCallback(async () => {
        setHistoryLoading(true);
        const supabase = createClient();
        const { data } = await supabase
            .from('conversations')
            .select('id, title, updated_at')
            .order('updated_at', { ascending: false })
            .limit(50);
        setConversations(data ?? []);
        setHistoryLoading(false);
    }, []);

    const openConversation = useCallback(async (id: string) => {
        const supabase = createClient();
        const { data } = await supabase
            .from('messages')
            .select('role, content')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true })
            .limit(100);
        setConversationId(id);
        setMessages((data ?? []) as ChatMessage[]);
        setView('chat');
    }, []);

    // Runs only after the user confirms in the modal (messages cascade in the DB)
    const deleteConversation = useCallback(async (id: string) => {
        setDeleting(true);
        const supabase = createClient();
        await supabase.from('conversations').delete().eq('id', id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (conversationId === id) {
            setConversationId(null);
            setMessages([]);
        }
        setDeleting(false);
        setPendingDelete(null);
    }, [conversationId]);

    const newConversation = useCallback(() => {
        setConversationId(null);
        setMessages([]);
        setView('chat');
        inputRef.current?.focus();
    }, []);

    const send = useCallback(async (text?: string) => {
        const content = (text ?? input).trim();
        if (!content || sending) return;
        setInput('');
        setSending(true);
        setMessages((prev) => [...prev, { role: 'user', content }]);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId, message: content }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMessages((prev) => [...prev, {
                    role: 'assistant',
                    content: data.error ?? 'Something went wrong — try again.',
                    error: true,
                }]);
            } else {
                setConversationId(data.conversationId);
                setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
            }
        } catch {
            setMessages((prev) => [...prev, {
                role: 'assistant',
                content: 'Could not reach the coach — check your connection and try again.',
                error: true,
            }]);
        } finally {
            setSending(false);
        }
    }, [input, sending, conversationId]);

    // Tapping an exercise card (or "start all") stages a real workout queue
    // and jumps to the camera screen — the chat's recommendations are startable
    const startExercises = useCallback((ids: ExerciseId[]) => {
        if (ids.length === 0) return;
        const items = ids.map((id) => {
            const cfg = EXERCISES[id];
            return cfg.repMode === 'hold'
                ? { exerciseId: id, targetSets: 3, targetReps: 0, targetHoldSeconds: 30 }
                : { exerciseId: id, targetSets: 3, targetReps: 10 };
        });
        setWorkoutQueue({
            programId: 'coach-picks',
            programName: 'Coach picks',
            dayIndex: 0,
            dayName: ids.length > 1 ? `${ids.length} exercises from your coach` : EXERCISES[ids[0]].name,
            items,
        });
        setOpen(false);
        router.push('/workout');
    }, [router]);

    const navigateTo = useCallback((path: string) => {
        setOpen(false);
        router.push(path);
    }, [router]);

    const handleNudge = useCallback((nudge: CoachNudge) => {
        if (nudge.action === 'intake') setView('intake');
        else send(nudge.prompt);
    }, [send]);

    const handlePlanChosen = useCallback((programId: string) => {
        setOpen(false);
        setView('chat');
        refreshNudges();
        router.push(`/programs/${programId}`);
    }, [router, refreshNudges]);

    // Camera-dominant screens (workout, cardio) get no chat button
    if (pathname.startsWith('/workout') || pathname.startsWith('/cardio')) return null;

    // Suggestion chips: real nudges first, defaults fill the rest
    const chips: Array<{ key: string; label: string; onTap: () => void }> = [
        ...nudges.map((n) => ({ key: n.id, label: n.label, onTap: () => handleNudge(n) })),
        ...DEFAULT_SUGGESTIONS.map((s) => ({ key: s, label: s, onTap: () => send(s) })),
    ].slice(0, 4);

    const attention = nudges.length > 0 || !seen;

    return (
        <>
            {/* ─── Floating button ─────────────────────────────────────────── */}
            {!open && (
                <button
                    onClick={() => openPanel('chat')}
                    aria-label={nudges.length > 0 ? `Open coach chat — ${nudges.length} suggestion${nudges.length > 1 ? 's' : ''}` : 'Open coach chat'}
                    className={`fixed z-40 right-4 bottom-[5.75rem] md:right-6 md:bottom-6 w-14 h-14 rounded-full bg-[#22c55e] text-black flex items-center justify-center shadow-[0_4px_25px_rgba(34,197,94,0.4)] hover:bg-[#16a34a] active:scale-95 transition-all cursor-pointer ${attention ? 'animate-fab-breathe' : ''}`}
                    style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
                >
                    {/* Soft ping ring until the user meets the coach */}
                    {!seen && (
                        <span className="absolute inset-0 rounded-full bg-[#22c55e]/40 animate-ping" aria-hidden="true" />
                    )}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative">
                        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                    </svg>
                    {/* Journey-nudge counter */}
                    {nudges.length > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 border-2 border-[#0f0f0f] text-white text-[10px] font-bold flex items-center justify-center">
                            {nudges.length}
                        </span>
                    )}
                </button>
            )}

            {/* ─── Panel ───────────────────────────────────────────────────── */}
            {open && (
                <div className="fixed z-50 inset-0 md:inset-auto md:right-6 md:bottom-6 md:w-[400px] md:h-[640px] md:max-h-[calc(100dvh-3rem)] bg-[#0d0d0d] md:border md:border-white/10 md:rounded-2xl md:shadow-2xl flex flex-col h-[100dvh] md:h-[640px] animate-chat-in">
                    {/* Header */}
                    <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-white/5" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#22c55e] flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm font-bold text-white leading-none">Coach</h2>
                                <p className="text-[9px] text-white/25 mt-1 tracking-wider uppercase truncate">
                                    {view === 'history' ? 'Conversations' : view === 'intake' ? 'Find your plan' : 'Knows your training'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {view === 'chat' ? (
                                <>
                                    <button
                                        onClick={() => { setView('history'); loadConversations(); }}
                                        aria-label="Conversation history"
                                        title="History"
                                        className="w-9 h-9 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all cursor-pointer"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                            <circle cx="12" cy="12" r="9" /><polyline points="12,7 12,12 15,14" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={newConversation}
                                        aria-label="New conversation"
                                        title="New conversation"
                                        className="w-9 h-9 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all cursor-pointer"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setView('chat')}
                                    aria-label="Back to chat"
                                    className="w-9 h-9 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all cursor-pointer"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="15,18 9,12 15,6" />
                                    </svg>
                                </button>
                            )}
                            <button
                                onClick={closePanel}
                                aria-label="Close chat"
                                className="w-9 h-9 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all cursor-pointer"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* ─── Intake view — the scripted Find-my-plan flow ─────── */}
                    {view === 'intake' && (
                        <CoachIntakeFlow onPlanChosen={handlePlanChosen} />
                    )}

                    {/* ─── History view ─────────────────────────────────────── */}
                    {view === 'history' && (
                        <div className="flex-1 overflow-y-auto p-3 space-y-1.5" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                            <button
                                onClick={newConversation}
                                className="w-full flex items-center gap-2 px-3 py-3 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-sm font-semibold hover:bg-[#22c55e]/15 transition-all cursor-pointer"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                New conversation
                            </button>
                            {historyLoading && conversations.length === 0 && (
                                <div className="space-y-1.5">
                                    {[0, 1, 2].map((i) => (
                                        <div key={i} className="animate-pulse rounded-xl border border-white/5 px-3 py-3">
                                            <div className="h-3 w-2/3 bg-white/[0.05] rounded" />
                                            <div className="h-2 w-16 bg-white/[0.04] rounded mt-2" />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {!historyLoading && conversations.length === 0 && (
                                <div className="flex flex-col items-center text-center pt-12 pb-8 px-6">
                                    {/* Empty chat bubble with a resting dash — nothing said yet */}
                                    <div className="relative w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-4">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                                            <line x1="9" y1="11.5" x2="15" y2="11.5" stroke="rgba(34,197,94,0.5)" />
                                        </svg>
                                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                            </svg>
                                        </span>
                                    </div>
                                    <p className="text-sm font-semibold text-white/60 mb-1">Nothing here yet</p>
                                    <p className="text-xs text-white/25 leading-relaxed">
                                        Every conversation you have with your coach is saved here, so you can pick any of them back up whenever you want.
                                    </p>
                                </div>
                            )}
                            {conversations.map((c) => (
                                <div
                                    key={c.id}
                                    className={`flex items-center gap-2 rounded-xl border transition-all ${c.id === conversationId ? 'border-[#22c55e]/30 bg-[#22c55e]/5' : 'border-white/5 hover:border-white/10'}`}
                                >
                                    <button
                                        onClick={() => openConversation(c.id)}
                                        className="flex-1 min-w-0 text-left px-3 py-3 cursor-pointer"
                                    >
                                        <p className="text-sm text-white/70 truncate">{c.title}</p>
                                        <p className="text-[10px] text-white/20 mt-0.5">{relativeDate(c.updated_at)}</p>
                                    </button>
                                    <button
                                        onClick={() => setPendingDelete(c)}
                                        aria-label={`Delete conversation: ${c.title}`}
                                        className="w-9 h-9 mr-1 flex items-center justify-center rounded-lg text-white/15 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer flex-shrink-0"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                            <polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ─── Chat view ────────────────────────────────────────── */}
                    {view === 'chat' && (
                        <>
                            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                                {messages.length === 0 && !sending && (
                                    <div className="pt-6">
                                        <p className="text-sm text-white/50 mb-1">Hey — I&apos;m your coach.</p>
                                        <p className="text-xs text-white/25 mb-5">I can see your training history, plan, and recent sessions. Ask me anything.</p>
                                        <div className="flex flex-wrap gap-2">
                                            {chips.map((chip) => (
                                                <button
                                                    key={chip.key}
                                                    onClick={chip.onTap}
                                                    className="px-3 py-2 rounded-full border border-white/10 text-xs text-white/50 hover:border-[#22c55e]/40 hover:text-[#22c55e] transition-all cursor-pointer"
                                                >
                                                    {chip.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {messages.map((m, i) => (
                                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${m.role === 'user'
                                                ? 'bg-[#22c55e]/15 text-white/90 rounded-br-md'
                                                : m.error
                                                    ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-bl-md'
                                                    : 'bg-white/5 text-white/80 rounded-bl-md'}`}
                                        >
                                            {m.role === 'assistant' && !m.error ? (
                                                <CoachRichMessage
                                                    content={m.content}
                                                    onStartExercises={startExercises}
                                                    onNavigate={navigateTo}
                                                />
                                            ) : (
                                                m.content
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {sending && (
                                    <div className="flex justify-start">
                                        <div className="bg-white/5 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                                            {[0, 1, 2].map((d) => (
                                                <span
                                                    key={d}
                                                    className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce"
                                                    style={{ animationDelay: `${d * 150}ms` }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input */}
                            <div
                                className="flex-none border-t border-white/5 p-3"
                                style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                            >
                                <div className="flex items-end gap-2">
                                    <textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                send();
                                            }
                                        }}
                                        placeholder="Ask your coach…"
                                        rows={1}
                                        // text-base (16px) prevents iOS from zooming the page on focus
                                        className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-base md:text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-[#22c55e]/40 max-h-28"
                                    />
                                    <button
                                        onClick={() => send()}
                                        disabled={!input.trim() || sending}
                                        aria-label="Send message"
                                        className="w-11 h-11 flex-shrink-0 rounded-xl bg-[#22c55e] text-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#16a34a] transition-all cursor-pointer"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ─── Delete confirmation ──────────────────────────────── */}
                    {pendingDelete && (
                        <div
                            className="absolute inset-0 z-10 md:rounded-2xl bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
                            onClick={() => !deleting && setPendingDelete(null)}
                        >
                            <div
                                role="alertdialog"
                                aria-modal="true"
                                aria-labelledby="delete-conv-title"
                                aria-describedby="delete-conv-body"
                                className="w-full max-w-[320px] bg-[#161616] border border-white/10 rounded-2xl p-5 shadow-2xl animate-chat-in"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round">
                                        <polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                    </svg>
                                </div>
                                <h3 id="delete-conv-title" className="text-sm font-bold text-white mb-1.5">
                                    Delete this conversation?
                                </h3>
                                <p id="delete-conv-body" className="text-xs text-white/40 leading-relaxed mb-5">
                                    <span className="text-white/60">&ldquo;{pendingDelete.title}&rdquo;</span> and every message
                                    in it will be permanently deleted. This can&apos;t be undone.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPendingDelete(null)}
                                        disabled={deleting}
                                        className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-white/60 hover:bg-white/5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => deleteConversation(pendingDelete.id)}
                                        disabled={deleting}
                                        className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {deleting ? 'Deleting…' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
