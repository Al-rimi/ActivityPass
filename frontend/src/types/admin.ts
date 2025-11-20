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
