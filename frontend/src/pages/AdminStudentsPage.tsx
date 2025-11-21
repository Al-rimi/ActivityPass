import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { AdminUser, SecurityPreferences } from '../types/admin';

const defaultStudentForm = () => ({
    student_id: '',
    username: '',
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
            username: student.username || '',
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
            if (!form.username.trim()) delete payload.username;
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
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
            <div className="flex flex-col gap-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">{t('admin.manageStudents')}</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button type="button" onClick={openModal} className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm">
                            {t('admin.addStudent')}
                        </button>
                        <button
                            type="button"
                            onClick={handleToggleStudentEnforcement}
                            disabled={securityLoading || togglingSecurity || !securityPrefs}
                            aria-pressed={securityPrefs?.force_students_change_default}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${securityPrefs?.force_students_change_default
                                ? 'bg-gray-900 text-white border border-gray-900'
                                : 'border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-100'} disabled:opacity-60`}
                        >
                            {securityPrefs?.force_students_change_default ? t('admin.promptStudentsToggleOff') : t('admin.promptStudentsToggleOn')}
                        </button>
                    </div>
                </header>

                {notice && (
                    <div className={`rounded-md border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-100' : notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100' : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-100'}`}>
                        {notice.text}
                    </div>
                )}

                <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('admin.searchStudents') || ''}
                            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-md px-4 py-2 bg-white dark:bg-gray-800"
                        />
                    </div>
                    <div className="mt-6 overflow-x-auto">
                        <table className="min-w-[720px] text-left text-sm">
                            <thead>
                                <tr className="text-gray-500 dark:text-gray-400">
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
                                        <td colSpan={8} className="py-6 text-center text-gray-500">{t('admin.noStudents', { defaultValue: 'No students found.' })}</td>
                                    </tr>
                                )}
                                {students.map(student => (
                                    <tr key={student.id} className="border-t border-gray-100 dark:border-gray-800">
                                        <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{student.student_profile?.student_id || '—'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{student.first_name || '—'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{student.email || '—'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{student.student_profile?.phone || '—'}</td>
                                        <td className="px-4 py-2">{student.student_profile?.major || '—'}</td>
                                        <td className="px-4 py-2">{student.student_profile?.class_name || '—'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{student.student_profile?.year ?? '—'}</td>
                                        <td className="px-4 py-2">
                                            <button type="button" onClick={() => openEditModal(student)} className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                                                {t('common.edit')}
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
                <div className="fixed inset-0 z-30 flex items-center justify-center px-4 py-6 bg-black/50">
                    <div className="w-full max-w-2xl p-6 bg-white rounded-2xl shadow-2xl dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('admin.quickCreate', { defaultValue: 'Quick create' })}</p>
                                <h2 className="text-xl font-semibold">{t('admin.addStudent', { defaultValue: 'Add student' })}</h2>
                            </div>
                            <button type="button" onClick={() => setModalOpen(false)} className="p-2 text-gray-500 rounded-md hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" aria-label="Close">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={submitNewStudent} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-1">
                            {[
                                { name: 'student_id', label: t('admin.table.studentId'), required: true },
                                { name: 'username', label: t('admin.username', { defaultValue: 'Username (optional)' }) },
                                { name: 'full_name', label: t('profile.name') },
                                { name: 'email', label: t('admin.table.email') },
                                ...studentProfileFieldDefs,
                            ].map(field => (
                                <label key={field.name} className="text-sm text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                                    {field.label}
                                    <input
                                        value={(form as Record<string, string>)[field.name]}
                                        onChange={e => setForm(prev => ({ ...prev, [field.name]: e.target.value }))}
                                        required={('required' in field) ? Boolean((field as { required?: boolean }).required) : false}
                                        className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-900"
                                    />
                                </label>
                            ))}
                            <label className="text-sm text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                                {t('admin.student.year')}
                                <input
                                    type="number"
                                    value={form.year}
                                    onChange={e => setForm(prev => ({ ...prev, year: e.target.value }))}
                                    className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-900"
                                />
                            </label>
                            <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-sm">
                                    {t('common.cancel', { defaultValue: 'Cancel' })}
                                </button>
                                <button type="submit" disabled={creating} className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm disabled:opacity-60">
                                    {creating ? t('profile.saving') : t('admin.createStudent', { defaultValue: 'Create student' })}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editModalOpen && editingStudent && (
                <div className="fixed inset-0 z-30 flex items-center justify-center px-4 py-6 bg-black/50">
                    <div className="w-full max-w-3xl p-6 bg-white rounded-2xl shadow-2xl dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('admin.editStudent')}</p>
                                <h2 className="text-xl font-semibold">{editingStudent.username}</h2>
                            </div>
                            <button type="button" onClick={closeEditModal} className="p-2 text-gray-500 rounded-md hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={submitEditStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-1">
                            <label className="text-sm text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                                {t('admin.table.studentId')}
                                <input value={editForm.student_id} disabled className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-gray-100 dark:bg-gray-800" />
                            </label>
                            <label className="text-sm text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                                {t('admin.table.username')}
                                <input value={editForm.username} disabled className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-gray-100 dark:bg-gray-800" />
                            </label>
                            <label className="text-sm text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                                {t('profile.name')}
                                <input value={editForm.full_name} onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))} className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-900" />
                            </label>
                            <label className="text-sm text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                                {t('admin.table.email')}
                                <input value={editForm.email} onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))} className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-900" />
                            </label>
                            {studentProfileFieldDefs.map(field => (
                                <label key={field.name} className="text-sm text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                                    {field.label}
                                    <input
                                        value={(editForm as Record<string, string>)[field.name]}
                                        onChange={e => setEditForm(prev => ({ ...prev, [field.name]: e.target.value }))}
                                        className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-900"
                                    />
                                </label>
                            ))}
                            <label className="text-sm text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                                {t('admin.student.year')}
                                <input type="number" value={editForm.year} onChange={e => setEditForm(prev => ({ ...prev, year: e.target.value }))} className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-900" />
                            </label>
                            <div className="md:col-span-2 flex flex-col gap-3 pt-2">
                                <button type="button" onClick={() => resetPassword(editingStudent)} className="self-start px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-sm disabled:opacity-60" disabled={resettingUserId === editingStudent.id}>
                                    {resettingUserId === editingStudent.id ? t('profile.saving') : t('admin.resetPassword')}
                                </button>
                                <div className="flex justify-end gap-3">
                                    <button type="button" onClick={closeEditModal} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-sm">{t('common.cancel')}</button>
                                    <button type="submit" disabled={updating} className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm disabled:opacity-60">
                                        {updating ? t('profile.saving') : t('admin.saveChanges')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
};

export default AdminStudentsPage;
