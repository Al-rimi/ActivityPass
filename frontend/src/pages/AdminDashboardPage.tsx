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
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [securityPrefs, setSecurityPrefs] = useState<SecurityPreferences | null>(null);
    const [securityLoading, setSecurityLoading] = useState(false);
    const [togglingSecurity, setTogglingSecurity] = useState(false);

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

    const handleToggleStaffEnforcement = async () => {
        const nextEnabled = !(securityPrefs?.force_staff_change_default);
        setTogglingSecurity(true);
        try {
            const res = await fetch('/api/admin/security/toggle/', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ role: 'staff', enabled: nextEnabled }),
            });
            if (!res.ok) throw new Error('toggle_failed');
            const data = await res.json();
            setSecurityPrefs(prev => ({
                force_students_change_default: prev?.force_students_change_default ?? false,
                force_staff_change_default: data.enabled,
            }));
            setNotice({
                type: 'info',
                text: data.enabled ? t('admin.promptStaffEnabled', { count: data.flagged }) : t('admin.promptStaffDisabled'),
            });
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.promptError') });
        } finally {
            setTogglingSecurity(false);
        }
    };

    useEffect(() => {
        if (tokens && me?.role === 'admin') {
            loadUsers();
            loadSecurityPrefs();
        }
    }, [tokens, me, loadUsers, loadSecurityPrefs]);

    const infoCards = [
        { label: t('admin.totalUsers'), value: users.length },
        { label: t('admin.totalStudents'), value: users.filter(u => u.role === 'student').length, to: '/admin/students' },
        { label: t('admin.totalStaff'), value: users.filter(u => u.role === 'staff').length, to: '/admin/staff' },
    ];

    return (
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-6">
                {notice && (
                    <div className={`rounded-md border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-app-light-accent bg-app-light-accent/10 text-app-light-text-primary dark:border-app-dark-accent dark:bg-app-dark-accent/20 dark:text-app-dark-text-primary' : notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100' : 'border-app-light-border bg-app-light-surface-secondary text-app-light-text-primary dark:border-app-dark-border dark:bg-app-dark-surface-secondary dark:text-app-dark-text-primary'}`}>{notice.text}</div>
                )}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {infoCards.map(card => (
                        card.to ? (
                            <Link key={card.label} to={card.to} className="p-5 transition border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface hover:border-app-light-border dark:hover:border-app-dark-border focus:outline-none focus:ring-1 focus:ring-offset-2 focus:ring-app-light-accent dark:focus:ring-app-dark-accent">
                                <p className="text-sm text-app-light-text-tertiary dark:text-app-dark-text-tertiary">{card.label}</p>
                                <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                            </Link>
                        ) : (
                            <article key={card.label} className="p-5 border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface">
                                <p className="text-sm text-app-light-text-tertiary dark:text-app-dark-text-tertiary">{card.label}</p>
                                <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                            </article>
                        )
                    ))}
                </section>

                <section className="p-5 border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface">
                    <h2 className="mb-4 text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{t('admin.securitySettings', { defaultValue: 'Security Settings' })}</h2>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="font-medium text-app-light-text-primary dark:text-app-dark-text-primary">{t('admin.forceStudentsChangeDefault', { defaultValue: 'Force Students to Change Default Password' })}</h3>
                                <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('admin.forceStudentsChangeDefaultDesc', { defaultValue: 'Require students to change their default password on first login' })}</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleToggleStudentEnforcement}
                                disabled={securityLoading || togglingSecurity || !securityPrefs}
                                aria-pressed={securityPrefs?.force_students_change_default}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${securityPrefs?.force_students_change_default
                                    ? 'bg-app-light-accent text-app-light-text-primary border border-app-light-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover dark:text-app-dark-text-primary dark:border-app-dark-accent'
                                    : 'border border-app-light-border dark:border-app-dark-border text-app-light-text-primary dark:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover'} disabled:opacity-60`}
                            >
                                {securityPrefs?.force_students_change_default ? t('admin.promptStudentsToggleOff') : t('admin.promptStudentsToggleOn')}
                            </button>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="font-medium text-app-light-text-primary dark:text-app-dark-text-primary">{t('admin.forceStaffChangeDefault', { defaultValue: 'Force Staff to Change Default Password' })}</h3>
                                <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('admin.forceStaffChangeDefaultDesc', { defaultValue: 'Require staff to change their default password on first login' })}</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleToggleStaffEnforcement}
                                disabled={securityLoading || togglingSecurity || !securityPrefs}
                                aria-pressed={securityPrefs?.force_staff_change_default}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${securityPrefs?.force_staff_change_default
                                    ? 'bg-app-light-accent text-app-light-text-primary border border-app-light-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover dark:text-app-dark-text-primary dark:border-app-dark-accent'
                                    : 'border border-app-light-border dark:border-app-dark-border text-app-light-text-primary dark:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover'} disabled:opacity-60`}
                            >
                                {securityPrefs?.force_staff_change_default ? t('admin.promptStaffToggleOff') : t('admin.promptStaffToggleOn')}
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
};

export default AdminDashboardPage;
