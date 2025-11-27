import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { AdminActivity } from '../types/admin';
import FloatingSelect from '../components/FloatingSelect';
import FloatingInput from '../components/FloatingInput';
import FloatingMultiSelect from '../components/FloatingMultiSelect';
import FloatingTextarea from '../components/FloatingTextarea';
import SelectPeriod from '../components/SelectPeriod';
import LocationPicker from '../components/LocationPicker';
import SearchInput from '../components/SearchInput';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

const COLLEGE_OPTIONS = [
    { value: '计算机科学与技术学院', labelKey: 'admin.college.computerScience' },
    { value: '国际经济与贸易学院', labelKey: 'admin.college.internationalEconomics' },
    { value: '初阳学院', labelKey: 'admin.college.chuYang' },
    { value: '经管学院', labelKey: 'admin.college.economicsManagement' },
    { value: '法学院', labelKey: 'admin.college.law' },
    { value: '马克思学院', labelKey: 'admin.college.marxism' },
    { value: '教育学院', labelKey: 'admin.college.education' },
    { value: '联合教育学院', labelKey: 'admin.college.jointEducation' },
    { value: '心理学院', labelKey: 'admin.college.psychology' },
    { value: '儿童教育学院', labelKey: 'admin.college.earlyChildhoodEducation' },
    { value: '体育学院', labelKey: 'admin.college.physicalEducation' },
    { value: '人文学院', labelKey: 'admin.college.humanities' },
    { value: '外语学院', labelKey: 'admin.college.foreignLanguages' },
    { value: '艺术学院', labelKey: 'admin.college.arts' },
    { value: '设计学院', labelKey: 'admin.college.design' },
    { value: '数学学院', labelKey: 'admin.college.mathematics' },
    { value: '计算机学院', labelKey: 'admin.college.computerScience' },
    { value: '数理医学院', labelKey: 'admin.college.mathematicsPhysicsMedicine' },
    { value: '物电学院', labelKey: 'admin.college.physicsElectronics' },
    { value: '化材学院', labelKey: 'admin.college.chemistryMaterials' },
    { value: '生命科学学院', labelKey: 'admin.college.lifeSciences' },
    { value: '地环学院', labelKey: 'admin.college.earthEnvironmental' },
    { value: '工学院', labelKey: 'admin.college.engineering' },
    { value: '国社学院', labelKey: 'admin.college.nationalSociety' },
    { value: '非洲学院', labelKey: 'admin.college.africaStudies' },
    { value: '终身学院', labelKey: 'admin.college.lifelongEducation' },
    { value: '杭州自动化学院', labelKey: 'admin.college.hangzhouAutomation' },
];

const COUNTRY_OPTIONS = [
    { value: 'China', labelKey: 'admin.country.china' },
    { value: 'United States', labelKey: 'admin.country.unitedStates' },
    { value: 'United Kingdom', labelKey: 'admin.country.unitedKingdom' },
    { value: 'Canada', labelKey: 'admin.country.canada' },
    { value: 'Australia', labelKey: 'admin.country.australia' },
    { value: 'Germany', labelKey: 'admin.country.germany' },
    { value: 'France', labelKey: 'admin.country.france' },
    { value: 'Japan', labelKey: 'admin.country.japan' },
    { value: 'South Korea', labelKey: 'admin.country.southKorea' },
    { value: 'India', labelKey: 'admin.country.india' },
    { value: 'Brazil', labelKey: 'admin.country.brazil' },
    { value: 'Russia', labelKey: 'admin.country.russia' },
    { value: 'Italy', labelKey: 'admin.country.italy' },
    { value: 'Spain', labelKey: 'admin.country.spain' },
    { value: 'Netherlands', labelKey: 'admin.country.netherlands' },
    { value: 'Sweden', labelKey: 'admin.country.sweden' },
    { value: 'Norway', labelKey: 'admin.country.norway' },
    { value: 'Denmark', labelKey: 'admin.country.denmark' },
    { value: 'Finland', labelKey: 'admin.country.finland' },
    { value: 'Poland', labelKey: 'admin.country.poland' },
    { value: 'Czech Republic', labelKey: 'admin.country.czechRepublic' },
    { value: 'Austria', labelKey: 'admin.country.austria' },
    { value: 'Switzerland', labelKey: 'admin.country.switzerland' },
    { value: 'Belgium', labelKey: 'admin.country.belgium' },
    { value: 'Portugal', labelKey: 'admin.country.portugal' },
    { value: 'Greece', labelKey: 'admin.country.greece' },
    { value: 'Turkey', labelKey: 'admin.country.turkey' },
    { value: 'Egypt', labelKey: 'admin.country.egypt' },
    { value: 'South Africa', labelKey: 'admin.country.southAfrica' },
    { value: 'Nigeria', labelKey: 'admin.country.nigeria' },
    { value: 'Kenya', labelKey: 'admin.country.kenya' },
    { value: 'Ghana', labelKey: 'admin.country.ghana' },
    { value: 'Ethiopia', labelKey: 'admin.country.ethiopia' },
    { value: 'Morocco', labelKey: 'admin.country.morocco' },
    { value: 'Algeria', labelKey: 'admin.country.algeria' },
    { value: 'Tunisia', labelKey: 'admin.country.tunisia' },
    { value: 'Libya', labelKey: 'admin.country.libya' },
    { value: 'Sudan', labelKey: 'admin.country.sudan' },
    { value: 'Uganda', labelKey: 'admin.country.uganda' },
    { value: 'Tanzania', labelKey: 'admin.country.tanzania' },
    { value: 'Zimbabwe', labelKey: 'admin.country.zimbabwe' },
    { value: 'Zambia', labelKey: 'admin.country.zambia' },
    { value: 'Botswana', labelKey: 'admin.country.botswana' },
    { value: 'Namibia', labelKey: 'admin.country.namibia' },
    { value: 'Mozambique', labelKey: 'admin.country.mozambique' },
    { value: 'Madagascar', labelKey: 'admin.country.madagascar' },
    { value: 'Angola', labelKey: 'admin.country.angola' },
    { value: 'Gabon', labelKey: 'admin.country.gabon' },
    { value: 'Cameroon', labelKey: 'admin.country.cameroon' },
    { value: 'Ivory Coast', labelKey: 'admin.country.ivoryCoast' },
    { value: 'Senegal', labelKey: 'admin.country.senegal' },
    { value: 'Mali', labelKey: 'admin.country.mali' },
    { value: 'Burkina Faso', labelKey: 'admin.country.burkinaFaso' },
    { value: 'Niger', labelKey: 'admin.country.niger' },
    { value: 'Chad', labelKey: 'admin.country.chad' },
    { value: 'Central African Republic', labelKey: 'admin.country.centralAfricanRepublic' },
    { value: 'Equatorial Guinea', labelKey: 'admin.country.equatorialGuinea' },
    { value: 'Guinea', labelKey: 'admin.country.guinea' },
    { value: 'Sierra Leone', labelKey: 'admin.country.sierraLeone' },
    { value: 'Liberia', labelKey: 'admin.country.liberia' },
    { value: 'Guinea-Bissau', labelKey: 'admin.country.guineaBissau' },
    { value: 'Cape Verde', labelKey: 'admin.country.capeVerde' },
    { value: 'Sao Tome and Principe', labelKey: 'admin.country.saoTomePrincipe' },
    { value: 'Democratic Republic of the Congo', labelKey: 'admin.country.democraticRepublicCongo' },
    { value: 'Republic of the Congo', labelKey: 'admin.country.republicCongo' },
    { value: 'Rwanda', labelKey: 'admin.country.rwanda' },
    { value: 'Burundi', labelKey: 'admin.country.burundi' },
    { value: 'Somalia', labelKey: 'admin.country.somalia' },
    { value: 'Djibouti', labelKey: 'admin.country.djibouti' },
    { value: 'Eritrea', labelKey: 'admin.country.eritrea' },
    { value: 'Yemen', labelKey: 'admin.country.yemen' },
    { value: 'Oman', labelKey: 'admin.country.oman' },
    { value: 'United Arab Emirates', labelKey: 'admin.country.unitedArabEmirates' },
    { value: 'Qatar', labelKey: 'admin.country.qatar' },
    { value: 'Bahrain', labelKey: 'admin.country.bahrain' },
    { value: 'Kuwait', labelKey: 'admin.country.kuwait' },
    { value: 'Saudi Arabia', labelKey: 'admin.country.saudiArabia' },
    { value: 'Jordan', labelKey: 'admin.country.jordan' },
    { value: 'Lebanon', labelKey: 'admin.country.lebanon' },
    { value: 'Syria', labelKey: 'admin.country.syria' },
    { value: 'Iraq', labelKey: 'admin.country.iraq' },
    { value: 'Iran', labelKey: 'admin.country.iran' },
    { value: 'Afghanistan', labelKey: 'admin.country.afghanistan' },
    { value: 'Pakistan', labelKey: 'admin.country.pakistan' },
    { value: 'Bangladesh', labelKey: 'admin.country.bangladesh' },
    { value: 'Sri Lanka', labelKey: 'admin.country.sriLanka' },
    { value: 'Nepal', labelKey: 'admin.country.nepal' },
    { value: 'Bhutan', labelKey: 'admin.country.bhutan' },
    { value: 'Maldives', labelKey: 'admin.country.maldives' },
    { value: 'Myanmar', labelKey: 'admin.country.myanmar' },
    { value: 'Thailand', labelKey: 'admin.country.thailand' },
    { value: 'Cambodia', labelKey: 'admin.country.cambodia' },
    { value: 'Laos', labelKey: 'admin.country.laos' },
    { value: 'Vietnam', labelKey: 'admin.country.vietnam' },
    { value: 'Malaysia', labelKey: 'admin.country.malaysia' },
    { value: 'Singapore', labelKey: 'admin.country.singapore' },
    { value: 'Indonesia', labelKey: 'admin.country.indonesia' },
    { value: 'Philippines', labelKey: 'admin.country.philippines' },
    { value: 'Brunei', labelKey: 'admin.country.brunei' },
    { value: 'East Timor', labelKey: 'admin.country.eastTimor' },
    { value: 'Papua New Guinea', labelKey: 'admin.country.papuaNewGuinea' },
    { value: 'Solomon Islands', labelKey: 'admin.country.solomonIslands' },
    { value: 'Vanuatu', labelKey: 'admin.country.vanuatu' },
    { value: 'Fiji', labelKey: 'admin.country.fiji' },
    { value: 'Samoa', labelKey: 'admin.country.samoa' },
    { value: 'Tonga', labelKey: 'admin.country.tonga' },
    { value: 'Kiribati', labelKey: 'admin.country.kiribati' },
    { value: 'Tuvalu', labelKey: 'admin.country.tuvalu' },
    { value: 'Nauru', labelKey: 'admin.country.nauru' },
    { value: 'Marshall Islands', labelKey: 'admin.country.marshallIslands' },
    { value: 'Micronesia', labelKey: 'admin.country.micronesia' },
    { value: 'Palau', labelKey: 'admin.country.palau' },
    { value: 'New Zealand', labelKey: 'admin.country.newZealand' },
    { value: 'Mexico', labelKey: 'admin.country.mexico' },
    { value: 'Guatemala', labelKey: 'admin.country.guatemala' },
    { value: 'Belize', labelKey: 'admin.country.belize' },
    { value: 'El Salvador', labelKey: 'admin.country.elSalvador' },
    { value: 'Honduras', labelKey: 'admin.country.honduras' },
    { value: 'Nicaragua', labelKey: 'admin.country.nicaragua' },
    { value: 'Costa Rica', labelKey: 'admin.country.costaRica' },
    { value: 'Panama', labelKey: 'admin.country.panama' },
    { value: 'Colombia', labelKey: 'admin.country.colombia' },
    { value: 'Venezuela', labelKey: 'admin.country.venezuela' },
    { value: 'Ecuador', labelKey: 'admin.country.ecuador' },
    { value: 'Peru', labelKey: 'admin.country.peru' },
    { value: 'Bolivia', labelKey: 'admin.country.bolivia' },
    { value: 'Chile', labelKey: 'admin.country.chile' },
    { value: 'Argentina', labelKey: 'admin.country.argentina' },
    { value: 'Uruguay', labelKey: 'admin.country.uruguay' },
    { value: 'Paraguay', labelKey: 'admin.country.paraguay' },
    { value: 'Guyana', labelKey: 'admin.country.guyana' },
    { value: 'Suriname', labelKey: 'admin.country.suriname' },
    { value: 'French Guiana', labelKey: 'admin.country.frenchGuiana' },
    { value: 'Cuba', labelKey: 'admin.country.cuba' },
    { value: 'Haiti', labelKey: 'admin.country.haiti' },
    { value: 'Dominican Republic', labelKey: 'admin.country.dominicanRepublic' },
    { value: 'Jamaica', labelKey: 'admin.country.jamaica' },
    { value: 'Trinidad and Tobago', labelKey: 'admin.country.trinidadTobago' },
    { value: 'Barbados', labelKey: 'admin.country.barbados' },
    { value: 'Bahamas', labelKey: 'admin.country.bahamas' },
    { value: 'Antigua and Barbuda', labelKey: 'admin.country.antiguaBarbuda' },
    { value: 'Saint Lucia', labelKey: 'admin.country.saintLucia' },
    { value: 'Saint Vincent and the Grenadines', labelKey: 'admin.country.saintVincentGrenadines' },
    { value: 'Grenada', labelKey: 'admin.country.grenada' },
    { value: 'Saint Kitts and Nevis', labelKey: 'admin.country.saintKittsNevis' },
    { value: 'Dominica', labelKey: 'admin.country.dominica' },
];

const CHINESE_LEVEL_OPTIONS = [
    { value: '', labelKey: 'admin.chineseLevel.any' },
    { value: 'HSK1', labelKey: 'admin.chineseLevel.hsk1' },
    { value: 'HSK2', labelKey: 'admin.chineseLevel.hsk2' },
    { value: 'HSK3', labelKey: 'admin.chineseLevel.hsk3' },
    { value: 'HSK4', labelKey: 'admin.chineseLevel.hsk4' },
    { value: 'HSK5', labelKey: 'admin.chineseLevel.hsk5' },
    { value: 'HSK6', labelKey: 'admin.chineseLevel.hsk6' },
    { value: 'Native', labelKey: 'admin.chineseLevel.native' },
];



const defaultActivityForm = () => ({
    title: '',
    description: '',
    college_required: [] as string[],
    chinese_level_min: '',
    countries: [] as string[],
    start_datetime: '',
    end_datetime: '',
    capacity: 50,
    location: null as { lat: number; lng: number; address?: string } | null,
});

const AdminActivitiesPage: React.FC = () => {
    const { tokens } = useAuth();
    const { t } = useTranslation();
    const { '*': path } = useParams<{ '*': string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Capture saved form data before it gets cleared
    const capturedFormData = React.useRef<string | null>(null);

    // Capture the data on mount
    React.useEffect(() => {
        const savedForm = localStorage.getItem('admin-activity-add-form');
        capturedFormData.current = savedForm;
    }, []);

    // Parse the path
    let identifier: string | null = null;
    let action: string | null = null;

    if (path === 'add') {
        action = 'add';
    } else if (path) {
        const editMatch = path.match(/^(\d+)\/edit$/);
        const deleteMatch = path.match(/^(\d+)\/delete$/);
        const viewMatch = path.match(/^(\d+)$/);

        if (editMatch) {
            identifier = editMatch[1];
            action = 'edit';
        } else if (deleteMatch) {
            identifier = deleteMatch[1];
            action = 'delete';
        } else if (viewMatch) {
            identifier = viewMatch[1];
            action = null; // view
        }
    }
    const [activities, setActivities] = useState<AdminActivity[]>([]);
    const [allActivities, setAllActivities] = useState<AdminActivity[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(() => {
        const saved = localStorage.getItem('admin-activity-add-form');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const clean = Object.fromEntries(Object.entries(parsed).filter(([k, v]) => v !== undefined && v !== null));
                return { ...defaultActivityForm(), ...clean };
            } catch (e) {
                return defaultActivityForm();
            }
        }
        return defaultActivityForm();
    });
    const [creating, setCreating] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<AdminActivity | null>(null);
    const [editForm, setEditForm] = useState(defaultActivityForm());
    const [updating, setUpdating] = useState(false);
    const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
    const [activityToDelete, setActivityToDelete] = useState<AdminActivity | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewingActivity, setViewingActivity] = useState<AdminActivity | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Track if we've loaded initial form data to prevent overwriting localStorage on mount
    const hasLoadedInitialData = React.useRef(false);
    // Track if we are currently loading initial data to prevent saving during load
    const isLoadingInitialData = React.useRef(false);

    // Save form data whenever it changes (as user types)
    React.useEffect(() => {
        if (!isLoadingInitialData.current && hasLoadedInitialData.current) {
            localStorage.setItem('admin-activity-add-form', JSON.stringify(form));
        }
    }, [form]);

    // Determine where to navigate when closing the view modal
    const getViewClosePath = useCallback(() => {
        const from = searchParams.get('from');
        const studentId = searchParams.get('studentId');

        if (from === 'student' && studentId) {
            return `/admin/students/${studentId}/activities`;
        }
        return '/admin/activities';
    }, [searchParams]);

    const headers = useMemo(() => ({
        'Content-Type': 'application/json',
        Authorization: tokens ? `Bearer ${tokens.access}` : '',
    }), [tokens]);

    const filterActivities = useCallback((query: string, dataset: AdminActivity[]) => {
        const q = query.trim().toLowerCase();
        if (!q) return dataset;
        return dataset.filter(activity => {
            const collegeStr = Array.isArray(activity.college_required)
                ? activity.college_required.join(' ')
                : activity.college_required || '';
            const targets = [
                activity.title,
                activity.description,
                collegeStr,
                activity.created_by_username,
            ].map(val => (val || '').toLowerCase());
            return targets.some(val => val && val.includes(q));
        });
    }, []);

    const loadActivities = useCallback(async (query = '') => {
        if (!tokens) return;
        setLoading(true);
        try {
            const res = await fetch('/api/activities/', { headers });
            if (!res.ok) throw new Error('fetch_failed');
            const data = await res.json();
            setAllActivities(data);
            setActivities(filterActivities(query, data));
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoading(false);
        }
    }, [tokens, headers, t, filterActivities]);

    React.useEffect(() => {
        if (tokens) {
            loadActivities();
        }
    }, [tokens, loadActivities]);

    useEffect(() => {
        setActivities(filterActivities(search, allActivities));
    }, [search, allActivities, filterActivities]);

    const submitActivity = async (evt: React.FormEvent) => {
        evt.preventDefault();
        if (!form.title.trim()) {
            setNotice({ type: 'error', text: t('admin.activityTitleRequired', { defaultValue: 'Activity title is required.' }) });
            return;
        }
        if (!form.start_datetime || !form.end_datetime) {
            setNotice({ type: 'error', text: t('admin.activityDatesRequired', { defaultValue: 'Start and end dates are required.' }) });
            return;
        }
        if (!form.location) {
            setNotice({ type: 'error', text: t('admin.activityLocationRequired', { defaultValue: 'Activity location is required.' }) });
            return;
        }
        setCreating(true);
        try {
            const payload = { ...form };

            // Handle college_required: if all colleges selected, store "all", otherwise store the array
            if (form.college_required.length === COLLEGE_OPTIONS.length) {
                (payload as any).college_required = 'all';
            } else if (!form.college_required.length) {
                delete (payload as any).college_required;
            }

            // Handle countries: if all countries selected, store "all", otherwise store the array
            if (form.countries.length === COUNTRY_OPTIONS.length) {
                (payload as any).countries = 'all';
            } else if (!form.countries.length) {
                delete (payload as any).countries;
            }

            // Convert location object to string
            if (form.location) {
                const loc = form.location;
                (payload as any).location = loc.address || `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;
            } else {
                (payload as any).location = '';
            }

            if (!form.description.trim()) delete (payload as any).description;
            if (!form.chinese_level_min.trim()) delete (payload as any).chinese_level_min;

            const res = await fetch('/api/activities/', {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('create_activity_failed');
            const data = await res.json();
            setNotice({ type: 'success', text: t('admin.activityCreated', { title: data.title }) });
            localStorage.removeItem('admin-activity-add-form');
            navigate('/admin/activities');
            loadActivities(search);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.activityCreateError', { defaultValue: 'Unable to create activity.' }) });
        } finally {
            setCreating(false);
        }
    };

    const submitEditActivity = async (evt: React.FormEvent) => {
        evt.preventDefault();
        if (!editingActivity) return;
        if (!editForm.title.trim()) {
            setNotice({ type: 'error', text: t('admin.activityTitleRequired', { defaultValue: 'Activity title is required.' }) });
            return;
        }
        if (!editForm.start_datetime || !editForm.end_datetime) {
            setNotice({ type: 'error', text: t('admin.activityDatesRequired', { defaultValue: 'Start and end dates are required.' }) });
            return;
        }
        if (!editForm.location) {
            setNotice({ type: 'error', text: t('admin.activityLocationRequired', { defaultValue: 'Activity location is required.' }) });
            return;
        }
        setUpdating(true);
        try {
            const payload: Record<string, unknown> = {
                title: editForm.title,
                description: editForm.description,
                college_required: editForm.college_required,
                chinese_level_min: editForm.chinese_level_min,
                countries: editForm.countries,
                start_datetime: editForm.start_datetime,
                end_datetime: editForm.end_datetime,
                capacity: editForm.capacity,
                location: editForm.location,
            };

            // Handle college_required: if all colleges selected, store "all", otherwise store the array
            if (Array.isArray(editForm.college_required) && editForm.college_required.length === COLLEGE_OPTIONS.length) {
                payload.college_required = 'all' as any;
            }

            // Handle countries: if all countries selected, store "all", otherwise store the array
            if (Array.isArray(editForm.countries) && editForm.countries.length === COUNTRY_OPTIONS.length) {
                payload.countries = 'all' as any;
            }

            // Convert location object to string
            if (editForm.location) {
                const loc = editForm.location;
                payload.location = loc.address || `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;
            } else {
                payload.location = '';
            }

            const res = await fetch(`/api/activities/${editingActivity.id}/`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('update_failed');
            setNotice({ type: 'success', text: t('admin.activityUpdated', { defaultValue: 'Activity updated successfully.' }) });
            navigate(`/admin/activities/${editingActivity.id}`);
            loadActivities(search);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.updateError') });
        } finally {
            setUpdating(false);
        }
    };

    const openDeleteConfirm = (activity: AdminActivity) => {
        setActivityToDelete(activity);
        setDeleteConfirmModalOpen(true);
    };

    const confirmDeleteActivity = async () => {
        if (!activityToDelete) return;
        const activityId = activityToDelete.id;
        setDeleteConfirmModalOpen(false);
        setActivityToDelete(null);
        await deleteActivity(activityToDelete);
        navigate('/admin/activities');
    };

    const cancelDelete = () => {
        setDeleteConfirmModalOpen(false);
        setActivityToDelete(null);
        if (activityToDelete) {
            navigate(`/admin/activities/${activityToDelete.id}`);
        }
    };

    const deleteActivity = async (activity: AdminActivity) => {
        if (!tokens) return;
        setDeletingId(activity.id);
        try {
            const res = await fetch(`/api/activities/${activity.id}/`, { method: 'DELETE', headers });
            if (!res.ok) throw new Error('delete_failed');
            loadActivities(search);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.activityDeleteError', { defaultValue: 'Failed to delete activity.' }) });
        } finally {
            setDeletingId(null);
        }
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    useEffect(() => {
        // Always close all modals first
        setModalOpen(false);
        setViewModalOpen(false);
        setEditModalOpen(false);
        setViewingActivity(null);
        setEditingActivity(null);
        setDeleteConfirmModalOpen(false);
        setActivityToDelete(null);

        if (action === 'add') {
            isLoadingInitialData.current = true;
            const saved = localStorage.getItem('admin-activity-add-form');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    const clean = Object.fromEntries(Object.entries(parsed).filter(([k, v]) => v !== undefined && v !== null));
                    setForm({ ...defaultActivityForm(), ...clean });
                } catch (e) {
                    console.error('Failed to parse saved activity form:', e);
                    setForm(defaultActivityForm());
                }
            } else {
                setForm(defaultActivityForm());
            }
            hasLoadedInitialData.current = true;
            isLoadingInitialData.current = false;
            setModalOpen(true);
        } else if (identifier) {
            const activityId = parseInt(identifier, 10);
            if (!isNaN(activityId) && allActivities.length > 0) {
                const activity = allActivities.find(a => a.id === activityId);
                if (activity) {
                    const effectiveAction = action === 'edit' ? 'edit' : action === 'delete' ? 'delete' : 'view';
                    if (effectiveAction === 'edit') {
                        setEditingActivity(activity);
                        setEditForm({
                            title: activity.title || '',
                            description: activity.description || '',
                            college_required: activity.college_required === 'all' ? COLLEGE_OPTIONS.map(opt => opt.value) :
                                Array.isArray(activity.college_required) ? activity.college_required : [],
                            chinese_level_min: activity.chinese_level_min || '',
                            countries: activity.countries === 'all' ? COUNTRY_OPTIONS.map(opt => opt.value) :
                                Array.isArray(activity.countries) ? activity.countries : [],
                            start_datetime: activity.start_datetime || '',
                            end_datetime: activity.end_datetime || '',
                            capacity: activity.capacity || 50,
                            location: null, // Reset location for editing - user needs to re-select
                        });
                        setEditModalOpen(true);
                    } else if (effectiveAction === 'delete') {
                        openDeleteConfirm(activity);
                    } else if (effectiveAction === 'view') {
                        setViewingActivity(activity);
                        setViewModalOpen(true);
                    }
                }
            }
            // If activity not found, modals stay closed
        }
        // If no identifier, modals stay closed
    }, [identifier, action, allActivities]);

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
                    <h1 className="flex-shrink-0 text-xl font-semibold">{t('admin.manageActivities', { defaultValue: 'Manage Activities' })}</h1>
                    <div className="flex items-center flex-shrink-0 gap-3">
                        <button type="button" onClick={() => navigate('/admin/activities/add')} className="px-3 py-2 text-sm text-white transition-colors rounded-md bg-app-light-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover whitespace-nowrap">
                            {t('admin.addActivity', { defaultValue: 'Add Activity' })}
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
                                id="activity-search"
                                label={t('admin.searchActivities', { defaultValue: 'Search activities...' })}
                                value={search}
                                onChange={setSearch}
                                placeholder={t('admin.searchActivities', { defaultValue: 'Search by title, description, or creator' })}
                            />
                        </div>
                    </div>
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.title', { defaultValue: 'Title' })}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.startDate', { defaultValue: 'Start Date' })}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.endDate', { defaultValue: 'End Date' })}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.capacity', { defaultValue: 'Capacity' })}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.creator', { defaultValue: 'Creator' })}</th>
                                    <th className="px-4 py-2 whitespace-nowrap">{t('admin.table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!activities.length && !loading && (
                                    <tr>
                                        <td colSpan={6} className="py-6 text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('admin.noActivities', { defaultValue: 'No activities found.' })}</td>
                                    </tr>
                                )}
                                {activities.map(activity => (
                                    <tr key={activity.id} className="border-t border-app-light-border dark:border-app-dark-border">
                                        <td className="px-4 py-2 font-medium">{activity.title}</td>
                                        <td className="px-4 py-2 text-sm whitespace-nowrap">{formatDateTime(activity.start_datetime)}</td>
                                        <td className="px-4 py-2 text-sm whitespace-nowrap">{formatDateTime(activity.end_datetime)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{activity.capacity}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{activity.created_by_username}</td>
                                        <td className="px-4 py-2">
                                            <button type="button" onClick={() => navigate(`/admin/activities/${activity.id}`)} className="text-sm font-medium transition-colors text-app-light-text-primary dark:text-app-dark-text-primary hover:text-app-light-accent dark:hover:text-app-dark-accent">
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
                        <div className="w-full max-w-2xl border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                            <div className="flex items-center justify-between p-4 pb-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{t('admin.addActivity', { defaultValue: 'Add Activity' })}</h2>
                                </div>
                                <button type="button" onClick={() => {
                                    // Save current form data before closing
                                    localStorage.setItem('admin-activity-add-form', JSON.stringify(form));
                                    navigate('/admin/activities');
                                }} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="px-4 pb-4">
                                <form onSubmit={submitActivity} className="space-y-4" autoComplete="off">
                                    {/* Basic Info */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="activity-title"
                                            label={t('admin.activity.title', { defaultValue: 'Title' })}
                                            value={form.title}
                                            onChange={(value) => setForm(prev => ({ ...prev, title: value }))}
                                            required
                                        />
                                        <FloatingInput
                                            id="activity-capacity"
                                            label={t('admin.activity.capacity', { defaultValue: 'Capacity' })}
                                            value={form.capacity.toString()}
                                            onChange={(value) => setForm(prev => ({ ...prev, capacity: Number(value) || 50 }))}
                                            type="number"
                                        />
                                    </div>

                                    {/* Description */}
                                    <FloatingTextarea
                                        id="activity-description"
                                        label={t('admin.activity.description', { defaultValue: 'Description' })}
                                        value={form.description}
                                        onChange={(value) => setForm(prev => ({ ...prev, description: value }))}
                                        rows={3}
                                        placeholder={t('admin.activity.description')}
                                    />

                                    {/* Date/Time Period */}
                                    <SelectPeriod
                                        id="activity-period"
                                        label={t('admin.activity.period', { defaultValue: 'Period' })}
                                        startValue={form.start_datetime}
                                        endValue={form.end_datetime}
                                        onStartChange={(value) => setForm(prev => ({ ...prev, start_datetime: value }))}
                                        onEndChange={(value) => setForm(prev => ({ ...prev, end_datetime: value }))}
                                    />

                                    {/* Location */}
                                    <LocationPicker
                                        id="activity-location"
                                        label={t('admin.activity.location', { defaultValue: 'Location' })}
                                        value={form.location}
                                        onChange={(location) => setForm(prev => ({ ...prev, location }))}
                                        placeholder={t('admin.activity.selectLocation', { defaultValue: 'Select activity location...' })}
                                    />

                                    {/* Requirements */}
                                    <div className="space-y-4">
                                        <FloatingMultiSelect
                                            id="activity-college"
                                            label={t('admin.activity.college', { defaultValue: 'College' })}
                                            value={form.college_required}
                                            onChange={(value) => setForm(prev => ({ ...prev, college_required: value }))}
                                            options={COLLEGE_OPTIONS.map(option => ({
                                                value: option.value,
                                                label: t(option.labelKey, { defaultValue: option.value })
                                            }))}
                                        />
                                        <FloatingMultiSelect
                                            id="activity-countries"
                                            label={t('admin.activity.countries', { defaultValue: 'Countries' })}
                                            value={form.countries}
                                            onChange={(value) => setForm(prev => ({ ...prev, countries: value }))}
                                            options={COUNTRY_OPTIONS.map(option => ({
                                                value: option.value,
                                                label: t(option.labelKey, { defaultValue: option.value })
                                            }))}
                                        />
                                        <FloatingSelect
                                            id="activity-chinese-level"
                                            label={t('admin.activity.chineseLevelMin', { defaultValue: 'Min Chinese Level' })}
                                            value={form.chinese_level_min}
                                            onChange={(value) => setForm(prev => ({ ...prev, chinese_level_min: value }))}
                                            options={CHINESE_LEVEL_OPTIONS.map(option => ({
                                                value: option.value,
                                                label: t(option.labelKey, { defaultValue: option.value })
                                            }))}
                                            hideSelectedTextWhen={(value) => value === ''}
                                        />
                                    </div>

                                    {/* Form Actions */}
                                    <div className="flex flex-col-reverse pt-3 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                localStorage.removeItem('admin-activity-add-form');
                                                navigate('/admin/activities');
                                            }}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={creating}
                                            className="w-full px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg sm:w-auto bg-app-light-accent hover:bg-app-light-accent-hover disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover"
                                        >
                                            {creating ? t('profile.saving') : t('admin.createActivity', { defaultValue: 'Create Activity' })}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editModalOpen && editingActivity && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
                    <div className="flex items-center justify-center min-h-full p-4">
                        <div className="w-full max-w-2xl border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                            <div className="flex items-center justify-between p-4 pb-3">
                                <div>
                                    <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {t('admin.editActivity', { defaultValue: 'Edit Activity' })}
                                    </p>
                                    <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{editingActivity.title}</h2>
                                </div>
                                <button type="button" onClick={() => navigate(`/admin/activities/${editingActivity.id}`)} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="px-4 pb-4">
                                <form onSubmit={submitEditActivity} className="space-y-4" autoComplete="off">
                                    {/* Basic Info */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="edit-activity-title"
                                            label={t('admin.activity.title', { defaultValue: 'Title' })}
                                            value={editForm.title}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, title: value }))}
                                            required
                                        />
                                        <FloatingInput
                                            id="edit-activity-capacity"
                                            label={t('admin.activity.capacity', { defaultValue: 'Capacity' })}
                                            value={editForm.capacity.toString()}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, capacity: Number(value) || 50 }))}
                                            type="number"
                                        />
                                    </div>

                                    {/* Description */}
                                    <FloatingTextarea
                                        id="edit-activity-description"
                                        label={t('admin.activity.description', { defaultValue: 'Description' })}
                                        value={editForm.description}
                                        onChange={(value) => setEditForm(prev => ({ ...prev, description: value }))}
                                        rows={3}
                                        placeholder={t('admin.activity.description')}
                                    />

                                    {/* Date/Time Period */}
                                    <SelectPeriod
                                        id="edit-activity-period"
                                        label={t('admin.activity.period', { defaultValue: 'Period' })}
                                        startValue={editForm.start_datetime}
                                        endValue={editForm.end_datetime}
                                        onStartChange={(value) => setEditForm(prev => ({ ...prev, start_datetime: value }))}
                                        onEndChange={(value) => setEditForm(prev => ({ ...prev, end_datetime: value }))}
                                    />

                                    {/* Location */}
                                    <LocationPicker
                                        id="edit-activity-location"
                                        label={t('admin.activity.location', { defaultValue: 'Location' })}
                                        value={editForm.location}
                                        onChange={(location) => setEditForm(prev => ({ ...prev, location }))}
                                        placeholder={t('admin.activity.selectLocation', { defaultValue: 'Select activity location...' })}
                                    />

                                    {/* Requirements */}
                                    <div className="space-y-4">
                                        <FloatingMultiSelect
                                            id="edit-activity-college"
                                            label={t('admin.activity.college', { defaultValue: 'College' })}
                                            value={editForm.college_required}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, college_required: value }))}
                                            options={COLLEGE_OPTIONS.map(option => ({
                                                value: option.value,
                                                label: t(option.labelKey, { defaultValue: option.value })
                                            }))}
                                        />
                                        <FloatingMultiSelect
                                            id="edit-activity-countries"
                                            label={t('admin.activity.countries', { defaultValue: 'Countries' })}
                                            value={editForm.countries}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, countries: value }))}
                                            options={COUNTRY_OPTIONS.map(option => ({
                                                value: option.value,
                                                label: t(option.labelKey, { defaultValue: option.value })
                                            }))}
                                        />
                                        <FloatingSelect
                                            id="edit-activity-chinese-level-min"
                                            label={t('admin.activity.chineseLevelMin', { defaultValue: 'Min Chinese Level' })}
                                            value={editForm.chinese_level_min}
                                            onChange={(value: string) => setEditForm(prev => ({ ...prev, chinese_level_min: value }))}
                                            options={CHINESE_LEVEL_OPTIONS.map(option => ({
                                                value: option.value,
                                                label: t(option.labelKey, { defaultValue: option.value })
                                            }))}
                                        />
                                    </div>

                                    {/* Form Actions */}
                                    <div className="flex flex-col-reverse pt-3 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/admin/activities/${editingActivity.id}`)}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={updating}
                                            className="w-full px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg sm:w-auto bg-app-light-accent hover:bg-app-light-accent-hover disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover"
                                        >
                                            {updating ? t('profile.saving') : t('admin.saveChanges')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {viewModalOpen && viewingActivity && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
                    <div className="flex items-center justify-center min-h-full p-4">
                        <div className="w-full max-w-2xl border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                            <div className="flex items-center justify-between p-4 pb-3">
                                <div>
                                    <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {t('admin.viewActivity', { defaultValue: 'View Activity' })}
                                    </p>
                                    <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{viewingActivity.title}</h2>
                                </div>
                                <button type="button" onClick={() => navigate(getViewClosePath())} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="px-4 pb-4">
                                <div className="space-y-4">
                                    {/* Basic Info */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="view-activity-title"
                                            label={t('admin.activity.title', { defaultValue: 'Title' })}
                                            value={viewingActivity.title || ''}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                        <FloatingInput
                                            id="view-activity-capacity"
                                            label={t('admin.activity.capacity', { defaultValue: 'Capacity' })}
                                            value={viewingActivity.capacity?.toString() || ''}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>

                                    {/* Description */}
                                    <FloatingTextarea
                                        id="view-activity-description"
                                        label={t('admin.activity.description', { defaultValue: 'Description' })}
                                        value={viewingActivity.description || ''}
                                        onChange={() => { }}
                                        rows={3}
                                        disabled={true}
                                    />

                                    {/* Date/Time Period */}
                                    <SelectPeriod
                                        id="view-activity-period"
                                        label={t('admin.activity.period', { defaultValue: 'Period' })}
                                        startValue={viewingActivity.start_datetime || ''}
                                        endValue={viewingActivity.end_datetime || ''}
                                        onStartChange={() => { }}
                                        onEndChange={() => { }}
                                        disabled={true}
                                    />

                                    {/* Location */}
                                    <LocationPicker
                                        id="view-activity-location"
                                        label={t('admin.activity.location', { defaultValue: 'Location' })}
                                        value={(() => {
                                            if (!viewingActivity.location) return null;
                                            if (typeof viewingActivity.location === 'string') {
                                                // For string locations, create a Location object with dummy coordinates
                                                return { lat: 0, lng: 0, address: viewingActivity.location };
                                            }
                                            return viewingActivity.location;
                                        })()}
                                        onChange={() => { }}
                                        disabled={true}
                                    />

                                    {/* Requirements */}
                                    <div className="space-y-4">
                                        <FloatingMultiSelect
                                            id="view-activity-college"
                                            label={t('admin.activity.college', { defaultValue: 'College' })}
                                            value={viewingActivity.college_required === 'all' ? COLLEGE_OPTIONS.map(opt => opt.value) :
                                                Array.isArray(viewingActivity.college_required) ? viewingActivity.college_required : []}
                                            onChange={() => { }}
                                            options={COLLEGE_OPTIONS.map(option => ({
                                                value: option.value,
                                                label: t(option.labelKey, { defaultValue: option.value })
                                            }))}
                                            disabled={true}
                                        />
                                        <FloatingMultiSelect
                                            id="view-activity-countries"
                                            label={t('admin.activity.countries', { defaultValue: 'Countries' })}
                                            value={viewingActivity.countries === 'all' ? COUNTRY_OPTIONS.map(opt => opt.value) :
                                                Array.isArray(viewingActivity.countries) ? viewingActivity.countries : []}
                                            onChange={() => { }}
                                            options={COUNTRY_OPTIONS.map(option => ({
                                                value: option.value,
                                                label: t(option.labelKey, { defaultValue: option.value })
                                            }))}
                                            disabled={true}
                                        />
                                        <FloatingSelect
                                            id="view-activity-chinese-level"
                                            label={t('admin.activity.chineseLevelMin', { defaultValue: 'Min Chinese Level' })}
                                            value={viewingActivity.chinese_level_min || ''}
                                            onChange={() => { }}
                                            options={CHINESE_LEVEL_OPTIONS.map(option => ({
                                                value: option.value,
                                                label: t(option.labelKey, { defaultValue: option.value })
                                            }))}
                                            disabled={true}
                                            hideSelectedTextWhen={(value) => value === ''}
                                        />
                                    </div>

                                    {/* Metadata */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="view-activity-creator"
                                            label={t('admin.table.creator', { defaultValue: 'Creator' })}
                                            value={viewingActivity.created_by_username || ''}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                        <FloatingInput
                                            id="view-activity-created-at"
                                            label={t('admin.createdAt', { defaultValue: 'Created At' })}
                                            value={viewingActivity.created_at ? formatDateTime(viewingActivity.created_at) : ''}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>

                                    {/* Form Actions */}
                                    <div className="flex flex-col-reverse pt-3 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-between sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/admin/activities/${viewingActivity.id}/delete`)}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-error bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover dark:bg-app-dark-surface dark:text-app-dark-error dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                        >
                                            {t('common.delete')}
                                        </button>
                                        <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:space-x-3 sm:space-y-0">
                                            <button
                                                type="button"
                                                onClick={() => navigate(getViewClosePath())}
                                                className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                            >
                                                {t('common.close')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/admin/activities/${viewingActivity.id}/edit`)}
                                                className="w-full px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg sm:w-auto bg-app-light-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover"
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
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmModalOpen && activityToDelete && (
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
                                    {t('admin.activityDeleteConfirmTitle', { defaultValue: 'Delete Activity' })}
                                </h3>
                                <p className="mb-6 text-sm text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.activityDeleteConfirm', { defaultValue: 'Are you sure you want to delete this activity? This action cannot be undone.', name: activityToDelete.title })}
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
                                        onClick={confirmDeleteActivity}
                                        disabled={deletingId === activityToDelete.id}
                                        className="w-full px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg sm:w-auto bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-600 dark:hover:bg-red-700"
                                    >
                                        {deletingId === activityToDelete.id ? t('common.deleting', { defaultValue: 'Deleting...' }) : t('common.delete')}
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

export default AdminActivitiesPage;