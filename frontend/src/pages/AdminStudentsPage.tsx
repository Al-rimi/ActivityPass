import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { AdminUser } from '../types/admin';

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
    const [resettingId, setResettingId] = useState<number | null>(null);
    const [prompting, setPrompting] = useState(false);

    const authHeaders = useMemo(() => ({
        'Content-Type': 'application/json',
        Authorization: tokens ? `Bearer ${tokens.access}` : '',
    }), [tokens]);

    const loadStudents = useCallback(async (query = '') => {
        if (!tokens) return;
        setLoading(true);
        try {
            const qs = new URLSearchParams({ role: 'student' });
            if (query.trim()) qs.set('q', query.trim());
            const res = await fetch(`/api/admin/users/?${qs.toString()}`, { headers: authHeaders });
            if (!res.ok) throw new Error('fetch_failed');
            const data = await res.json();
            setStudents(data);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoading(false);
        }
    }, [tokens, authHeaders, t]);

    useEffect(() => {
        if (tokens) {
            loadStudents();
        }
    }, [tokens, loadStudents]);

    const handleSearch = async (evt: React.FormEvent) => {
        evt.preventDefault();
        loadStudents(search);
    };

    const resetPassword = async (user: AdminUser) => {
        setResettingId(user.id);
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
            setResettingId(null);
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

    const promptDefaultStudents = async () => {
        setPrompting(true);
        try {
            const res = await fetch('/api/admin/prompt-default-students-change/', {
                method: 'POST',
                headers: authHeaders,
            });
            if (!res.ok) throw new Error('prompt_failed');
            const data = await res.json();
            setNotice({ type: 'info', text: t('admin.promptResult', { count: data.flagged }) });
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.promptError') });
        } finally {
            setPrompting(false);
        }
    };

    return (
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
            <div className="flex flex-col gap-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">{t('admin.sectionTitle', { defaultValue: 'Management' })}</p>
                        <h1 className="text-2xl font-semibold">{t('admin.manageStudents', { defaultValue: 'Manage students' })}</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.manageStudentsHint', { defaultValue: 'Search, add, and notify students from one place.' })}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={openModal} className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm">
                            {t('admin.addStudent', { defaultValue: 'Add student' })}
                        </button>
                        <button type="button" onClick={promptDefaultStudents} disabled={prompting} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 disabled:opacity-60">
                            {prompting ? t('profile.saving') : t('admin.promptDefaultBtn')}
                        </button>
                    </div>
                </header>

                {notice && (
                    <div className={`rounded-md border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-100' : notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100' : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-100'}`}>
                        {notice.text}
                    </div>
                )}

                <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                    <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('admin.searchStudents', { defaultValue: 'Search by name, username, or email' }) || ''}
                            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-md px-4 py-2 bg-white dark:bg-gray-800"
                        />
                        <div className="flex gap-2">
                            <button type="submit" className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm">{t('admin.search')}</button>
                            <button type="button" onClick={() => { setSearch(''); loadStudents(''); }} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-sm">
                                {t('admin.refresh')}
                            </button>
                        </div>
                    </form>
                    <div className="mt-6 overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="text-gray-500 dark:text-gray-400">
                                    <th className="py-2">{t('admin.table.studentId', { defaultValue: 'Student ID' })}</th>
                                    <th className="py-2">{t('admin.table.name')}</th>
                                    <th className="py-2">Email</th>
                                    <th className="py-2">{t('admin.table.phone')}</th>
                                    <th className="py-2">{t('admin.student.major')}</th>
                                    <th className="py-2">{t('admin.student.class_name')}</th>
                                    <th className="py-2">{t('admin.student.year')}</th>
                                    <th className="py-2">{t('admin.table.actions')}</th>
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
                                        <td className="py-2 font-mono text-xs">{student.student_profile?.student_id || '—'}</td>
                                        <td className="py-2">{student.first_name || '—'}</td>
                                        <td className="py-2">{student.email || '—'}</td>
                                        <td className="py-2">{student.student_profile?.phone || '—'}</td>
                                        <td className="py-2">{student.student_profile?.major || '—'}</td>
                                        <td className="py-2">{student.student_profile?.class_name || '—'}</td>
                                        <td className="py-2">{student.student_profile?.year ?? '—'}</td>
                                        <td className="py-2">
                                            <button type="button" onClick={() => resetPassword(student)} className="text-sm text-rose-600 dark:text-rose-300 disabled:opacity-60" disabled={resettingId === student.id}>
                                                {resettingId === student.id ? t('profile.saving') : t('admin.resetPassword')}
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
                                { name: 'student_id', label: t('admin.table.studentId', { defaultValue: 'Student ID' }), required: true },
                                { name: 'username', label: t('admin.username', { defaultValue: 'Username (optional)' }) },
                                { name: 'full_name', label: t('profile.name') },
                                { name: 'email', label: 'Email' },
                                { name: 'phone', label: t('admin.student.phone') },
                                { name: 'major', label: t('admin.student.major') },
                                { name: 'college', label: t('admin.student.college') },
                                { name: 'class_name', label: t('admin.student.class_name') },
                                { name: 'gender', label: t('admin.student.gender') },
                                { name: 'chinese_level', label: t('admin.student.chinese_level') },
                            ].map(field => (
                                <label key={field.name} className="text-sm text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                                    {field.label}
                                    <input
                                        value={(form as Record<string, string>)[field.name]}
                                        onChange={e => setForm(prev => ({ ...prev, [field.name]: e.target.value }))}
                                        required={Boolean(field.required)}
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
        </main>
    );
};

export default AdminStudentsPage;
