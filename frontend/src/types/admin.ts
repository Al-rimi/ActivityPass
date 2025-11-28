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

export type FacultyProfile = {
    id: number;
    user?: {
        id: number;
        username: string;
        first_name?: string | null;
        last_name?: string | null;
        email?: string | null;
        role: AdminRole;
        must_change_password?: boolean;
    };
    faculty_id?: string | null;
    name?: string | null;
    gender?: string | null;
    department?: string | null;
    position_category?: string | null;
    title_level?: string | null;
    title?: string | null;
    staff_category?: string | null;
    birth_date?: string | null;
    name_i18n?: { zh: string; en: string };
    department_i18n?: { zh: string; en: string };
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
    faculty_profile?: FacultyProfile | null;
    staff_number?: string | null;
    phone?: string | null;
    course_count?: number;
    activity_count?: number;
};

export type SecurityPreferences = {
    force_students_change_default: boolean;
    force_staff_change_default: boolean;
    force_faculty_change_default: boolean;
};

export type AdminCourse = {
    id: number;
    code: string;
    title: string;
    course_type_detail: string;
    teacher: FacultyProfile | null;
    teacher_id?: string;
    location: string;
    term: string;
    term_start_date: string;
    weekday: number;
    periods: number[];
    weeks: number[];
    credits: number;
    department_name: string;
    category: string;
    nature: string;
    teaching_mode: string;
    exam_type: string;
    grading_method: string;
    hours_per_week: number;
    total_course_hours: number;
    enrolled_students: number;
    class_students: number;
    capacity: number;
    campus_name: string;
    majors: string;
    grades: string;
    audience: string;
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
