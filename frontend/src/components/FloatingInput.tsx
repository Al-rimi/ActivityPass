import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface FloatingInputProps {
    id?: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    autoComplete?: string;
    error?: boolean;
    icon?: React.ReactNode;
}

const FloatingInput: React.FC<FloatingInputProps> = ({
    id,
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    required = false,
    disabled = false,
    className = '',
    autoComplete,
    error = false,
    icon
}) => {
    const [focused, setFocused] = useState(false);
    const { t } = useTranslation();

    return (
        <div className={`relative group border-2 rounded-lg transition-colors duration-200 ${error
            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
            : 'border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover'
            } ${disabled ? 'bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary' : 'bg-app-light-input-bg dark:bg-app-dark-input-bg'} ${className}`}>
            <div className="relative">
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    autoComplete={autoComplete}
                    className={`w-full px-4 pt-5 pb-3 placeholder-transparent transition-colors duration-200 rounded-lg bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none disabled:bg-app-light-surface-secondary dark:disabled:bg-app-dark-surface-secondary disabled:text-app-light-text-secondary dark:disabled:text-app-dark-text-secondary overflow-hidden ${icon ? 'pr-12' : ''}`}
                />
                {icon && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 z-10">
                        {icon}
                    </div>
                )}
                {/* Gradient overlay for overflow like multi-select inputs */}
                <div className={`absolute inset-y-0 right-0 w-8 rounded-r-lg bg-gradient-to-l ${disabled ? 'from-app-light-surface-secondary to-transparent dark:from-app-dark-surface-secondary' : 'from-app-light-input-bg to-transparent dark:from-app-dark-input-bg'} pointer-events-none ${icon ? 'mr-8' : ''}`}></div>
            </div>
            <label
                htmlFor={id}
                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${focused || value
                    ? 'top-0.5 text-xs font-medium transform -translate-y-0'
                    : 'top-1/2 text-base transform -translate-y-1/2'
                    } ${error
                        ? 'text-red-500'
                        : disabled
                            ? 'text-app-light-text-secondary dark:text-app-dark-text-secondary'
                            : 'text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary'
                    }`}
            >
                {label}
            </label>
        </div>
    );
};

export default FloatingInput;