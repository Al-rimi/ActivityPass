import React, { useMemo, useState } from 'react';
import { usePreferences } from '../context/PreferencesContext';

const ThemeToggle: React.FC = () => {
    const { theme, setTheme } = usePreferences();
    const [animationsEnabled, setAnimationsEnabled] = useState(false);

    const isDark = theme === 'dark';
    const toggleTheme = () => {
        setAnimationsEnabled(true);
        setTheme(isDark ? 'light' : 'dark');
    };

    const sunClasses = useMemo(() => [
        'absolute left-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center pointer-events-none transition-colors duration-300',
        isDark
            ? 'text-app-light-text-secondary opacity-60 dark:text-app-dark-text-secondary'
            : 'text-app-light-text-primary opacity-100 dark:text-app-dark-text-primary'
    ].join(' '), [isDark]);

    const moonClasses = useMemo(() => [
        'absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center pointer-events-none transition-colors duration-300',
        isDark
            ? 'text-app-light-text-primary opacity-100 dark:text-app-dark-text-primary'
            : 'text-app-light-text-secondary opacity-60 dark:text-app-dark-text-secondary'
    ].join(' '), [isDark]);

    const thumbAnimationClass = animationsEnabled
        ? isDark
            ? 'ap-toggle-thumb--right'
            : 'ap-toggle-thumb--left'
        : isDark
            ? 'ap-toggle-thumb--right-static'
            : 'ap-toggle-thumb--left-static';

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
            className={`relative inline-flex h-full min-h-[2.5rem] w-24 items-center overflow-hidden rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-light-accent/40 dark:focus-visible:ring-app-dark-accent/40 shadow-sm border-app-light-border dark:border-app-dark-border ${isDark ? 'bg-app-dark-surface' : 'bg-app-light-surface'
                }`}
        >
            <span className={sunClasses}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
            </span>
            <span className={moonClasses}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
            </span>
            <span className={`ap-toggle-thumb h-8 w-8 rounded-md bg-app-light-accent shadow dark:bg-app-dark-accent ${thumbAnimationClass}`} />
        </button>
    );
};

export default ThemeToggle;
