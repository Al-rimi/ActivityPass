import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface FloatingSelectProps {
    id?: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    hideSelectedTextWhen?: (value: string) => boolean;
}

const FloatingSelect: React.FC<FloatingSelectProps> = ({
    id,
    label,
    value,
    onChange,
    options,
    placeholder = '',
    required = false,
    disabled = false,
    className = '',
    hideSelectedTextWhen
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const selectRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(option => option.value === value);

    const filteredOptions = options.length > 10 && searchTerm
        ? options.filter(option =>
            option.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : options;

    const handleButtonClick = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
    };

    const handleOptionClick = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={selectRef} className={`relative group border-2 rounded-lg transition-colors duration-200 ${disabled ? 'border-app-light-border bg-app-light-surface-secondary dark:border-app-dark-border dark:bg-app-dark-surface-secondary' : 'border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover bg-app-light-input-bg dark:bg-app-dark-input-bg'} ${className}`}>
            <button
                id={id}
                type="button"
                onClick={handleButtonClick}
                disabled={disabled}
                className={`w-full px-4 pt-6 pb-2 text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg text-left flex items-center justify-between h-[3.5rem] relative ${disabled ? 'text-app-light-text-secondary dark:text-app-dark-text-secondary' : 'bg-transparent hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover'}`}
            >
                <div className="flex-1 pr-6 overflow-hidden">
                    <span className={selectedOption ? 'text-app-light-text-primary dark:text-app-dark-text-primary' : 'text-app-light-text-secondary dark:text-app-dark-text-secondary'}>
                        {selectedOption && !hideSelectedTextWhen?.(value) ? selectedOption.label : ''}
                    </span>
                </div>
                <svg
                    className={`w-4 h-4 text-app-light-text-secondary absolute right-3 top-1/2 transform -translate-y-1/2 dark:text-app-dark-text-secondary flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            <label
                htmlFor={id}
                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${(value && selectedOption)
                    ? 'top-0.5 text-xs font-medium transform -translate-y-0'
                    : 'top-1/2 text-base transform -translate-y-1/2'
                    } ${disabled ? 'text-app-light-text-secondary dark:text-app-dark-text-secondary' : 'text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary'}`}
            >
                {label}
            </label>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 overflow-hidden border rounded-lg shadow-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border max-h-60">
                    {options.length > 10 && (
                        <div className="p-2 border-b border-app-light-border dark:border-app-dark-border">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={t('common.search', { defaultValue: 'Search' })}
                                className="w-full px-3 py-2 text-sm transition-all duration-200 border rounded-lg bg-app-light-surface border-app-light-border focus:ring-2 focus:ring-app-light-accent focus:border-app-light-accent dark:bg-app-dark-surface dark:border-app-dark-border dark:text-app-dark-text dark:focus:ring-app-dark-accent dark:focus:border-app-dark-accent hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover"
                            />
                        </div>
                    )}
                    <div className="overflow-y-auto max-h-48">
                        {filteredOptions.map((option, index) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleOptionClick(option.value)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover transition-colors ${option.value === value
                                    ? 'bg-app-light-accent text-app-light-text-on-accent dark:bg-app-dark-accent dark:text-app-dark-text-on-accent'
                                    : 'text-app-light-text-primary dark:text-app-dark-text-primary'
                                    } ${index === 0 ? 'rounded-t-lg' : ''} ${index === filteredOptions.length - 1 ? 'rounded-b-lg' : ''}`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FloatingSelect;