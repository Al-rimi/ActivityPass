import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const langs: { code: string; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'zh', label: '中文' }
];

const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();
    const [open, setOpen] = useState(false);
    const current = i18n.language.startsWith('zh') ? 'zh' : 'en';

    const change = (lng: string) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('i18nextLng', lng);
        setOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium shadow-sm text-gray-700 dark:text-gray-200 transition-colors"
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span>{current === 'en' ? 'English' : '中文'}</span>
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open && (
                <ul className="absolute right-0 mt-2 w-32 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-20" role="listbox">
                    {langs.map(l => (
                        <li key={l.code}>
                            <button
                                className={`w-full text-left px-3 py-2 text-sm transition-colors ${current === l.code ? 'font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                onClick={() => change(l.code)}
                                role="option"
                                aria-selected={current === l.code}
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
