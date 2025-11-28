import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AdminUser, SecurityPreferences } from '../types/admin';

type Notice = { type: 'success' | 'error' | 'info'; text: string };

const AdminDashboardPage: React.FC = () => {
    const { tokens, me } = useAuth();
    const { t } = useTranslation();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [counts, setCounts] = useState<{ courses: number; activities: number; faculty: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [countsLoading, setCountsLoading] = useState(false);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [securityPrefs, setSecurityPrefs] = useState<SecurityPreferences | null>(null);
    const [securityLoading, setSecurityLoading] = useState(false);
    const [togglingSecurity, setTogglingSecurity] = useState<{ [key: string]: boolean }>({});

    // Track if we've fetched data to prevent multiple fetches
    const hasFetchedData = React.useRef(false);

    const authHeaders = useMemo(() => ({
        'Content-Type': 'application/json',
        Authorization: tokens ? `Bearer ${tokens.access}` : '',
    }), [tokens]);

    const loadUsers = useCallback(async () => {
        if (!tokens) return;
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users/', { headers: authHeaders });
            if (!res.ok) throw new Error('fetch_failed');
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoading(false);
        }
    }, [tokens, authHeaders, t]);

    const loadCounts = useCallback(async () => {
        if (!tokens) return;
        setCountsLoading(true);
        try {
            const res = await fetch('/api/admin/counts/', { headers: authHeaders });
            if (!res.ok) throw new Error('counts_failed');
            const data = await res.json();
            setCounts(data);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setCountsLoading(false);
        }
    }, [tokens, authHeaders, t]);

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

    const handleToggleSecurity = async (role: 'student' | 'staff' | 'faculty') => {
        const currentValue = securityPrefs?.[`force_${role}s_change_default` as keyof SecurityPreferences] as boolean;
        const nextEnabled = !currentValue;
        setTogglingSecurity(prev => ({ ...prev, [role]: true }));
        try {
            const res = await fetch('/api/admin/security/toggle/', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ role, enabled: nextEnabled }),
            });
            if (!res.ok) throw new Error('toggle_failed');
            const data = await res.json();
            setSecurityPrefs(prev => ({
                ...prev,
                [`force_${role}s_change_default`]: data.enabled,
                force_students_change_default: role === 'student' ? data.enabled : prev?.force_students_change_default ?? false,
                force_staff_change_default: role === 'staff' ? data.enabled : prev?.force_staff_change_default ?? false,
                force_faculty_change_default: role === 'faculty' ? data.enabled : prev?.force_faculty_change_default ?? false,
            }));
            setNotice({
                type: 'info',
                text: data.enabled ? t(`admin.prompt${role.charAt(0).toUpperCase() + role.slice(1)}sEnabled`, { count: data.flagged }) : t(`admin.prompt${role.charAt(0).toUpperCase() + role.slice(1)}sDisabled`),
            });
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.promptError') });
        } finally {
            setTogglingSecurity(prev => ({ ...prev, [role]: false }));
        }
    };

    useEffect(() => {
        if (tokens && me?.role === 'admin' && !hasFetchedData.current) {
            hasFetchedData.current = true;
            loadUsers();
            loadCounts();
            loadSecurityPrefs();
        }
    }, [tokens, me, loadUsers, loadCounts, loadSecurityPrefs]);

    const infoCards = [
        { label: t('admin.totalStudents'), value: users.filter(u => u.role === 'student').length, to: '/admin/students', loading },
        { label: t('admin.totalStaff'), value: users.filter(u => u.role === 'staff').length, to: '/admin/staff', loading },
        { label: t('admin.totalFaculty'), value: counts?.faculty ?? 0, to: '/admin/faculty', loading: countsLoading },
        { label: t('admin.totalCourses'), value: counts?.courses ?? 0, to: '/admin/courses', loading: countsLoading },
        { label: t('admin.totalActivities'), value: counts?.activities ?? 0, to: '/admin/activities', loading: countsLoading },
    ];

    return (
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-6">
                {notice && (
                    <div className={`rounded-md border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-app-light-accent bg-app-light-accent/10 text-app-light-text-primary dark:border-app-dark-accent dark:bg-app-dark-accent/20 dark:text-app-dark-text-primary' : notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100' : 'border-app-light-border bg-app-light-surface-secondary text-app-light-text-primary dark:border-app-dark-border dark:bg-app-dark-surface-secondary dark:text-app-dark-text-primary'}`}>{notice.text}</div>
                )}

                {/* Overview Cards */}
                <section className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                    {infoCards.map(card => (
                        card.to ? (
                            <Link key={card.label} to={card.to} className="p-3 transition-all duration-200 border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface hover:shadow-md hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover cursor-pointer focus:outline-none focus:ring-1 focus:ring-offset-2 focus:ring-app-light-accent dark:focus:ring-app-dark-accent min-h-[80px] flex flex-col justify-center">
                                <p className="text-xs text-app-light-text-tertiary dark:text-app-dark-text-tertiary">{card.label}</p>
                                <div className="mt-1 text-lg font-semibold">
                                    {card.loading ? (
                                        <div className="inline-block w-4 h-4 border-4 border-app-light-accent/30 border-t-app-light-accent rounded-full animate-spin dark:border-app-dark-accent/30 dark:border-t-app-dark-accent"></div>
                                    ) : (
                                        card.value
                                    )}
                                </div>
                            </Link>
                        ) : (
                            <article key={card.label} className="p-3 border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface min-h-[80px] flex flex-col justify-center">
                                <p className="text-xs text-app-light-text-tertiary dark:text-app-dark-text-tertiary">{card.label}</p>
                                <div className="mt-1 text-lg font-semibold">
                                    {card.loading ? (
                                        <div className="inline-block w-4 h-4 border-4 border-app-light-accent/30 border-t-app-light-accent rounded-full animate-spin dark:border-app-dark-accent/30 dark:border-t-app-dark-accent"></div>
                                    ) : (
                                        card.value
                                    )}
                                </div>
                            </article>
                        )
                    ))}
                </section>

                {/* Security Settings */}
                <section className="p-5 border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface">
                    <h2 className="mb-4 text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{t('admin.securitySettings', { defaultValue: 'Security Settings' })}</h2>
                    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
                        {/* Students */}
                        <div className="p-4 border rounded-lg border-app-light-border dark:border-app-dark-border">
                            <h3 className="font-medium text-app-light-text-primary dark:text-app-dark-text-primary mb-2">{t('admin.forceStudentsChangeDefault', { defaultValue: 'Force Students to Change Default Password' })}</h3>
                            <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary mb-3">{t('admin.forceStudentsChangeDefaultDesc', { defaultValue: 'Require students to change their default password on first login' })}</p>
                            <button
                                type="button"
                                onClick={() => handleToggleSecurity('student')}
                                disabled={securityLoading || togglingSecurity.student || !securityPrefs}
                                aria-pressed={securityPrefs?.force_students_change_default}
                                className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${securityPrefs?.force_students_change_default
                                    ? 'bg-app-light-accent text-app-light-text-primary border border-app-light-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover dark:text-app-dark-text-primary dark:border-app-dark-accent'
                                    : 'border border-app-light-border dark:border-app-dark-border text-app-light-text-primary dark:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover'} disabled:opacity-60`}
                            >
                                {togglingSecurity.student ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="inline-block w-4 h-4 border-4 border-current/30 border-t-current rounded-full animate-spin"></div>
                                        {t('common.loading')}
                                    </span>
                                ) : (
                                    securityPrefs?.force_students_change_default ? t('admin.promptStudentsToggleOff') : t('admin.promptStudentsToggleOn')
                                )}
                            </button>
                        </div>

                        {/* Staff */}
                        <div className="p-4 border rounded-lg border-app-light-border dark:border-app-dark-border">
                            <h3 className="font-medium text-app-light-text-primary dark:text-app-dark-text-primary mb-2">{t('admin.forceStaffChangeDefault', { defaultValue: 'Force Staff to Change Default Password' })}</h3>
                            <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary mb-3">{t('admin.forceStaffChangeDefaultDesc', { defaultValue: 'Require staff to change their default password on first login' })}</p>
                            <button
                                type="button"
                                onClick={() => handleToggleSecurity('staff')}
                                disabled={securityLoading || togglingSecurity.staff || !securityPrefs}
                                aria-pressed={securityPrefs?.force_staff_change_default}
                                className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${securityPrefs?.force_staff_change_default
                                    ? 'bg-app-light-accent text-app-light-text-primary border border-app-light-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover dark:text-app-dark-text-primary dark:border-app-dark-accent'
                                    : 'border border-app-light-border dark:border-app-dark-border text-app-light-text-primary dark:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover'} disabled:opacity-60`}
                            >
                                {togglingSecurity.staff ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="inline-block w-4 h-4 border-4 border-current/30 border-t-current rounded-full animate-spin"></div>
                                        {t('common.loading')}
                                    </span>
                                ) : (
                                    securityPrefs?.force_staff_change_default ? t('admin.promptStaffToggleOff') : t('admin.promptStaffToggleOn')
                                )}
                            </button>
                        </div>

                        {/* Faculty */}
                        <div className="p-4 border rounded-lg border-app-light-border dark:border-app-dark-border">
                            <h3 className="font-medium text-app-light-text-primary dark:text-app-dark-text-primary mb-2">{t('admin.forceFacultyChangeDefault', { defaultValue: 'Force Faculty to Change Default Password' })}</h3>
                            <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary mb-3">{t('admin.forceFacultyChangeDefaultDesc', { defaultValue: 'Require faculty to change their default password on first login' })}</p>
                            <button
                                type="button"
                                onClick={() => handleToggleSecurity('faculty')}
                                disabled={securityLoading || togglingSecurity.faculty || !securityPrefs}
                                aria-pressed={securityPrefs?.force_faculty_change_default}
                                className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${securityPrefs?.force_faculty_change_default
                                    ? 'bg-app-light-accent text-app-light-text-primary border border-app-light-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover dark:text-app-dark-text-primary dark:border-app-dark-accent'
                                    : 'border border-app-light-border dark:border-app-dark-border text-app-light-text-primary dark:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover'} disabled:opacity-60`}
                            >
                                {togglingSecurity.faculty ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="inline-block w-4 h-4 border-4 border-current/30 border-t-current rounded-full animate-spin"></div>
                                        {t('common.loading')}
                                    </span>
                                ) : (
                                    securityPrefs?.force_faculty_change_default ? t('admin.promptFacultyToggleOff') : t('admin.promptFacultyToggleOn')
                                )}
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
};

export default AdminDashboardPage;
