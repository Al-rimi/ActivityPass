import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface YearInputProps {
    id?: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    minYear?: number;
    maxYear?: number;
}

const YearInput: React.FC<YearInputProps> = ({
    id,
    label,
    value,
    onChange,
    required = false,
    disabled = false,
    className = '',
    minYear = 1900,
    maxYear = new Date().getFullYear() + 10
}) => {
    const [focused, setFocused] = useState(false);
    const { t } = useTranslation();

    const handleIncrement = () => {
        const currentYear = Number(value) || new Date().getFullYear();
        const newYear = Math.min(currentYear + 1, maxYear);
        onChange(String(newYear));
    };

    const handleDecrement = () => {
        const currentYear = Number(value) || new Date().getFullYear();
        const newYear = Math.max(currentYear - 1, minYear);
        onChange(String(newYear));
    };

    return (
        <div className={`relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover ${className}`}>
            <input
                id={id}
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                required={required}
                disabled={disabled}
                min={minYear}
                max={maxYear}
                className="w-full px-4 pt-5 pb-3 pr-16 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg disabled:bg-app-light-surface-secondary dark:disabled:bg-app-dark-surface-secondary disabled:text-app-light-text-secondary dark:disabled:text-app-dark-text-secondary"
            />
            <label
                htmlFor={id}
                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${focused || value
                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                    } ${disabled ? 'text-app-light-text-secondary dark:text-app-dark-text-secondary' : ''}`}
            >
                {label}
            </label>
            <div className="absolute inset-y-0 right-0 flex flex-col">
                <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={disabled || (Number(value) >= maxYear)}
                    className="flex-1 px-2 border-l text-app-light-text-secondary dark:text-app-dark-text-secondary border-app-light-border dark:border-app-dark-border hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Increase year"
                >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={disabled || (Number(value) <= minYear)}
                    className="flex-1 px-2 border-t border-l text-app-light-text-secondary dark:text-app-dark-text-secondary border-app-light-border dark:border-app-dark-border hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Decrease year"
                >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default YearInput;