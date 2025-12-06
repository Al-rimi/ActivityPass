import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStudentSchedule } from '../hooks/useStudentSchedule';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useAuthenticatedApi } from '../utils/api';
import { StudentTimelineEntry, StudentUnscheduledCourse } from '../types/student';
import {
    buildTimelineEntries,
    addDays,
    addWeeks,
    isSameDay,
    startOfWeek,
    TIMETABLE_PERIODS,
    getTimetableSpanForEntry,
    CAMPUS_TIMEZONE,
    getAcademicWeekNumber
} from '../utils/studentSchedule';
import { statusStyles, getStatusLabel } from '../utils/studentStatus';
import EligibleActivityCard from '../components/student/EligibleActivityCard';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';

const PERIOD_CELL_BASE_HEIGHT = 72; // px height for a single timetable period block
const TIMETABLE_COLUMN_MIN_WIDTH_PX = 200;

const StudentCalendarPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const locale = i18n.language || undefined;
    const { authenticatedFetch } = useAuthenticatedApi();
    const { courseSchedules, participations, eligibleActivities, loading, error, refresh } = useStudentSchedule();

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
    const { scheduled: timelineEntries, unscheduledCourses } = useMemo(
        () => buildTimelineEntries(courseSchedules, participations),
        [courseSchedules, participations]
    );
    const baseWeekStart = useMemo(() => startOfWeek(new Date()), []);
    const currentWeekStart = useMemo(() => addWeeks(baseWeekStart, weekOffset), [baseWeekStart, weekOffset]);
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(currentWeekStart, index)), [currentWeekStart]);

    type TimetableCellEntry = {
        entry: StudentTimelineEntry;
        startIndex: number;
        endIndex: number;
        approximate: boolean;
    };

    type TimetableGroupCell = {
        type: 'group';
        entries: TimetableCellEntry[];
        anchor: number;
        spanEnd: number;
    };

    type TimetableBlockedCell = {
        type: 'blocked';
        anchor: number;
    };

    type TimetableCell = TimetableGroupCell | TimetableBlockedCell | null;

    type TimetableCellLayout = TimetableCellEntry & {
        column: number;
        columns: number;
        topPercent: number;
        heightPercent: number;
        widthPercent: number;
    };

    const layoutCellEntries = (cell: TimetableGroupCell): TimetableCellLayout[] => {
        const totalSpan = Math.max(cell.spanEnd - cell.anchor + 1, 1);
        const sortedEntries = [...cell.entries].sort((a, b) => {
            if (a.startIndex !== b.startIndex) {
                return a.startIndex - b.startIndex;
            }
            if (a.endIndex !== b.endIndex) {
                return a.endIndex - b.endIndex;
            }
            const aTime = a.entry.start.getTime();
            const bTime = b.entry.start.getTime();
            return aTime - bTime;
        });

        const tracks: TimetableCellEntry[][] = [];
        const placements = new Map<TimetableCellEntry, number>();

        sortedEntries.forEach(item => {
            let placed = false;
            for (let columnIndex = 0; columnIndex < tracks.length; columnIndex += 1) {
                const columnEntries = tracks[columnIndex];
                const lastEntry = columnEntries[columnEntries.length - 1];
                if (item.startIndex > lastEntry.endIndex) {
                    columnEntries.push(item);
                    placements.set(item, columnIndex);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                tracks.push([item]);
                placements.set(item, tracks.length - 1);
            }
        });

        const columnCount = Math.max(tracks.length, 1);
        const baseWidth = 100 / columnCount;

        return sortedEntries.map(item => {
            const column = placements.get(item) ?? 0;
            const offsetUnits = item.startIndex - cell.anchor;
            const spanUnits = item.endIndex - item.startIndex + 1;
            return {
                ...item,
                column,
                columns: columnCount,
                topPercent: (offsetUnits / totalSpan) * 100,
                heightPercent: (spanUnits / totalSpan) * 100,
                widthPercent: baseWidth
            };
        });
    };

    const { matrix: timetableMatrix, hasEntries: hasTimetableEntries } = useMemo(() => {
        const matrix: TimetableCell[][] = TIMETABLE_PERIODS.map(() => weekDays.map(() => null as TimetableCell));

        timelineEntries.forEach(entry => {
            const dayIndex = weekDays.findIndex(day => isSameDay(entry.start, day));
            if (dayIndex === -1) {
                return;
            }

            const fallbackSpan = getTimetableSpanForEntry(entry) ?? { startIndex: 0, endIndex: 0, approximate: true };
            let { startIndex, endIndex, approximate } = fallbackSpan;

            if (!Number.isFinite(startIndex)) startIndex = 0;
            if (!Number.isFinite(endIndex)) endIndex = 0;

            startIndex = Math.max(0, Math.min(startIndex, TIMETABLE_PERIODS.length - 1));
            endIndex = Math.max(0, Math.min(endIndex, TIMETABLE_PERIODS.length - 1));

            if (endIndex < startIndex) {
                [startIndex, endIndex] = [endIndex, startIndex];
            }

            const cellEntry: TimetableCellEntry = {
                entry,
                startIndex,
                endIndex,
                approximate
            };

            let anchorIndex = startIndex;
            let cell = matrix[anchorIndex][dayIndex];

            if (cell && cell.type === 'blocked') {
                anchorIndex = cell.anchor;
                cell = matrix[anchorIndex][dayIndex];
            }

            if (!cell || cell.type !== 'group') {
                cell = {
                    type: 'group',
                    entries: [],
                    anchor: anchorIndex,
                    spanEnd: anchorIndex
                };
            }

            cell.entries.push(cellEntry);
            cell.spanEnd = Math.max(cell.spanEnd, endIndex);
            matrix[anchorIndex][dayIndex] = cell;

            for (let periodIndex = anchorIndex + 1; periodIndex <= cell.spanEnd; periodIndex += 1) {
                matrix[periodIndex][dayIndex] = { type: 'blocked', anchor: anchorIndex };
            }
        });

        const hasEntries = matrix.some(row => row.some(cell => cell && cell.type === 'group' && cell.entries.length > 0));

        return {
            matrix,
            hasEntries
        };
    }, [timelineEntries, weekDays]);

    const todayIndex = useMemo(() => weekDays.findIndex(day => isSameDay(day, now)), [weekDays, now]);

    const mobileDayEntries = useMemo(
        () => weekDays.map((_, dayIndex) => {
            const seen = new Set<string>();
            const entries: TimetableCellEntry[] = [];
            TIMETABLE_PERIODS.forEach((_, periodIndex) => {
                const cell = timetableMatrix[periodIndex][dayIndex];
                if (!cell || cell.type === 'blocked') {
                    return;
                }
                if (cell.anchor !== periodIndex) {
                    return;
                }
                cell.entries.forEach(item => {
                    const entryKey = item.entry.key ?? `${item.entry.title}-${item.entry.start.toISOString()}`;
                    if (seen.has(entryKey)) {
                        return;
                    }
                    seen.add(entryKey);
                    entries.push(item);
                });
            });
            entries.sort((a, b) => a.entry.start.getTime() - b.entry.start.getTime());
            return entries;
        }),
        [timetableMatrix, weekDays]
    );

    const appliedActivityIds = useMemo(() => new Set(participations.map(part => part.activity)), [participations]);
    const recommendedActivities = useMemo(() => (
        eligibleActivities.filter(activity => !appliedActivityIds.has(activity.id))
    ), [eligibleActivities, appliedActivityIds]);

    const weekRangeLabel = useMemo(() => {
        const weekEnd = addDays(currentWeekStart, 6);
        const formatterOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: CAMPUS_TIMEZONE };
        const startFormatter = new Intl.DateTimeFormat(locale, formatterOptions);
        const endFormatter = new Intl.DateTimeFormat(locale, formatterOptions);
        return `${startFormatter.format(currentWeekStart)} – ${endFormatter.format(weekEnd)}`;
    }, [currentWeekStart, locale]);

    const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: CAMPUS_TIMEZONE }), [locale]);
    const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric', timeZone: CAMPUS_TIMEZONE }), [locale]);
    const timeFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: CAMPUS_TIMEZONE }), [locale]);

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

    const resolveUnscheduledTitle = useCallback(
        (course: StudentUnscheduledCourse) =>
            resolveLocalizedTitle(course.title, {
                titleKey: course.titleKey,
                translations: course.titleTranslations ?? null
            }),
        [resolveLocalizedTitle]
    );

    const unscheduledReasonLabels = useMemo(
        () => ({
            missingTermStart: t('student.calendar.flexibleReason.missingTermStart', { defaultValue: 'Term start date missing' }),
            unspecifiedWeekday: t('student.calendar.flexibleReason.unspecifiedWeekday', { defaultValue: 'Weekday not assigned' }),
            invalidWeekday: t('student.calendar.flexibleReason.invalidWeekday', { defaultValue: 'Weekday value not supported' }),
            missingWeeks: t('student.calendar.flexibleReason.missingWeeks', { defaultValue: 'Weeks not provided' }),
            missingPeriods: t('student.calendar.flexibleReason.missingPeriods', { defaultValue: 'Periods not provided' }),
            invalidPeriod: t('student.calendar.flexibleReason.invalidPeriod', { defaultValue: 'Periods do not align with timetable' })
        }),
        [t]
    );

    const getUnscheduledReasonLabel = useCallback(
        (reason: StudentUnscheduledCourse['reason']) =>
            unscheduledReasonLabels[reason] ?? unscheduledReasonLabels.unspecifiedWeekday,
        [unscheduledReasonLabels]
    );

    const formatFlexibleWeekday = useCallback(
        (weekday: number | null) => {
            if (weekday === -1) {
                return t('student.calendar.flexibleWeekdayLabel', {
                    defaultValue: 'Weekday: {{weekday}}',
                    weekday: t('admin.weekday.-1')
                });
            }
            if (!weekday || weekday < 1 || weekday > 7) {
                return t('student.calendar.flexibleWeekdayUnknown', { defaultValue: 'Weekday: Not set yet' });
            }
            return t('student.calendar.flexibleWeekdayLabel', {
                defaultValue: 'Weekday: {{weekday}}',
                weekday: t(`admin.weekday.${weekday}`)
            });
        },
        [t]
    );

    const summarizeWeeks = useCallback((weeks?: number[]) => {
        if (!weeks || !weeks.length) {
            return '';
        }
        const sorted = [...new Set(weeks)].sort((a, b) => a - b);
        const segments: string[] = [];
        let rangeStart = sorted[0];
        let previous = sorted[0];
        for (let index = 1; index <= sorted.length; index += 1) {
            const current = sorted[index];
            if (current === previous + 1) {
                previous = current;
                continue;
            }
            segments.push(rangeStart === previous ? `${rangeStart}` : `${rangeStart}–${previous}`);
            rangeStart = current;
            previous = current;
        }
        return segments.join(', ');
    }, []);

    const getPeriodDisplay = useCallback(
        (entry: StudentTimelineEntry, startIndex: number, endIndex: number) => {
            const fallbackStart = TIMETABLE_PERIODS[startIndex]?.index ?? startIndex + 1;
            const fallbackEnd = TIMETABLE_PERIODS[endIndex]?.index ?? endIndex + 1;
            const start = entry.periodStart ?? fallbackStart;
            const end = entry.periodEnd ?? fallbackEnd;
            const rangeLabel = start === end
                ? t('student.calendar.sectionSingle', {
                    defaultValue: 'Section {{section}}',
                    section: start
                })
                : t('student.calendar.sectionRangeLabel', {
                    defaultValue: 'Sections {{start}}–{{end}}',
                    start,
                    end
                });
            const periodCountSource = entry.periodCount ?? Math.max(end - start + 1, 1);
            const countLabel = periodCountSource > 1
                ? t('student.calendar.sectionCount', {
                    defaultValue: '{{count}} periods',
                    count: periodCountSource
                })
                : null;
            return {
                rangeLabel,
                countLabel
            };
        },
        [t]
    );

    const estimateEntryHeight = useCallback(
        (layout: TimetableCellLayout) => {
            const { entry, startIndex, endIndex, approximate } = layout;
            const { rangeLabel, countLabel } = getPeriodDisplay(entry, startIndex, endIndex);
            const weeksSummary = summarizeWeeks(entry.weeks);

            const BASE_HEIGHT = 96; // base space for title, times, and primary chips
            let chipCount = 1; // type chip always present
            if (entry.courseCode) chipCount += 1;
            if (approximate) chipCount += 1;
            if (entry.hasConflict) chipCount += 1;
            const chipRows = Math.ceil(chipCount / 2); // estimate two chips per row
            const chipHeight = chipRows * 24;

            let extraLines = 0;
            if (rangeLabel) extraLines += 1;
            if (countLabel) extraLines += 1;
            if (weeksSummary) extraLines += 1;
            if (entry.location) extraLines += 1;
            if (entry.status) extraLines += 1;
            const extraHeight = extraLines * 20;

            return BASE_HEIGHT + chipHeight + extraHeight;
        },
        [getPeriodDisplay, summarizeWeeks]
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
                        <>
                            <div className="space-y-3 md:hidden">
                                {weekDays.map((day, dayIndex) => {
                                    const isToday = dayIndex === todayIndex;
                                    const dayEntries = mobileDayEntries[dayIndex];
                                    return (
                                        <section
                                            key={day.toISOString()}
                                            className={`rounded-2xl border p-4 shadow-sm ${isToday
                                                ? 'border-primary-400 bg-primary-50/70 dark:border-primary-500 dark:bg-primary-500/10'
                                                : 'border-app-light-border bg-app-light-surface dark:border-app-dark-border dark:bg-app-dark-surface'
                                                }`}
                                        >
                                            <header className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                        {weekdayFormatter.format(day)}
                                                    </p>
                                                    <p className="text-base font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                                                        {dateFormatter.format(day)}
                                                    </p>
                                                </div>
                                                {isToday && (
                                                    <span className="inline-flex items-center rounded-full bg-primary-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                                                        {t('student.calendar.todayBadge', { defaultValue: 'Today' })}
                                                    </span>
                                                )}
                                            </header>
                                            <div className="mt-4 space-y-3">
                                                {dayEntries.length ? dayEntries.map(item => {
                                                    const { entry, approximate, startIndex, endIndex } = item;
                                                    const entryKey = entry.key ?? `${entry.title}-${entry.start.toISOString()}`;
                                                    const { rangeLabel, countLabel } = getPeriodDisplay(entry, startIndex, endIndex);
                                                    const weeksSummary = summarizeWeeks(entry.weeks);
                                                    const baseCellClass = entry.kind === 'class'
                                                        ? 'schedule-cell-class'
                                                        : 'schedule-cell-activity';
                                                    const conflictNames = entry.conflicts?.map(conflict => conflict.courseCode ?? conflict.title).filter(Boolean) ?? [];
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
                                                    const cardClassName = `${baseCellClass}${entry.hasConflict ? ' schedule-cell-conflict' : ''}`;

                                                    return (
                                                        <article
                                                            key={entryKey}
                                                            className={`rounded-xl border px-4 py-3 ${cardClassName}`}
                                                        >
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <h4 className="text-sm font-semibold leading-tight text-app-light-text-primary dark:text-app-dark-text-primary">
                                                                    {resolveEntryTitle(entry)}
                                                                </h4>
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    {entry.courseCode && (
                                                                        <span className="rounded-full bg-white/50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-600 dark:bg-slate-900/40 dark:text-primary-300">
                                                                            {entry.courseCode}
                                                                        </span>
                                                                    )}
                                                                    <span className="schedule-info-chip rounded-full bg-white/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide dark:bg-slate-900/40">
                                                                        {typeLabel(entry.kind)}
                                                                    </span>
                                                                    {approximate && (
                                                                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                                                                            {t('student.calendar.approximatePlacement', { defaultValue: 'Time adjusted to nearest period' })}
                                                                        </span>
                                                                    )}
                                                                    {entry.hasConflict && (
                                                                        <span
                                                                            className="schedule-conflict-chip inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                                                                            title={conflictTooltip}
                                                                        >
                                                                            {conflictLabel}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                                <span className="inline-flex items-center gap-1">
                                                                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                        <circle cx="10" cy="10" r="8" opacity="0.35" />
                                                                        <path d="M10 6v4l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                    </svg>
                                                                    <span>{`${timeFormatter.format(entry.start)} – ${timeFormatter.format(entry.end)}`}</span>
                                                                </span>
                                                                {rangeLabel && (
                                                                    <span className="schedule-info-chip inline-flex items-center gap-1 rounded-full bg-white/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide dark:bg-slate-900/40">
                                                                        {rangeLabel}
                                                                    </span>
                                                                )}
                                                                {countLabel && (
                                                                    <span className="schedule-info-chip inline-flex items-center gap-1 rounded-full bg-white/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide dark:bg-slate-900/40">
                                                                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                            <path d="M6 7.5h8" strokeLinecap="round" />
                                                                            <path d="M6 10h8" strokeLinecap="round" />
                                                                            <path d="M6 12.5h5" strokeLinecap="round" />
                                                                        </svg>
                                                                        <span>{countLabel}</span>
                                                                    </span>
                                                                )}
                                                                {weeksSummary && (
                                                                    <span className="schedule-info-chip inline-flex items-center gap-1 rounded-full bg-white/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide dark:bg-slate-900/40">
                                                                        {t('student.calendar.weeksLabel', {
                                                                            defaultValue: 'Weeks: {{weeks}}',
                                                                            weeks: weeksSummary
                                                                        })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {entry.location && (
                                                                <div className="mt-2 flex items-center gap-1 text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                        <path d="M10 2.5c2.9 0 5.25 2.35 5.25 5.25 0 3.85-4.7 8.95-5.05 9.33a.3.3 0 0 1-.4 0C9.45 16.7 4.75 11.6 4.75 7.75 4.75 4.85 7.1 2.5 10 2.5Z" />
                                                                        <circle cx="10" cy="8" r="1.8" />
                                                                    </svg>
                                                                    <span className="truncate" title={entry.location}>{entry.location}</span>
                                                                </div>
                                                            )}
                                                            {entry.status && (
                                                                <div className="mt-3">
                                                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusStyles[entry.status]}`}>
                                                                        {getStatusLabel(entry.status, t)}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </article>
                                                    );
                                                }) : (
                                                    <p className="text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                        {t('student.calendar.noSessionsDay', { defaultValue: 'No sessions scheduled.' })}
                                                    </p>
                                                )}
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                            <div className="-mx-4 hidden overflow-x-auto pb-4 sm:mx-0 md:block">
                                <div className="inline-block min-w-full align-middle">
                                    <div className="rounded-3xl border border-app-light-border/60 bg-app-light-surface-secondary/70 p-4 shadow-lg dark:border-app-dark-border/60 dark:bg-app-dark-surface-secondary/70">
                                        <table className="min-w-full border-separate border-spacing-x-3 border-spacing-y-3 text-sm">
                                            <thead>
                                                <tr>
                                                    <th className="sticky left-0 top-0 z-40 rounded-2xl px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide shadow-sm backdrop-blur schedule-column-header">
                                                        {t('student.calendar.sectionHeader', { defaultValue: 'Section' })}
                                                    </th>
                                                    {weekDays.map((day, dayIndex) => {
                                                        const isToday = dayIndex === todayIndex;
                                                        return (
                                                            <th
                                                                key={day.toISOString()}
                                                                className={`rounded-2xl px-4 py-3 text-left align-top text-xs font-semibold uppercase tracking-wide shadow-sm backdrop-blur transition-colors duration-200 ${isToday
                                                                    ? 'schedule-today-header'
                                                                    : 'schedule-column-header'
                                                                    }`}
                                                            >
                                                                <div className="text-sm font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                                                                    {weekdayFormatter.format(day)}
                                                                </div>
                                                                <div className="text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                                    {dateFormatter.format(day)}
                                                                </div>
                                                                {isToday && (
                                                                    <span className="schedule-today-badge mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold">
                                                                        {t('student.calendar.todayBadge', { defaultValue: 'Today' })}
                                                                    </span>
                                                                )}
                                                            </th>
                                                        );
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {TIMETABLE_PERIODS.map((period, periodIndex) => (
                                                    <tr key={period.index}>
                                                        <th
                                                            scope="row"
                                                            className="sticky left-0 z-30 rounded-2xl px-4 py-3 text-left align-middle text-sm font-semibold shadow-sm backdrop-blur schedule-row-header"
                                                            style={{ height: `${PERIOD_CELL_BASE_HEIGHT}px` }}
                                                        >
                                                            <div>{t('student.calendar.sectionLabel', { defaultValue: 'Section {{section}}', section: period.index })}</div>
                                                            <div className="text-xs font-medium text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                                {period.label}
                                                            </div>
                                                        </th>
                                                        {weekDays.map((_, dayIndex) => {
                                                            const cell = timetableMatrix[periodIndex][dayIndex];
                                                            const isTodayColumn = dayIndex === todayIndex;

                                                            if (!cell) {
                                                                return (
                                                                    <td
                                                                        key={`${period.index}-${dayIndex}`}
                                                                        className={`${isTodayColumn ? 'schedule-today-column rounded-2xl' : 'bg-transparent'}`}
                                                                        style={{ minHeight: `${PERIOD_CELL_BASE_HEIGHT}px`, height: `${PERIOD_CELL_BASE_HEIGHT}px`, padding: 0 }}
                                                                    >
                                                                        <div className="h-full rounded-2xl schedule-placeholder" />
                                                                    </td>
                                                                );
                                                            }

                                                            if (cell.type === 'blocked') {
                                                                return null;
                                                            }

                                                            if (cell.anchor !== periodIndex) {
                                                                return null;
                                                            }

                                                            const cellSpan = cell.spanEnd - cell.anchor + 1;
                                                            const layouts = layoutCellEntries(cell);
                                                            const minHeight = Math.max(cellSpan, 1) * PERIOD_CELL_BASE_HEIGHT;
                                                            const contentAwareHeight = layouts.reduce((acc, layout) => {
                                                                const minCardHeight = estimateEntryHeight(layout);
                                                                const fraction = layout.heightPercent / 100;
                                                                if (fraction <= 0) {
                                                                    return Math.max(acc, minCardHeight);
                                                                }
                                                                const required = minCardHeight / fraction;
                                                                return Math.max(acc, required);
                                                            }, 0);
                                                            const effectiveHeight = Math.max(minHeight, contentAwareHeight);
                                                            const columnCountForCell = layouts.length ? layouts[0].columns : 1;
                                                            const minWidth = `${TIMETABLE_COLUMN_MIN_WIDTH_PX * Math.max(1, columnCountForCell)}px`;

                                                            return (
                                                                <td
                                                                    key={`${period.index}-${dayIndex}`}
                                                                    rowSpan={cellSpan}
                                                                    className={`${isTodayColumn ? 'schedule-today-column rounded-2xl' : 'bg-transparent'}`}
                                                                    style={{ minHeight: `${effectiveHeight}px`, height: `${effectiveHeight}px`, padding: 0, minWidth }}
                                                                >
                                                                    <div className="relative h-full w-full overflow-visible px-1 py-1">
                                                                        {layouts.map(layout => {
                                                                            const { entry, approximate, startIndex, endIndex, column, columns, widthPercent, topPercent, heightPercent } = layout;
                                                                            const entryKey = entry.key ?? `${entry.title}-${entry.start.toISOString()}`;
                                                                            const { rangeLabel, countLabel } = getPeriodDisplay(entry, startIndex, endIndex);
                                                                            const weeksSummary = summarizeWeeks(entry.weeks);
                                                                            const baseCellClass = entry.kind === 'class'
                                                                                ? 'schedule-cell-class shadow-sm backdrop-blur'
                                                                                : 'schedule-cell-activity shadow-sm backdrop-blur';
                                                                            const conflictNames = entry.conflicts?.map(conflict => conflict.courseCode ?? conflict.title).filter(Boolean) ?? [];
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
                                                                            const combinedCellClass = `${baseCellClass}${entry.hasConflict ? ' schedule-cell-conflict' : ''}`;

                                                                            const columnGap = columns > 1 ? 2 : 0;
                                                                            const verticalGap = 2;
                                                                            const heightGap = Math.min(verticalGap, Math.max(heightPercent * 0.35, 0));
                                                                            const topValue = topPercent === 0
                                                                                ? '0%'
                                                                                : `calc(${topPercent}% + ${(heightGap / 2).toFixed(2)}%)`;
                                                                            const heightValue = heightPercent >= 100
                                                                                ? '100%'
                                                                                : `calc(${heightPercent}% - ${heightGap.toFixed(2)}%)`;
                                                                            const leftValue = columns === 1
                                                                                ? '0%'
                                                                                : `calc(${column * widthPercent}% + ${(columnGap / 2).toFixed(2)}%)`;
                                                                            const widthValue = columns === 1
                                                                                ? '100%'
                                                                                : `calc(${widthPercent}% - ${columnGap.toFixed(2)}%)`;

                                                                            const style: React.CSSProperties = {
                                                                                top: topValue,
                                                                                height: heightValue,
                                                                                left: leftValue,
                                                                                width: widthValue
                                                                            };

                                                                            return (
                                                                                <div
                                                                                    key={entryKey}
                                                                                    className={`absolute z-10 flex flex-col gap-2 rounded-2xl px-4 py-3 ${combinedCellClass}`}
                                                                                    style={style}
                                                                                >
                                                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                                                        <div className="text-sm font-semibold leading-tight">
                                                                                            {resolveEntryTitle(entry)}
                                                                                        </div>
                                                                                        <div className="flex flex-wrap items-center gap-1">
                                                                                            {entry.courseCode && (
                                                                                                <span className="rounded-full bg-white/50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-600 dark:bg-slate-900/40 dark:text-primary-300">
                                                                                                    {entry.courseCode}
                                                                                                </span>
                                                                                            )}
                                                                                            <span className="schedule-info-chip rounded-full bg-white/30 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide dark:bg-slate-900/30">
                                                                                                {typeLabel(entry.kind)}
                                                                                            </span>
                                                                                            {approximate && (
                                                                                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                                                                                                    {t('student.calendar.approximatePlacement', { defaultValue: 'Time adjusted to nearest period' })}
                                                                                                </span>
                                                                                            )}
                                                                                            {entry.hasConflict && (
                                                                                                <span
                                                                                                    className="schedule-conflict-chip inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                                                                                                    title={conflictTooltip}
                                                                                                >
                                                                                                    {conflictLabel}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1 text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                                                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                                            <circle cx="10" cy="10" r="8" opacity="0.35" />
                                                                                            <path d="M10 6v4l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                                        </svg>
                                                                                        <span>{`${timeFormatter.format(entry.start)} – ${timeFormatter.format(entry.end)}`}</span>
                                                                                    </div>
                                                                                    {entry.location && (
                                                                                        <div className="flex items-center gap-1 text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                                                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                                                <path d="M10 2.5c2.9 0 5.25 2.35 5.25 5.25 0 3.85-4.7 8.95-5.05 9.33a.3.3 0 0 1-.4 0C9.45 16.7 4.75 11.6 4.75 7.75 4.75 4.85 7.1 2.5 10 2.5Z" />
                                                                                                <circle cx="10" cy="8" r="1.8" />
                                                                                            </svg>
                                                                                            <span className="truncate" title={entry.location}>{entry.location}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                                                                                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                                                            {rangeLabel && <span className="schedule-info-chip">{rangeLabel}</span>}
                                                                                            {countLabel && (
                                                                                                <span className="schedule-info-chip inline-flex items-center gap-1">
                                                                                                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                                                                        <path d="M6 7.5h8" strokeLinecap="round" />
                                                                                                        <path d="M6 10h8" strokeLinecap="round" />
                                                                                                        <path d="M6 12.5h5" strokeLinecap="round" />
                                                                                                    </svg>
                                                                                                    <span>{countLabel}</span>
                                                                                                </span>
                                                                                            )}
                                                                                            {weeksSummary && (
                                                                                                <span className="schedule-info-chip">
                                                                                                    {t('student.calendar.weeksLabel', {
                                                                                                        defaultValue: 'Weeks: {{weeks}}',
                                                                                                        weeks: weeksSummary
                                                                                                    })}
                                                                                                </span>
                                                                                            )}
                                                                                            {!rangeLabel && !countLabel && !weeksSummary && (
                                                                                                <span className="schedule-info-chip">{typeLabel(entry.kind)}</span>
                                                                                            )}
                                                                                        </div>
                                                                                        {entry.status && (
                                                                                            <span className={`inline-flex items-center px-2 py-1 text-[11px] font-semibold rounded-full ${statusStyles[entry.status]}`}>
                                                                                                {getStatusLabel(entry.status, t)}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    {!loading && !hasTimetableEntries && (
                        <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                            {t('student.calendar.noTimetable', { defaultValue: 'No classes scheduled this week.' })}
                        </p>
                    )}
                </section>

                {unscheduledCourses.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                            {t('student.calendar.flexibleHeading', { defaultValue: 'Courses without fixed schedule' })}
                        </h2>
                        <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                            {t('student.calendar.flexibleDescription', {
                                defaultValue: 'These courses do not have a confirmed weekday or period yet. We will keep them here until the timetable is finalized.'
                            })}
                        </p>
                        <div className="space-y-3">
                            {unscheduledCourses.map(course => {
                                const reasonLabel = getUnscheduledReasonLabel(course.reason);
                                const weekdayLabel = formatFlexibleWeekday(course.weekday);
                                const weeksSummary = summarizeWeeks(course.weeks);
                                const displayWeekNumber = course.termStartDate
                                    ? getAcademicWeekNumber(course.termStartDate, currentWeekStart)
                                    : null;
                                const occursThisDisplayedWeek = displayWeekNumber !== null
                                    ? course.weeks.includes(displayWeekNumber)
                                    : null;
                                const weekStatusLabel = occursThisDisplayedWeek === null
                                    ? null
                                    : occursThisDisplayedWeek
                                        ? t('student.calendar.flexibleOccursThisWeek', { defaultValue: 'Scheduled this week' })
                                        : t('student.calendar.flexibleNotThisWeek', { defaultValue: 'Not scheduled this week' });
                                return (
                                    <article
                                        key={course.key}
                                        className="rounded-2xl border border-app-light-border bg-app-light-surface p-4 dark:border-app-dark-border dark:bg-app-dark-surface"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <h4 className="text-base font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                                                {resolveUnscheduledTitle(course)}
                                            </h4>
                                            {course.courseCode && (
                                                <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-600 dark:bg-primary-500/15 dark:text-primary-200">
                                                    {course.courseCode}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                                                {reasonLabel}
                                            </span>
                                            <span className="inline-flex items-center rounded-full bg-app-light-surface-secondary px-2 py-0.5 dark:bg-app-dark-surface-secondary">
                                                {weekdayLabel}
                                            </span>
                                            {course.periods.length > 0 && (
                                                <span className="inline-flex items-center rounded-full bg-app-light-surface-secondary px-2 py-0.5 dark:bg-app-dark-surface-secondary">
                                                    {t('student.calendar.flexiblePeriodsLabel', {
                                                        defaultValue: 'Periods: {{periods}}',
                                                        periods: course.periods.join(', ')
                                                    })}
                                                </span>
                                            )}
                                            {weeksSummary && (
                                                <span className="inline-flex items-center rounded-full bg-app-light-surface-secondary px-2 py-0.5 dark:bg-app-dark-surface-secondary">
                                                    {t('student.calendar.weeksLabel', {
                                                        defaultValue: 'Weeks: {{weeks}}',
                                                        weeks: weeksSummary
                                                    })}
                                                </span>
                                            )}
                                            {weekStatusLabel && (
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-white ${occursThisDisplayedWeek ? 'bg-emerald-500/80 dark:bg-emerald-500/70' : 'bg-slate-500/80 dark:bg-slate-500/70'}`}>
                                                    {weekStatusLabel}
                                                </span>
                                            )}
                                        </div>
                                        {course.location && (
                                            <p className="mt-3 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                {t('student.calendar.flexibleLocationLabel', {
                                                    defaultValue: 'Location: {{location}}',
                                                    location: course.location
                                                })}
                                            </p>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                )}
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
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
            </main>
        </>
    );
};

export default StudentCalendarPage;
