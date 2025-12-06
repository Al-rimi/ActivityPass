import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStudentSchedule } from '../hooks/useStudentSchedule';
import { useAuthenticatedApi } from '../utils/api';
import { StudentTimelineEntry } from '../types/student';
import { buildTimelineEntries, addDays, addWeeks, isSameDay, startOfWeek } from '../utils/studentSchedule';
import { statusStyles, getStatusLabel } from '../utils/studentStatus';
import EligibleActivityCard from '../components/student/EligibleActivityCard';

const StudentCalendarPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const locale = i18n.language || undefined;
    const { authenticatedFetch } = useAuthenticatedApi();
    const { courseEvents, participations, eligibleActivities, loading, error, refresh } = useStudentSchedule();

    const [weekOffset, setWeekOffset] = useState(0);
    const [applyingId, setApplyingId] = useState<number | null>(null);
    const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!notice) return;
        const timer = window.setTimeout(() => setNotice(null), 4000);
        return () => window.clearTimeout(timer);
    }, [notice]);

    const now = new Date();
    const timelineEntries = useMemo(
        () => buildTimelineEntries(courseEvents, participations),
        [courseEvents, participations]
    );
    const baseWeekStart = useMemo(() => startOfWeek(new Date()), []);
    const currentWeekStart = useMemo(() => addWeeks(baseWeekStart, weekOffset), [baseWeekStart, weekOffset]);
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(currentWeekStart, index)), [currentWeekStart]);

    const appliedActivityIds = useMemo(() => new Set(participations.map(part => part.activity)), [participations]);
    const recommendedActivities = useMemo(() => (
        eligibleActivities.filter(activity => !appliedActivityIds.has(activity.id))
    ), [eligibleActivities, appliedActivityIds]);

    const weekRangeLabel = useMemo(() => {
        const weekEnd = addDays(currentWeekStart, 6);
        const startFormatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
        const endFormatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
        return `${startFormatter.format(currentWeekStart)} – ${endFormatter.format(weekEnd)}`;
    }, [currentWeekStart, locale]);

    const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'long' }), [locale]);
    const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric' }), [locale]);
    const timeFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }), [locale]);

    const typeLabel = (kind: 'class' | 'activity') => (
        kind === 'class'
            ? t('student.timeline.class', { defaultValue: 'Class' })
            : t('student.timeline.activity', { defaultValue: 'Activity' })
    );

    const handleApply = async (activityId: number) => {
        try {
            setApplyingId(activityId);
            setNotice(null);
            const response = await authenticatedFetch(`/api/activities/${activityId}/apply/`, { method: 'POST' });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.detail || t('apply.fail'));
            }
            setNotice({ type: 'success', message: t('apply.success') });
            await refresh();
        } catch (err) {
            setNotice({ type: 'error', message: err instanceof Error ? err.message : t('apply.fail') });
        } finally {
            setApplyingId(null);
        }
    };

    const resolveLocalizedTitle = useCallback(
        (
            title: string,
            options?: {
                titleKey?: string | null;
                translations?: Record<string, string> | null;
            }
        ) => {
            const titleKey = options?.titleKey;
            if (titleKey) {
                return t(titleKey, { defaultValue: title });
            }

            const translations = options?.translations ?? null;
            const lang = (i18n.language || 'en').toLowerCase();
            if (lang.startsWith('zh')) {
                return translations?.['zh'] ?? title;
            }
            if (lang.startsWith('en')) {
                return translations?.['en'] ?? title;
            }
            return translations?.['en'] ?? translations?.['zh'] ?? title;
        },
        [i18n.language, t]
    );

    const resolveEntryTitle = useCallback(
        (entry: StudentTimelineEntry) =>
            resolveLocalizedTitle(entry.title, {
                titleKey: entry.titleKey,
                translations: entry.titleTranslations ?? null
            }),
        [resolveLocalizedTitle]
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        setNotice(null);
        try {
            await refresh();
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <main className="w-full px-4 pb-16 mx-auto space-y-6 max-w-5xl sm:px-6 lg:px-8">
            <header className="pt-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-app-light-text-primary dark:text-app-dark-text-primary">
                            {t('student.calendar.title', { defaultValue: 'Calendar' })}
                        </h1>
                        <p className="mt-1 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                            {t('student.calendar.subtitle', { defaultValue: 'Weekly timetable and upcoming activities.' })}
                        </p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-app-light-text-secondary dark:text-app-dark-text-secondary">
                            {t('student.calendar.weekOf', {
                                defaultValue: 'Week of {{range}}',
                                range: weekRangeLabel
                            })}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setWeekOffset(offset => offset - 1)}
                            className="px-3 py-2 text-sm font-semibold border rounded-full border-app-light-border text-app-light-text-primary hover:bg-app-light-surface-secondary dark:border-app-dark-border dark:text-app-dark-text-primary dark:hover:bg-app-dark-surface-secondary"
                        >
                            {t('student.calendar.prevWeek', { defaultValue: 'Previous' })}
                        </button>
                        <button
                            type="button"
                            onClick={() => setWeekOffset(0)}
                            className="px-3 py-2 text-sm font-semibold text-white rounded-full bg-primary-500 hover:bg-primary-600"
                        >
                            {t('student.calendar.thisWeek', { defaultValue: 'This week' })}
                        </button>
                        <button
                            type="button"
                            onClick={() => setWeekOffset(offset => offset + 1)}
                            className="px-3 py-2 text-sm font-semibold border rounded-full border-app-light-border text-app-light-text-primary hover:bg-app-light-surface-secondary dark:border-app-dark-border dark:text-app-dark-text-primary dark:hover:bg-app-dark-surface-secondary"
                        >
                            {t('student.calendar.nextWeek', { defaultValue: 'Next' })}
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleRefresh()}
                            disabled={refreshing || loading}
                            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-full border transition-colors duration-200 ${refreshing || loading
                                    ? 'border-app-light-border text-app-light-text-secondary dark:border-app-dark-border dark:text-app-dark-text-secondary cursor-not-allowed'
                                    : 'border-primary-500 text-primary-600 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-300 dark:hover:bg-primary-500/10'
                                }`}
                        >
                            <span>{t('student.home.refresh', { defaultValue: 'Refresh' })}</span>
                            {(refreshing || loading) && (
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M12 4v2" strokeLinecap="round" />
                                    <path d="M12 18v2" strokeLinecap="round" />
                                    <path d="M4 12h2" strokeLinecap="round" />
                                    <path d="M18 12h2" strokeLinecap="round" />
                                    <path d="M5.64 5.64l1.42 1.42" strokeLinecap="round" />
                                    <path d="M16.94 16.94l1.42 1.42" strokeLinecap="round" />
                                    <path d="M16.94 7.06l1.42-1.42" strokeLinecap="round" />
                                    <path d="M5.64 18.36l1.42-1.42" strokeLinecap="round" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {notice && (
                <div className={`flex items-start gap-3 p-4 text-sm border rounded-xl ${notice.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100'
                        : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-100'
                    }`}>
                    <span className="mt-0.5">{notice.message}</span>
                </div>
            )}

            {error && (
                <div className="p-4 text-sm border border-rose-200 rounded-xl bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-100">
                    {t('error.generic', { defaultValue: 'Error' })}: {error}
                </div>
            )}

            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                    {t('student.calendar.weeklyTimetable', { defaultValue: 'Weekly timetable' })}
                </h2>
                {loading && !timelineEntries.length ? (
                    <div className="p-4 border rounded-2xl border-app-light-border bg-app-light-surface dark:border-app-dark-border dark:bg-app-dark-surface">
                        <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                            {t('student.calendar.loadingWeek', { defaultValue: 'Loading week...' })}
                        </p>
                    </div>
                ) : (
                    <div className="-mx-4 overflow-x-auto pb-4 sm:mx-0">
                        <div className="flex gap-3 px-1 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                            {weekDays.map(day => {
                                const dayEntries = timelineEntries.filter(entry => isSameDay(entry.start, day));
                                const isToday = isSameDay(day, now);
                                return (
                                    <article
                                        key={day.toISOString()}
                                        className={`flex flex-col min-w-[220px] rounded-2xl border p-4 transition-all duration-200 ${isToday
                                                ? 'border-primary-500 bg-primary-500/10 shadow-sm'
                                                : 'border-app-light-border bg-app-light-surface dark:border-app-dark-border dark:bg-app-dark-surface'
                                            }`}
                                    >
                                        <header className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wide text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                    {weekdayFormatter.format(day)}
                                                </p>
                                                <p className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                                                    {dateFormatter.format(day)}
                                                </p>
                                            </div>
                                            {isToday && (
                                                <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full bg-primary-500 text-white">
                                                    {t('student.calendar.todayBadge', { defaultValue: 'Today' })}
                                                </span>
                                            )}
                                        </header>
                                        <div className="flex-1 mt-4 space-y-3">
                                            {dayEntries.length ? dayEntries.map(entry => {
                                                const isCurrent = isToday && entry.start.getTime() <= now.getTime() && entry.end.getTime() >= now.getTime();
                                                return (
                                                    <div
                                                        key={entry.key}
                                                        className={`rounded-xl border p-3 transition-colors duration-200 ${isCurrent
                                                                ? 'border-primary-500 bg-primary-500/10'
                                                                : 'border-app-light-border bg-app-light-surface-secondary dark:border-app-dark-border dark:bg-app-dark-surface-secondary'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                            <span>{`${timeFormatter.format(entry.start)} – ${timeFormatter.format(entry.end)}`}</span>
                                                            <span>{typeLabel(entry.kind)}</span>
                                                        </div>
                                                        <h3 className="mt-2 text-sm font-semibold leading-snug text-app-light-text-primary dark:text-app-dark-text-primary">
                                                            {resolveEntryTitle(entry)}
                                                        </h3>
                                                        {entry.kind === 'activity' && entry.location && (
                                                            <p className="mt-1 text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                                {t('student.activities.locationLabel', {
                                                                    location: entry.location,
                                                                    defaultValue: 'Location: {{location}}'
                                                                })}
                                                            </p>
                                                        )}
                                                        {entry.status && (
                                                            <span className={`inline-flex items-center px-2.5 py-1 mt-3 text-xs font-semibold rounded-full ${statusStyles[entry.status]}`}>
                                                                {getStatusLabel(entry.status, t)}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            }) : (
                                                <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                    {t('student.calendar.emptyDay', { defaultValue: 'No classes or activities scheduled.' })}
                                                </p>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                )}
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                    {t('student.activities.recommendedHeading', { defaultValue: 'Recommended for you' })}
                </h2>
                {loading && !eligibleActivities.length ? (
                    <div className="p-4 border rounded-2xl border-app-light-border bg-app-light-surface dark:border-app-dark-border dark:bg-app-dark-surface">
                        <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                            {t('common.loading', { defaultValue: 'Loading' })}
                        </p>
                    </div>
                ) : recommendedActivities.length ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {recommendedActivities.map(activity => (
                            <EligibleActivityCard
                                key={activity.id}
                                activity={activity}
                                onApply={handleApply}
                                isApplying={applyingId === activity.id}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="p-4 border rounded-2xl border-app-light-border bg-app-light-surface dark:border-app-dark-border dark:bg-app-dark-surface">
                        <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                            {t('student.activities.empty', { defaultValue: 'No eligible activities right now. Check back soon!' })}
                        </p>
                    </div>
                )}
            </section>

            <section className="p-4 border rounded-2xl border-app-light-border bg-app-light-surface-secondary dark:border-app-dark-border dark:bg-app-dark-surface-secondary">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-app-light-text-secondary dark:text-app-dark-text-secondary">
                    {t('student.calendar.legend.title', { defaultValue: 'Legend' })}
                </h3>
                <div className="flex flex-wrap gap-3 mt-3 text-xs">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-app-light-surface dark:bg-app-dark-surface">
                        <span className="inline-block w-2 h-2 rounded-full bg-sky-500" />
                        {t('student.timeline.class', { defaultValue: 'Class' })}
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-app-light-surface dark:bg-app-dark-surface">
                        <span className="inline-block w-2 h-2 rounded-full bg-primary-500" />
                        {t('student.timeline.activity', { defaultValue: 'Activity' })}
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-app-light-surface dark:bg-app-dark-surface">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                        {t('student.status.approved', { defaultValue: 'Approved' })}
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-app-light-surface dark:bg-app-dark-surface">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                        {t('student.status.applied', { defaultValue: 'Pending' })}
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-app-light-surface dark:bg-app-dark-surface">
                        <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
                        {t('student.status.rejected', { defaultValue: 'Rejected' })}
                    </span>
                </div>
            </section>
        </main>
    );
};

export default StudentCalendarPage;
