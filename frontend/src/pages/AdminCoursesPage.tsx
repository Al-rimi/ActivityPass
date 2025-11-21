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
    day_of_week: '1',
    periods: [] as number[],
    week_pattern: [] as number[],
});

type CourseFormState = ReturnType<typeof defaultCourseForm>;

const weekdayKeys = [1, 2, 3, 4, 5, 6, 7] as const;

// Section → time mapping (24h)
const SECTION_TIMES: Record<number, [string, string]> = {
    1: ["08:00", "08:40"],
    2: ["08:45", "09:25"],
    3: ["09:40", "10:20"],
    4: ["10:35", "11:15"],
    5: ["11:20", "12:00"],
    6: ["14:00", "14:40"],
    7: ["14:45", "15:25"],
    8: ["15:40", "16:20"],
    9: ["16:30", "17:10"],
    10: ["18:00", "18:40"],
    11: ["18:45", "19:25"],
    12: ["19:40", "20:20"],
    13: ["20:30", "21:10"],
};

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
        if (course.periods && course.periods.length > 0) {
            const minPeriod = Math.min(...course.periods);
            const maxPeriod = Math.max(...course.periods);
            const startTime = SECTION_TIMES[minPeriod]?.[0];
            const endTime = SECTION_TIMES[maxPeriod]?.[1];
            if (startTime && endTime) {
                return `${startTime} - ${endTime}`;
            }
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
            day_of_week: String(course.day_of_week || 1),
            periods: course.periods || [],
            week_pattern: course.week_pattern || [],
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSaving(false);
        setEditingCourse(null);
        setForm(defaultCourseForm());
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
            day_of_week: Number(form.day_of_week) || 1,
            periods: form.periods,
            week_pattern: form.week_pattern,
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
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            {course.term === 'first' ? t('admin.courseForm.term.first') : 
                                             course.term === 'second' ? t('admin.courseForm.term.second') : 
                                             course.term || '—'}
                                        </td>
                                        <td className="px-4 py-2">
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{course.title}</p>
                                            <p className="text-xs text-gray-500">{course.code || '—'} · {
                                                course.course_type === 'Theory' ? t('admin.courseForm.type.theory') :
                                                course.course_type === 'Technical' ? t('admin.courseForm.type.technical') :
                                                course.course_type === 'Practice' ? t('admin.courseForm.type.practice') :
                                                course.course_type === 'Experiment' ? t('admin.courseForm.type.experiment') :
                                                course.course_type || '—'
                                            }</p>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-gray-900 dark:border-gray-700">
                        <div className="flex items-center justify-between p-6 pb-4">
                            <div>
                                <p className="text-xs tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                    {editingCourse ? t('admin.editCourse') : t('admin.addCourse')}
                                </p>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{form.title || t('admin.course.title')}</h2>
                            </div>
                            <button type="button" onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-6 pb-6">
                            <form onSubmit={submitCourse} className="space-y-6" autoComplete="off">
                                {/* Basic Info Row */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.courseForm.code')}
                                        </label>
                                        <input
                                            value={form.code}
                                            onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
                                            placeholder={t('admin.courseForm.code')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.courseForm.type')}
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={form.course_type}
                                                onChange={e => setForm(prev => ({ ...prev, course_type: e.target.value }))}
                                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 appearance-none transition-colors"
                                            >
                                                <option value="">{t('admin.courseForm.type')}</option>
                                                <option value="Theory">{t('admin.courseForm.type.theory')}</option>
                                                <option value="Technical">{t('admin.courseForm.type.technical')}</option>
                                                <option value="Practice">{t('admin.courseForm.type.practice')}</option>
                                                <option value="Experiment">{t('admin.courseForm.type.experiment')}</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Title */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('admin.courseForm.title')}
                                    </label>
                                    <input
                                        value={form.title}
                                        onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                                        required
                                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
                                        placeholder={t('admin.courseForm.title')}
                                    />
                                </div>

                                {/* Teacher and Location */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.courseForm.teacher')}
                                        </label>
                                        <input
                                            value={form.teacher}
                                            onChange={e => setForm(prev => ({ ...prev, teacher: e.target.value }))}
                                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
                                            placeholder={t('admin.courseForm.teacher')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.courseForm.location')}
                                        </label>
                                        <input
                                            value={form.location}
                                            onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
                                            placeholder={t('admin.courseForm.location')}
                                        />
                                    </div>
                                </div>

                                {/* Term, Date, Day */}
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.courseForm.term')}
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={form.term}
                                                onChange={e => setForm(prev => ({ ...prev, term: e.target.value }))}
                                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 appearance-none transition-colors"
                                            >
                                                <option value="">{t('admin.courseForm.term')}</option>
                                                <option value="first">{t('admin.courseForm.term.first')}</option>
                                                <option value="second">{t('admin.courseForm.term.second')}</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.courseForm.firstWeek')}
                                        </label>
                                        <input
                                            type="date"
                                            value={form.first_week_monday}
                                            onChange={e => setForm(prev => ({ ...prev, first_week_monday: e.target.value }))}
                                            required
                                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.courseForm.day')}
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={form.day_of_week}
                                                onChange={e => setForm(prev => ({ ...prev, day_of_week: e.target.value }))}
                                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 appearance-none transition-colors"
                                            >
                                                {weekdayKeys.map(key => (
                                                    <option key={key} value={key}>{formatDay(key)}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sessions and Weeks */}
                                <div className="grid gap-6 lg:grid-cols-2">
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.courseForm.periods')}
                                        </label>
                                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-2 p-4 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600">
                                            {Array.from({ length: 13 }, (_, i) => i + 1).map(session => (
                                                <button
                                                    key={session}
                                                    type="button"
                                                    onClick={() => {
                                                        setForm(prev => ({
                                                            ...prev,
                                                            periods: prev.periods.includes(session)
                                                                ? prev.periods.filter(p => p !== session)
                                                                : [...prev.periods, session].sort((a, b) => a - b)
                                                        }));
                                                    }}
                                                    className={`flex items-center justify-center w-full h-10 text-sm font-medium rounded-lg transition-all duration-200 ${
                                                        form.periods.includes(session)
                                                            ? 'bg-blue-600 text-white shadow-md transform scale-105'
                                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-600'
                                                    }`}
                                                >
                                                    {session}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.courseForm.weeks')}
                                        </label>
                                        <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 p-4 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-600 max-h-48 overflow-y-auto">
                                            {Array.from({ length: 17 }, (_, i) => i + 1).map(week => (
                                                <button
                                                    key={week}
                                                    type="button"
                                                    onClick={() => {
                                                        setForm(prev => ({
                                                            ...prev,
                                                            week_pattern: prev.week_pattern.includes(week)
                                                                ? prev.week_pattern.filter(w => w !== week)
                                                                : [...prev.week_pattern, week].sort((a, b) => a - b)
                                                        }));
                                                    }}
                                                    className={`flex items-center justify-center w-full h-10 text-sm font-medium rounded-lg transition-all duration-200 ${
                                                        form.week_pattern.includes(week)
                                                            ? 'bg-blue-600 text-white shadow-md transform scale-105'
                                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-600'
                                                    }`}
                                                >
                                                    {week}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-400 transition-colors"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                                    >
                                        {saving ? t('profile.saving') : t('common.save')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default AdminCoursesPage;
