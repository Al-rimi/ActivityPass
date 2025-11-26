import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SearchInputProps {
    id?: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
    id,
    label,
    value,
    onChange,
    placeholder,
    disabled = false,
    className = ''
}) => {
    const [focused, setFocused] = useState(false);
    const { t } = useTranslation();

    return (
        <div className={`relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover ${className}`}>
            <input
                id={id}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full px-4 pt-5 pb-3 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg disabled:bg-app-light-surface-secondary dark:disabled:bg-app-dark-surface-secondary disabled:text-app-light-text-secondary dark:disabled:text-app-dark-text-secondary"
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
        </div>
    );
};

export default SearchInput;