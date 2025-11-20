import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AdminUser } from '../types/admin';

type Notice = { type: 'success' | 'error' | 'info'; text: string };

const AdminDashboardPage: React.FC = () => {
    const { tokens, me } = useAuth();
    const { t } = useTranslation();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<Notice | null>(null);

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

    useEffect(() => {
        if (tokens && me?.role === 'admin') {
            loadUsers();
        }
    }, [tokens, me, loadUsers]);

    const infoCards = [
        { label: t('admin.totalUsers'), value: users.length },
        { label: t('admin.totalStudents'), value: users.filter(u => u.role === 'student').length },
        { label: t('admin.totalStaff'), value: users.filter(u => u.role === 'staff').length },
    ];

    const quickActions = [
        {
            title: t('admin.manageStudents', { defaultValue: 'Manage students' }),
            description: t('admin.manageStudentsHint', { defaultValue: 'Search, add, and update student accounts with full profile data.' }),
            to: '/admin/students',
            accent: 'from-indigo-500/10 to-blue-500/10 text-indigo-900 dark:text-indigo-200',
        },
        {
            title: t('admin.manageStaff', { defaultValue: 'Manage staff' }),
            description: t('admin.manageStaffHint', { defaultValue: 'Create new staff logins and reset access for existing members.' }),
            to: '/admin/staff',
            accent: 'from-emerald-500/10 to-teal-500/10 text-emerald-900 dark:text-emerald-200',
        },
    ];

    return (
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
            <div className="flex flex-col gap-6">
                {me?.username && <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">{me.username}</p>}
                {notice && (
                    <div className={`rounded-md border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/40 dark:text-green-100' : notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/40 dark:text-red-100' : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-100'}`}>{notice.text}</div>
                )}
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {infoCards.map(card => (
                        <article key={card.label} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                        </article>
                    ))}
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quickActions.map(action => (
                        <article key={action.to} className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br ${action.accent} p-6 shadow-sm flex flex-col gap-3`}>
                            <p className="text-sm font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400">{t('admin.sectionTitle', { defaultValue: 'Management' })}</p>
                            <h3 className="text-2xl font-semibold">{action.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 flex-1">{action.description}</p>
                            <Link
                                to={action.to}
                                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"
                            >
                                {t('admin.openSection', { defaultValue: 'Open section' })}
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14" />
                                    <path d="m12 5 7 7-7 7" />
                                </svg>
                            </Link>
                        </article>
                    ))}
                </section>

                <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
                    <h2 className="text-lg font-semibold">{t('admin.activityLogTitle', { defaultValue: 'Recent highlights' })}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {loading
                            ? t('admin.loadingHighlights', { defaultValue: 'Loading latest user metrics…' })
                            : t('admin.highlightsHelper', { defaultValue: 'Use the sections above to drill into student and staff information, add new accounts, or trigger password resets.' })}
                    </p>
                </section>
            </div>
        </main>
    );
};

export default AdminDashboardPage;
