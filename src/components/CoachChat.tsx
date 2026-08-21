/**
 * CoachChat — the AI coach, one tap away on every screen.
 *
 * A floating button (bottom-right, above the mobile nav) opens the coach:
 * full-screen sheet on mobile, compact panel on desktop. Holds a running
 * conversation, keeps history (open, continue, delete), and talks to
 * /api/chat, which grounds every reply in the user's real training data.
 *
 * Hidden on /workout — that screen is camera-dominant and has the voice
 * coach; overlaying a chat button on the workout controls would fight it.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '../utils/supabase/client';

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

const SUGGESTIONS = [
    'What should I do today?',
    'I only have 20 minutes',
    "I'm sore from last time",
    'How am I progressing?',
];

function relativeDate(iso: string): string {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function CoachChat() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<'chat' | 'history'>('chat');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [conversations, setConversations] = useState<ConversationRow[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Keep the newest message in view
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, sending, open, view]);

    const loadConversations = useCallback(async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from('conversations')
            .select('id, title, updated_at')
            .order('updated_at', { ascending: false })
            .limit(50);
        setConversations(data ?? []);
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

    const deleteConversation = useCallback(async (id: string) => {
        const supabase = createClient();
        await supabase.from('conversations').delete().eq('id', id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (conversationId === id) {
            setConversationId(null);
            setMessages([]);
        }
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
            const res = await fetch('/api/chat', {
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

    // The workout screen is camera-dominant — no chat button there
    if (pathname.startsWith('/workout')) return null;

    return (
        <>
            {/* ─── Floating button ─────────────────────────────────────────── */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    aria-label="Open coach chat"
                    className="fixed z-40 right-4 bottom-[4.75rem] md:right-6 md:bottom-6 w-14 h-14 rounded-full bg-[#22c55e] text-black flex items-center justify-center shadow-[0_4px_25px_rgba(34,197,94,0.4)] hover:bg-[#16a34a] active:scale-95 transition-all cursor-pointer"
                    style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                    </svg>
                </button>
            )}

            {/* ─── Panel ───────────────────────────────────────────────────── */}
            {open && (
                <div className="fixed z-50 inset-0 md:inset-auto md:right-6 md:bottom-6 md:w-[400px] md:h-[640px] md:max-h-[calc(100dvh-3rem)] bg-[#0d0d0d] md:border md:border-white/10 md:rounded-2xl md:shadow-2xl flex flex-col h-[100dvh] md:h-[640px]">
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
                                    {view === 'history' ? 'Conversations' : 'Knows your training'}
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
                                onClick={() => setOpen(false)}
                                aria-label="Close chat"
                                className="w-9 h-9 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all cursor-pointer"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>

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
                            {conversations.length === 0 && (
                                <p className="text-xs text-white/20 text-center pt-8">No conversations yet.</p>
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
                                        onClick={() => deleteConversation(c.id)}
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
                                            {SUGGESTIONS.map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => send(s)}
                                                    className="px-3 py-2 rounded-full border border-white/10 text-xs text-white/50 hover:border-[#22c55e]/40 hover:text-[#22c55e] transition-all cursor-pointer"
                                                >
                                                    {s}
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
                                            {m.content}
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
                </div>
            )}
        </>
    );
}
