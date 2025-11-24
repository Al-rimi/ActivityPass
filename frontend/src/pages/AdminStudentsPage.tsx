import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { AdminUser, SecurityPreferences } from '../types/admin';
import CustomSelect from '../components/CustomSelect';

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
    const [students, setStudents] = useState<AdminUser[]>([]);
    const [allStudents, setAllStudents] = useState<AdminUser[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(defaultStudentForm());
    const openModal = () => {
        setForm(defaultStudentForm());
        // Reset focus states
        setStudentIdFocused(false);
        setFullNameFocused(false);
        setEmailFocused(false);
        setPhoneFocused(false);
        setMajorFocused(false);
        setCollegeFocused(false);
        setClassNameFocused(false);
        setYearFocused(false);
        setModalOpen(true);
    };

    const [creating, setCreating] = useState(false);
    const [resettingUserId, setResettingUserId] = useState<number | null>(null);
    const [securityPrefs, setSecurityPrefs] = useState<SecurityPreferences | null>(null);
    const [securityLoading, setSecurityLoading] = useState(false);
    const [togglingSecurity, setTogglingSecurity] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState(defaultStudentForm());
    const [updating, setUpdating] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<AdminUser | null>(null);

    // Focus states for floating labels
    const [studentIdFocused, setStudentIdFocused] = useState(false);
    const [fullNameFocused, setFullNameFocused] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [phoneFocused, setPhoneFocused] = useState(false);
    const [majorFocused, setMajorFocused] = useState(false);
    const [collegeFocused, setCollegeFocused] = useState(false);
    const [classNameFocused, setClassNameFocused] = useState(false);
    const [yearFocused, setYearFocused] = useState(false);

    // Focus states for edit modal floating labels
    const [editFullNameFocused, setEditFullNameFocused] = useState(false);
    const [editEmailFocused, setEditEmailFocused] = useState(false);
    const [editPhoneFocused, setEditPhoneFocused] = useState(false);
    const [editMajorFocused, setEditMajorFocused] = useState(false);
    const [editCollegeFocused, setEditCollegeFocused] = useState(false);
    const [editClassNameFocused, setEditClassNameFocused] = useState(false);
    const [editYearFocused, setEditYearFocused] = useState(false);
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

    const loadSecurityPrefs = useCallback(async () => {
        if (!tokens) return;
        setSecurityLoading(true);
        try {
            const res = await fetch('/api/admin/security/preferences/', { headers: authHeaders });
            if (!res.ok) throw new Error('security_failed');
            const data = await res.json();
            setSecurityPrefs(data);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.promptError') });
        } finally {
            setSecurityLoading(false);
        }
    }, [tokens, authHeaders, t]);

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

    const loadStudents = useCallback(async (query = '') => {
        if (!tokens) return;
        setLoading(true);
        try {
            const qs = new URLSearchParams({ role: 'student' });
            const res = await fetch(`/api/admin/users/?${qs.toString()}`, { headers: authHeaders });
            if (!res.ok) throw new Error('fetch_failed');
            const data = await res.json();
            setAllStudents(data);
            setStudents(filterStudents(query, data));
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoading(false);
        }
    }, [tokens, authHeaders, t, filterStudents]);

    useEffect(() => {
        if (tokens) {
            loadStudents();
            loadSecurityPrefs();
        }
    }, [tokens, loadStudents, loadSecurityPrefs]);

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
        // Reset edit focus states
        setEditFullNameFocused(false);
        setEditEmailFocused(false);
        setEditPhoneFocused(false);
        setEditMajorFocused(false);
        setEditCollegeFocused(false);
        setEditClassNameFocused(false);
        setEditYearFocused(false);
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
            closeEditModal();
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
            setForm(defaultStudentForm());
            setModalOpen(false);
            loadStudents(search);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.studentCreateError', { defaultValue: 'Unable to create student.' }) });
        } finally {
            setCreating(false);
        }
    };

    const handleToggleStudentEnforcement = async () => {
        const nextEnabled = !(securityPrefs?.force_students_change_default);
        setTogglingSecurity(true);
        try {
            const res = await fetch('/api/admin/security/toggle/', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ role: 'student', enabled: nextEnabled }),
            });
            if (!res.ok) throw new Error('toggle_failed');
            const data = await res.json();
            setSecurityPrefs(prev => ({
                force_students_change_default: data.enabled,
                force_staff_change_default: prev?.force_staff_change_default ?? false,
            }));
            setNotice({
                type: 'info',
                text: data.enabled ? t('admin.promptStudentsEnabled', { count: data.flagged }) : t('admin.promptStudentsDisabled'),
            });
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.promptError') });
        } finally {
            setTogglingSecurity(false);
        }
    };

    return (
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">{t('admin.manageStudents')}</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button type="button" onClick={openModal} className="px-4 py-2 text-sm text-white transition-colors rounded-md bg-app-light-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover">
                            {t('admin.addStudent')}
                        </button>
                        <button
                            type="button"
                            onClick={handleToggleStudentEnforcement}
                            disabled={securityLoading || togglingSecurity || !securityPrefs}
                            aria-pressed={securityPrefs?.force_students_change_default}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${securityPrefs?.force_students_change_default
                                ? 'bg-app-light-accent text-app-light-text-primary border border-app-light-accent'
                                : 'border border-app-light-border dark:border-app-dark-border text-app-light-text-primary dark:text-app-dark-text-primary'} disabled:opacity-60`}
                        >
                            {securityPrefs?.force_students_change_default ? t('admin.promptStudentsToggleOff') : t('admin.promptStudentsToggleOn')}
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
                            <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                />
                                <label
                                    className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${search
                                        ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                        : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                        }`}
                                >
                                    {t('admin.searchStudents') || ''}
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-app-light-textSecondary dark:text-app-dark-textSecondary">
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.studentId')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.name')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.email')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.phone')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.student.major')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.student.class_name')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.student.year')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!students.length && !loading && (
                                    <tr>
                                        <td colSpan={8} className="py-6 text-center text-app-light-textSecondary dark:text-app-dark-textSecondary">{t('admin.noStudents', { defaultValue: 'No students found.' })}</td>
                                    </tr>
                                )}
                                {students.map(student => (
                                    <tr key={student.id} className="border-t border-app-light-border dark:border-app-dark-border">
                                        <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{student.student_profile?.student_id || '—'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{student.first_name || '—'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{student.email || '—'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{student.student_profile?.phone || '—'}</td>
                                        <td className="px-4 py-2">{student.student_profile?.major || '—'}</td>
                                        <td className="px-4 py-2">{student.student_profile?.class_name || '—'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{student.student_profile?.year ?? '—'}</td>
                                        <td className="px-4 py-2">
                                            <button type="button" onClick={() => openViewModal(student)} className="text-sm font-medium text-app-light-text dark:text-app-dark-text">
                                                {t('common.view')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-2xl mt-8 mb-8 border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{t('admin.addStudent', { defaultValue: 'Add student' })}</h2>
                            </div>
                            <button type="button" onClick={() => setModalOpen(false)} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-4 pb-4">
                            <form onSubmit={submitNewStudent} className="space-y-4" autoComplete="off">
                                {/* Basic Info Row */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="student_id"
                                                value={form.student_id}
                                                onChange={e => setForm(prev => ({ ...prev, student_id: e.target.value }))}
                                                onFocus={() => setStudentIdFocused(true)}
                                                onBlur={() => setStudentIdFocused(false)}
                                                required
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="student_id"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${studentIdFocused || form.student_id
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.table.studentId')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="full_name"
                                                value={form.full_name}
                                                onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                                                onFocus={() => setFullNameFocused(true)}
                                                onBlur={() => setFullNameFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="full_name"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${fullNameFocused || form.full_name
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
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
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="email"
                                                value={form.email}
                                                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                                                onFocus={() => setEmailFocused(true)}
                                                onBlur={() => setEmailFocused(false)}
                                                type="email"
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="email"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${emailFocused || form.email
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.table.email')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="phone"
                                                value={form.phone}
                                                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                                onFocus={() => setPhoneFocused(true)}
                                                onBlur={() => setPhoneFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="phone"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${phoneFocused || form.phone
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
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
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="major"
                                                value={form.major}
                                                onChange={e => setForm(prev => ({ ...prev, major: e.target.value }))}
                                                onFocus={() => setMajorFocused(true)}
                                                onBlur={() => setMajorFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="major"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${majorFocused || form.major
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.student.major')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="college"
                                                value={form.college}
                                                onChange={e => setForm(prev => ({ ...prev, college: e.target.value }))}
                                                onFocus={() => setCollegeFocused(true)}
                                                onBlur={() => setCollegeFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="college"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${collegeFocused || form.college
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
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
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="class_name"
                                                value={form.class_name}
                                                onChange={e => setForm(prev => ({ ...prev, class_name: e.target.value }))}
                                                onFocus={() => setClassNameFocused(true)}
                                                onBlur={() => setClassNameFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="class_name"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${classNameFocused || form.class_name
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.student.class_name')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="year"
                                                value={form.year}
                                                onChange={e => setForm(prev => ({ ...prev, year: e.target.value }))}
                                                onFocus={() => setYearFocused(true)}
                                                onBlur={() => setYearFocused(false)}
                                                type="number"
                                                className="w-full px-4 py-4 pr-16 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="year"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${yearFocused || form.year
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.student.year')}
                                            </label>
                                            <div className="absolute inset-y-0 right-0 flex flex-col">
                                                <button
                                                    type="button"
                                                    onClick={() => setForm(prev => ({ ...prev, year: String((Number(prev.year) || new Date().getFullYear()) + 1) }))}
                                                    className="flex-1 px-2 border-l text-app-light-text-secondary dark:text-app-dark-text-secondary border-app-light-border dark:border-app-dark-border"
                                                    aria-label="Increase year"
                                                >
                                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 19V5M5 12l7-7 7 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setForm(prev => ({ ...prev, year: String(Math.max(1900, (Number(prev.year) || new Date().getFullYear()) - 1)) }))}
                                                    className="flex-1 px-2 border-t border-l text-app-light-text-secondary dark:text-app-dark-text-secondary border-app-light-border dark:border-app-dark-border"
                                                    aria-label="Decrease year"
                                                >
                                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 5v14M5 12l7 7 7-7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Gender and Chinese Level */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="relative">
                                        <CustomSelect
                                            id="gender"
                                            label={t('admin.student.gender')}
                                            value={form.gender}
                                            onChange={(value) => setForm(prev => ({ ...prev, gender: value }))}
                                            focused={false}
                                            onFocus={() => {}}
                                            onBlur={() => {}}
                                            options={[
                                                { value: '', label: t('admin.student.gender') },
                                                { value: 'Male', label: t('admin.student.gender.male', { defaultValue: 'Male' }) },
                                                { value: 'Female', label: t('admin.student.gender.female', { defaultValue: 'Female' }) },
                                            ]}
                                        />
                                    </div>
                                    <div className="relative">
                                        <CustomSelect
                                            id="chinese_level"
                                            label={t('admin.student.chinese_level')}
                                            value={form.chinese_level}
                                            onChange={(value) => setForm(prev => ({ ...prev, chinese_level: value }))}
                                            focused={false}
                                            onFocus={() => {}}
                                            onBlur={() => {}}
                                            options={[
                                                { value: '', label: t('admin.student.chinese_level') },
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
                                <div className="flex flex-col-reverse pt-3 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-accent"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="w-full px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg sm:w-auto bg-app-light-accent hover:bg-app-light-accent-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover dark:focus:ring-app-dark-accent"
                                    >
                                        {creating ? t('profile.saving') : t('admin.createStudent', { defaultValue: 'Create student' })}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {editModalOpen && editingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-3xl mt-8 mb-8 border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.editStudent')}
                                </p>
                                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{editingStudent.first_name || editingStudent.username}</h2>
                            </div>
                            <button type="button" onClick={closeEditModal} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-4 pb-4">
                            <form onSubmit={submitEditStudent} className="space-y-4" autoComplete="off">
                                {/* Basic Info Row */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-app-light-text-primary dark:text-app-dark-text-primary">
                                            {t('admin.table.studentId')}
                                        </label>
                                        <input
                                            value={editForm.student_id}
                                            disabled
                                            className="w-full px-3 py-2 text-sm transition-colors border rounded-lg bg-app-light-surface-secondary border-app-light-border dark:bg-app-dark-surface-secondary dark:border-app-dark-border dark:text-app-dark-text-secondary"
                                        />
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="edit_full_name"
                                                value={editForm.full_name}
                                                onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                                                onFocus={() => setEditFullNameFocused(true)}
                                                onBlur={() => setEditFullNameFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="edit_full_name"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${editFullNameFocused || editForm.full_name
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
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
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="edit_email"
                                                value={editForm.email}
                                                onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                                onFocus={() => setEditEmailFocused(true)}
                                                onBlur={() => setEditEmailFocused(false)}
                                                type="email"
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="edit_email"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${editEmailFocused || editForm.email
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.table.email')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="edit_phone"
                                                value={editForm.phone}
                                                onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                                onFocus={() => setEditPhoneFocused(true)}
                                                onBlur={() => setEditPhoneFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="edit_phone"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${editPhoneFocused || editForm.phone
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
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
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="edit_major"
                                                value={editForm.major}
                                                onChange={e => setEditForm(prev => ({ ...prev, major: e.target.value }))}
                                                onFocus={() => setEditMajorFocused(true)}
                                                onBlur={() => setEditMajorFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="edit_major"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${editMajorFocused || editForm.major
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.student.major')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="edit_college"
                                                value={editForm.college}
                                                onChange={e => setEditForm(prev => ({ ...prev, college: e.target.value }))}
                                                onFocus={() => setEditCollegeFocused(true)}
                                                onBlur={() => setEditCollegeFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="edit_college"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${editCollegeFocused || editForm.college
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
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
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="edit_class_name"
                                                value={editForm.class_name}
                                                onChange={e => setEditForm(prev => ({ ...prev, class_name: e.target.value }))}
                                                onFocus={() => setEditClassNameFocused(true)}
                                                onBlur={() => setEditClassNameFocused(false)}
                                                className="w-full px-4 py-4 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="edit_class_name"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${editClassNameFocused || editForm.class_name
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.student.class_name')}
                                            </label>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border hover:border-app-light-border-hover dark:hover:border-app-dark-border-hover">
                                            <input
                                                id="edit_year"
                                                value={editForm.year}
                                                onChange={e => setEditForm(prev => ({ ...prev, year: e.target.value }))}
                                                onFocus={() => setEditYearFocused(true)}
                                                onBlur={() => setEditYearFocused(false)}
                                                type="number"
                                                className="w-full px-4 py-4 pr-16 placeholder-transparent transition-colors duration-200 bg-app-light-input-bg dark:bg-app-dark-input-bg text-app-light-text-primary dark:text-app-dark-text-primary focus:outline-none rounded-lg"
                                            />
                                            <label
                                                htmlFor="edit_year"
                                                className={`absolute left-4 transition-all duration-200 ease-out pointer-events-none ${editYearFocused || editForm.year
                                                    ? 'top-0.5 text-xs text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary font-medium transform -translate-y-0'
                                                    : 'top-1/2 text-base text-app-light-text-secondary group-hover:text-app-light-text-primary dark:group-hover:text-app-dark-text-primary transform -translate-y-1/2'
                                                    }`}
                                            >
                                                {t('admin.student.year')}
                                            </label>
                                            <div className="absolute inset-y-0 right-0 flex flex-col">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm(prev => ({ ...prev, year: String((Number(prev.year) || new Date().getFullYear()) + 1) }))}
                                                    className="flex-1 px-2 border-l text-app-light-text-secondary dark:text-app-dark-text-secondary border-app-light-border dark:border-app-dark-border"
                                                    aria-label="Increase year"
                                                >
                                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 19V5M5 12l7-7 7 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm(prev => ({ ...prev, year: String(Math.max(1900, (Number(prev.year) || new Date().getFullYear()) - 1)) }))}
                                                    className="flex-1 px-2 border-t border-l text-app-light-text-secondary dark:text-app-dark-text-secondary border-app-light-border dark:border-app-dark-border"
                                                    aria-label="Decrease year"
                                                >
                                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 5v14M5 12l7 7 7-7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Gender and Chinese Level */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="relative">
                                        <CustomSelect
                                            id="edit_gender"
                                            label={t('admin.student.gender')}
                                            value={editForm.gender}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, gender: value }))}
                                            focused={false}
                                            onFocus={() => {}}
                                            onBlur={() => {}}
                                            options={[
                                                { value: '', label: t('admin.student.gender') },
                                                { value: 'Male', label: t('admin.student.gender.male', { defaultValue: 'Male' }) },
                                                { value: 'Female', label: t('admin.student.gender.female', { defaultValue: 'Female' }) },
                                            ]}
                                        />
                                    </div>
                                    <div className="relative">
                                        <CustomSelect
                                            id="edit_chinese_level"
                                            label={t('admin.student.chinese_level')}
                                            value={editForm.chinese_level}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, chinese_level: value }))}
                                            focused={false}
                                            onFocus={() => {}}
                                            onBlur={() => {}}
                                            options={[
                                                { value: '', label: t('admin.student.chinese_level') },
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
                                    <button
                                        type="button"
                                        onClick={() => resetPassword(editingStudent)}
                                        className="self-start px-4 py-2 text-sm font-medium transition-colors border rounded-lg text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-accent"
                                        disabled={resettingUserId === editingStudent.id}
                                    >
                                        {resettingUserId === editingStudent.id ? t('profile.saving') : t('admin.resetPassword')}
                                    </button>
                                    <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0">
                                        <button
                                            type="button"
                                            onClick={closeEditModal}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-accent"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={updating}
                                            className="w-full px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg sm:w-auto bg-app-light-accent hover:bg-app-light-accent-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover dark:focus:ring-app-dark-accent"
                                        >
                                            {updating ? t('profile.saving') : t('admin.saveChanges')}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {viewModalOpen && viewingStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-2xl border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.viewStudent', { defaultValue: 'View Student' })}
                                </p>
                                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{viewingStudent.first_name || viewingStudent.username}</h2>
                            </div>
                            <button type="button" onClick={closeViewModal} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-4 pb-4">
                            <div className="space-y-4">
                                {/* Basic Info Row */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-app-light-text-primary dark:text-app-dark-text-primary">
                                            {t('admin.table.studentId')}
                                        </label>
                                        <div className="w-full px-3 py-2 text-sm border rounded-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border dark:text-app-dark-text">
                                            {viewingStudent.student_profile?.student_id || '—'}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-app-light-text-primary dark:text-app-dark-text-primary">
                                            {t('profile.name')}
                                        </label>
                                        <div className="w-full px-3 py-2 text-sm border rounded-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border dark:text-app-dark-text">
                                            {viewingStudent.first_name || '—'}
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-app-light-text-primary dark:text-app-dark-text-primary">
                                            {t('admin.table.email')}
                                        </label>
                                        <div className="w-full px-3 py-2 text-sm border rounded-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border dark:text-app-dark-text">
                                            {viewingStudent.email || '—'}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-app-light-text-primary dark:text-app-dark-text-primary">
                                            {t('admin.student.phone')}
                                        </label>
                                        <div className="w-full px-3 py-2 text-sm border rounded-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border dark:text-app-dark-text">
                                            {viewingStudent.student_profile?.phone || '—'}
                                        </div>
                                    </div>
                                </div>

                                {/* Academic Info */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-app-light-text-primary dark:text-app-dark-text-primary">
                                            {t('admin.student.major')}
                                        </label>
                                        <div className="w-full px-3 py-2 text-sm border rounded-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border dark:text-app-dark-text">
                                            {viewingStudent.student_profile?.major || '—'}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-app-light-text-primary dark:text-app-dark-text-primary">
                                            {t('admin.student.college')}
                                        </label>
                                        <div className="w-full px-3 py-2 text-sm border rounded-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border dark:text-app-dark-text">
                                            {viewingStudent.student_profile?.college || '—'}
                                        </div>
                                    </div>
                                </div>

                                {/* Class and Year */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-app-light-text-primary dark:text-app-dark-text-primary">
                                            {t('admin.student.class_name')}
                                        </label>
                                        <div className="w-full px-3 py-2 text-sm border rounded-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border dark:text-app-dark-text">
                                            {viewingStudent.student_profile?.class_name || '—'}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-app-light-text-primary dark:text-app-dark-text-primary">
                                            {t('admin.student.year')}
                                        </label>
                                        <div className="w-full px-3 py-2 text-sm border rounded-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border dark:text-app-dark-text">
                                            {viewingStudent.student_profile?.year ?? '—'}
                                        </div>
                                    </div>
                                </div>

                                {/* Gender and Chinese Level */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-app-light-text-primary dark:text-app-dark-text-primary">
                                            {t('admin.student.gender')}
                                        </label>
                                        <div className="w-full px-3 py-2 text-sm border rounded-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border dark:text-app-dark-text">
                                            {viewingStudent.student_profile?.gender || '—'}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-app-light-text-primary dark:text-app-dark-text-primary">
                                            {t('admin.student.chinese_level')}
                                        </label>
                                        <div className="w-full px-3 py-2 text-sm border rounded-lg bg-app-light-surface border-app-light-border dark:bg-app-dark-surface dark:border-app-dark-border dark:text-app-dark-text">
                                            {viewingStudent.student_profile?.chinese_level || '—'}
                                        </div>
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex flex-col gap-3 pt-3 border-t border-app-light-border dark:border-app-dark-border">
                                    <button
                                        type="button"
                                        onClick={() => resetPassword(viewingStudent)}
                                        disabled={resettingUserId === viewingStudent.id}
                                        className="self-start px-4 py-2 text-sm font-medium transition-colors border rounded-lg text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-accent"
                                    >
                                        {resettingUserId === viewingStudent.id ? t('profile.saving') : t('admin.resetPassword')}
                                    </button>
                                    <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0">
                                        <button
                                            type="button"
                                            onClick={closeViewModal}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-accent"
                                        >
                                            {t('common.close')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                closeViewModal();
                                                openEditModal(viewingStudent);
                                            }}
                                            className="w-full px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg sm:w-auto bg-app-light-accent hover:bg-app-light-accent-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover dark:focus:ring-app-dark-accent"
                                        >
                                            {t('common.edit')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default AdminStudentsPage;
