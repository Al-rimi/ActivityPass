import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { AdminActivity } from '../types/admin';
import MultiSelect from '../components/MultiSelect';
import CustomSelect from '../components/CustomSelect';
import DateTimePicker from '../components/DateTimePicker';
import LocationPicker from '../components/LocationPicker';

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
    { value: 'CET4', labelKey: 'admin.chineseLevel.cet4' },
    { value: 'CET6', labelKey: 'admin.chineseLevel.cet6' },
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
    const [activities, setActivities] = useState<AdminActivity[]>([]);
    const [allActivities, setAllActivities] = useState<AdminActivity[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(defaultActivityForm());
    const [creating, setCreating] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<AdminActivity | null>(null);
    const [editForm, setEditForm] = useState(defaultActivityForm());
    const [updating, setUpdating] = useState(false);

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

    const openModal = () => {
        setForm(defaultActivityForm());
        setModalOpen(true);
    };

    const openEditModal = (activity: AdminActivity) => {
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
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
        setEditingActivity(null);
        setEditForm(defaultActivityForm());
    };

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
            setModalOpen(false);
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
            closeEditModal();
            loadActivities(search);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.updateError') });
        } finally {
            setUpdating(false);
        }
    };

    const deleteActivity = async (activity: AdminActivity) => {
        if (!confirm(t('admin.confirmDeleteActivity', { title: activity.title, defaultValue: `Delete activity "${activity.title}"?` }))) {
            return;
        }
        try {
            const res = await fetch(`/api/activities/${activity.id}/`, {
                method: 'DELETE',
                headers,
            });
            if (!res.ok) throw new Error('delete_failed');
            setNotice({ type: 'success', text: t('admin.activityDeleted', { defaultValue: 'Activity deleted successfully.' }) });
            loadActivities(search);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.deleteError') });
        }
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
            <div className="flex flex-col gap-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">{t('admin.manageActivities', { defaultValue: 'Manage Activities' })}</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button type="button" onClick={openModal} className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm">
                            {t('admin.addActivity', { defaultValue: 'Add Activity' })}
                        </button>
                    </div>
                </header>

                {notice && (
                    <div className={`rounded-md border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-100' : notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100' : 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-100'}`}>
                        {notice.text}
                    </div>
                )}

                <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('admin.searchActivities', { defaultValue: 'Search by title, description, or creator' }) || ''}
                            className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                        />
                    </div>
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-gray-500 dark:text-gray-400">
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
                                        <td colSpan={6} className="py-6 text-center text-gray-500">{t('admin.noActivities', { defaultValue: 'No activities found.' })}</td>
                                    </tr>
                                )}
                                {activities.map(activity => (
                                    <tr key={activity.id} className="border-t border-gray-100 dark:border-gray-800">
                                        <td className="px-4 py-2 font-medium">{activity.title}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">{formatDateTime(activity.start_datetime)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">{formatDateTime(activity.end_datetime)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{activity.capacity}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{activity.created_by_username}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => openEditModal(activity)} className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                                                    {t('common.edit')}
                                                </button>
                                                <button type="button" onClick={() => deleteActivity(activity)} className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                                                    {t('common.delete')}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-gray-900 dark:border-gray-700">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <p className="text-xs tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                    {t('admin.quickCreate', { defaultValue: 'Quick create' })}
                                </p>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('admin.addActivity', { defaultValue: 'Add Activity' })}</h2>
                            </div>
                            <button type="button" onClick={() => setModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-4 pb-4">
                            <form onSubmit={submitActivity} className="space-y-4" autoComplete="off">
                                {/* Basic Info */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.activity.title', { defaultValue: 'Title' })}
                                        </label>
                                        <input
                                            value={form.title}
                                            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                                            required
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                            placeholder={t('admin.activity.title')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.activity.capacity', { defaultValue: 'Capacity' })}
                                        </label>
                                        <div className="relative">
                                            <input
                                                value={form.capacity}
                                                onChange={e => setForm(prev => ({ ...prev, capacity: Number(e.target.value) || 50 }))}
                                                type="number"
                                                min="1"
                                                className="w-full px-3 py-2 pr-16 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                                placeholder={t('admin.activity.capacity')}
                                            />
                                            <div className="absolute inset-y-0 right-0 flex flex-col">
                                                <button
                                                    type="button"
                                                    onClick={() => setForm(prev => ({ ...prev, capacity: (prev.capacity || 50) + 1 }))}
                                                    className="flex-1 px-2 text-gray-400 dark:text-gray-500 border-l border-gray-300 dark:border-gray-600"
                                                    aria-label="Increase capacity"
                                                >
                                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 19V5M5 12l7-7 7 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setForm(prev => ({ ...prev, capacity: Math.max(1, (prev.capacity || 50) - 1) }))}
                                                    className="flex-1 px-2 text-gray-400 dark:text-gray-500 border-l border-t border-gray-300 dark:border-gray-600"
                                                    aria-label="Decrease capacity"
                                                >
                                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 5v14M5 12l7 7 7-7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('admin.activity.description', { defaultValue: 'Description' })}
                                    </label>
                                    <textarea
                                        value={form.description}
                                        onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                        rows={3}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                        placeholder={t('admin.activity.description')}
                                    />
                                </div>

                                {/* Date/Time */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.activity.startDateTime', { defaultValue: 'Start Date & Time' })}
                                        </label>
                                        <DateTimePicker
                                            value={form.start_datetime}
                                            onChange={(value) => setForm(prev => ({ ...prev, start_datetime: value }))}
                                            placeholder={t('admin.activity.selectStartDateTime', { defaultValue: 'Select start date and time...' })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.activity.endDateTime', { defaultValue: 'End Date & Time' })}
                                        </label>
                                        <DateTimePicker
                                            value={form.end_datetime}
                                            onChange={(value) => setForm(prev => ({ ...prev, end_datetime: value }))}
                                            placeholder={t('admin.activity.selectEndDateTime', { defaultValue: 'Select end date and time...' })}
                                        />
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('admin.activity.location', { defaultValue: 'Location' })}
                                    </label>
                                    <LocationPicker
                                        value={form.location}
                                        onChange={(location) => setForm(prev => ({ ...prev, location }))}
                                        placeholder={t('admin.activity.selectLocation', { defaultValue: 'Select activity location...' })}
                                    />
                                </div>

                                {/* Requirements */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.activity.college', { defaultValue: 'College' })}
                                        </label>
                                        <MultiSelect
                                            value={form.college_required}
                                            onChange={(value) => setForm(prev => ({ ...prev, college_required: value }))}
                                            options={COLLEGE_OPTIONS.map(option => ({
                                                value: option.value,
                                                label: t(option.labelKey, { defaultValue: option.value })
                                            }))}
                                            placeholder={t('admin.activity.selectColleges', { defaultValue: 'Select colleges...' })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.activity.countries', { defaultValue: 'Countries' })}
                                        </label>
                                        <MultiSelect
                                            value={form.countries}
                                            onChange={(value) => setForm(prev => ({ ...prev, countries: value }))}
                                            options={COUNTRY_OPTIONS.map(option => ({
                                                value: option.value,
                                                label: t(option.labelKey, { defaultValue: option.value })
                                            }))}
                                            placeholder={t('admin.activity.selectCountries', { defaultValue: 'Select countries...' })}
                                            showSearch={true}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.activity.chineseLevelMin', { defaultValue: 'Min Chinese Level' })}
                                        </label>
                                        <CustomSelect
                                            value={form.chinese_level_min}
                                            onChange={(value) => setForm(prev => ({ ...prev, chinese_level_min: value }))}
                                            options={CHINESE_LEVEL_OPTIONS.map(option => ({
                                                value: option.value,
                                                label: t(option.labelKey, { defaultValue: option.value })
                                            }))}
                                        />
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-2 space-y-reverse sm:space-y-0 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-400 transition-colors"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                                    >
                                        {creating ? t('profile.saving') : t('admin.createActivity', { defaultValue: 'Create Activity' })}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {editModalOpen && editingActivity && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-gray-900 dark:border-gray-700">
                        <div className="flex items-center justify-between p-4 pb-3">
                            <div>
                                <p className="text-xs tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                    {t('admin.editActivity', { defaultValue: 'Edit Activity' })}
                                </p>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editingActivity.title}</h2>
                            </div>
                            <button type="button" onClick={closeEditModal} className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label={t('common.close')}>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-4 pb-4">
                            <form onSubmit={submitEditActivity} className="space-y-4" autoComplete="off">
                                {/* Basic Info */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.activity.title', { defaultValue: 'Title' })}
                                        </label>
                                        <input
                                            value={editForm.title}
                                            onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                            required
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                            placeholder={t('admin.activity.title')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.activity.capacity', { defaultValue: 'Capacity' })}
                                        </label>
                                        <div className="relative">
                                            <input
                                                value={editForm.capacity}
                                                onChange={e => setEditForm(prev => ({ ...prev, capacity: Number(e.target.value) || 50 }))}
                                                type="number"
                                                min="1"
                                                className="w-full px-3 py-2 pr-16 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                                placeholder={t('admin.activity.capacity')}
                                            />
                                            <div className="absolute inset-y-0 right-0 flex flex-col">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm(prev => ({ ...prev, capacity: (prev.capacity || 50) + 1 }))}
                                                    className="flex-1 px-2 text-gray-400 dark:text-gray-500 border-l border-gray-300 dark:border-gray-600"
                                                    aria-label="Increase capacity"
                                                >
                                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 19V5M5 12l7-7 7 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditForm(prev => ({ ...prev, capacity: Math.max(1, (prev.capacity || 50) - 1) }))}
                                                    className="flex-1 px-2 text-gray-400 dark:text-gray-500 border-l border-t border-gray-300 dark:border-gray-600"
                                                    aria-label="Decrease capacity"
                                                >
                                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 5v14M5 12l7 7 7-7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('admin.activity.description', { defaultValue: 'Description' })}
                                    </label>
                                    <textarea
                                        value={editForm.description}
                                        onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                        rows={3}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors text-sm"
                                        placeholder={t('admin.activity.description')}
                                    />
                                </div>

                                {/* Date/Time */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.activity.startDateTime', { defaultValue: 'Start Date & Time' })}
                                        </label>
                                        <DateTimePicker
                                            value={editForm.start_datetime}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, start_datetime: value }))}
                                            placeholder={t('admin.activity.selectStartDateTime', { defaultValue: 'Select start date and time...' })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.activity.endDateTime', { defaultValue: 'End Date & Time' })}
                                        </label>
                                        <DateTimePicker
                                            value={editForm.end_datetime}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, end_datetime: value }))}
                                            placeholder={t('admin.activity.selectEndDateTime', { defaultValue: 'Select end date and time...' })}
                                        />
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {t('admin.activity.location', { defaultValue: 'Location' })}
                                    </label>
                                    <LocationPicker
                                        value={editForm.location}
                                        onChange={(location) => setEditForm(prev => ({ ...prev, location }))}
                                        placeholder={t('admin.activity.selectLocation', { defaultValue: 'Select activity location...' })}
                                    />
                                </div>

                                {/* Requirements */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.activity.college', { defaultValue: 'College' })}
                                        </label>
                                        <MultiSelect
                                            value={editForm.college_required}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, college_required: value }))}
                                            options={COLLEGE_OPTIONS.map(option => ({
                                                value: option.value,
                                                label: t(option.labelKey, { defaultValue: option.value })
                                            }))}
                                            placeholder={t('admin.activity.selectColleges', { defaultValue: 'Select colleges...' })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.activity.countries', { defaultValue: 'Countries' })}
                                        </label>
                                        <MultiSelect
                                            value={editForm.countries}
                                            onChange={(value) => setEditForm(prev => ({ ...prev, countries: value }))}
                                            options={COUNTRY_OPTIONS.map(option => ({
                                                value: option.value,
                                                label: t(option.labelKey, { defaultValue: option.value })
                                            }))}
                                            placeholder={t('admin.activity.selectCountries', { defaultValue: 'Select countries...' })}
                                            showSearch={true}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t('admin.activity.chineseLevelMin', { defaultValue: 'Min Chinese Level' })}
                                        </label>
                                        <CustomSelect
                                            value={editForm.chinese_level_min}
                                            onChange={(value: string) => setEditForm(prev => ({ ...prev, chinese_level_min: value }))}
                                            options={CHINESE_LEVEL_OPTIONS.map(option => ({
                                                value: option.value,
                                                label: t(option.labelKey, { defaultValue: option.value })
                                            }))}
                                        />
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-2 space-y-reverse sm:space-y-0 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={closeEditModal}
                                        className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-400 transition-colors"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={updating}
                                        className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                                    >
                                        {updating ? t('profile.saving') : t('admin.saveChanges')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default AdminActivitiesPage;