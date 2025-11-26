import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface FloatingTextareaProps {
    id?: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    rows?: number;
}

const FloatingTextarea: React.FC<FloatingTextareaProps> = ({
    id,
    label,
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    className = '',
    rows = 3
}) => {
    const [focused, setFocused] = useState(false);
    const { t } = useTranslation();

    return (
        <div className={`relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover ${disabled ? 'bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary' : 'bg-app-light-input-bg dark:bg-app-dark-input-bg'} ${className}`}>
            <div className="relative">
                <textarea
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    rows={rows}
                    className="w-full px-4 pt-5 pb-3 placeholder-transparent transition-colors duration-200 rounded-lg bg-transparent text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none disabled:bg-transparent disabled:text-app-light-text-secondary dark:disabled:text-app-dark-text-secondary resize-vertical min-h-[3.5rem] overflow-hidden"
                />
                {/* Gradient overlay for overflow like other input components */}
                <div className={`absolute inset-y-0 right-0 w-8 rounded-r-lg bg-gradient-to-l ${disabled ? 'from-app-light-surface-secondary to-transparent dark:from-app-dark-surface-secondary' : 'from-app-light-input-bg to-transparent dark:from-app-dark-input-bg'} pointer-events-none`}></div>
            </div>
            <label
                htmlFor={id}
                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${focused || value
                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                    : 'top-4 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                    } ${disabled ? 'text-app-light-text-secondary dark:text-app-dark-text-secondary' : ''}`}
            >
                {label}
            </label>
        </div>
    );
};

export default FloatingTextarea;