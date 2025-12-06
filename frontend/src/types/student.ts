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

export interface StudentCourseEventRecord {
    id: number;
    student: number;
    title: string;
    title_i18n?: Record<string, string> | null;
    start_datetime: string;
    end_datetime: string;
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
    courseEventId?: number;
    activityId?: number;
    status?: ParticipationStatus;
    location?: string | null;
    titleKey?: string;
    titleTranslations?: Record<string, string> | null;
}
