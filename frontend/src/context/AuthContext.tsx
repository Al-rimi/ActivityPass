import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

export interface Tokens {
    access: string;
    refresh: string;
}

interface AuthContextValue {
    tokens: Tokens | null;
    user: any; // JWT payload
    me?: { id: number; username: string; first_name?: string; role: 'admin' | 'staff' | 'student' | 'user'; must_change_password?: boolean; student_profile?: any } | null;
    meLoading: boolean;
    login: (username: string, password: string) => Promise<Tokens>;
    register: (payload: { username: string; password: string; role: 'staff' | 'student'; email?: string; profile?: any }) => Promise<Tokens>;
    logout: () => void;
    setTokens: React.Dispatch<React.SetStateAction<Tokens | null>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const navigate = useNavigate();
    const [tokens, setTokens] = useState<Tokens | null>(() => {
        const stored = localStorage.getItem('ap_tokens');
        return stored ? JSON.parse(stored) as Tokens : null;
    });
    const [user, setUser] = useState<any>(() => {
        try {
            const stored = localStorage.getItem('ap_tokens');
            if (!stored) return null;
            const { access } = JSON.parse(stored) as Tokens;
            return jwtDecode(access);
        } catch {
            return null;
        }
    });

    const [me, setMe] = useState<AuthContextValue['me']>(null);
    const [meLoading, setMeLoading] = useState(false);

    useEffect(() => {
        if (tokens) {
            localStorage.setItem('ap_tokens', JSON.stringify(tokens));
            try { setUser(jwtDecode(tokens.access)); } catch { setUser(null); }
            // fetch /api/auth/me to get role and profile
            setMe(null);
            setMeLoading(true);
            fetch('/api/auth/me/', { headers: { Authorization: `Bearer ${tokens.access}` } })
                .then(r => {
                    if (r.status === 403) {
                        // Token is invalid or expired, logout and redirect to auth
                        logout();
                        navigate('/auth');
                        return Promise.reject(new Error('Authentication failed'));
                    }
                    return r.ok ? r.json() : Promise.reject(new Error('me failed'));
                })
                .then(data => setMe(data))
                .catch(() => setMe(null))
                .finally(() => setMeLoading(false));
        } else {
            localStorage.removeItem('ap_tokens');
            setUser(null);
            setMe(null);
            setMeLoading(false);
        }
    }, [tokens]);

    const login = async (username: string, password: string) => {
        const res = await fetch('/api/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw err;
        }
        const data = await res.json() as Tokens;
        setTokens(data);
        return data;
    };

    const register: AuthContextValue['register'] = async (payload) => {
        const res = await fetch('/api/auth/register/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Registration failed');
        }
        const data = await res.json();
        const tks = data.tokens as Tokens;
        setTokens(tks);
        return tks;
    };

    const logout = () => setTokens(null);

    const value = useMemo<AuthContextValue>(() => ({ tokens, user, me, meLoading, login, register, logout, setTokens }), [tokens, user, me, meLoading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
