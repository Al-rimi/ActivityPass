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
        { label: t('admin.totalStudents'), value: users.filter(u => u.role === 'student').length, to: '/admin/students' },
        { label: t('admin.totalStaff'), value: users.filter(u => u.role === 'staff').length, to: '/admin/staff' },
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
                        card.to ? (
                            <Link key={card.label} to={card.to} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm transition hover:border-gray-400 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
                                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                                <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                            </Link>
                        ) : (
                            <article key={card.label} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                                <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                            </article>
                        )
                    ))}
                </section>
            </div>
        </main>
    );
};

export default AdminDashboardPage;
