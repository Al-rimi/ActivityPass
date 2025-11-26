import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { AdminUser } from '../types/admin';
import FloatingInput from '../components/FloatingInput';
import SearchInput from '../components/SearchInput';

const defaultStaffForm = () => ({
    username: '',
    full_name: '',
    email: '',
    phone: '',
});

const AdminStaffPage: React.FC = () => {
    const { tokens } = useAuth();
    const { t } = useTranslation();
    const [staff, setStaff] = useState<AdminUser[]>([]);
    const [allStaff, setAllStaff] = useState<AdminUser[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [resettingUserId, setResettingUserId] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(defaultStaffForm());
    const [creating, setCreating] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState(defaultStaffForm());
    const [updating, setUpdating] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewingStaff, setViewingStaff] = useState<AdminUser | null>(null);

    const headers = useMemo(() => ({
        'Content-Type': 'application/json',
        Authorization: tokens ? `Bearer ${tokens.access}` : '',
    }), [tokens]);

    const filterStaff = useCallback((query: string, dataset: AdminUser[]) => {
        const q = query.trim().toLowerCase();
        if (!q) return dataset;
        return dataset.filter(member => {
            const targets = [
                member.username,
                member.first_name,
                member.email,
                member.phone,
            ].map(val => (val || '').toLowerCase());
            return targets.some(val => val && val.includes(q));
        });
    }, []);

    const loadStaff = useCallback(async (query = '') => {
        if (!tokens) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ role: 'staff' });
            const res = await fetch(`/api/admin/users/?${params.toString()}`, { headers });
            if (!res.ok) throw new Error('fetch_failed');
            const data = await res.json();
            setAllStaff(data);
            setStaff(filterStaff(query, data));
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoading(false);
        }
    }, [tokens, headers, t, filterStaff]);

    React.useEffect(() => {
        if (tokens) {
            loadStaff();
        }
    }, [tokens, loadStaff]);

    useEffect(() => {
        setStaff(filterStaff(search, allStaff));
    }, [search, allStaff, filterStaff]);

    const resetPassword = async (user: AdminUser) => {
        setResettingUserId(user.id);
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
            setResettingUserId(null);
        }
    };

    const openViewModal = (member: AdminUser) => {
        setViewingStaff(member);
        setViewModalOpen(true);
    };

    const closeViewModal = () => {
        setViewModalOpen(false);
        setViewingStaff(null);
    };

    const openModal = () => {
        setForm(defaultStaffForm());
        setModalOpen(true);
    };

    const openEditModal = (member: AdminUser) => {
        setEditingStaff(member);
        setEditForm({
            username: member.username || '',
            full_name: member.first_name || '',
            email: member.email || '',
            phone: member.staff_number || '',
        });
        setEditModalOpen(true);
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
        setEditingStaff(null);
        setEditForm(defaultStaffForm());
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
            if (!form.phone.trim()) delete (payload as any).phone;
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

    const submitEditStaff = async (evt: React.FormEvent) => {
        evt.preventDefault();
        if (!editingStaff) return;
        setUpdating(true);
        try {
            const payload: Record<string, unknown> = {
                first_name: editForm.full_name,
                email: editForm.email,
                account_meta: { staff_number: editForm.phone },
            };
            const res = await fetch(`/api/admin/users/${editingStaff.id}/`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('update_failed');
            setNotice({ type: 'success', text: t('admin.staffUpdated') });
            closeEditModal();
            loadStaff(search);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.updateError') });
        } finally {
            setUpdating(false);
        }
    };

    return (
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-6">
                <header className="flex items-center justify-between gap-3">
                    <h1 className="flex-shrink-0 text-xl font-semibold">{t('admin.manageStaff')}</h1>
                    <div className="flex items-center flex-shrink-0 gap-3">
                        <button type="button" onClick={openModal} className="px-3 py-2 text-sm text-white transition-colors rounded-md bg-app-light-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover whitespace-nowrap">
                            {t('admin.addStaff')}
                        </button>
                    </div>
                </header>

                {notice && (
                    <div className={`rounded-md border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-app-light-accent bg-app-light-accent/10 text-app-light-text-primary dark:border-app-dark-accent dark:bg-app-dark-accent/20 dark:text-app-dark-text-primary' : notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100' : 'border-app-light-border bg-app-light-surface-secondary text-app-light-text-primary dark:border-app-dark-border dark:bg-app-dark-surface-secondary dark:text-app-dark-text-primary'}`}>
                        {notice.text}
                    </div>
                )}

                <section className="p-5 border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                            <SearchInput
                                id="search"
                                label={t('admin.searchStaff')}
                                value={search}
                                onChange={setSearch}
                            />
                        </div>
                    </div>
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.username')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('profile.name')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.email')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.phone')}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!staff.length && !loading && (
                                    <tr>
                                        <td colSpan={5} className="py-6 text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('admin.noStaff', { defaultValue: 'No staff users found.' })}</td>
                                    </tr>
                                )}
                                {staff.map(member => (
                                    <tr key={member.id} className="border-t border-app-light-border dark:border-app-dark-border">
                                        <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{member.username}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{member.first_name || '—'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{member.email || '—'}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{member.phone || '—'}</td>
                                        <td className="px-4 py-2">
                                            <button type="button" onClick={() => openViewModal(member)} className="text-sm font-medium transition-colors text-app-light-text-primary dark:text-app-dark-text-primary hover:text-app-light-accent dark:hover:text-app-dark-accent">
                                                {t('common.view')}
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
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-lg my-8 border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{t('admin.addStaff', { defaultValue: 'Add staff' })}</h2>
                            </div>
                            <button type="button" onClick={() => setModalOpen(false)} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-4 pb-4">
                            <form onSubmit={submitStaff} className="space-y-4" autoComplete="off">
                                {/* Username */}
                                <FloatingInput
                                    id="username"
                                    label={t('admin.newStaffUsername')}
                                    value={form.username}
                                    onChange={(value: string) => setForm(prev => ({ ...prev, username: value }))}
                                    required
                                />

                                {/* Full Name */}
                                <FloatingInput
                                    id="full_name"
                                    label={t('profile.name')}
                                    value={form.full_name}
                                    onChange={(value: string) => setForm(prev => ({ ...prev, full_name: value }))}
                                />

                                {/* Phone and Email Row */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FloatingInput
                                        id="phone"
                                        label={t('admin.table.phone')}
                                        value={form.phone}
                                        onChange={(value: string) => setForm(prev => ({ ...prev, phone: value }))}
                                    />
                                    <FloatingInput
                                        id="email"
                                        label={t('admin.table.email')}
                                        value={form.email}
                                        onChange={(value: string) => setForm(prev => ({ ...prev, email: value }))}
                                        type="email"
                                    />
                                </div>

                                {/* Form Actions */}
                                <div className="flex flex-col-reverse pt-3 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-border focus:ring-offset-2 dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-border"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="w-full px-4 py-2 text-sm font-medium transition-colors border border-transparent rounded-lg sm:w-auto text-app-light-text-on-accent bg-app-light-accent hover:bg-app-light-accent-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover dark:focus:ring-app-dark-accent"
                                    >
                                        {creating ? t('profile.saving') : t('admin.createStaff')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {editModalOpen && editingStaff && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-lg my-8 border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.editStaff')}
                                </p>
                                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{editingStaff.username}</h2>
                            </div>
                            <button type="button" onClick={closeEditModal} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-4 pb-4">
                            <form onSubmit={submitEditStaff} className="space-y-4" autoComplete="off">
                                {/* Username (disabled) */}
                                <FloatingInput
                                    id="edit_staff_username"
                                    label={t('admin.table.username')}
                                    value={editForm.username}
                                    onChange={() => { }}
                                    disabled={true}
                                />

                                {/* Full Name */}
                                <FloatingInput
                                    id="edit_full_name"
                                    label={t('profile.name')}
                                    value={editForm.full_name}
                                    onChange={(value: string) => setEditForm(prev => ({ ...prev, full_name: value }))}
                                />

                                {/* Phone and Email Row */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FloatingInput
                                        id="edit_phone"
                                        label={t('admin.table.phone')}
                                        value={editForm.phone}
                                        onChange={(value: string) => setEditForm(prev => ({ ...prev, phone: value }))}
                                    />
                                    <FloatingInput
                                        id="edit_email"
                                        label={t('admin.table.email')}
                                        value={editForm.email}
                                        onChange={(value: string) => setEditForm(prev => ({ ...prev, email: value }))}
                                        type="email"
                                    />
                                </div>

                                {/* Form Actions */}
                                <div className="flex flex-col-reverse pt-3 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-between sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                    <button
                                        type="button"
                                        onClick={() => resetPassword(editingStaff)}
                                        disabled={resettingUserId === editingStaff.id}
                                        className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-border focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-border"
                                    >
                                        {resettingUserId === editingStaff.id ? t('profile.saving') : t('admin.resetPassword')}
                                    </button>
                                    <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:space-x-3 sm:space-y-0">
                                        <button
                                            type="button"
                                            onClick={closeEditModal}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-border focus:ring-offset-2 dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-border"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={updating}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border border-transparent rounded-lg sm:w-auto text-app-light-text-on-accent bg-app-light-accent hover:bg-app-light-accent-hover focus:ring-1 focus:ring-app-light-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover dark:focus:ring-app-dark-accent"
                                        >
                                            {updating ? t('profile.saving') : t('admin.saveChanges')}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {viewModalOpen && viewingStaff && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-lg my-8 border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.viewStaff', { defaultValue: 'View Staff' })}
                                </p>
                                <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{viewingStaff.username}</h2>
                            </div>
                            <button type="button" onClick={closeViewModal} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-4 pb-4">
                            <div className="space-y-4">
                                {/* Username (read-only) */}
                                <FloatingInput
                                    id="view_staff_username"
                                    label={t('admin.table.username')}
                                    value={viewingStaff.username || ''}
                                    onChange={() => { }}
                                    disabled={true}
                                />

                                {/* Full Name */}
                                <FloatingInput
                                    id="view_staff_full_name"
                                    label={t('profile.name')}
                                    value={viewingStaff.first_name || ''}
                                    onChange={() => { }}
                                    disabled={true}
                                />

                                {/* Phone and Email Row */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FloatingInput
                                        id="view_staff_phone"
                                        label={t('admin.table.phone')}
                                        value={viewingStaff.phone || ''}
                                        onChange={() => { }}
                                        disabled={true}
                                    />
                                    <FloatingInput
                                        id="view_staff_email"
                                        label={t('admin.table.email')}
                                        value={viewingStaff.email || ''}
                                        onChange={() => { }}
                                        disabled={true}
                                        type="email"
                                    />
                                </div>

                                {/* Form Actions */}
                                <div className="flex flex-col-reverse pt-3 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-between sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                    <button
                                        type="button"
                                        onClick={() => resetPassword(viewingStaff)}
                                        disabled={resettingUserId === viewingStaff.id}
                                        className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover focus:ring-1 focus:ring-app-light-border focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:focus:ring-app-dark-border"
                                    >
                                        {resettingUserId === viewingStaff.id ? t('profile.saving') : t('admin.resetPassword')}
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
                                                openEditModal(viewingStaff);
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
        </main>
    );
};

export default AdminStaffPage;
