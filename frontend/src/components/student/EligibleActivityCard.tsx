import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EligibleActivityRecord } from '../../types/student';

interface EligibleActivityCardProps {
    activity: EligibleActivityRecord;
    onApply: (activityId: number) => void;
    disabled?: boolean;
    isApplying?: boolean;
}

const EligibleActivityCard: React.FC<EligibleActivityCardProps> = ({ activity, onApply, disabled = false, isApplying = false }) => {
    const { t, i18n } = useTranslation();
    const locale = i18n.language || undefined;

    const start = useMemo(() => new Date(activity.start_datetime), [activity.start_datetime]);
    const end = useMemo(() => new Date(activity.end_datetime), [activity.end_datetime]);

    const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    }), [locale]);

    const timeFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: '2-digit'
    }), [locale]);

    const displayTitle = useMemo(() => {
        const translations = activity.title_i18n ?? null;
        const lang = (i18n.language || 'en').toLowerCase();
        if (translations) {
            if (lang.startsWith('zh') && translations['zh']) {
                return translations['zh'];
            }
            if (lang.startsWith('en') && translations['en']) {
                return translations['en'];
            }
        }
        return translations?.['en'] ?? translations?.['zh'] ?? activity.title;
    }, [activity.title, activity.title_i18n, i18n.language]);

    const handleApply = () => {
        if (!disabled && !isApplying) {
            onApply(activity.id);
        }
    };

    const capacityLabel = useMemo(() => t('student.activities.capacity', {
        count: activity.capacity,
        defaultValue: `${activity.capacity} seats`
    }), [activity.capacity, t]);

    return (
        <article className="flex flex-col h-full p-4 transition-all duration-200 border rounded-2xl bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border shadow-sm hover:shadow-md">
            <div className="flex flex-wrap items-center justify-between text-xs font-medium uppercase tracking-wide text-app-light-text-secondary dark:text-app-dark-text-secondary">
                <span>{dateFormatter.format(start)}</span>
                <span>{`${timeFormatter.format(start)} – ${timeFormatter.format(end)}`}</span>
            </div>
            <h3 className="mt-2 text-base font-semibold leading-snug text-app-light-text-primary dark:text-app-dark-text-primary">
                {displayTitle}
            </h3>
            {activity.description && (
                <p className="mt-1 text-sm leading-relaxed text-app-light-text-secondary dark:text-app-dark-text-secondary">
                    {activity.description}
                </p>
            )}
            {activity.location && (
                <p className="mt-3 text-sm font-medium text-primary-600 dark:text-primary-400">
                    {t('student.activities.locationLabel', {
                        location: activity.location,
                        defaultValue: 'Location: {{location}}'
                    })}
                </p>
            )}
            <div className="flex items-center justify-between mt-4">
                <span className="text-xs font-medium text-app-light-text-secondary dark:text-app-dark-text-secondary">
                    {capacityLabel}
                </span>
                <button
                    type="button"
                    onClick={handleApply}
                    disabled={disabled || isApplying}
                    className={`inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 ${disabled || isApplying
                            ? 'bg-app-light-surface-secondary text-app-light-text-secondary dark:bg-app-dark-surface-secondary dark:text-app-dark-text-secondary cursor-not-allowed'
                            : 'bg-primary-500 text-white hover:bg-primary-600'
                        }`}
                >
                    {isApplying ? t('common.loading', { defaultValue: 'Loading' }) : t('student.activities.joinCta', { defaultValue: 'Join Activity' })}
                </button>
            </div>
        </article>
    );
};

export default EligibleActivityCard;
