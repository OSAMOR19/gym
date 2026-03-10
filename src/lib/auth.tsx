/**
 * Auth System — localStorage-based authentication
 *
 * Provides a React context for auth state + helper functions.
 * Users and sessions are stored in localStorage.
 * Passwords are hashed with SHA-256 via the Web Crypto API.
 *
 * The AuthContext interface is designed to be backend-agnostic:
 * swap localStorage for Supabase/Firebase by changing only this file.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
    id: string;
    email: string;
    name: string;
    createdAt: string;
}

interface StoredUser extends User {
    passwordHash: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ error?: string }>;
    signup: (name: string, email: string, password: string) => Promise<{ error?: string }>;
    logout: () => void;
    resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
}

const USERS_KEY = 'irontrack_users';
const SESSION_KEY = 'irontrack_session';

// ─── Crypto helpers ──────────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateId(): string {
    return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Storage helpers ─────────────────────────────────────────────────────────

function getUsers(): StoredUser[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveUsers(users: StoredUser[]): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession(): User | null {
    if (typeof window === 'undefined') return null;
    try {
        const session = localStorage.getItem(SESSION_KEY);
        return session ? JSON.parse(session) : null;
    } catch {
        return null;
    }
}

function saveSession(user: User | null): void {
    if (user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
        localStorage.removeItem(SESSION_KEY);
    }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Restore session on mount
    useEffect(() => {
        setUser(getSession());
        setIsLoading(false);
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const users = getUsers();
        const hash = await hashPassword(password);
        const found = users.find((u) => u.email === email.toLowerCase() && u.passwordHash === hash);

        if (!found) {
            return { error: 'Invalid email or password' };
        }

        const userData: User = { id: found.id, email: found.email, name: found.name, createdAt: found.createdAt };
        setUser(userData);
        saveSession(userData);
        return {};
    }, []);

    const signup = useCallback(async (name: string, email: string, password: string) => {
        const users = getUsers();
        const lowerEmail = email.toLowerCase();

        if (users.some((u) => u.email === lowerEmail)) {
            return { error: 'An account with this email already exists' };
        }

        if (password.length < 6) {
            return { error: 'Password must be at least 6 characters' };
        }

        const hash = await hashPassword(password);
        const newUser: StoredUser = {
            id: generateId(),
            email: lowerEmail,
            name,
            passwordHash: hash,
            createdAt: new Date().toISOString(),
        };

        users.push(newUser);
        saveUsers(users);

        const userData: User = { id: newUser.id, email: newUser.email, name: newUser.name, createdAt: newUser.createdAt };
        setUser(userData);
        saveSession(userData);
        return {};
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        saveSession(null);
    }, []);

    const resetPassword = useCallback(async (email: string) => {
        const users = getUsers();
        const found = users.find((u) => u.email === email.toLowerCase());

        if (!found) {
            return { error: 'No account found with this email' };
        }

        // In a real app this would send an email. For the MVP, we reset to "password123"
        const hash = await hashPassword('password123');
        found.passwordHash = hash;
        saveUsers(users);

        return { message: 'Password has been reset to "password123". Please login and change it.' };
    }, []);

    return (
        <AuthContext.Provider value= {{ user, isLoading, login, signup, logout, resetPassword }
}>
    { children }
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
