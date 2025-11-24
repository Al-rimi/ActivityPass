export type AdminRole = 'admin' | 'staff' | 'student' | 'user';

export type StudentProfile = {
    student_id?: string | null;
    major?: string | null;
    college?: string | null;
    class_name?: string | null;
    gender?: string | null;
    phone?: string | null;
    chinese_level?: string | null;
    year?: number | null;
};

export type AdminUser = {
    id: number;
    username: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    role: AdminRole;
    must_change_password?: boolean;
    student_profile?: StudentProfile | null;
    staff_number?: string | null;
    phone?: string | null;
};

export type SecurityPreferences = {
    force_students_change_default: boolean;
    force_staff_change_default: boolean;
};

export type AdminCourse = {
    id: number;
    code: string;
    title: string;
    course_type: string;
    teacher: string;
    location: string;
    term: string;
    first_week_monday: string;
    day_of_week: number;
    periods: number[];
    week_pattern: number[];
    created_at: string;
    updated_at: string;
};

export type AdminActivity = {
    id: number;
    title: string;
    description: string;
    title_i18n: Record<string, string>;
    description_i18n: Record<string, string>;
    college_required: string | string[];
    chinese_level_min: string;
    countries: string | string[];
    start_datetime: string;
    end_datetime: string;
    capacity: number;
    location?: {
        lat: number;
        lng: number;
        address?: string;
    } | string | null;
    created_by: number;
    created_by_username: string;
    created_at: string;
};
