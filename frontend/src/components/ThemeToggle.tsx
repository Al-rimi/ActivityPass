import React, { useEffect, useState } from 'react';

// Two-state theme: 'light' | 'dark'. If no prior choice, detect system and persist.
const systemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const applyTheme = (mode: 'light' | 'dark') => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
};

const ThemeToggle: React.FC = () => {
    const [mode, setMode] = useState<'light' | 'dark'>(() => {
        const stored = localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark') return stored;
        // auto select system then persist
        const sys = systemPrefersDark() ? 'dark' : 'light';
        localStorage.setItem('theme', sys);
        return sys;
    });

    useEffect(() => {
        applyTheme(mode);
        localStorage.setItem('theme', mode);
    }, [mode]);

    // Switch component: pill with sliding thumb and icons
    const toggle = () => setMode(m => (m === 'dark' ? 'light' : 'dark'));

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`relative inline-flex items-center h-8 w-16 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 shadow-sm border border-gray-300 dark:border-gray-700 ${mode === 'dark' ? 'bg-gray-800' : 'bg-white dark:bg-gray-900'}`}
        >
            {/* Icons */}
            <span className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-500 dark:text-gray-400 pointer-events-none">
                {/* Sun icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
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
            <span className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-500 dark:text-gray-400 pointer-events-none">
                {/* Moon icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
            </span>
            {/* Thumb */}
            <span
                className={`absolute top-1 left-1 inline-block h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 shadow transition-transform duration-300 ease-out ${mode === 'dark' ? 'translate-x-8' : 'translate-x-0'}`}
            />
        </button>
    );
};

export default ThemeToggle;
