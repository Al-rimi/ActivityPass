import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface SelectPeriodProps {
    id?: string;
    label: string;
    startValue: string;
    endValue: string;
    onStartChange: (value: string) => void;
    onEndChange: (value: string) => void;
    required?: boolean;
    disabled?: boolean;
    className?: string;
}

const SelectPeriod: React.FC<SelectPeriodProps> = ({
    id,
    label,
    startValue,
    endValue,
    onStartChange,
    onEndChange,
    required = false,
    disabled = false,
    className = ''
}) => {
    const [focused, setFocused] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
    const [tempEndDate, setTempEndDate] = useState<Date | null>(null);
    const [startTimeOpen, setStartTimeOpen] = useState(false);
    const [endTimeOpen, setEndTimeOpen] = useState(false);
    const [startTimeDropdownPosition, setStartTimeDropdownPosition] = useState<'bottom' | 'top'>('bottom');
    const [endTimeDropdownPosition, setEndTimeDropdownPosition] = useState<'bottom' | 'top'>('bottom');
    const startTimeButtonRef = useRef<HTMLButtonElement>(null);
    const endTimeButtonRef = useRef<HTMLButtonElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);
    const { t, i18n } = useTranslation();

    // Generate time options (15-minute intervals)
    const timeOptions = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            timeOptions.push({
                value: timeString,
                label: timeString
            });
        }
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setStartTimeOpen(false);
                setEndTimeOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const calculateDropdownPosition = (buttonRef: React.RefObject<HTMLButtonElement>, dropdownHeight: number = 192) => {
        if (!buttonRef.current) return 'bottom';

        const buttonRect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;

        // If there's not enough space below (accounting for some padding), position above
        return spaceBelow < dropdownHeight + 10 && spaceAbove > spaceBelow ? 'top' : 'bottom';
    };

    useEffect(() => {
        if (startTimeOpen && startTimeButtonRef.current) {
            setStartTimeDropdownPosition(calculateDropdownPosition(startTimeButtonRef));
        }
    }, [startTimeOpen]);

    useEffect(() => {
        if (endTimeOpen && endTimeButtonRef.current) {
            setEndTimeDropdownPosition(calculateDropdownPosition(endTimeButtonRef));
        }
    }, [endTimeOpen]);

    const formatDateTime = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hour}:${minute}`;
    };

    const formatDisplayDate = (date: Date) => {
        return date.toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDisplayTime = (timeString: string) => {
        if (!timeString) return '';
        const [hour, minute] = timeString.split(':');
        return `${hour}:${minute}`;
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
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

        // Prevent selecting dates before today
        if (selectedDate < today) {
            return;
        }

        if (!tempStartDate) {
            // First selection - set start date
            setTempStartDate(selectedDate);
            setTempEndDate(null);
        } else if (!tempEndDate) {
            // Second selection
            if (selectedDate >= tempStartDate) {
                // Valid end date - set the range
                setTempEndDate(selectedDate);
            } else {
                // If selected date is before start date, start new selection
                setTempStartDate(selectedDate);
                setTempEndDate(null);
            }
        } else {
            // Third selection - start new selection
            setTempStartDate(selectedDate);
            setTempEndDate(null);
        }
    };

    const handleTimeChange = (type: 'start' | 'end', timeString: string) => {
        if (!timeString) return;

        const [hour, minute] = timeString.split(':').map(Number);
        const baseDate = type === 'start' ? (tempStartDate || new Date()) : (tempEndDate || new Date());
        const dateTime = new Date(baseDate);
        dateTime.setHours(hour, minute);

        if (type === 'start') {
            onStartChange(formatDateTime(dateTime));
        } else {
            onEndChange(formatDateTime(dateTime));
        }

        if (type === 'start') {
            setStartTimeOpen(false);
        } else {
            setEndTimeOpen(false);
        }
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
        : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const weekdayNames = i18n.language === 'zh'
        ? ['日', '一', '二', '三', '四', '五', '六']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const hasValue = startValue || endValue;

    const isDateInRange = (day: number) => {
        if (!tempStartDate) return false;

        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

        if (tempStartDate && tempEndDate) {
            // Highlight selected range
            return checkDate >= tempStartDate && checkDate <= tempEndDate;
        }

        return false;
    };

    const isDateSelected = (day: number) => {
        if (!tempStartDate) return false;

        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

        if (tempStartDate && checkDate.toDateString() === tempStartDate.toDateString()) {
            return 'start';
        }

        if (tempEndDate && checkDate.toDateString() === tempEndDate.toDateString()) {
            return 'end';
        }

        return false;
    };

    return (
        <div ref={containerRef} className={`relative group/main border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover group-hover/main:border-app-light-border-hover dark:group-hover/main:border-app-dark-border-hover ${disabled ? 'bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary' : 'bg-app-light-input-bg dark:bg-app-dark-input-bg'} ${className}`}>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    disabled={disabled}
                    className="w-full px-4 pt-5 pb-3 text-left transition-colors duration-200 rounded-lg bg-transparent text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none disabled:bg-transparent disabled:text-app-light-text-secondary dark:disabled:text-app-dark-text-secondary min-h-[3.5rem] flex items-center justify-between overflow-hidden"
                >
                    <div className="flex flex-col flex-1 gap-1">
                        {tempStartDate && tempEndDate && tempStartDate.toDateString() !== tempEndDate.toDateString() && (
                            <div className="text-sm">
                                <span className="text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {formatDisplayDate(tempStartDate)} {startValue ? formatDisplayTime(startValue.split('T')[1]) : '09:00'} - {formatDisplayDate(tempEndDate)} {endValue ? formatDisplayTime(endValue.split('T')[1]) : '17:00'}
                                </span>
                            </div>
                        )}
                        {tempStartDate && (!tempEndDate || tempStartDate.toDateString() === tempEndDate.toDateString()) && (
                            <div className="text-sm">
                                <span className="text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {formatDisplayDate(tempStartDate)} {startValue ? formatDisplayTime(startValue.split('T')[1]) : '09:00'} - {endValue ? formatDisplayTime(endValue.split('T')[1]) : '17:00'}
                                </span>
                            </div>
                        )}
                        {!tempStartDate && startValue && endValue && (
                            <div className="text-sm">
                                <span className="text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {new Date(startValue).toDateString() !== new Date(endValue).toDateString()
                                        ? `${formatDisplayDate(new Date(startValue))} ${formatDisplayTime(startValue.split('T')[1])} - ${formatDisplayDate(new Date(endValue))} ${formatDisplayTime(endValue.split('T')[1])}`
                                        : `${formatDisplayDate(new Date(startValue))} ${formatDisplayTime(startValue.split('T')[1])} - ${formatDisplayTime(endValue.split('T')[1])}`
                                    }
                                </span>
                            </div>
                        )}
                    </div>
                    <svg
                        className="absolute flex-shrink-0 w-4 h-4 transform -translate-y-1/2 text-app-light-text-secondary right-3 top-1/2 dark:text-app-dark-text-secondary z-10"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
                {/* Gradient overlay for overflow like other input components */}
                <div className={`absolute inset-y-0 right-0 w-8 rounded-r-lg bg-gradient-to-l ${disabled ? 'from-app-light-surface-secondary to-transparent dark:from-app-dark-surface-secondary' : 'from-app-light-input-bg to-transparent dark:from-app-dark-input-bg'} pointer-events-none`}></div>
            </div>
            <label
                htmlFor={id}
                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${focused || hasValue || isOpen
                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover/main:text-app-light-text-primary dark:group-hover/main:text-app-dark-text-primary font-medium transform -translate-y-0'
                    : 'top-1/2 text-base text-app-light-text-secondary group-hover/main:text-app-light-text-primary dark:group-hover/main:text-app-dark-text-primary transform -translate-y-1/2'
                    } ${disabled ? 'text-app-light-text-secondary dark:text-app-dark-text-secondary' : ''}`}
            >
                {label}
            </label>

            {isOpen && (
                <div ref={pickerRef} className="absolute z-50 w-full mt-1 overflow-hidden border shadow-2xl bg-app-light-surface border-app-light-border rounded-xl dark:bg-app-dark-surface dark:border-app-dark-border">
                    {/* Date and Time Section */}
                    <div className="flex flex-col sm:flex-row">
                        {/* Date Section */}
                        <div className="flex-1 p-4">
                            {/* Month Navigation */}
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    type="button"
                                    onClick={() => changeMonth('prev')}
                                    className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <span className="text-sm font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                                    {currentDate.getFullYear()} {monthNames[currentDate.getMonth()]}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => changeMonth('next')}
                                    className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>

                            {/* Weekday headers */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {weekdayNames.map((day, index) => (
                                    <div key={index} className="py-1 text-xs font-medium text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {getDaysInMonth(currentDate).map((day, index) => {
                                    const isInRange = day && isDateInRange(day);
                                    const selectedType = day && isDateSelected(day);
                                    const isPastDate = day ? (() => {
                                        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        return checkDate < today;
                                    })() : false;

                                    return (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => day && !isPastDate && handleDateSelect(day)}
                                            disabled={!day || isPastDate}
                                            className={`text-center text-sm py-2 rounded-lg transition-colors ${day
                                                ? `${!isPastDate ? 'hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover' : ''} ${isPastDate
                                                    ? 'text-app-light-text-tertiary dark:text-app-dark-text-tertiary cursor-default'
                                                    : selectedType === 'start'
                                                        ? 'bg-app-light-accent text-app-light-text-on-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover'
                                                        : selectedType === 'end'
                                                            ? 'bg-app-light-accent text-app-light-text-on-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover'
                                                            : isInRange
                                                                ? 'bg-app-light-accent-light text-app-light-accent dark:bg-app-dark-accent-light dark:text-app-dark-accent'
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

                        {/* Time Section */}
                        <div className="w-full p-4 border-t sm:w-48 sm:border-t-0 sm:border-l border-app-light-border dark:border-app-dark-border">
                            <div className="space-y-3">
                                {/* Start Time */}
                                <div className="relative">
                                    <div className={`relative group/start border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover group-hover/start:border-app-light-border-hover dark:group-hover/start:border-app-dark-border-hover ${disabled ? 'bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary' : 'bg-app-light-input-bg dark:bg-app-dark-input-bg'}`}>
                                        <button
                                            ref={startTimeButtonRef}
                                            type="button"
                                            onClick={() => {
                                                setStartTimeOpen(!startTimeOpen);
                                                setEndTimeOpen(false);
                                            }}
                                            disabled={disabled}
                                            className={`w-full px-4 pt-6 pb-2 text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg text-left flex items-center justify-between h-[3.5rem] relative ${disabled ? 'text-app-light-text-secondary dark:text-app-dark-text-secondary' : 'bg-transparent hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover'}`}
                                        >
                                            <div className="flex-1 pr-6 overflow-hidden">
                                                <span className={startValue ? 'text-app-light-text-primary dark:text-app-dark-text-primary' : 'text-app-light-text-secondary dark:text-app-dark-text-secondary'}>
                                                    {startValue ? formatDisplayTime(startValue.split('T')[1] || '09:00') : '09:00'}
                                                </span>
                                            </div>
                                            <svg
                                                className={`w-4 h-4 text-app-light-text-secondary absolute right-3 top-1/2 transform -translate-y-1/2 transition-transform dark:text-app-dark-text-secondary flex-shrink-0 ${startTimeOpen ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        <label
                                            className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none top-0.5 text-xs font-medium transform -translate-y-0 ${disabled ? 'text-app-light-text-secondary dark:text-app-dark-text-secondary' : 'text-app-light-text-secondary group-hover/start:text-app-light-text-primary dark:group-hover/start:text-app-dark-text-primary'}`}
                                        >
                                            {t('period.startTime', { defaultValue: 'Start Time' })}
                                        </label>
                                    </div>

                                    {startTimeOpen && (
                                        <div className={`absolute z-50 w-full border rounded-lg shadow-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border max-h-48 overflow-y-auto ${startTimeDropdownPosition === 'top' ? 'bottom-full mb-1' : 'mt-1'}`}>
                                            {timeOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => handleTimeChange('start', option.value)}
                                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover transition-colors ${startValue && startValue.split('T')[1] === option.value
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

                                {/* End Time */}
                                <div className="relative">
                                    <div className={`relative group/end border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover group-hover/end:border-app-light-border-hover dark:group-hover/end:border-app-dark-border-hover ${disabled ? 'bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary' : 'bg-app-light-input-bg dark:bg-app-dark-input-bg'}`}>
                                        <button
                                            ref={endTimeButtonRef}
                                            type="button"
                                            onClick={() => {
                                                setEndTimeOpen(!endTimeOpen);
                                                setStartTimeOpen(false);
                                            }}
                                            disabled={disabled}
                                            className={`w-full px-4 pt-6 pb-2 text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg text-left flex items-center justify-between h-[3.5rem] relative ${disabled ? 'text-app-light-text-secondary dark:text-app-dark-text-secondary' : 'bg-transparent hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover'}`}
                                        >
                                            <div className="flex-1 pr-6 overflow-hidden">
                                                <span className={endValue ? 'text-app-light-text-primary dark:text-app-dark-text-primary' : 'text-app-light-text-secondary dark:text-app-dark-text-secondary'}>
                                                    {endValue ? formatDisplayTime(endValue.split('T')[1] || '17:00') : '17:00'}
                                                </span>
                                            </div>
                                            <svg
                                                className={`w-4 h-4 text-app-light-text-secondary absolute right-3 top-1/2 transform -translate-y-1/2 transition-transform dark:text-app-dark-text-secondary flex-shrink-0 ${endTimeOpen ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        <label
                                            className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none top-0.5 text-xs font-medium transform -translate-y-0 ${disabled ? 'text-app-light-text-secondary dark:text-app-dark-text-secondary' : 'text-app-light-text-secondary group-hover/end:text-app-light-text-primary dark:group-hover/end:text-app-dark-text-primary'}`}
                                        >
                                            {t('period.endTime', { defaultValue: 'End Time' })}
                                        </label>
                                    </div>

                                    {endTimeOpen && (
                                        <div className={`absolute z-50 w-full border rounded-lg shadow-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border max-h-48 overflow-y-auto ${endTimeDropdownPosition === 'top' ? 'bottom-full mb-1' : 'mt-1'}`}>
                                            {timeOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => handleTimeChange('end', option.value)}
                                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover transition-colors ${endValue && endValue.split('T')[1] === option.value
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
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-4 border-t border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                        <button
                            type="button"
                            onClick={() => {
                                if (tempStartDate) {
                                    const startDateTime = new Date(tempStartDate);
                                    const endDateTime = tempEndDate ? new Date(tempEndDate) : new Date(tempStartDate);

                                    // Set default times if not set
                                    if (!startValue) {
                                        startDateTime.setHours(9, 0); // Default to 9:00
                                    } else {
                                        const existingStart = new Date(startValue);
                                        startDateTime.setHours(existingStart.getHours(), existingStart.getMinutes());
                                    }

                                    if (!endValue) {
                                        endDateTime.setHours(17, 0); // Default to 17:00
                                    } else {
                                        const existingEnd = new Date(endValue);
                                        endDateTime.setHours(existingEnd.getHours(), existingEnd.getMinutes());
                                    }

                                    onStartChange(formatDateTime(startDateTime));
                                    onEndChange(formatDateTime(endDateTime));
                                }
                                setIsOpen(false);
                            }}
                            disabled={!tempStartDate}
                            className="px-3 py-1.5 text-sm font-medium text-app-light-text-on-accent bg-app-light-accent border border-transparent rounded-lg hover:bg-app-light-accent-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover dark:focus:ring-app-dark-accent transition-colors"
                        >
                            {t('common.done')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SelectPeriod;