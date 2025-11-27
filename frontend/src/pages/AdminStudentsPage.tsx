import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { AdminUser } from '../types/admin';
import FloatingInput from '../components/FloatingInput';
import FloatingSelect from '../components/FloatingSelect';
import YearInput from '../components/YearInput';
import SearchInput from '../components/SearchInput';
import { useNavigate, useParams } from 'react-router-dom';

const defaultStudentForm = () => ({
    student_id: '',
    full_name: '',
    email: '',
    phone: '',
    major: '',
    college: '',
    class_name: '',
    gender: '',
    chinese_level: '',
    year: '',
});

const AdminStudentsPage: React.FC = () => {
    const { tokens } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { '*': path } = useParams<{ '*': string }>();

    // Capture saved form data before it gets cleared
    const capturedFormData = React.useRef<string | null>(null);

    // Capture the data on mount
    React.useEffect(() => {
        const savedForm = localStorage.getItem('admin-student-add-form');
        capturedFormData.current = savedForm;
    }, []);

    // Parse the path
    let identifier: string | null = null;
    let action: string | null = null;

    if (path === 'add') {
        action = 'add';
    } else if (path) {
        const editMatch = path.match(/^(\w+)\/edit$/);
        const deleteMatch = path.match(/^(\w+)\/delete$/);
        const activitiesMatch = path.match(/^(\w+)\/activities$/);
        const coursesMatch = path.match(/^(\w+)\/courses$/);
        const viewMatch = path.match(/^(\w+)$/);

        if (editMatch) {
            identifier = editMatch[1];
            action = 'edit';
        } else if (deleteMatch) {
            identifier = deleteMatch[1];
            action = 'delete';
        } else if (activitiesMatch) {
            identifier = activitiesMatch[1];
            action = 'activities';
        } else if (coursesMatch) {
            identifier = coursesMatch[1];
            action = 'courses';
        } else if (viewMatch) {
            identifier = viewMatch[1];
            action = null; // view
        }
    }
    const [students, setStudents] = useState<AdminUser[]>([]);
    const [allStudents, setAllStudents] = useState<AdminUser[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(() => {
        const saved = localStorage.getItem('admin-student-add-form');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const clean = Object.fromEntries(Object.entries(parsed).filter(([k, v]) => v !== undefined && v !== null));
                return { ...defaultStudentForm(), ...clean };
            } catch (e) {
                return defaultStudentForm();
            }
        }
        return defaultStudentForm();
    });
    const [creating, setCreating] = useState(false);
    const [resettingUserId, setResettingUserId] = useState<number | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState(defaultStudentForm());
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<AdminUser | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<AdminUser | null>(null);
    const [updating, setUpdating] = useState(false);

    // Track if we've loaded initial form data to prevent overwriting localStorage on mount
    const hasLoadedInitialData = React.useRef(false);
    // Track if we are currently loading initial data to prevent saving during load
    const isLoadingInitialData = React.useRef(false);

    // Save form data whenever it changes (as user types)
    React.useEffect(() => {
        if (!isLoadingInitialData.current && hasLoadedInitialData.current) {
            localStorage.setItem('admin-student-add-form', JSON.stringify(form));
        }
    }, [form]);

    // Prevent body scrolling when modals are open
    React.useEffect(() => {
        const isAnyModalOpen = modalOpen || editModalOpen || viewModalOpen || deleteConfirmModalOpen;
        const originalOverflow = document.body.style.overflow;

        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [modalOpen, editModalOpen, viewModalOpen, deleteConfirmModalOpen]);



    // Focus states for floating labels
    const [searchFocused, setSearchFocused] = useState(false);

    // Activities and courses popup states
    const [selectedStudentActivities, setSelectedStudentActivities] = useState<any[]>([]);
    const [selectedStudentCourses, setSelectedStudentCourses] = useState<any[]>([]);
    const [selectedStudentForActivities, setSelectedStudentForActivities] = useState<any>(null);
    const [selectedStudentForCourses, setSelectedStudentForCourses] = useState<any>(null);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [loadingCourses, setLoadingCourses] = useState(false);

    // Student counts cache
    const [studentCounts, setStudentCounts] = useState<Record<number, { activities: number; courses: number }>>({});
    const studentProfileFieldDefs = useMemo(() => ([
        { name: 'phone', label: t('admin.student.phone') },
        { name: 'major', label: t('admin.student.major') },
        { name: 'college', label: t('admin.student.college') },
        { name: 'class_name', label: t('admin.student.class_name') },
        { name: 'gender', label: t('admin.student.gender') },
        { name: 'chinese_level', label: t('admin.student.chinese_level') },
    ]), [t]);

    const authHeaders = useMemo(() => ({
        'Content-Type': 'application/json',
        Authorization: tokens ? `Bearer ${tokens.access}` : '',
    }), [tokens]);

    const filterStudents = useCallback((query: string, dataset: AdminUser[]) => {
        const q = query.trim().toLowerCase();
        if (!q) return dataset;
        return dataset.filter(student => {
            const targets = [
                student.username,
                student.first_name,
                student.email,
                student.student_profile?.student_id,
                student.student_profile?.major,
                student.student_profile?.class_name,
            ].map(val => (val || '').toLowerCase());
            return targets.some(val => val && val.includes(q));
        });
    }, []);

    const loadStudentCounts = useCallback(async (students: AdminUser[]) => {
        const counts: Record<number, { activities: number; courses: number }> = {};

        try {
            // Fetch all participations and course enrollments in bulk
            const [participationsRes, enrollmentsRes] = await Promise.all([
                fetch('/api/participations/', { headers: authHeaders }),
                fetch('/api/admin/course-enrollments/', { headers: authHeaders })
            ]);

            const participations = participationsRes.ok ? await participationsRes.json() : [];
            const enrollments = enrollmentsRes.ok ? await enrollmentsRes.json() : [];

            // Create maps for counting
            const participationCounts: Record<number, number> = {};
            const enrollmentCounts: Record<number, number> = {};

            // Count participations by student
            participations.forEach((p: any) => {
                const studentId = p.student;
                participationCounts[studentId] = (participationCounts[studentId] || 0) + 1;
            });

            // Count enrollments by student
            enrollments.forEach((e: any) => {
                const studentId = e.student;
                enrollmentCounts[studentId] = (enrollmentCounts[studentId] || 0) + 1;
            });

            // Set counts for all students
            students.forEach(student => {
                counts[student.id] = {
                    activities: participationCounts[student.id] || 0,
                    courses: enrollmentCounts[student.id] || 0
                };
            });
        } catch (err) {
            console.error('Error loading bulk counts:', err);
            // Fallback to zero counts
            students.forEach(student => {
                counts[student.id] = { activities: 0, courses: 0 };
            });
        }

        setStudentCounts(counts);
    }, [authHeaders]);

    const loadStudents = useCallback(async (query = '') => {
        if (!tokens) return;
        setLoading(true);
        try {
            const qs = new URLSearchParams({ role: 'student' });
            const res = await fetch(`/api/admin/users/?${qs.toString()}`, { headers: authHeaders });
            if (!res.ok) throw new Error('fetch_failed');
            const data = await res.json();
            setAllStudents(data);
            const filteredData = filterStudents(query, data);
            setStudents(filteredData);

            // Load counts for the filtered students
            await loadStudentCounts(filteredData);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoading(false);
        }
    }, [tokens, authHeaders, t, filterStudents, loadStudentCounts]);

    useEffect(() => {
        if (tokens) {
            loadStudents();
        }
    }, [tokens, loadStudents]);

    useEffect(() => {
        setStudents(filterStudents(search, allStudents));
    }, [search, allStudents, filterStudents]);

    const resetPassword = async (user: AdminUser) => {
        setResettingUserId(user.id);
        try {
            const res = await fetch('/api/admin/reset-password/', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ user_id: user.id }),
            });
            if (!res.ok) throw new Error('reset_failed');
            const data = await res.json();
            setNotice({ type: 'success', text: t('admin.resetPasswordDone', { password: data.password }) });
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.resetPasswordError') });
        } finally {
            setResettingUserId(null);
        }
    };

    const openEditModal = (student: AdminUser) => {
        setViewingStudent(null);
        setViewModalOpen(false);
        setEditingStudent(student);
        setEditForm({
            student_id: student.student_profile?.student_id || '',
            full_name: student.first_name || '',
            email: student.email || '',
            phone: student.student_profile?.phone || '',
            major: student.student_profile?.major || '',
            college: student.student_profile?.college || '',
            class_name: student.student_profile?.class_name || '',
            gender: student.student_profile?.gender || '',
            chinese_level: student.student_profile?.chinese_level || '',
            year: student.student_profile?.year != null ? String(student.student_profile.year) : '',
        });
        setEditModalOpen(true);
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
        setEditingStudent(null);
        setEditForm(defaultStudentForm());
    };

    const openViewModal = (student: AdminUser) => {
        setViewingStudent(student);
        setViewModalOpen(true);
    };

    const closeViewModal = () => {
        setViewModalOpen(false);
        setViewingStudent(null);
    };

    const submitEditStudent = async (evt: React.FormEvent) => {
        evt.preventDefault();
        if (!editingStudent) return;
        setUpdating(true);
        try {
            const payload: Record<string, unknown> = {
                first_name: editForm.full_name,
                email: editForm.email,
            };
            const studentProfile: Record<string, unknown> = {
                phone: editForm.phone,
                major: editForm.major,
                college: editForm.college,
                class_name: editForm.class_name,
                gender: editForm.gender,
                chinese_level: editForm.chinese_level,
            };
            if (editForm.year.trim()) {
                studentProfile.year = Number(editForm.year);
            } else {
                studentProfile.year = null;
            }
            payload.student_profile = studentProfile;
            const res = await fetch(`/api/admin/users/${editingStudent.id}/`, {
                method: 'PATCH',
                headers: authHeaders,
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('update_failed');
            setNotice({ type: 'success', text: t('admin.studentUpdated') });
            navigate(`/admin/students/${editingStudent.student_profile?.student_id}`);
            loadStudents(search);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.updateError') });
        } finally {
            setUpdating(false);
        }
    };

    const submitNewStudent = async (evt: React.FormEvent) => {
        evt.preventDefault();
        if (!form.student_id.trim()) {
            setNotice({ type: 'error', text: t('admin.studentIdRequired', { defaultValue: 'Student ID is required.' }) });
            return;
        }
        setCreating(true);
        try {
            const payload: Record<string, unknown> = { ...form };
            if (!form.full_name.trim()) delete payload.full_name;
            if (!form.email.trim()) delete payload.email;
            if (!form.phone.trim()) delete payload.phone;
            if (!form.major.trim()) delete payload.major;
            if (!form.college.trim()) delete payload.college;
            if (!form.class_name.trim()) delete payload.class_name;
            if (!form.gender.trim()) delete payload.gender;
            if (!form.chinese_level.trim()) delete payload.chinese_level;
            if (!form.year.trim()) {
                delete payload.year;
            } else {
                payload.year = Number(form.year);
            }
            const res = await fetch('/api/admin/create-student/', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('create_student_failed');
            const data = await res.json();
            setNotice({ type: 'success', text: t('admin.studentCreated', { defaultValue: 'Student created with default password 000000.', username: data.user?.username || form.student_id }) });
            localStorage.removeItem('admin-student-add-form');
            setForm(defaultStudentForm());
            navigate('/admin/students');
            loadStudents(search);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.studentCreateError', { defaultValue: 'Unable to create student.' }) });
        } finally {
            setCreating(false);
        }
    };

    const loadStudentActivities = useCallback(async (student: AdminUser) => {
        setLoadingActivities(true);
        try {
            const res = await fetch(`/api/participations/?student=${student.id}`, { headers: authHeaders });
            if (!res.ok) throw new Error('fetch_activities_failed');
            const data = await res.json();
            setSelectedStudentActivities(data);
            setSelectedStudentForActivities(student);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoadingActivities(false);
        }
    }, [authHeaders, t]);

    const loadStudentCourses = useCallback(async (student: AdminUser) => {
        setLoadingCourses(true);
        try {
            const res = await fetch(`/api/admin/course-enrollments/?student=${student.id}`, { headers: authHeaders });
            if (!res.ok) throw new Error('fetch_courses_failed');
            const data = await res.json();
            // Transform course enrollment data to course data
            const courses = data.map((enrollment: any) => enrollment.course);
            setSelectedStudentCourses(courses);
            setSelectedStudentForCourses(student);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoadingCourses(false);
        }
    }, [authHeaders, t]);

    const openDeleteConfirm = (student: AdminUser) => {
        setStudentToDelete(student);
        setDeleteConfirmModalOpen(true);
    };

    const confirmDeleteStudent = async () => {
        if (!studentToDelete) return;
        const studentId = studentToDelete.id;
        setDeleteConfirmModalOpen(false);
        setStudentToDelete(null);
        await deleteStudent(studentId);
        navigate('/admin/students');
    };

    const cancelDelete = () => {
        setDeleteConfirmModalOpen(false);
        setStudentToDelete(null);
        if (studentToDelete) {
            navigate(`/admin/students/${studentToDelete.student_profile?.student_id}`);
        }
    };

    const deleteStudent = async (studentId: number) => {
        if (!tokens) return;
        setDeletingId(studentId);
        try {
            const res = await fetch(`/api/admin/users/${studentId}/`, { method: 'DELETE', headers: authHeaders });
            if (!res.ok) throw new Error('delete_failed');
            loadStudents(search);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.studentDeleteError', { defaultValue: 'Failed to delete student.' }) });
        } finally {
            setDeletingId(null);
        }
    };

    useEffect(() => {
        // Always close all modals first
        setViewModalOpen(false);
        setEditModalOpen(false);
        setModalOpen(false);
        setViewingStudent(null);
        setEditingStudent(null);
        setDeleteConfirmModalOpen(false);
        setStudentToDelete(null);
        setSelectedStudentForActivities(null);
        setSelectedStudentForCourses(null);

        if (action === 'add') {
            isLoadingInitialData.current = true;
            const saved = localStorage.getItem('admin-student-add-form');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    const clean = Object.fromEntries(Object.entries(parsed).filter(([k, v]) => v !== undefined && v !== null));
                    setForm({ ...defaultStudentForm(), ...clean });
                } catch (e) {
                    console.error('Failed to parse saved student form:', e);
                    setForm(defaultStudentForm());
                }
            } else {
                setForm(defaultStudentForm());
            }
            hasLoadedInitialData.current = true;
            isLoadingInitialData.current = false;
            setModalOpen(true);
        } else if (identifier) {
            const student = allStudents.find(s => s.student_profile?.student_id === identifier);
            if (student) {
                if (action === 'edit') {
                    openEditModal(student);
                } else if (action === 'delete') {
                    openDeleteConfirm(student);
                } else if (action === 'activities') {
                    // Load activities for this student
                    loadStudentActivities(student);
                } else if (action === 'courses') {
                    // Load courses for this student
                    loadStudentCourses(student);
                } else {
                    // Default to view modal when identifier exists but no specific action
                    openViewModal(student);
                }
            }
            // If student not found, modals stay closed
        }
        // If no identifier, modals stay closed
    }, [identifier, action, allStudents]);

    return (
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-6">
                {/* Show activities page */}
                {action === 'activities' && selectedStudentForActivities && (
                    <>
                        <header className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate(`/admin/students/${selectedStudentForActivities.student_profile?.student_id}`)}
                                    className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover"
                                    aria-label={t('common.back')}
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M15 18l-6-6 6-6" />
                                    </svg>
                                </button>
                                <div>
                                    <h1 className="text-xl font-semibold">{t('admin.student.activities', { defaultValue: 'Student Activities' })}</h1>
                                    <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {selectedStudentForActivities.first_name || selectedStudentForActivities.username} ({selectedStudentForActivities.student_profile?.student_id})
                                    </p>
                                </div>
                            </div>
                        </header>

                        <section className="p-5 border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface">
                            {loadingActivities ? (
                                <div className="py-8 text-center">
                                    <div className="inline-block w-6 h-6 border-2 border-app-light-accent border-t-transparent rounded-full animate-spin dark:border-app-dark-accent"></div>
                                    <p className="mt-2 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {t('common.loading', { defaultValue: 'Loading...' })}
                                    </p>
                                </div>
                            ) : selectedStudentActivities.length === 0 ? (
                                <div className="py-8 text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.student.noActivities', { defaultValue: 'No activities found for this student.' })}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-medium">{t('admin.student.activities')}</h2>
                                        <span className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                            {selectedStudentActivities.length} {t('admin.table.activities', { defaultValue: 'activities' })}
                                        </span>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {selectedStudentActivities.map((participation: any) => (
                                            <div key={participation.id} className="p-4 border rounded-lg border-app-light-border dark:border-app-dark-border hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover cursor-pointer transition-colors" onClick={() => navigate(`/admin/activities/${participation.activity?.id}?from=student&studentId=${selectedStudentForActivities.student_profile?.student_id}`)}>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-medium text-app-light-text-primary dark:text-app-dark-text-primary truncate">
                                                            {participation.activity?.title || 'Unknown Activity'}
                                                        </h3>
                                                        <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary mt-1">
                                                            Status: <span className={`font-medium ${participation.status === 'confirmed' ? 'text-green-600 dark:text-green-400' : participation.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                {participation.status}
                                                            </span>
                                                        </p>
                                                        {participation.activity?.start_datetime && (
                                                            <p className="text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary mt-1">
                                                                {new Date(participation.activity.start_datetime).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    </>
                )}

                {/* Show courses page */}
                {action === 'courses' && selectedStudentForCourses && (
                    <>
                        <header className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate(`/admin/students/${selectedStudentForCourses.student_profile?.student_id}`)}
                                    className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover"
                                    aria-label={t('common.back')}
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M15 18l-6-6 6-6" />
                                    </svg>
                                </button>
                                <div>
                                    <h1 className="text-xl font-semibold">{t('admin.student.courses', { defaultValue: 'Student Courses' })}</h1>
                                    <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {selectedStudentForCourses.first_name || selectedStudentForCourses.username} ({selectedStudentForCourses.student_profile?.student_id})
                                    </p>
                                </div>
                            </div>
                        </header>

                        <section className="p-5 border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface">
                            {loadingCourses ? (
                                <div className="py-8 text-center">
                                    <div className="inline-block w-6 h-6 border-2 border-app-light-accent border-t-transparent rounded-full animate-spin dark:border-app-dark-accent"></div>
                                    <p className="mt-2 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {t('common.loading', { defaultValue: 'Loading...' })}
                                    </p>
                                </div>
                            ) : selectedStudentCourses.length === 0 ? (
                                <div className="py-8 text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.student.noCourses', { defaultValue: 'No courses found for this student.' })}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-medium">{t('admin.student.courses')}</h2>
                                        <span className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                            {selectedStudentCourses.length} {t('admin.table.courses', { defaultValue: 'courses' })}
                                        </span>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {selectedStudentCourses.map((course: any) => (
                                            <div key={course.id} className="p-4 border rounded-lg border-app-light-border dark:border-app-dark-border hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover cursor-pointer transition-colors" onClick={() => navigate(`/admin/courses/${course.id}?from=student&studentId=${selectedStudentForCourses.student_profile?.student_id}`)}>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-medium text-app-light-text-primary dark:text-app-dark-text-primary truncate">
                                                            {course.title || 'Unknown Course'}
                                                        </h3>
                                                        {course.code && (
                                                            <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary mt-1">
                                                                Code: {course.code}
                                                            </p>
                                                        )}
                                                        {course.teacher && (
                                                            <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                                Teacher: {course.teacher}
                                                            </p>
                                                        )}
                                                        {course.term && (
                                                            <p className="text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary mt-1">
                                                                {course.term} {course.academic_year}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    </>
                )}

                {/* Show main students list when not on activities or courses pages */}
                {action !== 'activities' && action !== 'courses' && (
                    <>
                        <header className="flex items-center justify-between gap-3">
                            <h1 className="text-xl font-semibold flex-shrink-0">{t('admin.manageStudents')}</h1>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <button type="button" onClick={() => navigate('/admin/students/add')} className="px-3 py-2 text-sm text-white transition-colors rounded-md bg-app-light-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover whitespace-nowrap">
                                    {t('admin.addStudent')}
                                </button>
                            </div>
                        </header>

                        {notice && (
                            <div className={`rounded-md border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-app-light-accent bg-app-light-accent/10 text-app-light-text-primary dark:border-app-dark-accent dark:bg-app-dark-accent/20 dark:text-app-dark-text-primary' : notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100' : 'border-app-light-border bg-app-light-surface-secondary text-app-light-text-primary dark:border-app-dark-border dark:bg-app-dark-surface-secondary dark:text-app-dark-text-primary'}`}>
                                {notice.text}
                            </div>
                        )}

                        <section className="p-5 border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface">
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <div className="relative flex-1">
                                    <SearchInput
                                        id="search"
                                        label={t('admin.searchStudents')}
                                        value={search}
                                        onChange={setSearch}
                                    />
                                </div>
                            </div>
                            <div className="mt-6 overflow-x-auto">
                                <table className="w-full text-xs xss:text-sm text-left table-fixed">
                                    <thead>
                                        <tr className="text-app-light-textSecondary dark:text-app-dark-textSecondary">
                                            <th className="px-4 py-2 whitespace-nowrap min-w-0 flex-1 xss:min-w-16">{t('admin.table.student')}</th>
                                            <th className="p-0.5 xss:px-1 sm:px-4 py-2 whitespace-nowrap text-center w-16 xss:w-20">{t('admin.table.activities')}</th>
                                            <th className="p-0.5 xss:px-1 sm:px-4 py-2 whitespace-nowrap text-center w-16 xss:w-20">{t('admin.table.courses')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!students.length && !loading && (
                                            <tr>
                                                <td colSpan={3} className="py-6 text-center text-app-light-textSecondary dark:text-app-dark-textSecondary">{t('admin.noStudents', { defaultValue: 'No students found.' })}</td>
                                            </tr>
                                        )}
                                        {students.map(student => (
                                            <tr key={student.id} className="border-t border-app-light-border dark:border-app-dark-border">
                                                <td className="px-4 py-2 min-w-0 flex-1 xss:min-w-16">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/admin/students/${student.student_profile?.student_id}`)}
                                                        className="w-full text-left block"
                                                    >
                                                        <p className="font-medium text-app-light-text-primary hover:text-app-light-text-secondary dark:text-app-dark-text-primary dark:hover:text-app-dark-text-secondary">{student.student_profile?.student_id || '—'}</p>
                                                        <div className="whitespace-nowrap block overflow-hidden relative">
                                                            <p className="text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">{student.first_name || '—'}</p>
                                                            <span className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-app-light-surface to-transparent dark:from-app-dark-surface"></span>
                                                        </div>
                                                    </button>
                                                </td>
                                                <td className="p-0.5 xss:px-4 py-2 whitespace-nowrap text-center w-16 xss:w-20">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/admin/students/${student.student_profile?.student_id}/activities`)}
                                                        className="text-xs xss:text-sm font-medium text-app-light-text-primary hover:text-app-light-text-secondary dark:text-app-dark-text-primary dark:hover:text-app-dark-text-secondary"
                                                    >
                                                        {studentCounts[student.id]?.activities || 0}
                                                    </button>
                                                </td>
                                                <td className="p-0.5 xss:px-1 sm:px-4 py-2 whitespace-nowrap text-center w-16 xss:w-20">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/admin/students/${student.student_profile?.student_id}/courses`)}
                                                        className="text-xs xss:text-sm font-medium text-app-light-text-primary hover:text-app-light-text-secondary dark:text-app-dark-text-primary dark:hover:text-app-dark-text-secondary"
                                                    >
                                                        {studentCounts[student.id]?.courses || 0}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                )}

                {modalOpen && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
                        <div className="flex items-center justify-center min-h-full p-4">
                            <div className="w-full max-w-2xl border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                                <div className="flex items-center justify-between p-4 pb-3">
                                    <div>
                                        <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{t('admin.addStudent', { defaultValue: 'Add student' })}</h2>
                                    </div>
                                    <button type="button" onClick={() => {
                                        // Save current form data before closing
                                        localStorage.setItem('admin-student-add-form', JSON.stringify(form));
                                        navigate('/admin/students');
                                    }} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="px-4 pb-4">
                                    <form onSubmit={submitNewStudent} className="space-y-4" autoComplete="off">
                                        {/* Student ID */}
                                        <FloatingInput
                                            id="student_id"
                                            label={t('admin.table.studentId')}
                                            value={form.student_id}
                                            onChange={(value: string) => setForm(prev => ({ ...prev, student_id: value }))}
                                            required
                                        />

                                        {/* Full Name */}
                                        <FloatingInput
                                            id="full_name"
                                            label={t('profile.name')}
                                            value={form.full_name}
                                            onChange={(value: string) => setForm(prev => ({ ...prev, full_name: value }))}
                                        />

                                        {/* Email and Phone Row */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingInput
                                                id="email"
                                                label={t('admin.table.email')}
                                                value={form.email}
                                                onChange={(value: string) => setForm(prev => ({ ...prev, email: value }))}
                                                type="email"
                                            />
                                            <FloatingInput
                                                id="phone"
                                                label={t('admin.student.phone')}
                                                value={form.phone}
                                                onChange={(value: string) => setForm(prev => ({ ...prev, phone: value }))}
                                            />
                                        </div>

                                        {/* Major and College Row */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingInput
                                                id="major"
                                                label={t('admin.student.major')}
                                                value={form.major}
                                                onChange={(value: string) => setForm(prev => ({ ...prev, major: value }))}
                                            />
                                            <FloatingInput
                                                id="college"
                                                label={t('admin.student.college')}
                                                value={form.college}
                                                onChange={(value: string) => setForm(prev => ({ ...prev, college: value }))}
                                            />
                                        </div>

                                        {/* Class Name and Year Row */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingInput
                                                id="class_name"
                                                label={t('admin.student.class_name')}
                                                value={form.class_name}
                                                onChange={(value: string) => setForm(prev => ({ ...prev, class_name: value }))}
                                            />
                                            <YearInput
                                                id="year"
                                                label={t('admin.student.year')}
                                                value={form.year}
                                                onChange={(value: string) => setForm(prev => ({ ...prev, year: value }))}
                                            />
                                        </div>

                                        {/* Gender and Chinese Level */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingSelect
                                                id="gender"
                                                label={t('admin.student.gender')}
                                                value={form.gender}
                                                onChange={(value: string) => setForm(prev => ({ ...prev, gender: value }))}
                                                options={[
                                                    { value: 'Male', label: t('admin.student.gender.male', { defaultValue: 'Male' }) },
                                                    { value: 'Female', label: t('admin.student.gender.female', { defaultValue: 'Female' }) },
                                                ]}
                                            />
                                            <FloatingSelect
                                                id="chinese_level"
                                                label={t('admin.student.chinese_level')}
                                                value={form.chinese_level}
                                                onChange={(value: string) => setForm(prev => ({ ...prev, chinese_level: value }))}
                                                options={[
                                                    { value: 'HSK1', label: 'HSK 1' },
                                                    { value: 'HSK2', label: 'HSK 2' },
                                                    { value: 'HSK3', label: 'HSK 3' },
                                                    { value: 'HSK4', label: 'HSK 4' },
                                                    { value: 'HSK5', label: 'HSK 5' },
                                                    { value: 'HSK6', label: 'HSK 6' },
                                                    { value: 'Native', label: t('admin.student.chinese_level.native', { defaultValue: 'Native' }) },
                                                ]}
                                            />
                                        </div>

                                        {/* Form Actions */}
                                        <div className="flex flex-col-reverse pt-3 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    localStorage.removeItem('admin-student-add-form');
                                                    navigate('/admin/students');
                                                }}
                                                className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                            >
                                                {t('common.cancel')}
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={creating}
                                                className="w-full px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg sm:w-auto bg-app-light-accent hover:bg-app-light-accent-hover disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover"
                                            >
                                                {creating ? t('profile.saving') : t('admin.createStudent', { defaultValue: 'Create student' })}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {editModalOpen && editingStudent && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
                        <div className="flex items-center justify-center min-h-full p-4">
                            <div className="w-full max-w-3xl border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                                <div className="flex items-center justify-between p-4 pb-3">
                                    <div>
                                        <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                            {t('admin.editStudent')}
                                        </p>
                                        <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{editingStudent.first_name || editingStudent.username}</h2>
                                    </div>
                                    <button type="button" onClick={() => navigate(`/admin/students/${editingStudent.student_profile?.student_id}`)} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="px-4 pb-4">
                                    <form onSubmit={submitEditStudent} className="space-y-4" autoComplete="off">
                                        {/* Basic Info Row */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingInput
                                                id="edit_student_id"
                                                label={t('admin.table.studentId')}
                                                value={editForm.student_id}
                                                onChange={() => { }}
                                                disabled
                                            />
                                            <FloatingInput
                                                id="edit_full_name"
                                                label={t('profile.name')}
                                                value={editForm.full_name}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, full_name: value }))}
                                            />
                                        </div>

                                        {/* Contact Info */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingInput
                                                id="edit_email"
                                                label={t('admin.table.email')}
                                                value={editForm.email}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, email: value }))}
                                                type="email"
                                            />
                                            <FloatingInput
                                                id="edit_phone"
                                                label={t('admin.student.phone')}
                                                value={editForm.phone}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, phone: value }))}
                                            />
                                        </div>

                                        {/* Academic Info */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingInput
                                                id="edit_major"
                                                label={t('admin.student.major')}
                                                value={editForm.major}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, major: value }))}
                                            />
                                            <FloatingInput
                                                id="edit_college"
                                                label={t('admin.student.college')}
                                                value={editForm.college}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, college: value }))}
                                            />
                                        </div>

                                        {/* Class and Year */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingInput
                                                id="edit_class_name"
                                                label={t('admin.student.class_name')}
                                                value={editForm.class_name}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, class_name: value }))}
                                            />
                                            <YearInput
                                                id="edit_year"
                                                label={t('admin.student.year')}
                                                value={editForm.year}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, year: value }))}
                                            />
                                        </div>

                                        {/* Gender and Chinese Level */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingSelect
                                                id="edit_gender"
                                                label={t('admin.student.gender')}
                                                value={editForm.gender}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, gender: value }))}
                                                options={[
                                                    { value: 'Male', label: t('admin.student.gender.male', { defaultValue: 'Male' }) },
                                                    { value: 'Female', label: t('admin.student.gender.female', { defaultValue: 'Female' }) },
                                                ]}
                                            />
                                            <FloatingSelect
                                                id="edit_chinese_level"
                                                label={t('admin.student.chinese_level')}
                                                value={editForm.chinese_level}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, chinese_level: value }))}
                                                options={[
                                                    { value: 'HSK1', label: 'HSK 1' },
                                                    { value: 'HSK2', label: 'HSK 2' },
                                                    { value: 'HSK3', label: 'HSK 3' },
                                                    { value: 'HSK4', label: 'HSK 4' },
                                                    { value: 'HSK5', label: 'HSK 5' },
                                                    { value: 'HSK6', label: 'HSK 6' },
                                                    { value: 'Native', label: t('admin.student.chinese_level.native', { defaultValue: 'Native' }) },
                                                ]}
                                            />
                                        </div>

                                        {/* Form Actions */}
                                        <div className="flex flex-col gap-3 pt-3 border-t border-app-light-border dark:border-app-dark-border">
                                            <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:justify-between sm:space-x-3 sm:space-y-0 sm:items-center">
                                                <button
                                                    type="button"
                                                    onClick={() => resetPassword(editingStudent)}
                                                    className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                                    disabled={resettingUserId === editingStudent.id}
                                                >
                                                    {resettingUserId === editingStudent.id ? t('profile.saving') : t('admin.resetPassword')}
                                                </button>
                                                <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:space-x-3 sm:space-y-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/admin/students/${editingStudent.student_profile?.student_id}`)}
                                                        className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                                    >
                                                        {t('common.cancel')}
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={updating}
                                                        className="w-full px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg sm:w-auto bg-app-light-accent hover:bg-app-light-accent-hover disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover"
                                                    >
                                                        {updating ? t('profile.saving') : t('admin.saveChanges')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {viewModalOpen && viewingStudent && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
                        <div className="flex items-center justify-center min-h-full p-4">
                            <div className="w-full max-w-2xl border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                                <div className="flex items-center justify-between p-4 pb-3">
                                    <div>
                                        <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                            {t('admin.viewStudent', { defaultValue: 'View Student' })}
                                        </p>
                                        <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{viewingStudent.first_name || viewingStudent.username}</h2>
                                    </div>
                                    <button type="button" onClick={() => navigate('/admin/students')} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="px-4 pb-4">
                                    <div className="space-y-4">
                                        {/* Basic Info Row */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="relative">
                                                <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                                    <input
                                                        id="view_student_id"
                                                        value={viewingStudent.student_profile?.student_id || ''}
                                                        readOnly
                                                        className="w-full px-4 pt-5 pb-3 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                                    />
                                                    <label
                                                        htmlFor="view_student_id"
                                                        className={`absolute left-4 text-app-light-text-secondary font-medium pointer-events-none transform transition-all duration-200 ${viewingStudent.student_profile?.student_id
                                                            ? 'top-0.5 -translate-y-0 text-xs'
                                                            : 'top-1/2 -translate-y-1/2 text-sm'
                                                            }`}
                                                    >
                                                        {t('admin.table.studentId')}
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                                    <input
                                                        id="view_full_name"
                                                        value={viewingStudent.first_name || ''}
                                                        readOnly
                                                        className="w-full px-4 pt-5 pb-3 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                                    />
                                                    <label
                                                        htmlFor="view_full_name"
                                                        className={`absolute left-4 text-app-light-text-secondary font-medium pointer-events-none transform transition-all duration-200 ${viewingStudent.first_name
                                                            ? 'top-0.5 -translate-y-0 text-xs'
                                                            : 'top-1/2 -translate-y-1/2 text-sm'
                                                            }`}
                                                    >
                                                        {t('profile.name')}
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact Info */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="relative">
                                                <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                                    <input
                                                        id="view_email"
                                                        value={viewingStudent.email || ''}
                                                        readOnly
                                                        className="w-full px-4 pt-5 pb-3 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                                    />
                                                    <label
                                                        htmlFor="view_email"
                                                        className={`absolute left-4 text-app-light-text-secondary font-medium pointer-events-none transform transition-all duration-200 ${viewingStudent.email
                                                            ? 'top-0.5 -translate-y-0 text-xs'
                                                            : 'top-1/2 -translate-y-1/2 text-sm'
                                                            }`}
                                                    >
                                                        {t('admin.table.email')}
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                                    <input
                                                        id="view_phone"
                                                        value={viewingStudent.student_profile?.phone || ''}
                                                        readOnly
                                                        className="w-full px-4 pt-5 pb-3 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                                    />
                                                    <label
                                                        htmlFor="view_phone"
                                                        className={`absolute left-4 text-app-light-text-secondary font-medium pointer-events-none transform transition-all duration-200 ${viewingStudent.student_profile?.phone
                                                            ? 'top-0.5 -translate-y-0 text-xs'
                                                            : 'top-1/2 -translate-y-1/2 text-sm'
                                                            }`}
                                                    >
                                                        {t('admin.student.phone')}
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Academic Info */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="relative">
                                                <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                                    <input
                                                        id="view_major"
                                                        value={viewingStudent.student_profile?.major || ''}
                                                        readOnly
                                                        className="w-full px-4 pt-5 pb-3 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                                    />
                                                    <label
                                                        htmlFor="view_major"
                                                        className={`absolute left-4 text-app-light-text-secondary font-medium pointer-events-none transform transition-all duration-200 ${viewingStudent.student_profile?.major
                                                            ? 'top-0.5 -translate-y-0 text-xs'
                                                            : 'top-1/2 -translate-y-1/2 text-sm'
                                                            }`}
                                                    >
                                                        {t('admin.student.major')}
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                                    <input
                                                        id="view_college"
                                                        value={viewingStudent.student_profile?.college || ''}
                                                        readOnly
                                                        className="w-full px-4 pt-5 pb-3 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                                    />
                                                    <label
                                                        htmlFor="view_college"
                                                        className={`absolute left-4 text-app-light-text-secondary font-medium pointer-events-none transform transition-all duration-200 ${viewingStudent.student_profile?.college
                                                            ? 'top-0.5 -translate-y-0 text-xs'
                                                            : 'top-1/2 -translate-y-1/2 text-sm'
                                                            }`}
                                                    >
                                                        {t('admin.student.college')}
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Class and Year */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="relative">
                                                <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                                    <input
                                                        id="view_class_name"
                                                        value={viewingStudent.student_profile?.class_name || ''}
                                                        readOnly
                                                        className="w-full px-4 pt-5 pb-3 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                                    />
                                                    <label
                                                        htmlFor="view_class_name"
                                                        className={`absolute left-4 text-app-light-text-secondary font-medium pointer-events-none transform transition-all duration-200 ${viewingStudent.student_profile?.class_name
                                                            ? 'top-0.5 -translate-y-0 text-xs'
                                                            : 'top-1/2 -translate-y-1/2 text-sm'
                                                            }`}
                                                    >
                                                        {t('admin.student.class_name')}
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                                    <input
                                                        id="view_year"
                                                        value={viewingStudent.student_profile?.year?.toString() || ''}
                                                        readOnly
                                                        className="w-full px-4 pt-5 pb-3 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                                    />
                                                    <label
                                                        htmlFor="view_year"
                                                        className={`absolute left-4 text-app-light-text-secondary font-medium pointer-events-none transform transition-all duration-200 ${viewingStudent.student_profile?.year
                                                            ? 'top-0.5 -translate-y-0 text-xs'
                                                            : 'top-1/2 -translate-y-1/2 text-sm'
                                                            }`}
                                                    >
                                                        {t('admin.student.year')}
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Gender and Chinese Level */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="relative">
                                                <FloatingSelect
                                                    id="view_gender"
                                                    label={t('admin.student.gender')}
                                                    value={viewingStudent.student_profile?.gender || ''}
                                                    onChange={() => { }}
                                                    disabled={true}
                                                    options={[
                                                        { value: 'Male', label: t('admin.student.gender.male', { defaultValue: 'Male' }) },
                                                        { value: 'Female', label: t('admin.student.gender.female', { defaultValue: 'Female' }) },
                                                    ]}
                                                />
                                            </div>
                                            <div className="relative">
                                                <FloatingSelect
                                                    id="view_chinese_level"
                                                    label={t('admin.student.chinese_level')}
                                                    value={viewingStudent.student_profile?.chinese_level || ''}
                                                    onChange={() => { }}
                                                    disabled={true}
                                                    options={[
                                                        { value: 'HSK1', label: 'HSK 1' },
                                                        { value: 'HSK2', label: 'HSK 2' },
                                                        { value: 'HSK3', label: 'HSK 3' },
                                                        { value: 'HSK4', label: 'HSK 4' },
                                                        { value: 'HSK5', label: 'HSK 5' },
                                                        { value: 'HSK6', label: 'HSK 6' },
                                                        { value: 'Native', label: t('admin.student.chinese_level.native', { defaultValue: 'Native' }) },
                                                    ]}
                                                />
                                            </div>
                                        </div>

                                        {/* Form Actions */}
                                        <div className="flex flex-col gap-3 pt-3 border-t border-app-light-border dark:border-app-dark-border">
                                            <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:justify-between sm:space-x-3 sm:space-y-0 sm:items-center">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/admin/students/${viewingStudent.student_profile?.student_id}/delete`)}
                                                    className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-error bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-surface dark:text-app-dark-error dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                                >
                                                    {t('common.delete')}
                                                </button>
                                                <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:space-x-3 sm:space-y-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate('/admin/students')}
                                                        className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                                    >
                                                        {t('common.close')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/admin/students/${viewingStudent.student_profile?.student_id}/edit`)}
                                                        className="w-full px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg sm:w-auto bg-app-light-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover"
                                                    >
                                                        {t('common.edit')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}







                {/* Delete Confirmation Modal */}
                {deleteConfirmModalOpen && studentToDelete && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
                        <div className="flex items-center justify-center min-h-full p-4">
                            <div className="w-full max-w-md border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                                <div className="p-6">
                                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full dark:bg-red-900/30">
                                        <svg className="w-6 h-6 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                    <h3 className="mb-2 text-lg font-semibold text-center text-app-light-text-primary dark:text-app-dark-text-primary">
                                        {t('admin.studentDeleteConfirmTitle', { defaultValue: 'Delete Student' })}
                                    </h3>
                                    <p className="mb-6 text-sm text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {t('admin.studentDeleteConfirm', { defaultValue: 'Are you sure you want to delete this student? This action cannot be undone.', name: studentToDelete.first_name || studentToDelete.username })}
                                    </p>
                                    <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0">
                                        <button
                                            type="button"
                                            onClick={cancelDelete}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={confirmDeleteStudent}
                                            disabled={deletingId === studentToDelete.id}
                                            className="w-full px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg sm:w-auto bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-600 dark:hover:bg-red-700"
                                        >
                                            {deletingId === studentToDelete.id ? t('common.deleting', { defaultValue: 'Deleting...' }) : t('common.delete')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
};

export default AdminStudentsPage;
