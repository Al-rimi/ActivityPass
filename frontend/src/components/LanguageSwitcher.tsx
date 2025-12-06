import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../context/PreferencesContext';

const langs: { code: string; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'zh', label: '中文' }
];

const LanguageSwitcher: React.FC = () => {
    const { t } = useTranslation();
    const { language, setLanguage } = usePreferences();
    const [open, setOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const change = (lng: string) => {
        if (lng !== 'en' && lng !== 'zh') return;
        setLanguage(lng);
        setOpen(false);
    };

    return (
        <div ref={selectRef} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="w-full px-3 py-2 bg-app-light-surface border border-app-light-border rounded-lg transition-all duration-200 text-sm text-left flex items-center justify-between min-h-[2.5rem] hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover dark:bg-app-dark-surface dark:border-app-dark-border dark:text-app-dark-text"
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="text-app-light-text-primary dark:text-app-dark-text-primary">
                    {language === 'en' ? t('lang.english') : t('lang.chinese')}
                </span>
                <svg
                    className={`w-4 h-4 text-app-light-text-secondary transition-transform dark:text-app-dark-text-secondary ${open ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <ul className="absolute z-50 w-full mt-1 overflow-hidden border rounded-lg shadow-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border" role="listbox">
                    {langs.map((l, index) => (
                        <li key={l.code}>
                            <button
                                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover ${language === l.code
                                    ? 'bg-app-light-accent text-app-light-text-on-accent dark:bg-app-dark-accent dark:text-app-dark-text-on-accent'
                                    : 'text-app-light-text-primary dark:text-app-dark-text-primary'
                                    } ${index === 0 ? 'rounded-t-lg' : ''} ${index === langs.length - 1 ? 'rounded-b-lg' : ''}`}
                                onClick={() => change(l.code)}
                                role="option"
                                aria-selected={language === l.code}
                            >
                                {l.label}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LanguageSwitcher;
