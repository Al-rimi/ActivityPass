import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    className?: string;
    id?: string;
    label?: string;
    focused?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = '',
    className = '',
    id,
    label,
    focused = false,
    onFocus,
    onBlur
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                onBlur?.();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onBlur]);

    const selectedOption = options.find(option => option.value === value);

    const handleButtonClick = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            onFocus?.();
        } else {
            onBlur?.();
        }
    };

    const handleOptionClick = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        onBlur?.();
    };

    if (label) {
        // Floating label version
        return (
            <div ref={selectRef} className={`relative ${className}`}>
                <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                    <button
                        id={id}
                        type="button"
                        onClick={handleButtonClick}
                        className="w-full px-4 py-4 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg text-left flex items-center justify-between min-h-[3.5rem]"
                    >
                        <span className={selectedOption ? 'text-app-light-text-primary dark:text-app-dark-text-primary' : 'text-app-light-text-secondary dark:text-app-dark-text-secondary'}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                        <svg
                            className={`w-4 h-4 text-app-light-text-secondary transition-transform dark:text-app-dark-text-secondary ${isOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <label
                        htmlFor={id}
                        className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${focused || value
                            ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                            : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                            }`}
                    >
                        {label}
                    </label>
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 border rounded-lg shadow-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleOptionClick(option.value)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover transition-colors ${option.value === value
                                    ? 'bg-app-light-accent text-app-light-text-on-accent dark:bg-app-dark-accent dark:text-app-dark-text-on-accent'
                                    : 'text-app-light-text-primary dark:text-app-dark-text-primary'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div ref={selectRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 bg-app-light-input-bg border border-app-light-border rounded-lg focus:ring-1 focus:ring-app-light-accent focus:border-app-light-accent dark:bg-app-dark-input-bg dark:border-app-dark-border dark:text-app-dark-text dark:focus:ring-app-dark-accent dark:focus:border-app-dark-accent transition-all duration-200 text-sm text-left flex items-center justify-between min-h-[2.5rem] hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover"
            >
                <span className={selectedOption ? 'text-app-light-text-primary dark:text-app-dark-text-primary' : 'text-app-light-text-secondary dark:text-app-dark-text-secondary'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <svg
                    className={`w-4 h-4 text-app-light-text-secondary transition-transform dark:text-app-dark-text-secondary ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 border rounded-lg shadow-lg bg-app-light-surface-dark border-app-light-border dark:bg-app-dark-surface-dark dark:border-app-dark-border">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover transition-colors ${option.value === value
                                ? 'bg-app-light-accent text-app-light-text-on-accent dark:bg-app-dark-accent dark:text-app-dark-text-on-accent'
                                : 'text-app-light-text-primary dark:text-app-dark-text-primary'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomSelect;