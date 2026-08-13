'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface User {
    id: string;
    email: string;
    name: string;
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ error?: string }>;
    /** `needsConfirmation` is true when Supabase requires an email confirm before sign-in. */
    signup: (name: string, email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
    loginWithGoogle: () => Promise<{ error?: string }>;
    logout: () => void;
    resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapSupabaseUser(user: any): User | null {
    if (!user) return null;
    return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        createdAt: user.created_at,
    };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function initSession() {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted) {
                setUser(mapSupabaseUser(session?.user));
                setIsLoading(false);
            }
        }
        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(mapSupabaseUser(session?.user));
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        return {};
    }, []);

    const signup = useCallback(async (name: string, email: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name },
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            }
        });
        if (error) return { error: error.message };
        // No session back from signUp = email confirmation is required;
        // the caller must NOT push to /dashboard (middleware would bounce it)
        return { needsConfirmation: !data.session };
    }, []);

    const loginWithGoogle = useCallback(async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        if (error) return { error: error.message };
        return {};
    }, []);

    const logout = useCallback(async () => {
        await supabase.auth.signOut();
    }, []);

    const resetPassword = useCallback(async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (error) return { error: error.message };
        return { message: 'Password reset link sent! Check your email.' };
    }, []);

    return (
        <AuthContext.Provider value={{ user, isLoading, login, signup, loginWithGoogle, logout, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
