import {
    StudentCourseScheduleRecord,
    StudentParticipationRecord,
    StudentTimelineEntry,
    StudentTimelineBuildResult,
    StudentUnscheduledCourse,
    StudentUnscheduledCourseReason,
    StudentTimelineEntryConflict
} from '../types/student';
import { getCourseTitleKey } from './courseTitleTranslations';

export const CAMPUS_TIMEZONE = 'Asia/Shanghai';

const campusTimeFormatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: CAMPUS_TIMEZONE
});

const getCampusTimeParts = (date: Date): { hour: number; minute: number } => {
    const parts = campusTimeFormatter.formatToParts(date);
    const hourPart = parts.find(part => part.type === 'hour');
    const minutePart = parts.find(part => part.type === 'minute');
    const hour = hourPart ? parseInt(hourPart.value, 10) : 0;
    const minute = minutePart ? parseInt(minutePart.value, 10) : 0;
    return { hour, minute };
};

const padNumber = (value: number): string => value.toString().padStart(2, '0');
const minutes = (hour: number, minute: number): number => hour * 60 + minute;
const toHourMinutes = (totalMinutes: number): { hour: number; minute: number } => ({
    hour: Math.floor(totalMinutes / 60),
    minute: totalMinutes % 60
});

const parseDateParts = (value?: string | null): { year: number; month: number; day: number } | null => {
    if (!value) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) return null;
    return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3])
    };
};

const createCampusDate = (year: number, month: number, day: number, hour: number, minute: number): Date => {
    const isoYear = String(year).padStart(4, '0');
    const iso = `${isoYear}-${padNumber(month)}-${padNumber(day)}T${padNumber(hour)}:${padNumber(minute)}:00+08:00`;
    return new Date(iso);
};

export interface TimetablePeriod {
    index: number;
    startMinutes: number;
    endMinutes: number;
    label: string;
    startLabel: string;
    endLabel: string;
}

export interface TimetableSpan {
    startIndex: number;
    endIndex: number;
    approximate: boolean;
}

const createLabel = (startHour: number, startMinute: number, endHour: number, endMinute: number): string => {
    return `${padNumber(startHour)}:${padNumber(startMinute)} – ${padNumber(endHour)}:${padNumber(endMinute)}`;
};

export const TIMETABLE_PERIODS: TimetablePeriod[] = [
    { index: 1, startMinutes: minutes(8, 0), endMinutes: minutes(8, 40), label: createLabel(8, 0, 8, 40), startLabel: '08:00', endLabel: '08:40' },
    { index: 2, startMinutes: minutes(8, 45), endMinutes: minutes(9, 25), label: createLabel(8, 45, 9, 25), startLabel: '08:45', endLabel: '09:25' },
    { index: 3, startMinutes: minutes(9, 40), endMinutes: minutes(10, 20), label: createLabel(9, 40, 10, 20), startLabel: '09:40', endLabel: '10:20' },
    { index: 4, startMinutes: minutes(10, 35), endMinutes: minutes(11, 15), label: createLabel(10, 35, 11, 15), startLabel: '10:35', endLabel: '11:15' },
    { index: 5, startMinutes: minutes(11, 20), endMinutes: minutes(12, 0), label: createLabel(11, 20, 12, 0), startLabel: '11:20', endLabel: '12:00' },
    { index: 6, startMinutes: minutes(14, 0), endMinutes: minutes(14, 40), label: createLabel(14, 0, 14, 40), startLabel: '14:00', endLabel: '14:40' },
    { index: 7, startMinutes: minutes(14, 45), endMinutes: minutes(15, 25), label: createLabel(14, 45, 15, 25), startLabel: '14:45', endLabel: '15:25' },
    { index: 8, startMinutes: minutes(15, 40), endMinutes: minutes(16, 20), label: createLabel(15, 40, 16, 20), startLabel: '15:40', endLabel: '16:20' },
    { index: 9, startMinutes: minutes(16, 30), endMinutes: minutes(17, 10), label: createLabel(16, 30, 17, 10), startLabel: '16:30', endLabel: '17:10' },
    { index: 10, startMinutes: minutes(18, 0), endMinutes: minutes(18, 40), label: createLabel(18, 0, 18, 40), startLabel: '18:00', endLabel: '18:40' },
    { index: 11, startMinutes: minutes(18, 45), endMinutes: minutes(19, 25), label: createLabel(18, 45, 19, 25), startLabel: '18:45', endLabel: '19:25' },
    { index: 12, startMinutes: minutes(19, 40), endMinutes: minutes(20, 20), label: createLabel(19, 40, 20, 20), startLabel: '19:40', endLabel: '20:20' },
    { index: 13, startMinutes: minutes(20, 30), endMinutes: minutes(21, 10), label: createLabel(20, 30, 21, 10), startLabel: '20:30', endLabel: '21:10' }
];

const minutesSinceMidnight = (date: Date): number => {
    const { hour, minute } = getCampusTimeParts(date);
    return hour * 60 + minute;
};

const findPeriodIndexForStart = (date: Date): number => {
    const currentMinutes = minutesSinceMidnight(date);
    return TIMETABLE_PERIODS.findIndex(period => currentMinutes >= period.startMinutes && currentMinutes < period.endMinutes);
};

const findPeriodIndexForEnd = (date: Date): number => {
    const currentMinutes = minutesSinceMidnight(date);
    return TIMETABLE_PERIODS.findIndex(period => currentMinutes > period.startMinutes && currentMinutes <= period.endMinutes);
};

const distanceToPeriod = (period: TimetablePeriod, targetMinutes: number): number => {
    if (targetMinutes < period.startMinutes) {
        return period.startMinutes - targetMinutes;
    }
    if (targetMinutes > period.endMinutes) {
        return targetMinutes - period.endMinutes;
    }
    return 0;
};

const findClosestPeriodIndex = (targetMinutes: number): number => {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    TIMETABLE_PERIODS.forEach((period, index) => {
        const distance = distanceToPeriod(period, targetMinutes);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
        }
    });
    return bestIndex;
};

const buildSpan = (startIndex: number, endIndex: number, approximate: boolean): TimetableSpan | null => {
    if (startIndex === -1 && endIndex === -1) {
        return null;
    }
    if (startIndex === -1) {
        startIndex = endIndex;
    }
    if (endIndex === -1) {
        endIndex = startIndex;
    }
    if (startIndex > endIndex) {
        [startIndex, endIndex] = [endIndex, startIndex];
    }
    return { startIndex, endIndex, approximate };
};

export const getTimetableSpanForEntry = (entry: StudentTimelineEntry): TimetableSpan | null => {
    const strictStart = findPeriodIndexForStart(entry.start);
    const strictEnd = findPeriodIndexForEnd(entry.end);
    if (strictStart !== -1 && strictEnd !== -1 && strictEnd >= strictStart) {
        return buildSpan(strictStart, strictEnd, false);
    }

    const startMinutesValue = minutesSinceMidnight(entry.start);
    const endMinutesValue = minutesSinceMidnight(entry.end);
    const approxStart = findClosestPeriodIndex(startMinutesValue);
    const approxEnd = findClosestPeriodIndex(endMinutesValue);
    return buildSpan(approxStart, approxEnd, true);
};

const cloneDate = (date: Date): Date => new Date(date.getTime());

export const startOfDay = (date: Date): Date => {
    const copy = cloneDate(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
};

export const endOfDay = (date: Date): Date => {
    const copy = cloneDate(date);
    copy.setHours(23, 59, 59, 999);
    return copy;
};

export const isSameDay = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const startOfWeek = (date: Date): Date => {
    const copy = startOfDay(date);
    const day = copy.getDay();
    const isoDay = day === 0 ? 7 : day; // Treat Sunday as 7
    copy.setDate(copy.getDate() - (isoDay - 1));
    return copy;
};

export const getAcademicWeekNumber = (termStartDate: string | null | undefined, targetDate: Date): number | null => {
    const parts = parseDateParts(termStartDate ?? null);
    if (!parts) {
        return null;
    }
    const baseUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    const targetStart = startOfDay(targetDate).getTime();
    const diffMs = targetStart - baseUtc.getTime();
    if (diffMs < 0) {
        return null;
    }
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
};

export const addDays = (date: Date, days: number): Date => {
    const copy = cloneDate(date);
    copy.setDate(copy.getDate() + days);
    return copy;
};

export const addWeeks = (date: Date, weeks: number): Date => addDays(date, weeks * 7);

const splitIntoContiguousRuns = (values: number[]): number[][] => {
    if (!values.length) {
        return [];
    }
    const runs: number[][] = [];
    let currentRun: number[] = [values[0]];
    for (let index = 1; index < values.length; index += 1) {
        const value = values[index];
        const previous = values[index - 1];
        if (value === previous + 1) {
            currentRun.push(value);
            continue;
        }
        runs.push(currentRun);
        currentRun = [value];
    }
    runs.push(currentRun);
    return runs;
};

const dateKey = (value: Date): string => {
    const year = value.getUTCFullYear();
    const month = (value.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = value.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const rangesOverlap = (startA: Date, endA: Date, startB: Date, endB: Date): boolean =>
    startA.getTime() < endB.getTime() && startB.getTime() < endA.getTime();

const markTimelineConflicts = (entries: StudentTimelineEntry[]): void => {
    if (!entries.length) {
        return;
    }

    const entryByKey = new Map<string, StudentTimelineEntry>();
    entries.forEach(entry => {
        entryByKey.set(entry.key, entry);
        // Reset conflict flags before recomputing.
        entry.hasConflict = undefined;
        entry.conflictCount = undefined;
        entry.conflicts = undefined;
    });

    const buckets = new Map<string, StudentTimelineEntry[]>();
    entries.forEach(entry => {
        const key = dateKey(entry.start);
        const bucket = buckets.get(key);
        if (bucket) {
            bucket.push(entry);
        } else {
            buckets.set(key, [entry]);
        }
    });

    const conflictMap = new Map<string, Set<string>>();

    buckets.forEach(list => {
        if (list.length < 2) {
            return;
        }
        for (let i = 0; i < list.length; i += 1) {
            const first = list[i];
            for (let j = i + 1; j < list.length; j += 1) {
                const second = list[j];
                if (!rangesOverlap(first.start, first.end, second.start, second.end)) {
                    continue;
                }
                const firstSet = conflictMap.get(first.key) ?? new Set<string>();
                firstSet.add(second.key);
                conflictMap.set(first.key, firstSet);

                const secondSet = conflictMap.get(second.key) ?? new Set<string>();
                secondSet.add(first.key);
                conflictMap.set(second.key, secondSet);
            }
        }
    });

    conflictMap.forEach((conflictKeys, entryKey) => {
        const entry = entryByKey.get(entryKey);
        if (!entry) {
            return;
        }
        const conflictEntries: StudentTimelineEntryConflict[] = Array.from(conflictKeys)
            .map(conflictKey => entryByKey.get(conflictKey))
            .filter((conflict): conflict is StudentTimelineEntry => Boolean(conflict))
            .map(conflict => ({
                key: conflict.key,
                title: conflict.title,
                courseCode: conflict.courseCode ?? null
            }));

        if (!conflictEntries.length) {
            return;
        }

        entry.hasConflict = true;
        entry.conflictCount = conflictEntries.length;
        entry.conflicts = conflictEntries;
    });
};

export const buildTimelineEntries = (
    courses: StudentCourseScheduleRecord[],
    participations: StudentParticipationRecord[]
): StudentTimelineBuildResult => {
    const entries: StudentTimelineEntry[] = [];
    const unscheduledCourses: StudentUnscheduledCourse[] = [];

    for (const course of courses) {
        const weeksRaw = Array.isArray(course.weeks)
            ? course.weeks.filter(week => Number.isFinite(week) && week >= 1)
            : [];
        const periodsRaw = Array.isArray(course.periods)
            ? course.periods.filter(period => Number.isFinite(period) && period >= 1)
            : [];
        const sortedWeeks = [...new Set(weeksRaw)].sort((a, b) => a - b);
        const sortedPeriods = [...new Set(periodsRaw)].sort((a, b) => a - b);
        const translationKey = getCourseTitleKey(course.title);
        const normalizedWeekday = typeof course.weekday === 'number'
            ? course.weekday
            : course.weekday !== undefined && course.weekday !== null
                ? Number(course.weekday)
                : null;

        const pushUnscheduled = (reason: StudentUnscheduledCourseReason) => {
            unscheduledCourses.push({
                key: `unscheduled-${course.enrollment_id}-${reason}`,
                title: course.title,
                courseId: course.course_id,
                enrollmentId: course.enrollment_id,
                courseCode: course.code ?? null,
                location: course.location ?? null,
                weekday: typeof normalizedWeekday === 'number' && !Number.isNaN(normalizedWeekday)
                    ? normalizedWeekday
                    : null,
                weeks: sortedWeeks,
                periods: sortedPeriods,
                reason,
                titleKey: translationKey,
                titleTranslations: course.title_i18n ?? null,
                termStartDate: course.term_start_date ?? null
            });
        };

        const dateParts = parseDateParts(course.term_start_date);
        if (!dateParts) {
            pushUnscheduled('missingTermStart');
            continue;
        }

        const weekdayRaw = typeof normalizedWeekday === 'number' ? normalizedWeekday : Number.NaN;
        if (Number.isNaN(weekdayRaw) || weekdayRaw === -1) {
            pushUnscheduled('unspecifiedWeekday');
            continue;
        }
        if (weekdayRaw < 1 || weekdayRaw > 7) {
            pushUnscheduled('invalidWeekday');
            continue;
        }

        if (!sortedWeeks.length) {
            pushUnscheduled('missingWeeks');
            continue;
        }
        if (!sortedPeriods.length) {
            pushUnscheduled('missingPeriods');
            continue;
        }

        const hasUnknownPeriod = sortedPeriods.some(periodIndex => !TIMETABLE_PERIODS.some(period => period.index === periodIndex));
        if (hasUnknownPeriod) {
            pushUnscheduled('invalidPeriod');
            continue;
        }
        const periodRuns = splitIntoContiguousRuns(sortedPeriods);

        const baseDateUtc = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day));

        for (const week of sortedWeeks) {
            const occurrenceDateUtc = new Date(baseDateUtc.getTime());
            occurrenceDateUtc.setUTCDate(occurrenceDateUtc.getUTCDate() + (week - 1) * 7 + (weekdayRaw - 1));

            const occurrenceYear = occurrenceDateUtc.getUTCFullYear();
            const occurrenceMonth = occurrenceDateUtc.getUTCMonth() + 1;
            const occurrenceDay = occurrenceDateUtc.getUTCDate();

            periodRuns.forEach((run, runIndex) => {
                const runStartPeriod = TIMETABLE_PERIODS.find(period => period.index === run[0]);
                const runEndPeriod = TIMETABLE_PERIODS.find(period => period.index === run[run.length - 1]);
                if (!runStartPeriod || !runEndPeriod) {
                    return;
                }

                const startParts = toHourMinutes(runStartPeriod.startMinutes);
                const endParts = toHourMinutes(runEndPeriod.endMinutes);

                const start = createCampusDate(occurrenceYear, occurrenceMonth, occurrenceDay, startParts.hour, startParts.minute);
                const end = createCampusDate(occurrenceYear, occurrenceMonth, occurrenceDay, endParts.hour, endParts.minute);

                entries.push({
                    key: `class-${course.course_id}-${week}-${weekdayRaw}-${runIndex}`,
                    kind: 'class',
                    title: course.title,
                    start,
                    end,
                    courseId: course.course_id,
                    enrollmentId: course.enrollment_id,
                    location: course.location ?? null,
                    courseCode: course.code ?? null,
                    periodStart: runStartPeriod.index,
                    periodEnd: runEndPeriod.index,
                    periodCount: run.length,
                    periods: run,
                    titleKey: translationKey,
                    titleTranslations: course.title_i18n ?? null,
                    weeks: sortedWeeks,
                    occurrenceWeek: week
                });
            });
        }
    }

    for (const participation of participations) {
        const activity = participation.activity_detail;
        if (!activity) {
            continue;
        }
        const start = new Date(activity.start_datetime);
        const end = new Date(activity.end_datetime);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            continue;
        }
        entries.push({
            key: `activity-${participation.id}-${activity.id}`,
            kind: 'activity',
            title: activity.title,
            start,
            end,
            activityId: activity.id,
            status: participation.status,
            location: activity.location ?? null,
            titleTranslations: activity.title_i18n ?? null
        });
    }

    const scheduled = entries.sort((a, b) => a.start.getTime() - b.start.getTime());
    markTimelineConflicts(scheduled);
    unscheduledCourses.sort((a, b) => a.title.localeCompare(b.title));

    return {
        scheduled,
        unscheduledCourses
    };
};
