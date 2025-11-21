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
    last_week: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    week_pattern: number[];
    source_filename: string;
    created_at: string;
    updated_at: string;
};
