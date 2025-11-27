import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import i18n from '../i18n';
import { useAuth } from './AuthContext';

type ThemeMode = 'light' | 'dark';
type LanguageCode = 'en' | 'zh';

type Preferences = {
    language: LanguageCode;
    theme: ThemeMode;
};

type PreferencesContextValue = Preferences & {
    setLanguage: (language: LanguageCode) => void;
    setTheme: (mode: ThemeMode) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const canUseDOM = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const detectSystemLanguage = (): LanguageCode => {
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh')) {
        return 'zh';
    }
    return 'en';
};

const systemPrefersDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
const detectSystemTheme = (): ThemeMode => (systemPrefersDark() ? 'dark' : 'light');

const storageKey = (userId?: number) => (userId ? `ap_preferences_user_${userId}` : 'ap_preferences');

const safeParse = (value: string | null): Partial<Preferences> | null => {
    if (!value) return null;
    try {
        return JSON.parse(value) as Partial<Preferences>;
    } catch {
        return null;
    }
};

const readPreferences = (userId?: number): Preferences => {
    const fallback: Preferences = {
        language: detectSystemLanguage(),
        theme: detectSystemTheme(),
    };
    if (!canUseDOM()) return fallback;
    const userPrefs = userId ? safeParse(localStorage.getItem(storageKey(userId))) : null;
    if (userPrefs) return { ...fallback, ...userPrefs } as Preferences;
    const globalPrefs = safeParse(localStorage.getItem(storageKey()));
    if (globalPrefs) return { ...fallback, ...globalPrefs } as Preferences;
    const cachedLanguage = localStorage.getItem('i18nextLng');
    if (cachedLanguage === 'zh' || cachedLanguage === 'en') {
        fallback.language = cachedLanguage;
    }
    return fallback;
};

const persistPreferences = (prefs: Preferences, userId?: number) => {
    if (!canUseDOM()) return;
    try {
        localStorage.setItem(storageKey(), JSON.stringify(prefs));
        if (userId) {
            localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
        }
    } catch {
        // ignore quota issues
    }
};

const applyThemeClass = (mode: ThemeMode) => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.add('disable-transitions');
    document.documentElement.classList.toggle('dark', mode === 'dark');
    // Force reflow to apply the class
    document.documentElement.offsetHeight;
    document.documentElement.classList.remove('disable-transitions');
};

const applyLanguage = (language: LanguageCode) => {
    i18n.changeLanguage(language);
    if (canUseDOM()) {
        try {
            localStorage.setItem('i18nextLng', language);
        } catch {
            // ignore
        }
    }
};

export const PreferencesProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { me } = useAuth();
    const userId = me?.id;
    const [prefs, setPrefs] = useState<Preferences>(() => {
        const initial = readPreferences();
        applyThemeClass(initial.theme);
        applyLanguage(initial.language);
        return initial;
    });

    useEffect(() => {
        const next = readPreferences(userId);
        setPrefs(next);
        persistPreferences(next, userId);
        applyThemeClass(next.theme);
        applyLanguage(next.language);
    }, [userId]);

    useEffect(() => {
        applyThemeClass(prefs.theme);
    }, [prefs.theme]);

    useEffect(() => {
        applyLanguage(prefs.language);
    }, [prefs.language]);

    const setLanguage = useCallback((language: LanguageCode) => {
        setPrefs(prev => {
            if (prev.language === language) return prev;
            const next = { ...prev, language } as Preferences;
            persistPreferences(next, userId);
            return next;
        });
    }, [userId]);

    const setTheme = useCallback((mode: ThemeMode) => {
        setPrefs(prev => {
            if (prev.theme === mode) return prev;
            const next = { ...prev, theme: mode } as Preferences;
            persistPreferences(next, userId);
            return next;
        });
    }, [userId]);

    const value = useMemo<PreferencesContextValue>(() => ({
        language: prefs.language,
        theme: prefs.theme,
        setLanguage,
        setTheme,
    }), [prefs.language, prefs.theme, setLanguage, setTheme]);

    return (
        <PreferencesContext.Provider value={value}>
            {children}
        </PreferencesContext.Provider>
    );
};

export const usePreferences = () => {
    const ctx = useContext(PreferencesContext);
    if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
    return ctx;
};
