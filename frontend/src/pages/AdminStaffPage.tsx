import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { AdminUser } from '../types/admin';
import FloatingInput from '../components/FloatingInput';
import SearchInput from '../components/SearchInput';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthenticatedApi } from '../utils/api';

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
    const { authenticatedJsonFetch } = useAuthenticatedApi();

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
        const activitiesMatch = path.match(/^(.+)\/activities$/);
        const viewMatch = path.match(/^(.+)$/);

        if (editMatch) {
            identifier = editMatch[1];
            action = 'edit';
        } else if (deleteMatch) {
            identifier = deleteMatch[1];
            action = 'delete';
        } else if (activitiesMatch) {
            identifier = activitiesMatch[1];
            action = 'activities';
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
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
    const [selectedStaffForActivities, setSelectedStaffForActivities] = useState<AdminUser | null>(null);
    const [selectedStaffActivities, setSelectedStaffActivities] = useState<any[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    // Track if we've loaded initial form data to prevent overwriting localStorage on mount
    const hasLoadedInitialData = React.useRef(false);
    // Track if we are currently loading initial data to prevent saving during load
    const isLoadingInitialData = React.useRef(false);

    // Track if data has been fetched to prevent multiple fetches
    const hasFetchedData = React.useRef(false);

    // Save form data whenever it changes (as user types)
    React.useEffect(() => {
        if (!isLoadingInitialData.current && hasLoadedInitialData.current) {
            localStorage.setItem('admin-staff-add-form', JSON.stringify(form));
        }
    }, [form]);

    const loadStaff = useCallback(async (query = '') => {
        if (!tokens) return;
        setLoading(true);
        try {
            const qs = new URLSearchParams();
            if (query.trim()) {
                qs.set('q', query.trim());
            }
            const data = await authenticatedJsonFetch(`/api/admin/staff-list/?${qs.toString()}`);
            setAllStaff(data);
            setStaff(data);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoading(false);
        }
    }, [tokens, authenticatedJsonFetch, t]);

    const loadStaffActivities = useCallback(async (staff: AdminUser) => {
        setLoadingActivities(true);
        try {
            const data = await authenticatedJsonFetch(`/api/activities/?created_by=${staff.id}`);
            setSelectedStaffActivities(data);
            setSelectedStaffForActivities(staff);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoadingActivities(false);
        }
    }, [authenticatedJsonFetch, t]);

    React.useEffect(() => {
        if (tokens && !hasFetchedData.current) {
            hasFetchedData.current = true;
            loadStaff();
        }
    }, [tokens, loadStaff]);

    useEffect(() => {
        loadStaff(search);
    }, [search, loadStaff]);

    const resetPassword = async (user: AdminUser) => {
        setResettingUserId(user.id);
        try {
            const data = await authenticatedJsonFetch('/api/admin/reset-password/', {
                method: 'POST',
                body: JSON.stringify({ user_id: user.id }),
            });
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
        setFieldErrors({}); // Clear any previous field errors
        try {
            const payload: Record<string, unknown> = {
                username: form.username,
                full_name: form.full_name,
                email: form.email,
                staff_number: form.phone,
            };
            if (!form.full_name.trim()) delete payload.full_name;
            if (!form.email.trim()) delete payload.email;
            if (!form.phone.trim()) delete payload.staff_number;
            const data = await authenticatedJsonFetch('/api/admin/create-staff/', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            // Close the modal first
            setModalOpen(false);
            setForm(defaultStaffForm());
            // Then navigate and show success message
            navigate('/admin/staff');
            setNotice({ type: 'success', text: t('admin.staffCreated', { username: data.user.username, password: data.password }) });
            loadStaff(search);
        } catch (err: any) {
            console.error(err);
            // Handle field-specific validation errors
            if (err.detail === 'username already exists') {
                setFieldErrors({ username: t('admin.usernameAlreadyExists', { defaultValue: 'Username already exists' }) });
            } else if (err.detail === 'username required') {
                setFieldErrors({ username: t('admin.staffUsernameRequired') });
            } else {
                setNotice({ type: 'error', text: t('admin.staffCreateError') });
            }
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
            await authenticatedJsonFetch(`/api/admin/users/${editingStaff.id}/`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });
            // Close the modal first
            setEditModalOpen(false);
            setEditingStaff(null);
            setEditForm(defaultStaffForm());
            // Then navigate and show success message
            navigate('/admin/staff');
            setNotice({ type: 'success', text: t('admin.staffUpdated') });
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
            await authenticatedJsonFetch(`/api/admin/users/${staffId}/`, { method: 'DELETE' });
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
        setSelectedStaffForActivities(null);

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
                } else if (action === 'activities') {
                    // Load activities for this staff
                    loadStaffActivities(staffMember);
                } else {
                    // Default to view modal when identifier exists but no specific action
                    openViewModal(staffMember);
                }
            }
            // If staff member not found, modals stay closed
        }
        // If no identifier, modals stay closed
    }, [identifier, action, allStaff, loadStaffActivities]);

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
                {/* Show activities page */}
                {action === 'activities' && selectedStaffForActivities && (
                    <>
                        <header className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin/staff')}
                                    className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover"
                                    aria-label={t('common.back')}
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M15 18l-6-6 6-6" />
                                    </svg>
                                </button>
                                <div>
                                    <h1 className="text-xl font-semibold">{t('admin.staff.activities', { defaultValue: 'Staff Activities' })}</h1>
                                    <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {selectedStaffForActivities.first_name || selectedStaffForActivities.username}
                                    </p>
                                </div>
                            </div>
                        </header>

                        <section className="p-5 border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface">
                            {loadingActivities ? (
                                <div className="py-8 text-center">
                                    <div className="inline-block w-4 h-4 border-4 border-app-light-accent/30 border-t-app-light-accent rounded-full animate-spin dark:border-app-dark-accent/30 dark:border-t-app-dark-accent"></div>
                                    <p className="mt-2 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {t('common.loading')}
                                    </p>
                                </div>
                            ) : selectedStaffActivities.length === 0 ? (
                                <div className="py-8 text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.staff.noActivities', { defaultValue: 'No activities found for this staff member.' })}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-medium">{t('admin.staff.activities')}</h2>
                                        <span className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                            {selectedStaffActivities.length} {t('admin.table.activities', { defaultValue: 'activities' })}
                                        </span>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {selectedStaffActivities.map((activity: any) => (
                                            <div key={activity.id} className="p-4 border rounded-lg border-app-light-border dark:border-app-dark-border hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover cursor-pointer transition-colors" onClick={() => navigate(`/admin/activities/${activity.id}?from=staff&staffId=${selectedStaffForActivities.username}`)}>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-medium text-app-light-text-primary dark:text-app-dark-text-primary truncate">
                                                            {activity.title || 'Unknown Activity'}
                                                        </h3>
                                                        <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary mt-1">
                                                            {activity.description || 'No description'}
                                                        </p>
                                                        {activity.start_datetime && (
                                                            <p className="text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary mt-1">
                                                                {new Date(activity.start_datetime).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    </>
                )}

                {/* Show main staff list when not on activities page */}
                {action !== 'activities' && (
                    <>
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
                                <table className="w-full text-xs xss:text-sm text-left table-fixed">
                                    <thead>
                                        <tr className="text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                            <th className="px-4 py-2 whitespace-nowrap min-w-0 flex-1 xss:min-w-16">{t('admin.table.staff')}</th>
                                            <th className="p-0.5 xss:px-1 sm:px-4 py-2 whitespace-nowrap text-center w-16 xss:w-20">{t('admin.table.activities')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading && !staff.length && (
                                            <tr>
                                                <td colSpan={2} className="py-6 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="inline-block w-4 h-4 border-4 border-current/30 border-t-current rounded-full animate-spin"></div>
                                                        <span className="text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('admin.table.loading')}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {!loading && !staff.length && (
                                            <tr>
                                                <td colSpan={2} className="py-6 text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('admin.noStaff', { defaultValue: 'No staff found.' })}</td>
                                            </tr>
                                        )}
                                        {!loading && staff.map(member => (
                                            <tr key={member.id} className="border-t border-app-light-border dark:border-app-dark-border">
                                                <td className="px-4 py-2 min-w-0 flex-1 xss:min-w-16">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/admin/staff/${member.username}`)}
                                                        className="w-full text-left block"
                                                    >
                                                        <p className="font-medium text-app-light-text-primary hover:text-app-light-text-secondary dark:text-app-dark-text-primary dark:hover:text-app-dark-text-secondary">{member.first_name || '—'}</p>
                                                        <div className="whitespace-nowrap block overflow-hidden relative">
                                                            <p className="text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">{member.username}</p>
                                                            <span className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-app-light-surface to-transparent dark:from-app-dark-surface"></span>
                                                        </div>
                                                    </button>
                                                </td>
                                                <td className="p-0.5 xss:px-1 sm:px-4 py-2 whitespace-nowrap text-center w-16 xss:w-20">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/admin/staff/${member.username}/activities`)}
                                                        className="text-sm font-medium text-app-light-text-primary hover:text-app-light-text-secondary dark:text-app-dark-text-primary dark:hover:text-app-dark-text-secondary"
                                                    >
                                                        {member.activity_count || 0}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                )}

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
                                        onChange={(value: string) => {
                                            setForm(prev => ({ ...prev, username: value }));
                                            if (fieldErrors.username) {
                                                setFieldErrors(prev => ({ ...prev, username: '' }));
                                            }
                                        }}
                                        required
                                        error={!!fieldErrors.username}
                                    />
                                    {fieldErrors.username && (
                                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{fieldErrors.username}</p>
                                    )}

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
                                            {creating ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <div className="inline-block w-4 h-4 border-4 border-app-light-text-on-accent/30 border-t-app-light-text-on-accent rounded-full animate-spin"></div>
                                                    {t('profile.saving')}
                                                </span>
                                            ) : (
                                                t('admin.createStaff')
                                            )}
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
                                            {resettingUserId === editingStaff.id ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <div className="inline-block w-4 h-4 border-4 border-app-light-text-primary/30 border-t-app-light-text-primary rounded-full animate-spin dark:border-app-dark-text-primary/30 dark:border-t-app-dark-text-primary"></div>
                                                    {t('profile.saving')}
                                                </span>
                                            ) : (
                                                t('admin.resetPassword')
                                            )}
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
                                                {updating ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <div className="inline-block w-4 h-4 border-4 border-app-light-text-on-accent/30 border-t-app-light-text-on-accent rounded-full animate-spin"></div>
                                                        {t('profile.saving')}
                                                    </span>
                                                ) : (
                                                    t('admin.saveChanges')
                                                )}
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
