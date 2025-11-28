import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface FloatingMultiSelectProps {
    id?: string;
    label: string;
    value: string[];
    onChange: (value: string[]) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    showSearch?: boolean;
    disabled?: boolean;
    className?: string;
}

const FloatingMultiSelect: React.FC<FloatingMultiSelectProps> = ({
    id,
    label,
    value,
    onChange,
    options,
    placeholder = '',
    showSearch = false,
    disabled = false,
    className = ''
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

    const filteredOptions = showSearch && searchTerm
        ? options.filter(option =>
            option.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : options;

    const selectedLabels = value.map(val =>
        options.find(opt => opt.value === val)?.label || val
    );

    const handleSelect = (optionValue: string) => {
        if (value.includes(optionValue)) {
            onChange(value.filter(v => v !== optionValue));
        } else {
            onChange([...value, optionValue]);
        }
    };

    const handleSelectAll = () => {
        if (value.length === options.length) {
            onChange([]);
        } else {
            onChange(options.map(opt => opt.value));
        }
    };

    // Create selected items display with overflow handling
    const renderSelectedItems = () => {
        if (selectedLabels.length === 0) {
            return (
                <span className="text-app-light-text-secondary dark:text-app-dark-text-secondary">
                    {placeholder}
                </span>
            );
        }

        if (selectedLabels.length === options.length) {
            return (
                <span className="text-app-light-text-primary dark:text-app-dark-text-primary">
                    {t('common.all', { defaultValue: 'All' })}
                </span>
            );
        }

        // Show all selected items in a single line with overflow like student name column
        return (
            <div className="relative w-full">
                <div className="flex items-center gap-1 overflow-hidden whitespace-nowrap">
                    {selectedLabels.map((label, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-app-light-accent-light text-app-light-accent dark:bg-app-dark-accent-light dark:text-app-dark-accent flex-shrink-0"
                        >
                            {label}
                        </span>
                    ))}
                </div>
                {/* Gradient overlay for overflow like student name column */}
                <div className={`absolute inset-y-0 right-0 w-8 bg-gradient-to-l ${disabled ? 'from-app-light-surface-secondary to-transparent dark:from-app-dark-surface-secondary' : 'from-app-light-input-bg to-transparent dark:from-app-dark-input-bg'} pointer-events-none`}></div>
            </div>
        );
    }; return (
        <div ref={selectRef} className={`relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover ${disabled ? 'bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary' : 'bg-app-light-input-bg dark:bg-app-dark-input-bg'} ${className}`}>
            <button
                id={id}
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full px-4 pt-6 pb-2 text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg text-left flex items-center justify-between h-[3.5rem] relative ${disabled ? 'text-app-light-text-secondary dark:text-app-dark-text-secondary' : 'bg-transparent hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover'}`}
            >
                <div className="flex-1 pr-6 overflow-hidden">
                    {renderSelectedItems()}
                </div>
                <svg
                    className={`w-4 h-4 text-app-light-text-secondary absolute right-3 top-1/2 transform -translate-y-1/2 transition-transform dark:text-app-dark-text-secondary flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            <label
                htmlFor={id}
                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${value.length > 0
                    ? 'top-0.5 text-xs font-medium transform -translate-y-0'
                    : 'top-1/2 text-base transform -translate-y-1/2'
                    } ${disabled ? 'text-app-light-text-secondary dark:text-app-dark-text-secondary' : 'text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary'}`}
            >
                {label}
            </label>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 overflow-hidden border rounded-lg shadow-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border max-h-60">
                    {showSearch && options.length > 10 && (
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
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className="w-full px-3 py-2 text-sm font-medium text-left transition-colors border-b hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover text-app-light-accent dark:text-app-dark-accent border-app-light-border dark:border-app-dark-border"
                        >
                            {value.length === options.length
                                ? t('common.deselectAll', { defaultValue: 'Deselect All' })
                                : t('common.selectAll', { defaultValue: 'Select All' })
                            }
                        </button>
                        {filteredOptions.map((option, index) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleSelect(option.value)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover transition-colors flex items-center ${value.includes(option.value)
                                    ? 'bg-app-light-accent-light text-app-light-accent dark:bg-app-dark-accent-light dark:text-app-dark-accent'
                                    : 'text-app-light-text-primary dark:text-app-dark-text-primary'
                                    } ${index === 0 ? 'rounded-t-lg' : ''} ${index === filteredOptions.length - 1 ? 'rounded-b-lg' : ''}`}
                            >
                                <span className="mr-2 text-app-light-accent dark:text-app-dark-accent">
                                    {value.includes(option.value) ? '✓' : '○'}
                                </span>
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FloatingMultiSelect;