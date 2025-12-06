export type ParticipationStatus = 'applied' | 'approved' | 'rejected';

export interface ActivityEligibility {
    eligible: boolean;
    reasons: string[];
}

export interface ActivityRecord {
    id: number;
    title: string;
    description?: string | null;
    title_i18n?: Record<string, string> | null;
    description_i18n?: Record<string, string> | null;
    college_required?: unknown;
    countries?: unknown;
    major_required?: string | null;
    chinese_level_min?: string | null;
    location?: string | null;
    start_datetime: string;
    end_datetime: string;
    capacity: number;
    created_by_username: string;
    created_at: string;
}

export interface EligibleActivityRecord extends ActivityRecord {
    eligibility?: ActivityEligibility;
}

export interface StudentCourseScheduleRecord {
    enrollment_id: number;
    course_id: number;
    student: number;
    title: string;
    title_i18n?: Record<string, string> | null;
    code?: string | null;
    location?: string | null;
    weekday: number;
    periods: number[];
    weeks: number[];
    term_start_date?: string | null;
    term?: string | null;
    teacher_id?: string | null;
    campus_name?: string | null;
}

export interface StudentParticipationRecord {
    id: number;
    student: unknown;
    activity: number;
    activity_detail?: ActivityRecord | null;
    status: ParticipationStatus;
    applied_at: string;
}

export interface StudentTimelineEntry {
    key: string;
    kind: 'class' | 'activity';
    title: string;
    start: Date;
    end: Date;
    courseId?: number;
    enrollmentId?: number;
    activityId?: number;
    status?: ParticipationStatus;
    location?: string | null;
    courseCode?: string | null;
    periodStart?: number;
    periodEnd?: number;
    periodCount?: number;
    periods?: number[];
    titleKey?: string;
    titleTranslations?: Record<string, string> | null;
    weeks?: number[];
    occurrenceWeek?: number;
    hasConflict?: boolean;
    conflictCount?: number;
    conflicts?: StudentTimelineEntryConflict[];
}

export interface StudentTimelineEntryConflict {
    key: string;
    title: string;
    courseCode?: string | null;
}

export type StudentUnscheduledCourseReason =
    | 'missingTermStart'
    | 'unspecifiedWeekday'
    | 'invalidWeekday'
    | 'missingWeeks'
    | 'missingPeriods'
    | 'invalidPeriod';

export interface StudentUnscheduledCourse {
    key: string;
    title: string;
    courseId: number;
    enrollmentId: number;
    courseCode?: string | null;
    location?: string | null;
    weekday: number | null;
    weeks: number[];
    periods: number[];
    reason: StudentUnscheduledCourseReason;
    titleKey?: string;
    titleTranslations?: Record<string, string> | null;
    termStartDate?: string | null;
}

export interface StudentTimelineBuildResult {
    scheduled: StudentTimelineEntry[];
    unscheduledCourses: StudentUnscheduledCourse[];
}
