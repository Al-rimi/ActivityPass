import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { AdminCourse } from '../types/admin';

const defaultCourseForm = () => ({
    code: '',
    title: '',
    course_type: '',
    teacher: '',
    location: '',
    term: '',
    first_week_monday: '',
    last_week: '16',
    day_of_week: '1',
    start_time: '',
    end_time: '',
    periods_text: '',
    week_pattern_text: '',
    source_filename: '',
});

type CourseFormState = ReturnType<typeof defaultCourseForm>;

const weekdayKeys = [1, 2, 3, 4, 5, 6, 7] as const;

const AdminCoursesPage: React.FC = () => {
    const { tokens } = useAuth();
    const { t } = useTranslation();
    const [courses, setCourses] = useState<AdminCourse[]>([]);
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [search, setSearch] = useState('');
    const [termFilter, setTermFilter] = useState('');
    const [dayFilter, setDayFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState<CourseFormState>(defaultCourseForm());
    const [saving, setSaving] = useState(false);
    const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const authHeaders = useMemo(() => {
        const base: Record<string, string> = { 'Content-Type': 'application/json' };
        if (tokens) {
            base.Authorization = `Bearer ${tokens.access}`;
        }
        return base;
    }, [tokens]);

    const fetchCourses = useCallback(async () => {
        if (!tokens) return;
        setLoading(true);
        try {
            const res = await fetch('/api/admin/courses/', { headers: authHeaders });
            if (!res.ok) throw new Error('failed');
            const data = await res.json();
            setCourses(data);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.courseSaveError') });
        } finally {
            setLoading(false);
        }
    }, [tokens, authHeaders, t]);

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

    const termOptions = useMemo(() => {
        const unique = new Set<string>();
        courses.forEach(course => { if (course.term) unique.add(course.term); });
        return Array.from(unique);
    }, [courses]);

    const filteredCourses = useMemo(() => {
        const q = search.trim().toLowerCase();
        return courses.filter(course => {
            if (termFilter && course.term !== termFilter) return false;
            if (dayFilter && String(course.day_of_week) !== dayFilter) return false;
            if (!q) return true;
            const bag = [course.title, course.code, course.teacher, course.location];
            return bag.some(field => (field || '').toLowerCase().includes(q));
        });
    }, [courses, search, termFilter, dayFilter]);

    const formatTime = (course: AdminCourse) => {
        if (course.start_time && course.end_time) {
            return `${course.start_time} - ${course.end_time}`;
        }
        return '—';
    };

    const formatDay = (value: number) => t(`admin.weekday.${value}`, { defaultValue: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][value - 1] });
    const formatPeriods = (course: AdminCourse) => (course.periods?.length ? course.periods.join(', ') : '—');
    const formatWeeks = (course: AdminCourse) => (course.week_pattern?.length ? course.week_pattern.join(', ') : '—');


    const openCreateModal = () => {
        setForm(defaultCourseForm());
        setEditingCourse(null);
        setModalOpen(true);
    };

    const openEditModal = (course: AdminCourse) => {
        setEditingCourse(course);
        setForm({
            code: course.code || '',
            title: course.title || '',
            course_type: course.course_type || '',
            teacher: course.teacher || '',
            location: course.location || '',
            term: course.term || '',
            first_week_monday: course.first_week_monday || '',
            last_week: String(course.last_week || ''),
            day_of_week: String(course.day_of_week || 1),
            start_time: course.start_time || '',
            end_time: course.end_time || '',
            periods_text: (course.periods || []).join(', '),
            week_pattern_text: (course.week_pattern || []).join(', '),
            source_filename: course.source_filename || '',
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSaving(false);
        setEditingCourse(null);
        setForm(defaultCourseForm());
    };

    const parseWeekPattern = (value: string) => {
        if (!value.trim()) return [];
        return value.split(',')
            .map(part => part.trim())
            .filter(Boolean)
            .map(item => parseInt(item, 10))
            .filter(num => !Number.isNaN(num) && num > 0)
            .sort((a, b) => a - b);
    };

    const parsePeriods = (value: string) => {
        if (!value.trim()) return [];
        return value.split(',')
            .map(part => part.trim())
            .filter(Boolean)
            .map(item => parseInt(item, 10))
            .filter(num => !Number.isNaN(num) && num > 0)
            .sort((a, b) => a - b);
    };

    const submitCourse = async (evt: React.FormEvent) => {
        evt.preventDefault();
        if (!tokens) return;
        setSaving(true);
        const payload = {
            code: form.code.trim(),
            title: form.title.trim(),
            course_type: form.course_type.trim(),
            teacher: form.teacher.trim(),
            location: form.location.trim(),
            term: form.term.trim(),
            first_week_monday: form.first_week_monday,
            last_week: Number(form.last_week) || 1,
            day_of_week: Number(form.day_of_week) || 1,
            start_time: form.start_time || null,
            end_time: form.end_time || null,
            periods: parsePeriods(form.periods_text),
            week_pattern: parseWeekPattern(form.week_pattern_text),
            source_filename: form.source_filename.trim(),
        };
        try {
            const url = editingCourse ? `/api/admin/courses/${editingCourse.id}/` : '/api/admin/courses/';
            const method = editingCourse ? 'PATCH' : 'POST';
            const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error('save_failed');
            setNotice({ type: 'success', text: t('admin.courseSaveSuccess') });
            closeModal();
            fetchCourses();
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.courseSaveError') });
        } finally {
            setSaving(false);
        }
    };

    const deleteCourse = async (courseId: number) => {
        if (!tokens) return;
        if (!window.confirm(t('admin.courseDeleteConfirm'))) return;
        setDeletingId(courseId);
        try {
            const res = await fetch(`/api/admin/courses/${courseId}/`, { method: 'DELETE', headers: authHeaders });
            if (!res.ok) throw new Error('delete_failed');
            fetchCourses();
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.courseSaveError') });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">{t('admin.manageCourses', { defaultValue: 'Manage courses' })}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.manageStudentsHint')}</p>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={openCreateModal} className="px-4 py-2 text-sm text-white bg-gray-900 rounded-md">
                            {t('admin.addCourse', { defaultValue: 'Add course' })}
                        </button>
                    </div>
                </header>

                {notice && (
                    <div className={`rounded-md border px-4 py-3 text-sm ${notice.type === 'success'
                        ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-100'
                        : 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100'}`}>
                        {notice.text}
                    </div>
                )}

                <section className="p-5 bg-white border border-gray-200 shadow-sm rounded-xl dark:border-gray-800 dark:bg-gray-900">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('admin.searchStudents', { defaultValue: 'Search…' }) || ''}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-md dark:border-gray-700 dark:bg-gray-800"
                        />
                        <select value={termFilter} onChange={e => setTermFilter(e.target.value)} className="px-4 py-2 bg-white border border-gray-300 rounded-md dark:border-gray-700 dark:bg-gray-800">
                            <option value="">{t('admin.course.term')}</option>
                            {termOptions.map(term => (
                                <option key={term} value={term}>{term}</option>
                            ))}
                        </select>
                        <select value={dayFilter} onChange={e => setDayFilter(e.target.value)} className="px-4 py-2 bg-white border border-gray-300 rounded-md dark:border-gray-700 dark:bg-gray-800">
                            <option value="">{t('admin.course.day')}</option>
                            {weekdayKeys.map(key => (
                                <option key={key} value={key}>{formatDay(key)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-6 overflow-x-auto">
                        <table className="min-w-[720px] text-left text-sm">
                            <thead>
                                <tr className="text-gray-500 dark:text-gray-400">
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.course.term')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.course.title')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.course.teacher')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.course.day')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.course.time')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.course.periods')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.course.weeks')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.course.location')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap" />
                                </tr>
                            </thead>
                            <tbody>
                                {!filteredCourses.length && !loading && (
                                    <tr>
                                        <td colSpan={9} className="py-6 text-center text-gray-500">{t('admin.noCourses')}</td>
                                    </tr>
                                )}
                                {loading && (
                                    <tr>
                                        <td colSpan={9} className="py-6 text-center text-gray-500">{t('admin.table.loading')}</td>
                                    </tr>
                                )}
                                {filteredCourses.map(course => (
                                    <tr key={course.id} className="border-t border-gray-100 dark:border-gray-800">
                                        <td className="px-4 py-2 whitespace-nowrap">{course.term || '—'}</td>
                                        <td className="px-4 py-2">
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{course.title}</p>
                                            <p className="text-xs text-gray-500">{course.code || '—'} · {course.course_type || '—'}</p>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">{course.teacher || '—'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{formatDay(course.day_of_week)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{formatTime(course)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{formatPeriods(course)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{formatWeeks(course)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{course.location || '—'}</td>
                                        <td className="px-4 py-2 text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-3">
                                                <button type="button" onClick={() => openEditModal(course)} className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {t('common.edit')}
                                                </button>
                                                <button type="button" onClick={() => deleteCourse(course.id)} className="text-sm text-red-600" disabled={deletingId === course.id}>
                                                    {t('admin.courseDelete')}
                                                </button>
                                            </div>
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
                    <div className="w-full max-w-2xl p-6 bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-gray-950 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                    {editingCourse ? t('admin.editCourse') : t('admin.addCourse')}
                                </p>
                                <h2 className="text-xl font-semibold">{form.title || t('admin.course.title')}</h2>
                            </div>
                            <button type="button" onClick={closeModal} className="p-2 text-gray-500 rounded-md hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={submitCourse} className="grid gap-4 max-h-[75vh] overflow-y-auto pr-1" autoComplete="off">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
                                    {t('admin.courseForm.code')}
                                    <input value={form.code} onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))} className="px-3 py-2 bg-white border border-gray-300 rounded-md dark:border-gray-700 dark:bg-gray-900" />
                                </label>
                                <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
                                    {t('admin.courseForm.type')}
                                    <input value={form.course_type} onChange={e => setForm(prev => ({ ...prev, course_type: e.target.value }))} className="px-3 py-2 bg-white border border-gray-300 rounded-md dark:border-gray-700 dark:bg-gray-900" />
                                </label>
                            </div>
                            <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
                                {t('admin.courseForm.title')}
                                <input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} required className="px-3 py-2 bg-white border border-gray-300 rounded-md dark:border-gray-700 dark:bg-gray-900" />
                            </label>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
                                    {t('admin.courseForm.teacher')}
                                    <input value={form.teacher} onChange={e => setForm(prev => ({ ...prev, teacher: e.target.value }))} className="px-3 py-2 bg-white border border-gray-300 rounded-md dark:border-gray-700 dark:bg-gray-900" />
                                </label>
                                <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
                                    {t('admin.courseForm.location')}
                                    <input value={form.location} onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))} className="px-3 py-2 bg-white border border-gray-300 rounded-md dark:border-gray-700 dark:bg-gray-900" />
                                </label>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
                                    {t('admin.courseForm.term')}
                                    <input value={form.term} onChange={e => setForm(prev => ({ ...prev, term: e.target.value }))} className="px-3 py-2 bg-white border border-gray-300 rounded-md dark:border-gray-700 dark:bg-gray-900" />
                                </label>
                                <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
                                    {t('admin.courseForm.firstWeek')}
                                    <input type="date" value={form.first_week_monday} onChange={e => setForm(prev => ({ ...prev, first_week_monday: e.target.value }))} required className="px-3 py-2 bg-white border border-gray-300 rounded-md dark:border-gray-700 dark:bg-gray-900" />
                                </label>
                                <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
                                    {t('admin.courseForm.lastWeek')}
                                    <input type="number" min={1} max={30} value={form.last_week} onChange={e => setForm(prev => ({ ...prev, last_week: e.target.value }))} className="px-3 py-2 bg-white border border-gray-300 rounded-md dark:border-gray-700 dark:bg-gray-900" />
                                </label>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
                                    {t('admin.courseForm.day')}
                                    <select value={form.day_of_week} onChange={e => setForm(prev => ({ ...prev, day_of_week: e.target.value }))} className="px-3 py-2 bg-white border border-gray-300 rounded-md dark:border-gray-700 dark:bg-gray-900">
                                        {weekdayKeys.map(key => (
                                            <option key={key} value={key}>{formatDay(key)}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
                                    {t('admin.courseForm.startTime')}
                                    <input type="time" value={form.start_time} onChange={e => setForm(prev => ({ ...prev, start_time: e.target.value }))} className="px-3 py-2 bg-white border border-gray-300 rounded-md dark:border-gray-700 dark:bg-gray-900" />
                                </label>
                                <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
                                    {t('admin.courseForm.endTime')}
                                    <input type="time" value={form.end_time} onChange={e => setForm(prev => ({ ...prev, end_time: e.target.value }))} className="px-3 py-2 bg-white border border-gray-300 rounded-md dark:border-gray-700 dark:bg-gray-900" />
                                </label>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
                                    {t('admin.courseForm.periods')}
                                    <input value={form.periods_text} onChange={e => setForm(prev => ({ ...prev, periods_text: e.target.value }))} placeholder="1,2,3" className="px-3 py-2 bg-white border border-gray-300 rounded-md dark:border-gray-700 dark:bg-gray-900" />
                                </label>
                                <label className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
                                    {t('admin.courseForm.source')}
                                    <input value={form.source_filename} onChange={e => setForm(prev => ({ ...prev, source_filename: e.target.value }))} className="px-3 py-2 bg-white border border-gray-300 rounded-md dark:border-gray-700 dark:bg-gray-900" />
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm border border-gray-300 rounded-md dark:border-gray-700">
                                    {t('common.cancel')}
                                </button>
                                <button type="submit" disabled={saving} className="px-4 py-2 text-sm text-white bg-gray-900 rounded-md disabled:opacity-60">
                                    {saving ? t('profile.saving') : t('common.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
};

export default AdminCoursesPage;
