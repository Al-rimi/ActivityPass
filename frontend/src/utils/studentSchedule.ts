import {
    StudentCourseEventRecord,
    StudentParticipationRecord,
    StudentTimelineEntry
} from '../types/student';
import { getCourseTitleKey } from './courseTitleTranslations';

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

export const addDays = (date: Date, days: number): Date => {
    const copy = cloneDate(date);
    copy.setDate(copy.getDate() + days);
    return copy;
};

export const addWeeks = (date: Date, weeks: number): Date => addDays(date, weeks * 7);

export const buildTimelineEntries = (
    events: StudentCourseEventRecord[],
    participations: StudentParticipationRecord[]
): StudentTimelineEntry[] => {
    const entries: StudentTimelineEntry[] = [];

    for (const courseEvent of events) {
        const start = new Date(courseEvent.start_datetime);
        const end = new Date(courseEvent.end_datetime);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            continue;
        }
        const translationKey = getCourseTitleKey(courseEvent.title);
        entries.push({
            key: `class-${courseEvent.id}`,
            kind: 'class',
            title: courseEvent.title,
            start,
            end,
            courseEventId: courseEvent.id,
            titleKey: translationKey,
            titleTranslations: courseEvent.title_i18n ?? null
        });
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

    return entries.sort((a, b) => a.start.getTime() - b.start.getTime());
};
