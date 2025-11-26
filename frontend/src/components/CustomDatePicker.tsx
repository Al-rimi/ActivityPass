import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface CustomDatePickerProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    label?: string;
    id?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
    value,
    onChange,
    placeholder = '',
    className = '',
    label = '',
    id
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [focused, setFocused] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const pickerRef = useRef<HTMLDivElement>(null);
    const { t, i18n } = useTranslation();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (value) {
            setCurrentDate(new Date(value));
        }
    }, [value]);

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDisplayDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }

        return days;
    };

    const handleDateSelect = (day: number) => {
        const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const formattedDate = formatDate(selectedDate);
        onChange(formattedDate);
        setIsOpen(false);
    };

    const changeMonth = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(newDate.getMonth() - 1);
            } else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            return newDate;
        });
    };

    const monthNames = i18n.language === 'zh'
        ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const weekdayNames = i18n.language === 'zh'
        ? ['日', '一', '二', '三', '四', '五', '六']
        : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    return (
        <div ref={pickerRef} className={`relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover bg-app-light-input-bg dark:bg-app-dark-input-bg ${className}`}>
            <button
                id={id}
                type="button"
                onClick={() => {
                    setIsOpen(!isOpen);
                    setFocused(true);
                }}
                onBlur={() => setFocused(false)}
                className="w-full px-4 pt-5 pb-3 text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg text-left flex items-center justify-between h-[3.5rem] relative bg-transparent hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover"
            >
                <span className={value ? 'text-app-light-text-primary dark:text-app-dark-text-primary' : 'text-app-light-text-secondary dark:text-app-dark-text-secondary'}>
                    {value ? formatDisplayDate(value) : placeholder}
                </span>
                <svg
                    className="w-4 h-4 text-app-light-text-secondary absolute right-3 top-1/2 transform -translate-y-1/2 dark:text-app-dark-text-secondary flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>
            {label && (
                <label
                    htmlFor={id}
                    className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${focused || value
                        ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                        : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                        }`}
                >
                    {label}
                </label>
            )}

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 border rounded-lg shadow-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b border-app-light-border dark:border-app-dark-border">
                        <button
                            type="button"
                            onClick={() => changeMonth('prev')}
                            className="p-1 text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <span className="text-sm font-medium text-app-light-text-primary dark:text-app-dark-text-primary">
                            {currentDate.getFullYear()} {monthNames[currentDate.getMonth()]}
                        </span>
                        <button
                            type="button"
                            onClick={() => changeMonth('next')}
                            className="p-1 text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-1 p-2">
                        {weekdayNames.map((day, index) => (
                            <div key={index} className="py-1 text-xs font-medium text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1 p-2">
                        {getDaysInMonth(currentDate).map((day, index) => {
                            const today = new Date();
                            const isToday = day && day === today.getDate() &&
                                currentDate.getMonth() === today.getMonth() &&
                                currentDate.getFullYear() === today.getFullYear();
                            const isSelected = day && formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)) === value;

                            return (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => day && handleDateSelect(day)}
                                    disabled={!day}
                                    className={`text-center text-sm py-2 rounded-md transition-colors ${day
                                        ? `hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover ${isSelected
                                            ? 'bg-app-light-accent text-app-light-text-on-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover'
                                            : isToday
                                                ? 'ring-1 ring-app-light-accent text-app-light-accent dark:ring-app-dark-accent dark:text-app-dark-accent'
                                                : 'text-app-light-text-primary dark:text-app-dark-text-primary'
                                        }`
                                        : ''
                                        }`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomDatePicker;