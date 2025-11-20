import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { AdminUser } from '../types/admin';

const defaultStaffForm = () => ({
    username: '',
    full_name: '',
    email: '',
    staff_number: '',
});

const AdminStaffPage: React.FC = () => {
    const { tokens } = useAuth();
    const { t } = useTranslation();
    const [staff, setStaff] = useState<AdminUser[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [resettingId, setResettingId] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(defaultStaffForm());
    const [creating, setCreating] = useState(false);

    const headers = useMemo(() => ({
        'Content-Type': 'application/json',
        Authorization: tokens ? `Bearer ${tokens.access}` : '',
    }), [tokens]);

    const loadStaff = useCallback(async (query = '') => {
        if (!tokens) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ role: 'staff' });
            if (query.trim()) params.set('q', query.trim());
            const res = await fetch(`/api/admin/users/?${params.toString()}`, { headers });
            if (!res.ok) throw new Error('fetch_failed');
            const data = await res.json();
            setStaff(data);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoading(false);
        }
    }, [tokens, headers, t]);

    React.useEffect(() => {
        if (tokens) {
            loadStaff();
        }
    }, [tokens, loadStaff]);

    const handleSearch = (evt: React.FormEvent) => {
        evt.preventDefault();
        loadStaff(search);
    };

    const resetPassword = async (user: AdminUser) => {
        setResettingId(user.id);
        try {
            const res = await fetch('/api/admin/reset-password/', {
                method: 'POST',
                headers,
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

    const openModal = () => {
        setForm(defaultStaffForm());
        setModalOpen(true);
    };

    const submitStaff = async (evt: React.FormEvent) => {
        evt.preventDefault();
        if (!form.username.trim()) {
            setNotice({ type: 'error', text: t('admin.staffUsernameRequired') });
            return;
        }
        setCreating(true);
        try {
            const payload = { ...form };
            if (!form.full_name.trim()) delete (payload as any).full_name;
            if (!form.email.trim()) delete (payload as any).email;
            if (!form.staff_number.trim()) delete (payload as any).staff_number;
            const res = await fetch('/api/admin/create-staff/', {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('create_staff_failed');
            const data = await res.json();
            setNotice({ type: 'success', text: t('admin.staffCreated', { username: data.user.username, password: data.password }) });
            setModalOpen(false);
            loadStaff(search);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.staffCreateError') });
        } finally {
            setCreating(false);
        }
    };

    return (
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
            <div className="flex flex-col gap-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">{t('admin.sectionTitle', { defaultValue: 'Management' })}</p>
                        <h1 className="text-2xl font-semibold">{t('admin.manageStaff', { defaultValue: 'Manage staff' })}</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('admin.manageStaffHint', { defaultValue: 'Reset access and onboard new staff.' })}</p>
                    </div>
                    <button type="button" onClick={openModal} className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm">
                        {t('admin.addStaff', { defaultValue: 'Add staff' })}
                    </button>
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
                            placeholder={t('admin.searchStaff', { defaultValue: 'Search by name, username, or email' }) || ''}
                            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-md px-4 py-2 bg-white dark:bg-gray-800"
                        />
                        <div className="flex gap-2">
                            <button type="submit" className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm">{t('admin.search')}</button>
                            <button type="button" onClick={() => { setSearch(''); loadStaff(''); }} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-sm">
                                {t('admin.refresh')}
                            </button>
                        </div>
                    </form>
                    <div className="mt-6 overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="text-gray-500 dark:text-gray-400">
                                    <th className="py-2">{t('admin.table.username')}</th>
                                    <th className="py-2">{t('profile.name')}</th>
                                    <th className="py-2">Email</th>
                                    <th className="py-2">{t('admin.staffNumber', { defaultValue: 'Staff number' })}</th>
                                    <th className="py-2">{t('admin.table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!staff.length && !loading && (
                                    <tr>
                                        <td colSpan={5} className="py-6 text-center text-gray-500">{t('admin.noStaff', { defaultValue: 'No staff users found.' })}</td>
                                    </tr>
                                )}
                                {staff.map(member => (
                                    <tr key={member.id} className="border-t border-gray-100 dark:border-gray-800">
                                        <td className="py-2 font-mono text-xs">{member.username}</td>
                                        <td className="py-2">{member.first_name || '—'}</td>
                                        <td className="py-2">{member.email || '—'}</td>
                                        <td className="py-2">{member.staff_number || '—'}</td>
                                        <td className="py-2">
                                            <button type="button" onClick={() => resetPassword(member)} className="text-sm text-rose-600 dark:text-rose-300 disabled:opacity-60" disabled={resettingId === member.id}>
                                                {resettingId === member.id ? t('profile.saving') : t('admin.resetPassword')}
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
                    <div className="w-full max-w-lg p-6 bg-white rounded-2xl shadow-2xl dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('admin.quickCreate', { defaultValue: 'Quick create' })}</p>
                                <h2 className="text-xl font-semibold">{t('admin.addStaff', { defaultValue: 'Add staff' })}</h2>
                            </div>
                            <button type="button" onClick={() => setModalOpen(false)} className="p-2 text-gray-500 rounded-md hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" aria-label="Close">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={submitStaff} className="flex flex-col gap-4">
                            <label className="text-sm text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                                {t('admin.newStaffUsername')}
                                <input value={form.username} onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))} className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-900" required />
                            </label>
                            <label className="text-sm text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                                {t('profile.name')}
                                <input value={form.full_name} onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))} className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-900" />
                            </label>
                            <label className="text-sm text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                                Email
                                <input value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-900" />
                            </label>
                            <label className="text-sm text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                                {t('admin.staffNumber', { defaultValue: 'Staff number' })}
                                <input value={form.staff_number} onChange={e => setForm(prev => ({ ...prev, staff_number: e.target.value }))} className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 bg-white dark:bg-gray-900" />
                            </label>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-sm">
                                    {t('common.cancel', { defaultValue: 'Cancel' })}
                                </button>
                                <button type="submit" disabled={creating} className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm disabled:opacity-60">
                                    {creating ? t('profile.saving') : t('admin.createStaff')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
};

export default AdminStaffPage;
