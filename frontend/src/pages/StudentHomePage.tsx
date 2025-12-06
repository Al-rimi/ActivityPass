import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useStudentSchedule } from '../hooks/useStudentSchedule';
import { useAuthenticatedApi } from '../utils/api';
import EligibleActivityCard from '../components/student/EligibleActivityCard';
import { StudentTimelineEntry } from '../types/student';
import { buildTimelineEntries, isSameDay, startOfDay } from '../utils/studentSchedule';
import { statusStyles, getStatusLabel } from '../utils/studentStatus';

const StudentHomePage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { me } = useAuth();
    const locale = i18n.language || undefined;
    const { authenticatedFetch } = useAuthenticatedApi();
    const { courseEvents, participations, eligibleActivities, loading, error, refresh } = useStudentSchedule();

    const [applyingId, setApplyingId] = useState<number | null>(null);
    const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!notice) return;
        const timer = window.setTimeout(() => setNotice(null), 4000);
        return () => window.clearTimeout(timer);
    }, [notice]);

    const today = startOfDay(new Date());
    const now = new Date();

    const timelineEntries = useMemo(
        () => buildTimelineEntries(courseEvents, participations),
        [courseEvents, participations]
    );
    const todaysEntries = useMemo(() => timelineEntries.filter(entry => isSameDay(entry.start, today)), [timelineEntries, today]);
    const nextEntry = useMemo(() => {
        return timelineEntries.find(entry => entry.start.getTime() >= now.getTime());
    }, [timelineEntries, now]);

    const appliedActivityIds = useMemo(() => new Set(participations.map(part => part.activity)), [participations]);
    const recommendedActivities = useMemo(() => (
        eligibleActivities.filter(activity => !appliedActivityIds.has(activity.id)).slice(0, 6)
    ), [eligibleActivities, appliedActivityIds]);

    const upcomingParticipations = useMemo(() => {
        return participations
            .filter(part => {
                const activity = part.activity_detail;
                if (!activity) return false;
                const start = new Date(activity.start_datetime);
                return start.getTime() >= now.getTime();
            })
            .sort((a, b) => {
                const aStart = new Date(a.activity_detail!.start_datetime).getTime();
                const bStart = new Date(b.activity_detail!.start_datetime).getTime();
                return aStart - bStart;
            })
            .slice(0, 4);
    }, [participations, now]);

    const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    }), [locale]);

    const timeFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: '2-digit'
    }), [locale]);

    const shortDateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric'
    }), [locale]);

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
        <main className="w-full px-4 pb-16 mx-auto space-y-6 max-w-4xl sm:px-6 lg:px-8">
            <header className="pt-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">
                            {me?.first_name ? t('student.home.greetingNamed', { defaultValue: 'Good day, {{name}}', name: me.first_name }) : t('student.home.greeting', { defaultValue: 'Good day' })}
                        </p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl text-app-light-text-primary dark:text-app-dark-text-primary">
                            {t('student.home.title', { defaultValue: 'Today' })}
                        </h1>
                        <p className="mt-1 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                            {t('student.home.subtitle', {
                                defaultValue: 'Here is everything scheduled for {{date}}.',
                                date: dateFormatter.format(today)
                            })}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void handleRefresh()}
                        disabled={refreshing || loading}
                        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border transition-colors duration-200 ${refreshing || loading
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
            </header>

            {notice && (
                <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${notice.type === 'success'
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
                    {t('student.home.nextUp', { defaultValue: 'Next up' })}
                </h2>
                {loading ? (
                    <div className="p-4 border rounded-2xl border-app-light-border bg-app-light-surface dark:border-app-dark-border dark:bg-app-dark-surface">
                        <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                            {t('common.loading', { defaultValue: 'Loading' })}
                        </p>
                    </div>
                ) : nextEntry ? (
                    <div className="p-4 border rounded-2xl border-primary-500/60 bg-primary-500/10 dark:border-primary-400/60 dark:bg-primary-500/15">
                        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-primary-600 dark:text-primary-300">
                            <span>{typeLabel(nextEntry.kind)}</span>
                            <span>{`${timeFormatter.format(nextEntry.start)} – ${timeFormatter.format(nextEntry.end)}`}</span>
                        </div>
                        <h3 className="mt-2 text-base font-semibold text-primary-700 dark:text-primary-200">
                            {resolveEntryTitle(nextEntry)}
                        </h3>
                        {nextEntry.kind === 'activity' && nextEntry.location && (
                            <p className="mt-2 text-sm text-primary-700 dark:text-primary-200">
                                {t('student.activities.locationLabel', {
                                    location: nextEntry.location,
                                    defaultValue: 'Location: {{location}}'
                                })}
                            </p>
                        )}
                        {nextEntry.status && (
                            <span className={`inline-flex items-center px-3 py-1 mt-3 text-xs font-semibold rounded-full ${statusStyles[nextEntry.status]}`}>
                                {getStatusLabel(nextEntry.status, t)}
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="p-4 border rounded-2xl border-app-light-border bg-app-light-surface dark:border-app-dark-border dark:bg-app-dark-surface">
                        <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                            {t('student.home.noNext', { defaultValue: 'No upcoming events.' })}
                        </p>
                    </div>
                )}
            </section>

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                        {t('student.home.timelineHeading', { defaultValue: "Today's agenda" })}
                    </h2>
                    <span className="text-xs font-medium uppercase tracking-wide text-app-light-text-secondary dark:text-app-dark-text-secondary">
                        {dateFormatter.format(today)}
                    </span>
                </div>
                {loading ? (
                    <div className="p-4 border rounded-2xl border-app-light-border bg-app-light-surface dark:border-app-dark-border dark:bg-app-dark-surface">
                        <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                            {t('common.loading', { defaultValue: 'Loading' })}
                        </p>
                    </div>
                ) : todaysEntries.length ? (
                    <div className="space-y-3">
                        {todaysEntries.map(entry => {
                            const isCurrent = entry.start.getTime() <= now.getTime() && entry.end.getTime() >= now.getTime();
                            return (
                                <article
                                    key={entry.key}
                                    className={`flex gap-4 p-4 border rounded-2xl transition-all duration-200 ${isCurrent
                                            ? 'border-primary-500/70 bg-primary-500/10 shadow-sm'
                                            : 'border-app-light-border bg-app-light-surface dark:border-app-dark-border dark:bg-app-dark-surface'
                                        }`}
                                >
                                    <div className="flex flex-col items-center w-20 text-sm font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                                        <span>{timeFormatter.format(entry.start)}</span>
                                        <span className="text-xs font-medium text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                            {timeFormatter.format(entry.end)}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-base font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                                                {resolveEntryTitle(entry)}
                                            </h3>
                                            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full bg-app-light-surface-secondary text-app-light-text-secondary dark:bg-app-dark-surface-secondary dark:text-app-dark-text-secondary">
                                                {typeLabel(entry.kind)}
                                            </span>
                                            {entry.status && (
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusStyles[entry.status]}`}>
                                                    {getStatusLabel(entry.status, t)}
                                                </span>
                                            )}
                                        </div>
                                        {entry.kind === 'activity' && entry.location && (
                                            <p className="mt-2 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                {t('student.activities.locationLabel', {
                                                    location: entry.location,
                                                    defaultValue: 'Location: {{location}}'
                                                })}
                                            </p>
                                        )}
                                        {isCurrent && (
                                            <span className="inline-flex items-center px-2 py-1 mt-3 text-xs font-semibold tracking-wide uppercase rounded-full bg-primary-500 text-white">
                                                {t('student.home.timelineNow', { defaultValue: 'Now' })}
                                            </span>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-4 border rounded-2xl border-app-light-border bg-app-light-surface dark:border-app-dark-border dark:bg-app-dark-surface">
                        <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                            {t('student.home.noAgenda', { defaultValue: 'You have no classes or activities scheduled today.' })}
                        </p>
                    </div>
                )}
            </section>

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                        {t('student.activities.recommendedHeading', { defaultValue: 'Recommended for you' })}
                    </h2>
                    <span className="text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">
                        {t('student.activities.recommendedHint', { defaultValue: 'Personalized by your eligibility rules' })}
                    </span>
                </div>
                {loading && !eligibleActivities.length ? (
                    <div className="p-4 border rounded-2xl border-app-light-border bg-app-light-surface dark:border-app-dark-border dark:bg-app-dark-surface">
                        <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                            {t('common.loading', { defaultValue: 'Loading' })}
                        </p>
                    </div>
                ) : recommendedActivities.length ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                    {t('student.applications.heading', { defaultValue: 'Upcoming commitments' })}
                </h2>
                {upcomingParticipations.length ? (
                    <div className="space-y-3">
                        {upcomingParticipations.map(participation => {
                            const activity = participation.activity_detail!;
                            const start = new Date(activity.start_datetime);
                            const end = new Date(activity.end_datetime);
                            return (
                                <article key={participation.id} className="flex flex-col gap-2 p-4 border rounded-2xl border-app-light-border bg-app-light-surface dark:border-app-dark-border dark:bg-app-dark-surface">
                                    <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        <span>{shortDateFormatter.format(start)}</span>
                                        <span>{`${timeFormatter.format(start)} – ${timeFormatter.format(end)}`}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-base font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                                            {resolveLocalizedTitle(activity.title, {
                                                translations: activity.title_i18n ?? null
                                            })}
                                        </h3>
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusStyles[participation.status]}`}>
                                            {getStatusLabel(participation.status, t)}
                                        </span>
                                    </div>
                                    {activity.location && (
                                        <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                            {t('student.activities.locationLabel', {
                                                location: activity.location,
                                                defaultValue: 'Location: {{location}}'
                                            })}
                                        </p>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-4 border rounded-2xl border-app-light-border bg-app-light-surface dark:border-app-dark-border dark:bg-app-dark-surface">
                        <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                            {t('student.applications.empty', { defaultValue: 'You have no upcoming activity commitments.' })}
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
};

export default StudentHomePage;
