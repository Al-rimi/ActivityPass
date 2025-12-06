import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStudentSchedule } from '../hooks/useStudentSchedule';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useAuthenticatedApi } from '../utils/api';
import EligibleActivityCard from '../components/student/EligibleActivityCard';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';
import { StudentTimelineEntry } from '../types/student';
import { CAMPUS_TIMEZONE, buildTimelineEntries, getAcademicWeekNumber, isSameDay, startOfDay } from '../utils/studentSchedule';
import { statusStyles, getStatusLabel } from '../utils/studentStatus';

const determineVacationKey = (month: number): 'Summer' | 'Winter' => (month >= 5 && month <= 7 ? 'Summer' : 'Winter');

const StudentHomePage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const locale = i18n.language || undefined;
    const { authenticatedFetch } = useAuthenticatedApi();
    const { courseSchedules, participations, eligibleActivities, loading, error, refresh } = useStudentSchedule();

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

    const { scheduled: timelineEntries } = useMemo(
        () => buildTimelineEntries(courseSchedules, participations),
        [courseSchedules, participations]
    );
    const todaysEntries = useMemo(() => timelineEntries.filter(entry => isSameDay(entry.start, today)), [timelineEntries, today]);
    const nextEntry = useMemo(() => {
        return timelineEntries.find(entry => entry.start.getTime() >= now.getTime());
    }, [timelineEntries, now]);

    const nextEntryConflictNames = (nextEntry?.conflicts ?? []).map(conflict => conflict.courseCode ?? conflict.title).filter(Boolean);
    const nextEntryConflictTooltip = nextEntryConflictNames.length
        ? t('student.calendar.conflictTooltip', {
            defaultValue: 'Conflicts with: {{list}}',
            list: nextEntryConflictNames.join(', ')
        })
        : undefined;
    const nextEntryConflictLabel = nextEntry?.conflictCount && nextEntry.conflictCount > 1
        ? t('student.calendar.conflictBadgeCount', {
            defaultValue: 'Conflict ({{count}})',
            count: nextEntry.conflictCount
        })
        : t('student.calendar.conflictBadge', { defaultValue: 'Conflict' });

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
        day: 'numeric',
        timeZone: CAMPUS_TIMEZONE
    }), [locale]);

    const headerDateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: CAMPUS_TIMEZONE
    }), [locale]);

    const todayValue = today.getTime();
    const todayMonth = today.getMonth();

    const termSummaries = useMemo(() => {
        const summaries = new Map<string, { maxWeek: number }>();
        courseSchedules.forEach(course => {
            const termStart = course.term_start_date;
            if (!termStart) {
                return;
            }
            let courseMaxWeek = 0;
            if (Array.isArray(course.weeks)) {
                course.weeks.forEach(weekValue => {
                    const weekNumber = typeof weekValue === 'number' ? weekValue : Number(weekValue);
                    if (Number.isFinite(weekNumber) && weekNumber > courseMaxWeek) {
                        courseMaxWeek = weekNumber;
                    }
                });
            }
            const existing = summaries.get(termStart);
            if (!existing) {
                summaries.set(termStart, { maxWeek: courseMaxWeek });
            } else {
                existing.maxWeek = Math.max(existing.maxWeek, courseMaxWeek);
            }
        });
        return summaries;
    }, [courseSchedules]);

    const termStatus = useMemo(() => {
        if (!termSummaries.size) {
            return null;
        }
        const terms: Array<{ termStart: string; maxWeek: number; currentWeek: number | null }> = [];
        termSummaries.forEach((summary, termStart) => {
            const currentWeek = getAcademicWeekNumber(termStart, today);
            terms.push({ termStart, maxWeek: summary.maxWeek, currentWeek });
        });
        if (!terms.length) {
            return null;
        }
        const active = terms
            .filter(term => term.currentWeek !== null && term.currentWeek >= 1 && term.maxWeek > 0 && term.currentWeek <= term.maxWeek)
            .sort((a, b) => a.termStart.localeCompare(b.termStart));
        if (active.length) {
            return active[active.length - 1];
        }
        const upcoming = terms
            .filter(term => term.currentWeek === null)
            .sort((a, b) => a.termStart.localeCompare(b.termStart));
        if (upcoming.length) {
            return upcoming[0];
        }
        const past = terms
            .filter(term => term.currentWeek !== null && term.maxWeek > 0 && term.currentWeek > term.maxWeek)
            .sort((a, b) => a.termStart.localeCompare(b.termStart));
        if (past.length) {
            return past[past.length - 1];
        }
        return terms.sort((a, b) => a.termStart.localeCompare(b.termStart))[0];
    }, [termSummaries, todayValue]);

    const scheduleStatusText = useMemo(() => {
        if (!termStatus || termStatus.maxWeek <= 0) {
            return t('student.home.subtitleNoTerm', { defaultValue: 'Schedule details coming soon.' });
        }
        const { currentWeek, maxWeek } = termStatus;
        if (currentWeek === null || currentWeek < 1 || currentWeek > maxWeek) {
            const seasonKey = determineVacationKey(todayMonth);
            return t(`student.home.subtitleVacation${seasonKey}`, {
                defaultValue: seasonKey === 'Summer' ? 'Summer vacation' : 'Winter vacation'
            });
        }
        return t('student.home.subtitleWeek', {
            week: currentWeek,
            defaultValue: 'Week {{week}}'
        });
    }, [termStatus, todayMonth, t]);

    const timeFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: CAMPUS_TIMEZONE
    }), [locale]);

    const shortDateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        timeZone: CAMPUS_TIMEZONE
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
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        setNotice(null);
        try {
            await refresh();
        } finally {
            setRefreshing(false);
        }
    }, [refresh]);

    const isUpdating = refreshing || loading;
    const triggerRefresh = useCallback(() => {
        if (isUpdating) return;
        void handleRefresh();
    }, [handleRefresh, isUpdating]);

    const { pullDistance, progress, isPulling } = usePullToRefresh({
        onRefresh: triggerRefresh,
        isRefreshing: isUpdating,
    });

    return (
        <>
            <PullToRefreshIndicator
                pullDistance={pullDistance}
                progress={progress}
                isPulling={isPulling}
                isRefreshing={isUpdating}
            />
            <main className="flex-1 px-4 pb-16 space-y-8 sm:px-6 lg:px-10 xl:px-12">
                <header className="pt-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-app-light-text-primary dark:text-app-dark-text-primary">
                            {headerDateFormatter.format(today)}
                        </h1>
                        <p className="mt-1 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                            {scheduleStatusText}
                        </p>
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

                <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <div className="space-y-4">
                        <div className="p-4 border rounded-2xl border-app-light-border bg-app-light-surface dark:border-app-dark-border dark:bg-app-dark-surface">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                <span>{t('student.home.nextUp', { defaultValue: 'Next up' })}</span>
                                {!loading && nextEntry && (
                                    <span className="text-app-light-text-tertiary dark:text-app-dark-text-tertiary">
                                        {`${timeFormatter.format(nextEntry.start)} – ${timeFormatter.format(nextEntry.end)}`}
                                    </span>
                                )}
                            </div>
                            {loading ? (
                                <p className="mt-3 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('common.loading', { defaultValue: 'Loading' })}
                                </p>
                            ) : nextEntry ? (
                                <div className="mt-4 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center rounded-full bg-primary-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-700 dark:bg-primary-500/20 dark:text-primary-200">
                                            {typeLabel(nextEntry.kind)}
                                        </span>
                                        {nextEntry.status && (
                                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${statusStyles[nextEntry.status]}`}>
                                                {getStatusLabel(nextEntry.status, t)}
                                            </span>
                                        )}
                                        {nextEntry.hasConflict && (
                                            <span
                                                className="schedule-conflict-chip inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                                                title={nextEntryConflictTooltip}
                                            >
                                                {nextEntryConflictLabel}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                                        {resolveEntryTitle(nextEntry)}
                                    </h3>
                                    {(nextEntry.courseCode || nextEntry.location || nextEntry.periodStart) && (
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                            {nextEntry.courseCode && (
                                                <span className="rounded-full bg-primary-500/10 px-2 py-0.5 font-semibold uppercase tracking-wide text-primary-700 dark:bg-primary-500/20 dark:text-primary-200">
                                                    {nextEntry.courseCode}
                                                </span>
                                            )}
                                            {nextEntry.periodStart && (
                                                <span className="inline-flex items-center gap-1">
                                                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <path d="M5.5 6.5h9" strokeLinecap="round" />
                                                        <path d="M5.5 10h7" strokeLinecap="round" />
                                                        <path d="M5.5 13.5h5" strokeLinecap="round" />
                                                    </svg>
                                                    <span>
                                                        {nextEntry.periodEnd && nextEntry.periodEnd !== nextEntry.periodStart
                                                            ? t('student.calendar.sectionRangeLabel', {
                                                                defaultValue: 'Sections {{start}}–{{end}}',
                                                                start: nextEntry.periodStart,
                                                                end: nextEntry.periodEnd
                                                            })
                                                            : t('student.calendar.sectionSingle', {
                                                                defaultValue: 'Section {{section}}',
                                                                section: nextEntry.periodStart
                                                            })}
                                                    </span>
                                                    {nextEntry.periodCount && nextEntry.periodCount > 1 && (
                                                        <span className="ml-1 text-[11px] font-semibold">
                                                            {t('student.calendar.sectionCount', {
                                                                defaultValue: '{{count}} periods',
                                                                count: nextEntry.periodCount
                                                            })}
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                            {nextEntry.location && (
                                                <span className="inline-flex items-center gap-1">
                                                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <path d="M10 2.5c2.9 0 5.25 2.35 5.25 5.25 0 3.85-4.7 8.95-5.05 9.33a.3.3 0 0 1-.4 0C9.45 16.7 4.75 11.6 4.75 7.75 4.75 4.85 7.1 2.5 10 2.5Z" />
                                                        <circle cx="10" cy="8" r="1.8" />
                                                    </svg>
                                                    <span>{nextEntry.location}</span>
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="mt-3 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('student.home.noNext', { defaultValue: 'No upcoming events.' })}
                                </p>
                            )}
                        </div>

                        <div className="p-4 border rounded-2xl border-app-light-border bg-app-light-surface dark:border-app-dark-border dark:bg-app-dark-surface">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                <span className="text-app-light-text-primary dark:text-app-dark-text-primary">
                                    {t('student.home.timelineHeading', { defaultValue: "Today's agenda" })}
                                </span>
                                <span className="text-app-light-text-tertiary dark:text-app-dark-text-tertiary">
                                    {dateFormatter.format(today)}
                                </span>
                            </div>
                            {loading ? (
                                <p className="mt-3 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('common.loading', { defaultValue: 'Loading' })}
                                </p>
                            ) : todaysEntries.length ? (
                                <div className="mt-4 space-y-3">
                                    {todaysEntries.map(entry => {
                                        const isCurrent = entry.start.getTime() <= now.getTime() && entry.end.getTime() >= now.getTime();
                                        const conflictNames = (entry.conflicts ?? []).map(conflict => conflict.courseCode ?? conflict.title).filter(Boolean);
                                        const conflictTooltip = conflictNames.length
                                            ? t('student.calendar.conflictTooltip', {
                                                defaultValue: 'Conflicts with: {{list}}',
                                                list: conflictNames.join(', ')
                                            })
                                            : undefined;
                                        const conflictLabel = entry.conflictCount && entry.conflictCount > 1
                                            ? t('student.calendar.conflictBadgeCount', {
                                                defaultValue: 'Conflict ({{count}})',
                                                count: entry.conflictCount
                                            })
                                            : t('student.calendar.conflictBadge', { defaultValue: 'Conflict' });
                                        const visualState = entry.hasConflict
                                            ? 'border-rose-400/70 bg-rose-500/10 dark:border-rose-500/60 dark:bg-rose-500/15 shadow-sm'
                                            : isCurrent
                                                ? 'border-primary-500/70 bg-primary-500/10 shadow-sm'
                                                : 'border-app-light-border bg-app-light-surface-secondary dark:border-app-dark-border dark:bg-app-dark-surface-secondary';
                                        return (
                                            <article
                                                key={entry.key}
                                                className={`flex gap-4 p-4 border rounded-2xl transition-all duration-200 ${visualState}`}
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
                                                        <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full bg-app-light-surface text-app-light-text-secondary dark:bg-app-dark-surface dark:text-app-dark-text-secondary">
                                                            {typeLabel(entry.kind)}
                                                        </span>
                                                        {entry.courseCode && (
                                                            <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide rounded-full bg-primary-500/15 text-primary-700 dark:bg-primary-500/20 dark:text-primary-200">
                                                                {entry.courseCode}
                                                            </span>
                                                        )}
                                                        {entry.periodStart && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide rounded-full bg-[var(--app-accent-light)] text-[var(--app-accent)] dark:bg-[rgba(7,193,96,0.25)]">
                                                                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                    <path d="M5.5 6.5h9" strokeLinecap="round" />
                                                                    <path d="M5.5 10h7" strokeLinecap="round" />
                                                                    <path d="M5.5 13.5h5" strokeLinecap="round" />
                                                                </svg>
                                                                <span>
                                                                    {entry.periodEnd && entry.periodEnd !== entry.periodStart
                                                                        ? t('student.calendar.sectionRangeLabel', {
                                                                            defaultValue: 'Sections {{start}}–{{end}}',
                                                                            start: entry.periodStart,
                                                                            end: entry.periodEnd
                                                                        })
                                                                        : t('student.calendar.sectionSingle', {
                                                                            defaultValue: 'Section {{section}}',
                                                                            section: entry.periodStart
                                                                        })}
                                                                </span>
                                                            </span>
                                                        )}
                                                        {entry.hasConflict && (
                                                            <span
                                                                className="schedule-conflict-chip inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide rounded-full"
                                                                title={conflictTooltip}
                                                            >
                                                                {conflictLabel}
                                                            </span>
                                                        )}
                                                        {entry.status && (
                                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusStyles[entry.status]}`}>
                                                                {getStatusLabel(entry.status, t)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {entry.location && (
                                                        <p className="mt-2 flex items-center gap-1 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                <path d="M10 2.5c2.9 0 5.25 2.35 5.25 5.25 0 3.85-4.7 8.95-5.05 9.33a.3.3 0 0 1-.4 0C9.45 16.7 4.75 11.6 4.75 7.75 4.75 4.85 7.1 2.5 10 2.5Z" />
                                                                <circle cx="10" cy="8" r="1.8" />
                                                            </svg>
                                                            <span>{entry.location}</span>
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
                                <p className="mt-3 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('student.home.noAgenda', { defaultValue: 'You have no classes or activities scheduled today.' })}
                                </p>
                            )}
                        </div>
                    </div>

                    <aside className="space-y-4">
                        <div className="p-4 border rounded-2xl border-app-light-border bg-app-light-surface dark:border-app-dark-border dark:bg-app-dark-surface">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                <span className="text-app-light-text-primary dark:text-app-dark-text-primary">
                                    {t('student.activities.recommendedHeading', { defaultValue: 'Recommended for you' })}
                                </span>
                                <span className="text-[11px] font-medium text-app-light-text-tertiary dark:text-app-dark-text-tertiary">
                                    {t('student.activities.recommendedHint', { defaultValue: 'Personalized by your eligibility rules' })}
                                </span>
                            </div>
                            {loading && !eligibleActivities.length ? (
                                <p className="mt-3 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('common.loading', { defaultValue: 'Loading' })}
                                </p>
                            ) : recommendedActivities.length ? (
                                <div className="grid grid-cols-1 gap-3 mt-4">
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
                                <p className="mt-3 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('student.activities.empty', { defaultValue: 'No eligible activities right now. Check back soon!' })}
                                </p>
                            )}
                        </div>

                        <div className="p-4 border rounded-2xl border-app-light-border bg-app-light-surface dark:border-app-dark-border dark:bg-app-dark-surface">
                            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                <span className="text-app-light-text-primary dark:text-app-dark-text-primary">
                                    {t('student.applications.heading', { defaultValue: 'Upcoming commitments' })}
                                </span>
                            </div>
                            {upcomingParticipations.length ? (
                                <div className="mt-4 space-y-3">
                                    {upcomingParticipations.map(participation => {
                                        const activity = participation.activity_detail!;
                                        const start = new Date(activity.start_datetime);
                                        const end = new Date(activity.end_datetime);
                                        return (
                                            <article key={participation.id} className="flex flex-col gap-2 p-4 border rounded-2xl border-app-light-border/70 bg-app-light-surface-secondary dark:border-app-dark-border/70 dark:bg-app-dark-surface-secondary">
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
                                <p className="mt-3 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('student.applications.empty', { defaultValue: 'You have no upcoming activity commitments.' })}
                                </p>
                            )}
                        </div>
                    </aside>
                </div>
            </main>
        </>
    );
};

export default StudentHomePage;
