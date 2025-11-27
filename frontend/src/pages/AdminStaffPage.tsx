import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { AdminUser } from '../types/admin';
import FloatingInput from '../components/FloatingInput';
import SearchInput from '../components/SearchInput';
import { useParams, useNavigate } from 'react-router-dom';

const defaultStaffForm = () => ({
    username: '',
    full_name: '',
    email: '',
    phone: '',
});

const AdminStaffPage: React.FC = () => {
    const { tokens } = useAuth();
    const { t } = useTranslation();
    const { '*': path } = useParams<{ '*': string }>();
    const navigate = useNavigate();

    // Capture saved form data before it gets cleared
    const capturedFormData = React.useRef<string | null>(null);

    // Capture the data on mount
    React.useEffect(() => {
        const savedForm = localStorage.getItem('admin-staff-add-form');
        capturedFormData.current = savedForm;
    }, []);    // Parse the path
    let identifier: string | null = null;
    let action: string | null = null;

    if (path === 'add') {
        action = 'add';
    } else if (path) {
        const editMatch = path.match(/^(.+)\/edit$/);
        const deleteMatch = path.match(/^(.+)\/delete$/);
        const viewMatch = path.match(/^(.+)$/);

        if (editMatch) {
            identifier = editMatch[1];
            action = 'edit';
        } else if (deleteMatch) {
            identifier = deleteMatch[1];
            action = 'delete';
        } else if (viewMatch && viewMatch[1] !== 'add') {
            identifier = viewMatch[1];
            action = null; // view
        }
    }
    const [staff, setStaff] = useState<AdminUser[]>([]);
    const [allStaff, setAllStaff] = useState<AdminUser[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [resettingUserId, setResettingUserId] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(() => {
        const saved = localStorage.getItem('admin-staff-add-form');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const clean = Object.fromEntries(Object.entries(parsed).filter(([k, v]) => v !== undefined && v !== null));
                return { ...defaultStaffForm(), ...clean };
            } catch (e) {
                return defaultStaffForm();
            }
        }
        return defaultStaffForm();
    });
    const [creating, setCreating] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState(defaultStaffForm());
    const [updating, setUpdating] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewingStaff, setViewingStaff] = useState<AdminUser | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
    const [staffToDelete, setStaffToDelete] = useState<AdminUser | null>(null);

    // Track if we've loaded initial form data to prevent overwriting localStorage on mount
    const hasLoadedInitialData = React.useRef(false);
    // Track if we are currently loading initial data to prevent saving during load
    const isLoadingInitialData = React.useRef(false);

    // Save form data whenever it changes (as user types)
    React.useEffect(() => {
        if (!isLoadingInitialData.current && hasLoadedInitialData.current) {
            localStorage.setItem('admin-staff-add-form', JSON.stringify(form));
        }
    }, [form]);


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
        // Mark that we're loading initial data to prevent saving during load
        isLoadingInitialData.current = true;

        // Load saved form data if available, otherwise use defaults
        const savedForm = localStorage.getItem('admin-staff-add-form');
        if (savedForm) {
            try {
                const parsedForm = JSON.parse(savedForm);
                setForm(parsedForm);
            } catch (error) {
                console.error('Failed to parse saved staff form:', error);
                setForm(defaultStaffForm());
            }
        } else {
            setForm(defaultStaffForm());
        }

        // Mark that we've loaded initial data
        hasLoadedInitialData.current = true;
        isLoadingInitialData.current = false;

    }; const openEditModal = (member: AdminUser) => {
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
            localStorage.removeItem('admin-staff-add-form');
            navigate('/admin/staff');
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
                phone: editForm.phone,
            };
            const res = await fetch(`/api/admin/users/${editingStaff.id}/`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('update_failed');
            setNotice({ type: 'success', text: t('admin.staffUpdated') });
            navigate(`/admin/staff/${editingStaff.username}`);
            loadStaff(search);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.updateError') });
        } finally {
            setUpdating(false);
        }
    };

    const deleteStaff = async (staffId: number) => {
        setDeletingId(staffId);
        try {
            const res = await fetch(`/api/admin/users/${staffId}/`, { method: 'DELETE', headers: headers });
            if (!res.ok) throw new Error('delete_failed');
            loadStaff(search);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.deleteError') });
        } finally {
            setDeletingId(null);
        }
    };

    const openDeleteConfirm = (staff: AdminUser) => {
        setStaffToDelete(staff);
        setDeleteConfirmModalOpen(true);
    };

    const confirmDeleteStaff = async () => {
        if (!staffToDelete) return;
        const staffId = staffToDelete.id;
        setDeleteConfirmModalOpen(false);
        setStaffToDelete(null);
        await deleteStaff(staffId);
        navigate('/admin/staff');
    };

    const cancelDelete = () => {
        setDeleteConfirmModalOpen(false);
        setStaffToDelete(null);
        if (staffToDelete) {
            navigate(`/admin/staff/${staffToDelete.username}`);
        }
    };

    useEffect(() => {
        // Always close all modals first
        setViewModalOpen(false);
        setEditModalOpen(false);
        setModalOpen(false);
        setViewingStaff(null);
        setEditingStaff(null);
        setDeleteConfirmModalOpen(false);
        setStaffToDelete(null);

        if (action === 'add') {
            isLoadingInitialData.current = true;
            const saved = localStorage.getItem('admin-staff-add-form');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    const clean = Object.fromEntries(Object.entries(parsed).filter(([k, v]) => v !== undefined && v !== null));
                    setForm({ ...defaultStaffForm(), ...clean });
                } catch (e) {
                    console.error('Failed to parse saved staff form:', e);
                    setForm(defaultStaffForm());
                }
            } else {
                setForm(defaultStaffForm());
            }
            hasLoadedInitialData.current = true;
            isLoadingInitialData.current = false;
            setModalOpen(true);
        } else if (identifier) {
            const staffMember = allStaff.find(s => s.username === identifier);
            if (staffMember) {
                if (action === 'edit') {
                    openEditModal(staffMember);
                } else if (action === 'delete') {
                    openDeleteConfirm(staffMember);
                } else {
                    // Default to view modal when identifier exists but no specific action
                    openViewModal(staffMember);
                }
            }
            // If staff member not found, modals stay closed
        }
        // If no identifier, modals stay closed
    }, [identifier, action, allStaff]);

    useEffect(() => {
        const isAnyModalOpen = modalOpen || editModalOpen || viewModalOpen || deleteConfirmModalOpen;
        const originalOverflow = document.body.style.overflow;
        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [modalOpen, editModalOpen, viewModalOpen, deleteConfirmModalOpen]);

    return (
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-6">
                <header className="flex items-center justify-between gap-3">
                    <h1 className="flex-shrink-0 text-xl font-semibold">{t('admin.manageStaff')}</h1>
                    <div className="flex items-center flex-shrink-0 gap-3">
                        <button type="button" onClick={() => navigate('/admin/staff/add')} className="px-3 py-2 text-sm text-white transition-colors rounded-md bg-app-light-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover whitespace-nowrap">
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
                                            <button type="button" onClick={() => navigate(`/admin/staff/${member.username}`)} className="text-sm font-medium transition-colors text-app-light-text-primary dark:text-app-dark-text-primary hover:text-app-light-accent dark:hover:text-app-dark-accent">
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
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
                    <div className="flex items-center justify-center min-h-full p-4">
                        <div className="w-full max-w-lg border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                            <div className="flex items-center justify-between p-4 pb-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{t('admin.addStaff', { defaultValue: 'Add staff' })}</h2>
                                </div>
                                <button type="button" onClick={() => {
                                    // Save current form data before closing
                                    localStorage.setItem('admin-staff-add-form', JSON.stringify(form));
                                    navigate('/admin/staff');
                                }} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
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
                                            onClick={() => {
                                                localStorage.removeItem('admin-staff-add-form');
                                                navigate('/admin/staff');
                                            }}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={creating}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border border-transparent rounded-lg sm:w-auto text-app-light-text-on-accent bg-app-light-accent hover:bg-app-light-accent-hover disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover"
                                        >
                                            {creating ? t('profile.saving') : t('admin.createStaff')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editModalOpen && editingStaff && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
                    <div className="flex items-center justify-center min-h-full p-4">
                        <div className="w-full max-w-lg border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                            <div className="flex items-center justify-between p-4 pb-3">
                                <div>
                                    <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {t('admin.editStaff')}
                                    </p>
                                    <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{editingStaff.username}</h2>
                                </div>
                                <button type="button" onClick={() => navigate(`/admin/staff/${editingStaff.username}`)} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
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
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                        >
                                            {resettingUserId === editingStaff.id ? t('profile.saving') : t('admin.resetPassword')}
                                        </button>
                                        <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:space-x-3 sm:space-y-0">
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/admin/staff/${editingStaff.username}`)}
                                                className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                            >
                                                {t('common.cancel')}
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={updating}
                                                className="w-full px-4 py-2 text-sm font-medium transition-colors border border-transparent rounded-lg sm:w-auto text-app-light-text-on-accent bg-app-light-accent hover:bg-app-light-accent-hover disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover"
                                            >
                                                {updating ? t('profile.saving') : t('admin.saveChanges')}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {viewModalOpen && viewingStaff && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
                    <div className="flex items-center justify-center min-h-full p-4">
                        <div className="w-full max-w-lg border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                            <div className="flex items-center justify-between p-4 pb-3">
                                <div>
                                    <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {t('admin.viewStaff', { defaultValue: 'View Staff' })}
                                    </p>
                                    <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{viewingStaff.username}</h2>
                                </div>
                                <button type="button" onClick={() => navigate('/admin/staff')} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
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
                                            onClick={() => navigate(`/admin/staff/${viewingStaff.username}/delete`)}
                                            disabled={deletingId === viewingStaff.id}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-error bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-surface dark:text-app-dark-error dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                        >
                                            {t('common.delete')}
                                        </button>
                                        <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:space-x-3 sm:space-y-0">
                                            <button
                                                type="button"
                                                onClick={() => resetPassword(viewingStaff)}
                                                disabled={resettingUserId === viewingStaff.id}
                                                className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                            >
                                                {resettingUserId === viewingStaff.id ? t('profile.saving') : t('admin.resetPassword')}
                                            </button>
                                            <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:space-x-3 sm:space-y-0">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate('/admin/staff')}
                                                    className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                                >
                                                    {t('common.close')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/admin/staff/${viewingStaff.username}/edit`)}
                                                    className="w-full px-4 py-2 text-sm font-medium transition-colors border border-transparent rounded-lg sm:w-auto text-app-light-text-on-accent bg-app-light-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover"
                                                >
                                                    {t('common.edit')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmModalOpen && staffToDelete && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
                    <div className="flex items-center justify-center min-h-full p-4">
                        <div className="w-full max-w-md border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                            <div className="p-6">
                                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full dark:bg-red-900/30">
                                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <h3 className="mb-2 text-lg font-semibold text-center text-app-light-text-primary dark:text-app-dark-text-primary">
                                    {t('admin.staffDeleteConfirmTitle', { defaultValue: 'Delete Staff Member' })}
                                </h3>
                                <p className="mb-6 text-sm text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.staffDeleteConfirm', { defaultValue: 'Are you sure you want to delete this staff member? This action cannot be undone.', name: staffToDelete.first_name || staffToDelete.username })}
                                </p>
                                <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0">
                                    <button
                                        type="button"
                                        onClick={cancelDelete}
                                        className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmDeleteStaff}
                                        disabled={deletingId === staffToDelete.id}
                                        className="w-full px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg sm:w-auto bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-600 dark:hover:bg-red-700"
                                    >
                                        {deletingId === staffToDelete.id ? t('common.deleting', { defaultValue: 'Deleting...' }) : t('common.delete')}
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

export default AdminStaffPage;
