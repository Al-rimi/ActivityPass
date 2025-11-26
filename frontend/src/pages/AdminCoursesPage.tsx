import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { AdminCourse } from '../types/admin';
import FloatingInput from '../components/FloatingInput';
import FloatingSelect from '../components/FloatingSelect';
import FloatingMultiSelect from '../components/FloatingMultiSelect';
import SearchInput from '../components/SearchInput';
import CustomDatePicker from '../components/CustomDatePicker';

const defaultCourseForm = () => ({
    code: '',
    title: '',
    course_type: '',
    teacher: '',
    location: '',
    term: '',
    academic_year: '',
    first_week_monday: '',
    day_of_week: '',
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
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewingCourse, setViewingCourse] = useState<AdminCourse | null>(null);
    const [academicTerms, setAcademicTerms] = useState<any[]>([]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');

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

    const fetchAcademicTerms = useCallback(async () => {
        if (!tokens) return;
        try {
            const res = await fetch('/api/admin/academic-terms/?is_active=true', { headers: authHeaders });
            if (!res.ok) throw new Error('failed');
            const data = await res.json();
            setAcademicTerms(data);
        } catch (err) {
            console.error('Failed to fetch academic terms:', err);
        }
    }, [tokens, authHeaders]);

    useEffect(() => {
        fetchCourses();
        fetchAcademicTerms();
    }, [fetchCourses, fetchAcademicTerms]);

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

    // Generate academic year options dynamically (1 year behind to 4 years ahead)
    const generateAcademicYearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [];

        // Add 1 year behind
        years.push(`${currentYear - 1}-${currentYear}`);

        // Add current year and 4 years ahead
        for (let i = 0; i <= 4; i++) {
            years.push(`${currentYear + i}-${currentYear + i + 1}`);
        }

        return years.map(year => ({ value: year, label: year }));
    }, []);

    // Calculate week 1 Monday date from academic year and term
    const calculateWeekOneMonday = useCallback((academicYear: string, term: string): string => {
        // Find the academic term that matches the academic year and semester
        const semester = term === 'first' ? 1 : term === 'second' ? 2 : 1;
        const matchingTerm = academicTerms.find(t =>
            t.academic_year === academicYear && t.semester === semester
        );
        return matchingTerm ? matchingTerm.first_week_monday : '';
    }, [academicTerms]);

    // Calculate academic year from a week 1 Monday date
    const calculateAcademicYearFromDate = useCallback((firstWeekMonday: string): string => {
        if (!firstWeekMonday) return '';

        const matchingTerm = academicTerms.find(t => t.first_week_monday === firstWeekMonday);
        return matchingTerm ? matchingTerm.academic_year : '';
    }, [academicTerms]);

    // Handle academic year change
    const handleAcademicYearChange = useCallback((academicYear: string) => {
        const firstWeekMonday = calculateWeekOneMonday(academicYear, form.term);
        setForm(prev => ({
            ...prev,
            academic_year: academicYear,
            first_week_monday: firstWeekMonday
        }));
    }, [calculateWeekOneMonday, form.term]);

    // Handle term change
    const handleTermChange = useCallback((term: string) => {
        const firstWeekMonday = calculateWeekOneMonday(form.academic_year, term);
        setForm(prev => ({
            ...prev,
            term: term,
            first_week_monday: firstWeekMonday
        }));
    }, [calculateWeekOneMonday, form.academic_year]);


    const openViewModal = (course: AdminCourse) => {
        setViewingCourse(course);
        setViewModalOpen(true);
    };

    const closeViewModal = () => {
        setViewModalOpen(false);
        setViewingCourse(null);
    };

    const openCreateModal = () => {
        setForm(defaultCourseForm());
        setEditingCourse(null);
        setModalOpen(true);
    };

    const openEditModal = (course: AdminCourse) => {
        setEditingCourse(course);
        const academicYear = calculateAcademicYearFromDate(course.first_week_monday || '');
        setForm({
            code: course.code || '',
            title: course.title || '',
            course_type: course.course_type || '',
            teacher: course.teacher || '',
            location: course.location || '',
            term: course.term || '',
            academic_year: academicYear,
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

        // Check if the academic term exists
        const semester = form.term === 'first' ? 1 : form.term === 'second' ? 2 : 1;
        const termExists = academicTerms.some(term =>
            term.academic_year === form.academic_year && term.semester === semester
        );

        if (!termExists && form.academic_year && form.term) {
            // Academic term doesn't exist, show date picker
            setShowDatePicker(true);
            setSaving(false);
            return;
        }

        await saveCourse();
    };

    const saveCourse = async () => {
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

    const saveWithNewTerm = async () => {
        if (!selectedDate) return;

        // Create the academic term first
        const semester = form.term === 'first' ? 1 : form.term === 'second' ? 2 : 1;
        const termData = {
            term: `${form.academic_year}-${semester}`,
            academic_year: form.academic_year,
            semester: semester,
            first_week_monday: selectedDate,
            is_active: true
        };

        try {
            const res = await fetch('/api/admin/academic-terms/', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(termData)
            });
            if (!res.ok) throw new Error('term_creation_failed');

            // Update local state
            setAcademicTerms(prev => [...prev, termData]);

            // Update form with the selected date
            setForm(prev => ({ ...prev, first_week_monday: selectedDate }));

            // Hide date picker and save course
            setShowDatePicker(false);
            setSelectedDate('');
            await saveCourse();

        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: 'Failed to create academic term' });
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
                <header className="flex items-center justify-between gap-3">
                    <h1 className="text-xl font-semibold flex-shrink-0">{t('admin.manageCourses', { defaultValue: 'Manage courses' })}</h1>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <button type="button" onClick={openCreateModal} className="px-3 py-2 text-sm transition-colors border border-transparent rounded-lg text-app-light-text-on-accent bg-app-light-accent hover:bg-app-light-accent-hover focus:ring-2 focus:ring-app-light-accent focus:ring-offset-2 dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover dark:focus:ring-app-dark-accent whitespace-nowrap">
                            {t('admin.addCourse', { defaultValue: 'Add course' })}
                        </button>
                    </div>
                </header>

                {notice && (
                    <div className={`rounded-md border px-4 py-3 text-sm ${notice.type === 'success'
                        ? 'border-app-light-accent bg-app-light-accent/10 text-app-light-text-primary dark:border-app-dark-accent dark:bg-app-dark-accent/10 dark:text-app-dark-text-primary'
                        : 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100'}`}>
                        {notice.text}
                    </div>
                )}

                <section className="p-5 border shadow-sm bg-app-light-surface border-app-light-border rounded-xl dark:border-app-dark-border dark:bg-app-dark-surface">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <SearchInput
                            id="course-search"
                            label={t('admin.searchCourses', { defaultValue: 'Search courses...' })}
                            value={search}
                            onChange={setSearch}
                            placeholder={t('admin.searchCourses', { defaultValue: 'Search courses...' })}
                        />
                        <FloatingSelect
                            id="term-filter"
                            label={t('admin.course.term')}
                            value={termFilter}
                            onChange={setTermFilter}
                            options={[
                                { value: '', label: t('admin.course.term') },
                                ...termOptions.map(term => ({ value: term, label: term }))
                            ]}
                            hideSelectedTextWhen={(value) => value === ''}
                        />
                        <FloatingSelect
                            id="day-filter"
                            label={t('admin.course.day')}
                            value={dayFilter}
                            onChange={setDayFilter}
                            options={[
                                { value: '', label: t('admin.course.day') },
                                ...weekdayKeys.map(key => ({ value: String(key), label: formatDay(key) }))
                            ]}
                            hideSelectedTextWhen={(value) => value === ''}
                        />
                    </div>

                    <div className="mt-6">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        <th className="px-4 py-2 whitespace-nowrap">{t('admin.course.term')}</th>
                                        <th className="px-4 py-2 whitespace-nowrap min-w-[200px]">{t('admin.course.title')}</th>
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
                                            <td colSpan={9} className="py-6 text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('admin.noCourses')}</td>
                                        </tr>
                                    )}
                                    {loading && (
                                        <tr>
                                            <td colSpan={9} className="py-6 text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('admin.table.loading')}</td>
                                        </tr>
                                    )}
                                    {filteredCourses.map(course => (
                                        <tr key={course.id} className="border-t border-app-light-border dark:border-app-dark-border">
                                            <td className="px-4 py-2 whitespace-nowrap">
                                                {course.term === 'first' ? t('admin.courseForm.term.first') :
                                                    course.term === 'second' ? t('admin.courseForm.term.second') :
                                                        course.term || '—'}
                                            </td>
                                            <td className="px-4 py-2 min-w-[200px]">
                                                <p className="font-medium text-app-light-text-primary dark:text-app-dark-text-primary">{course.title}</p>
                                                <p className="text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">{course.code || '—'} · {
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
                                                <button type="button" onClick={() => openViewModal(course)} className="text-sm font-medium transition-colors text-app-light-text-primary dark:text-app-dark-text-primary hover:text-app-light-accent dark:hover:text-app-dark-accent">
                                                    {t('common.view')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-2xl my-8 border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {editingCourse ? t('admin.editCourse') : t('admin.addCourse')}
                                </p>
                                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{form.title || t('admin.course.title')}</h2>
                            </div>
                            <button type="button" onClick={closeModal} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-4 pb-4">
                            <form onSubmit={submitCourse} className="space-y-4" autoComplete="off">
                                {/* Basic Info Row */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FloatingInput
                                        id="course-code"
                                        label={t('admin.courseForm.code')}
                                        value={form.code}
                                        onChange={(value) => setForm(prev => ({ ...prev, code: value }))}
                                    />
                                    <FloatingSelect
                                        id="course-type"
                                        label={t('admin.courseForm.type')}
                                        value={form.course_type}
                                        onChange={(value: string) => setForm(prev => ({ ...prev, course_type: value }))}
                                        options={[
                                            { value: '', label: t('admin.courseForm.type') },
                                            { value: 'Theory', label: t('admin.courseForm.type.theory') },
                                            { value: 'Technical', label: t('admin.courseForm.type.technical') },
                                            { value: 'Practice', label: t('admin.courseForm.type.practice') },
                                            { value: 'Experiment', label: t('admin.courseForm.type.experiment') },
                                        ]}
                                        hideSelectedTextWhen={(value) => value === ''}
                                    />
                                </div>

                                {/* Title */}
                                <FloatingInput
                                    id="course-title"
                                    label={t('admin.courseForm.title')}
                                    value={form.title}
                                    onChange={(value) => setForm(prev => ({ ...prev, title: value }))}
                                    required
                                />

                                {/* Teacher and Location */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FloatingInput
                                        id="course-teacher"
                                        label={t('admin.courseForm.teacher')}
                                        value={form.teacher}
                                        onChange={(value) => setForm(prev => ({ ...prev, teacher: value }))}
                                    />
                                    <FloatingInput
                                        id="course-location"
                                        label={t('admin.courseForm.location')}
                                        value={form.location}
                                        onChange={(value) => setForm(prev => ({ ...prev, location: value }))}
                                    />
                                </div>

                                {/* Term, Date, Day */}
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <FloatingSelect
                                        id="course-term"
                                        label={t('admin.courseForm.term')}
                                        value={form.term}
                                        onChange={handleTermChange}
                                        options={[
                                            { value: '', label: t('admin.courseForm.term') },
                                            { value: 'first', label: t('admin.courseForm.term.first') },
                                            { value: 'second', label: t('admin.courseForm.term.second') },
                                        ]}
                                        hideSelectedTextWhen={(value) => value === ''}
                                    />
                                    <FloatingSelect
                                        id="academic-year"
                                        label={t('admin.courseForm.academicYear', { defaultValue: 'Academic Year' })}
                                        value={form.academic_year}
                                        onChange={handleAcademicYearChange}
                                        options={[
                                            { value: '', label: t('admin.courseForm.academicYear', { defaultValue: 'Academic Year' }) },
                                            ...generateAcademicYearOptions
                                        ]}
                                        hideSelectedTextWhen={(value) => value === ''}
                                    />
                                    <FloatingSelect
                                        id="day-of-week"
                                        label={t('admin.course.day')}
                                        value={form.day_of_week}
                                        onChange={(value: string) => setForm(prev => ({ ...prev, day_of_week: value }))}
                                        options={[
                                            { value: '', label: t('admin.course.day') },
                                            ...weekdayKeys.map(key => ({ value: String(key), label: formatDay(key) }))
                                        ]}
                                        hideSelectedTextWhen={(value) => value === ''}
                                    />
                                </div>

                                {/* Sessions and Weeks */}
                                <div className="space-y-4">
                                    <FloatingMultiSelect
                                        id="course-periods"
                                        label={t('admin.courseForm.periods')}
                                        value={form.periods.map(String)}
                                        onChange={(value) => setForm(prev => ({ ...prev, periods: value.map(Number) }))}
                                        options={Array.from({ length: 13 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                                    />
                                    <FloatingMultiSelect
                                        id="course-weeks"
                                        label={t('admin.courseForm.weeks')}
                                        value={form.week_pattern.map(String)}
                                        onChange={(value) => setForm(prev => ({ ...prev, week_pattern: value.map(Number) }))}
                                        options={Array.from({ length: 17 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                                        showSearch={true}
                                    />
                                </div>

                                {/* Form Actions */}
                                <div className="flex flex-col-reverse pt-3 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-border focus:ring-offset-2 dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-border"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full px-4 py-2 text-sm font-medium transition-colors border border-transparent rounded-lg sm:w-auto text-app-light-text-on-accent bg-app-light-accent hover:bg-app-light-accent-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover dark:focus:ring-app-dark-accent"
                                    >
                                        {saving ? t('profile.saving') : t('common.save')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {viewModalOpen && viewingCourse && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-2xl my-8 border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{viewingCourse.title}</h2>
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
                                    <FloatingInput
                                        id="view-course-code"
                                        label={t('admin.courseForm.code')}
                                        value={viewingCourse.code || ''}
                                        onChange={() => { }}
                                        disabled={true}
                                    />
                                    <FloatingSelect
                                        id="view-course-type"
                                        label={t('admin.courseForm.type')}
                                        value={viewingCourse.course_type || ''}
                                        onChange={() => { }}
                                        options={[
                                            { value: 'Theory', label: t('admin.courseForm.type.theory') },
                                            { value: 'Technical', label: t('admin.courseForm.type.technical') },
                                            { value: 'Practice', label: t('admin.courseForm.type.practice') },
                                            { value: 'Experiment', label: t('admin.courseForm.type.experiment') },
                                        ]}
                                        disabled={true}
                                    />
                                </div>

                                {/* Title */}
                                <FloatingInput
                                    id="view-course-title"
                                    label={t('admin.courseForm.title')}
                                    value={viewingCourse.title || ''}
                                    onChange={() => { }}
                                    disabled={true}
                                />

                                {/* Teacher and Location */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FloatingInput
                                        id="view-course-teacher"
                                        label={t('admin.courseForm.teacher')}
                                        value={viewingCourse.teacher || ''}
                                        onChange={() => { }}
                                        disabled={true}
                                    />
                                    <FloatingInput
                                        id="view-course-location"
                                        label={t('admin.courseForm.location')}
                                        value={viewingCourse.location || ''}
                                        onChange={() => { }}
                                        disabled={true}
                                    />
                                </div>

                                {/* Term, Academic Year, Day */}
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <FloatingSelect
                                        id="view-course-term"
                                        label={t('admin.courseForm.term')}
                                        value={viewingCourse.term || ''}
                                        onChange={() => { }}
                                        options={[
                                            { value: 'first', label: t('admin.courseForm.term.first') },
                                            { value: 'second', label: t('admin.courseForm.term.second') },
                                        ]}
                                        disabled={true}
                                    />
                                    <FloatingInput
                                        id="view-course-academic-year"
                                        label={t('admin.courseForm.academicYear')}
                                        value={(() => {
                                            const academicYear = calculateAcademicYearFromDate(viewingCourse.first_week_monday || '');
                                            return academicYear || '';
                                        })()}
                                        onChange={() => { }}
                                        disabled={true}
                                    />
                                    <FloatingSelect
                                        id="view-course-day"
                                        label={t('admin.course.day')}
                                        value={String(viewingCourse.day_of_week || 1)}
                                        onChange={() => { }}
                                        options={weekdayKeys.map(key => ({
                                            value: String(key),
                                            label: formatDay(key)
                                        }))}
                                        disabled={true}
                                    />
                                </div>

                                {/* Sessions and Weeks */}
                                <div className="space-y-4">
                                    <FloatingMultiSelect
                                        id="view-course-periods"
                                        label={t('admin.courseForm.periods')}
                                        value={(viewingCourse.periods || []).map(String)}
                                        onChange={() => { }}
                                        options={Array.from({ length: 13 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                                        disabled={true}
                                    />
                                    <FloatingMultiSelect
                                        id="view-course-weeks"
                                        label={t('admin.courseForm.weeks')}
                                        value={(viewingCourse.week_pattern || []).map(String)}
                                        onChange={() => { }}
                                        options={Array.from({ length: 17 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                                        disabled={true}
                                        showSearch={true}
                                    />
                                </div>

                                {/* Form Actions */}
                                <div className="flex flex-col-reverse pt-3 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-between sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                    <button
                                        type="button"
                                        onClick={() => deleteCourse(viewingCourse.id)}
                                        disabled={deletingId === viewingCourse.id}
                                        className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-error bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-error focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-surface dark:text-app-dark-error dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-error"
                                    >
                                        {t('admin.courseDelete')}
                                    </button>
                                    <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:space-x-3 sm:space-y-0">
                                        <button
                                            type="button"
                                            onClick={closeViewModal}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-border focus:ring-offset-2 dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-border"
                                        >
                                            {t('common.close')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                closeViewModal();
                                                openEditModal(viewingCourse);
                                            }}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border border-transparent rounded-lg sm:w-auto text-app-light-text-on-accent bg-app-light-accent hover:bg-app-light-accent-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover dark:focus:ring-app-dark-accent"
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

            {showDatePicker && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-md my-8 border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                                    {t('admin.missingAcademicTerm')}
                                </h2>
                            </div>
                            <button type="button" onClick={() => setShowDatePicker(false)} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-4 pb-4">
                            <div className="space-y-4">
                                <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.selectFirstWeekMondayDescription')}
                                </p>
                                <CustomDatePicker
                                    id="first-week-monday"
                                    label={t('admin.firstWeekMonday')}
                                    value={selectedDate}
                                    onChange={setSelectedDate}
                                />
                                <div className="flex flex-col-reverse pt-3 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                    <button
                                        type="button"
                                        onClick={() => setShowDatePicker(false)}
                                        className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-border focus:ring-offset-2 dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-border"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={saveWithNewTerm}
                                        disabled={!selectedDate || saving}
                                        className="w-full px-4 py-2 text-sm font-medium transition-colors border border-transparent rounded-lg sm:w-auto text-app-light-text-on-accent bg-app-light-accent hover:bg-app-light-accent-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover dark:focus:ring-app-dark-accent"
                                    >
                                        {saving ? t('profile.saving') : t('admin.createTermAndSave')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default AdminCoursesPage;
