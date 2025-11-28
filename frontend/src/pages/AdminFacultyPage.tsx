import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { AdminUser } from '../types/admin';
import FloatingInput from '../components/FloatingInput';
import FloatingSelect from '../components/FloatingSelect';
import CustomDatePicker from '../components/CustomDatePicker';
import SearchInput from '../components/SearchInput';
import { useNavigate, useParams } from 'react-router-dom';
import { getDepartmentOptions } from '../utils/constants';
import { useAuthenticatedApi } from '../utils/api';

const genderOptions = (t: any) => [
    { value: 'Male', label: t('gender.male') },
    { value: 'Female', label: t('gender.female') },
];

const titleLevelOptions = (t: any) => [
    { value: '中级', label: t('faculty.titleLevels.中级') },
    { value: '正高级', label: t('faculty.titleLevels.正高级') },
    { value: '副高级', label: t('faculty.titleLevels.副高级') },
    { value: '无', label: t('faculty.titleLevels.无') },
];

const positionCategoryOptions = (t: any) => [
    { value: '无', label: t('faculty.positions.无') },
];

const staffCategoryOptions = (t: any) => [
    { value: '无', label: t('faculty.staffTypes.无') },
];

const departmentOptions = (t: any) => getDepartmentOptions(t);

const titleOptions = (t: any) => [
    { value: '讲师', label: t('faculty.titles.讲师') },
    { value: '教授', label: t('faculty.titles.教授') },
    { value: '副教授', label: t('faculty.titles.副教授') },
    { value: '无', label: t('faculty.titles.无') },
];

// Mapping of course titles to translation keys
const getCourseTitleTranslationKey = (title: string): string => {
    const titleMapping: { [key: string]: string } = {
        '人工智能导论': 'admin.course.title.aiIntro',
        '大模型引领的人工智能通识与实践': 'admin.course.title.largeModelAI',
        '动手学 AI：人工智能通识与实践（人文艺术版）': 'admin.course.title.handsOnAIHumanities',
        '动手学 AI：人工智能通识与实践（社科版）': 'admin.course.title.handsOnAISocialScience',
        '动手学 AI：人工智能通识与实践（理工版）': 'admin.course.title.handsOnAIScience',
        '人工智能通识与实践应用': 'admin.course.title.aiGeneralPractice',
        '人工智能实践应用（师范类、人文社科）': 'admin.course.title.aiPracticeNormalHumanities',
        '人工智能实践应用（师范类、理工科）': 'admin.course.title.aiPracticeNormalScience',
        'WPS智能办公': 'admin.course.title.wpsOffice',
        '人工智能应用-网站设计': 'admin.course.title.aiWebDesign',
        '人工智能基础-Python程序设计': 'admin.course.title.pythonProgramming',
        'C语言程序设计': 'admin.course.title.cProgramming',
        'Java程序设计': 'admin.course.title.javaProgramming',
        'Python与数据分析': 'admin.course.title.pythonDataAnalysis',
        'Python数据分析应用实训': 'admin.course.title.pythonDataAnalysisTraining',
        'UI/UX交互设计': 'admin.course.title.uiUxDesign',
        'Web前端开发技术': 'admin.course.title.webFrontendDevelopment',
        'Web应用程序开发': 'admin.course.title.webAppDevelopment',
        '专业基础技能考核': 'admin.course.title.professionalSkillsAssessment',
        '专业实习': 'admin.course.title.internship',
        '专业导论': 'admin.course.title.professionalIntroduction',
        '专业英语': 'admin.course.title.professionalEnglish',
        '专业见习': 'admin.course.title.professionalVisit',
        '个人项目实训': 'admin.course.title.individualProjectTraining',
        '交互设计': 'admin.course.title.interactionDesign',
        '人工智能基础': 'admin.course.title.aiFoundation',
        '人工智能算法实训': 'admin.course.title.aiAlgorithmTraining',
        '分布式系统': 'admin.course.title.distributedSystems',
        '团队协作与职业素质': 'admin.course.title.teamworkProfessionalQuality',
        '团队规范项目实训': 'admin.course.title.teamProjectTraining',
        '多媒体技术与应用': 'admin.course.title.multimediaTechnology',
        '嵌入式软件开发': 'admin.course.title.embeddedSoftwareDevelopment',
        '开源硬件实训': 'admin.course.title.openSourceHardwareTraining',
        '教育实习': 'admin.course.title.educationInternship',
        '教育研习': 'admin.course.title.educationResearch',
        '数字信号处理': 'admin.course.title.digitalSignalProcessing',
        '数字图像处理与计算机视觉': 'admin.course.title.digitalImageProcessing',
        '数据库原理及应用': 'admin.course.title.databasePrinciples',
        '数据库及应用技术': 'admin.course.title.databaseTechnology',
        '数据结构课程设计': 'admin.course.title.dataStructuresDesign',
        '智能科学新技术讲座': 'admin.course.title.intelligentScienceSeminar',
        '智能移动设备软件开发': 'admin.course.title.mobileSoftwareDevelopment',
        '机器人学': 'admin.course.title.robotics',
        '概率与数理统计': 'admin.course.title.probabilityStatistics',
        '离散数学': 'admin.course.title.discreteMathematics',
        '科技文献检索及专利申请': 'admin.course.title.techLiteratureSearch',
        '移动应用开发': 'admin.course.title.mobileAppDevelopment',
        '算法设计与分析': 'admin.course.title.algorithmDesign',
        '系统分析与设计：理论和方法': 'admin.course.title.systemAnalysisDesign',
        '线性代数': 'admin.course.title.linearAlgebra',
        '编译原理': 'admin.course.title.compilerPrinciples',
        '网络安全': 'admin.course.title.networkSecurity',
        '网络安全技能综合实训': 'admin.course.title.networkSecurityTraining',
        '网络攻击与防御技术': 'admin.course.title.networkAttackDefense',
        '计算方法': 'admin.course.title.computationalMethods',
        '计算机新技术讲座': 'admin.course.title.computerScienceSeminar',
        '计算机科学导论': 'admin.course.title.computerScienceIntro',
        '计算机组成与结构': 'admin.course.title.computerArchitecture',
        '软件新技术讲座': 'admin.course.title.softwareSeminar',
        '软件设计模式': 'admin.course.title.softwareDesignPatterns',
        '软件质量保证与测试': 'admin.course.title.softwareQualityTesting',
        '软件过程与文档写作': 'admin.course.title.softwareProcessDocumentation',
        '软件项目管理': 'admin.course.title.softwareProjectManagement',
        '防火墙与入侵检测技术': 'admin.course.title.firewallIntrusionDetection',
        '面向对象分析与设计': 'admin.course.title.ooAnalysisDesign',
        '面向对象程序设计C#': 'admin.course.title.ooProgrammingCsharp',
        '面向对象程序设计Java': 'admin.course.title.ooProgrammingJava',
        '面向对象编程基础': 'admin.course.title.ooProgrammingFoundation',
        '项目管理与工程实训': 'admin.course.title.projectManagementTraining',
    };
    return titleMapping[title] || '';
};

// Function to get translated course title
const getTranslatedCourseTitle = (title: string, t: any): string => {
    const translationKey = getCourseTitleTranslationKey(title);
    return translationKey ? t(translationKey) : title;
};

const defaultFacultyForm = () => ({
    faculty_id: '',
    name: '',
    gender: '',
    department: '',
    position_category: '',
    title_level: '',
    title: '',
    staff_category: '',
    birth_date: '',
});

const AdminFacultyPage: React.FC = () => {
    const { tokens } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { '*': path } = useParams<{ '*': string }>();
    const { authenticatedJsonFetch, authenticatedFetch } = useAuthenticatedApi();

    // Capture saved form data before it gets cleared
    const capturedFormData = React.useRef<string | null>(null);

    // Capture the data on mount
    React.useEffect(() => {
        const savedForm = localStorage.getItem('admin-faculty-add-form');
        capturedFormData.current = savedForm;
    }, []);

    // Parse the path
    let identifier: string | null = null;
    let action: string | null = null;

    if (path === 'add') {
        action = 'add';
    } else if (path) {
        const editMatch = path.match(/^(\w+)\/edit$/);
        const deleteMatch = path.match(/^(\w+)\/delete$/);
        const coursesMatch = path.match(/^(\w+)\/courses$/);
        const viewMatch = path.match(/^(\w+)$/);
        if (editMatch) {
            identifier = editMatch[1];
            action = 'edit';
        } else if (deleteMatch) {
            identifier = deleteMatch[1];
            action = 'delete';
        } else if (coursesMatch) {
            identifier = coursesMatch[1];
            action = 'courses';
        } else if (viewMatch) {
            identifier = viewMatch[1];
            action = null; // view
        }
    }

    const [faculty, setFaculty] = useState<AdminUser[]>([]);
    const [allFaculty, setAllFaculty] = useState<AdminUser[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [resettingUserId, setResettingUserId] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(() => {
        const saved = localStorage.getItem('admin-faculty-add-form');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const clean = Object.fromEntries(Object.entries(parsed).filter(([k, v]) => v !== undefined && v !== null));
                return { ...defaultFacultyForm(), ...clean };
            } catch (e) {
                return defaultFacultyForm();
            }
        }
        return defaultFacultyForm();
    });
    const [creating, setCreating] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingFaculty, setEditingFaculty] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState(defaultFacultyForm());
    const [updating, setUpdating] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewingFaculty, setViewingFaculty] = useState<AdminUser | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
    const [facultyToDelete, setFacultyToDelete] = useState<AdminUser | null>(null);
    const [selectedFacultyForCourses, setSelectedFacultyForCourses] = useState<AdminUser | null>(null);
    const [facultyCourses, setFacultyCourses] = useState<any[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(false);

    // Track if we've loaded initial form data to prevent overwriting localStorage on mount
    const hasLoadedInitialData = React.useRef(false);
    // Track if we are currently loading initial data to prevent saving during load
    const isLoadingInitialData = React.useRef(false);

    // Track if data has been fetched to prevent multiple fetches
    const hasFetchedData = React.useRef(false);

    // Save form data whenever it changes (as user types)
    React.useEffect(() => {
        if (!isLoadingInitialData.current && hasLoadedInitialData.current) {
            localStorage.setItem('admin-faculty-add-form', JSON.stringify(form));
        }
    }, [form]);

    const loadFaculty = useCallback(async (query = '') => {
        if (!tokens) return;
        setLoading(true);
        try {
            const qs = new URLSearchParams();
            if (query.trim()) {
                qs.set('q', query.trim());
            }
            const data = await authenticatedJsonFetch(`/api/admin/faculty-with-counts/?${qs.toString()}`);
            setAllFaculty(data);
            setFaculty(data);
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.fetchError') });
        } finally {
            setLoading(false);
        }
    }, [tokens, authenticatedJsonFetch, t]);

    React.useEffect(() => {
        if (tokens && !hasFetchedData.current) {
            hasFetchedData.current = true;
            loadFaculty();
        }
    }, [tokens, loadFaculty]);

    useEffect(() => {
        loadFaculty(search);
    }, [search, loadFaculty]);

    const resetPassword = async (facultyMember: AdminUser) => {
        setResettingUserId(facultyMember.id);
        try {
            const response = await authenticatedFetch('/api/admin/reset-password/', {
                method: 'POST',
                body: JSON.stringify({ user_id: facultyMember.id }),
            });
            if (!response.ok) throw new Error('reset_failed');
            setNotice({ type: 'success', text: t('admin.passwordResetSuccess') });
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.passwordResetError') });
        } finally {
            setResettingUserId(null);
        }
    };

    const submitNewFaculty = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const response = await authenticatedFetch('/api/admin/create-faculty/', {
                method: 'POST',
                body: JSON.stringify({
                    username: form.faculty_id, // use faculty_id as username
                    full_name: form.name,
                    faculty_profile: form
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'create_failed');
            }
            setNotice({ type: 'success', text: t('admin.facultyCreated') });
            localStorage.removeItem('admin-faculty-add-form');
            setForm(defaultFacultyForm());
            setModalOpen(false);
            loadFaculty();
        } catch (err: any) {
            console.error(err);
            setNotice({ type: 'error', text: err.message || t('admin.createError') });
        } finally {
            setCreating(false);
        }
    };

    const openEditModal = (facultyMember: AdminUser) => {
        setEditingFaculty(facultyMember);
        setEditForm({
            faculty_id: facultyMember.faculty_profile?.faculty_id || '',
            name: facultyMember.faculty_profile?.name || '',
            gender: facultyMember.faculty_profile?.gender || '',
            department: facultyMember.faculty_profile?.department || '',
            position_category: facultyMember.faculty_profile?.position_category || '',
            title_level: facultyMember.faculty_profile?.title_level || '',
            title: facultyMember.faculty_profile?.title || '',
            staff_category: facultyMember.faculty_profile?.staff_category || '',
            birth_date: facultyMember.faculty_profile?.birth_date || '',
        });
        setEditModalOpen(true);
    };

    const submitEditFaculty = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingFaculty) return;
        setUpdating(true);
        try {
            const response = await authenticatedFetch(`/api/admin/users/${editingFaculty.id}/`, {
                method: 'PATCH',
                body: JSON.stringify({
                    faculty_profile: editForm
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'update_failed');
            }
            setNotice({ type: 'success', text: t('admin.facultyUpdated') });
            setEditModalOpen(false);
            setEditingFaculty(null);
            loadFaculty();
        } catch (err: any) {
            console.error(err);
            setNotice({ type: 'error', text: err.message || t('admin.updateError') });
        } finally {
            setUpdating(false);
        }
    };

    const openViewModal = (facultyMember: AdminUser) => {
        setViewingFaculty(facultyMember);
        setViewModalOpen(true);
    };

    const openDeleteConfirm = (facultyMember: AdminUser) => {
        setFacultyToDelete(facultyMember);
        setDeleteConfirmModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!facultyToDelete) return;
        try {
            const response = await authenticatedFetch(`/api/admin/users/${facultyToDelete.id}/`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('delete_failed');
            setNotice({ type: 'success', text: t('admin.facultyDeleted') });
            setDeleteConfirmModalOpen(false);
            setFacultyToDelete(null);
            loadFaculty();
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.deleteError') });
        }
    };

    const loadFacultyCourses = async (facultyId: string) => {
        setLoadingCourses(true);
        try {
            const data = await authenticatedJsonFetch(`/api/admin/courses/?teacher=${facultyId}`);
            setFacultyCourses(data);
        } catch (err) {
            console.error(err);
            setFacultyCourses([]);
        } finally {
            setLoadingCourses(false);
        }
    };

    useEffect(() => {
        // Always close all modals first
        setViewModalOpen(false);
        setEditModalOpen(false);
        setModalOpen(false);
        setViewingFaculty(null);
        setEditingFaculty(null);
        setDeleteConfirmModalOpen(false);
        setFacultyToDelete(null);
        setSelectedFacultyForCourses(null);

        if (action === 'add') {
            isLoadingInitialData.current = true;
            const saved = localStorage.getItem('admin-faculty-add-form');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    const clean = Object.fromEntries(Object.entries(parsed).filter(([k, v]) => v !== undefined && v !== null));
                    setForm({ ...defaultFacultyForm(), ...clean });
                } catch (e) {
                    console.error('Failed to parse saved faculty form:', e);
                    setForm(defaultFacultyForm());
                }
            } else {
                setForm(defaultFacultyForm());
            }
            hasLoadedInitialData.current = true;
            isLoadingInitialData.current = false;
            setModalOpen(true);
        } else if (identifier) {
            const facultyMember = allFaculty.find(f => f.faculty_profile?.faculty_id === identifier);
            if (facultyMember) {
                if (action === 'edit') {
                    openEditModal(facultyMember);
                } else if (action === 'delete') {
                    openDeleteConfirm(facultyMember);
                } else if (action === 'courses') {
                    setSelectedFacultyForCourses(facultyMember);
                    loadFacultyCourses(facultyMember.faculty_profile?.faculty_id || '');
                } else {
                    // Default to view modal when identifier exists but no specific action
                    openViewModal(facultyMember);
                }
            }
            // If faculty member not found, modals stay closed
        }
        // If no identifier, modals stay closed
    }, [identifier, action, allFaculty]);

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
                {/* Show courses page */}
                {action === 'courses' && selectedFacultyForCourses && (
                    <>
                        <header className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin/faculty')}
                                    className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover"
                                    aria-label={t('common.back')}
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M15 18l-6-6 6-6" />
                                    </svg>
                                </button>
                                <div>
                                    <h1 className="text-xl font-semibold">{t('admin.faculty.courses', { defaultValue: 'Faculty Courses' })}</h1>
                                    <div className="mt-1">
                                        <p className="text-sm font-medium text-app-light-text-primary dark:text-app-dark-text-primary">
                                            {(selectedFacultyForCourses.faculty_profile?.title ? `${titleOptions(t).find(opt => opt.value === selectedFacultyForCourses.faculty_profile?.title)?.label || selectedFacultyForCourses.faculty_profile?.title} ` : '')}{selectedFacultyForCourses.faculty_profile?.name || selectedFacultyForCourses.first_name}
                                        </p>
                                        <p className="text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                            {selectedFacultyForCourses.faculty_profile?.faculty_id}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </header>

                        <section className="p-5 border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface">
                            {loadingCourses ? (
                                <div className="py-8 text-center">
                                    <div className="inline-block w-4 h-4 border-4 border-app-light-accent/30 border-t-app-light-accent rounded-full animate-spin dark:border-app-dark-accent/30 dark:border-t-app-dark-accent"></div>
                                    <p className="mt-2 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {t('common.loading')}
                                    </p>
                                </div>
                            ) : facultyCourses.length === 0 ? (
                                <div className="py-8 text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.faculty.noCourses', { defaultValue: 'No courses found for this faculty.' })}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-medium">{t('admin.faculty.courses')}</h2>
                                        <span className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                            {facultyCourses.length} {t('admin.table.courses', { defaultValue: 'courses' })}
                                        </span>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {facultyCourses.map((course: any) => (
                                            <div key={course.id} className="p-4 border rounded-lg border-app-light-border dark:border-app-dark-border hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover cursor-pointer transition-colors" onClick={() => navigate(`/admin/courses/${course.id}?from=faculty&facultyId=${selectedFacultyForCourses.faculty_profile?.faculty_id}`)}>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-medium text-app-light-text-primary dark:text-app-dark-text-primary truncate">
                                                            {getTranslatedCourseTitle(course.title, t) || 'Unknown Course'}
                                                        </h3>
                                                        {course.code && (
                                                            <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary mt-1">
                                                                {t('admin.course.code')}: {course.code}
                                                            </p>
                                                        )}
                                                        {course.term && (
                                                            <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                                {t('admin.course.term')}: {course.term}
                                                            </p>
                                                        )}
                                                        {course.location && (
                                                            <p className="text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary mt-1">
                                                                {t('admin.course.location')}: {course.location}
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

                {/* Show main faculty list when not on courses page */}
                {action !== 'courses' && (
                    <>
                        <header className="flex items-center justify-between gap-3">
                            <h1 className="text-xl font-semibold flex-shrink-0">{t('admin.manageFaculty')}</h1>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <button type="button" onClick={() => navigate('/admin/faculty/add')} className="px-3 py-2 text-sm text-white transition-colors rounded-md bg-app-light-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:hover:bg-app-dark-accent-hover whitespace-nowrap">
                                    {t('admin.addFaculty')}
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
                                        label={t('admin.searchFaculty')}
                                        value={search}
                                        onChange={setSearch}
                                    />
                                </div>
                            </div>
                            <div className="mt-6 overflow-x-auto">
                                <table className="w-full text-xs xss:text-sm text-left table-fixed">
                                    <thead>
                                        <tr className="text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                            <th className="px-4 py-2 whitespace-nowrap min-w-0 flex-1 xss:min-w-16">{t('admin.table.faculty')}</th>
                                            <th className="p-0.5 xss:px-1 sm:px-4 py-2 whitespace-nowrap text-center w-16 xss:w-20">{t('admin.table.courses')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading && !faculty.length && (
                                            <tr>
                                                <td colSpan={2} className="py-6 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="inline-block w-4 h-4 border-4 border-current/30 border-t-current rounded-full animate-spin"></div>
                                                        <span className="text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('admin.table.loading')}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {!faculty.length && !loading && (
                                            <tr>
                                                <td colSpan={2} className="py-6 text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('admin.noFaculty', { defaultValue: 'No faculty found.' })}</td>
                                            </tr>
                                        )}
                                        {faculty.map(member => (
                                            <tr key={member.id} className="border-t border-app-light-border dark:border-app-dark-border">
                                                <td className="px-4 py-2 min-w-0 flex-1 xss:min-w-16">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/admin/faculty/${member.faculty_profile?.faculty_id}`)}
                                                        className="w-full text-left block"
                                                    >
                                                        <p className="font-medium text-app-light-text-primary hover:text-app-light-text-secondary dark:text-app-dark-text-primary dark:hover:text-app-dark-text-secondary">{(member.faculty_profile?.title ? `${titleOptions(t).find(opt => opt.value === member.faculty_profile?.title)?.label || member.faculty_profile?.title} ` : '')}{member.faculty_profile?.name || member.first_name || '—'}</p>
                                                        <div className="whitespace-nowrap block overflow-hidden relative">
                                                            <p className="text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">{member.faculty_profile?.faculty_id || '—'}</p>
                                                            <span className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-app-light-surface to-transparent dark:from-app-dark-surface"></span>
                                                        </div>
                                                    </button>
                                                </td>
                                                <td className="p-0.5 xss:px-1 sm:px-4 py-2 whitespace-nowrap text-center w-16 xss:w-20">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/admin/faculty/${member.faculty_profile?.faculty_id}/courses`)}
                                                        className="text-sm font-medium text-app-light-text-primary hover:text-app-light-text-secondary dark:text-app-dark-text-primary dark:hover:text-app-dark-text-secondary"
                                                    >
                                                        {member.course_count || 0}
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

                {/* Add Faculty Modal */}
                {modalOpen && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
                        <div className="flex items-center justify-center min-h-full p-4">
                            <div className="w-full max-w-2xl border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                                <div className="flex items-center justify-between p-4 pb-3">
                                    <div>
                                        <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{t('admin.addFaculty', { defaultValue: 'Add faculty' })}</h2>
                                    </div>
                                    <button type="button" onClick={() => {
                                        localStorage.setItem('admin-faculty-add-form', JSON.stringify(form));
                                        navigate('/admin/faculty');
                                    }} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="px-4 pb-4">
                                    <form onSubmit={submitNewFaculty} className="space-y-4" autoComplete="off">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingInput
                                                id="faculty_id"
                                                label={t('admin.table.facultyId')}
                                                value={form.faculty_id}
                                                onChange={(value: string) => setForm(prev => ({ ...prev, faculty_id: value }))}
                                                required
                                            />
                                            <FloatingInput
                                                id="name"
                                                label={t('profile.name')}
                                                value={form.name}
                                                onChange={(value: string) => setForm(prev => ({ ...prev, name: value }))}
                                            />
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingSelect
                                                id="gender"
                                                label={t('admin.table.gender')}
                                                value={form.gender}
                                                onChange={(value: string) => setForm(prev => ({ ...prev, gender: value }))}
                                                options={genderOptions(t)}
                                            />
                                            <CustomDatePicker
                                                id="birth_date"
                                                label={t('admin.faculty.birthDate')}
                                                value={form.birth_date}
                                                onChange={(value: string) => setForm(prev => ({ ...prev, birth_date: value }))}
                                            />
                                        </div>
                                        <div className="grid gap-4">
                                            <FloatingSelect
                                                id="department"
                                                label={t('admin.table.department')}
                                                value={form.department}
                                                onChange={(value: string) => setForm(prev => ({ ...prev, department: value }))}
                                                options={departmentOptions(t)}
                                            />
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingSelect
                                                id="position_category"
                                                label={t('admin.faculty.positionCategory')}
                                                value={form.position_category}
                                                onChange={(value: string) => setForm(prev => ({ ...prev, position_category: value }))}
                                                options={positionCategoryOptions(t)}
                                            />
                                            <FloatingSelect
                                                id="title_level"
                                                label={t('admin.faculty.titleLevel')}
                                                value={form.title_level}
                                                onChange={(value: string) => setForm(prev => ({ ...prev, title_level: value }))}
                                                options={titleLevelOptions(t)}
                                            />
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingSelect
                                                id="title"
                                                label={t('admin.table.title')}
                                                value={form.title}
                                                onChange={(value: string) => setForm(prev => ({ ...prev, title: value }))}
                                                options={titleOptions(t)}
                                            />
                                            <FloatingSelect
                                                id="staff_category"
                                                label={t('admin.faculty.staffCategory')}
                                                value={form.staff_category}
                                                onChange={(value: string) => setForm(prev => ({ ...prev, staff_category: value }))}
                                                options={staffCategoryOptions(t)}
                                            />
                                        </div>
                                        <div className="flex flex-col-reverse pt-3 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    localStorage.removeItem('admin-faculty-add-form');
                                                    navigate('/admin/faculty');
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
                                                    t('admin.createFaculty')
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* View Faculty Modal */}
                {viewModalOpen && viewingFaculty && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
                        <div className="flex items-center justify-center min-h-full p-4">
                            <div className="w-full max-w-2xl border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                                <div className="flex items-center justify-between p-4 pb-3">
                                    <div>
                                        <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                            {t('admin.viewFaculty', { defaultValue: 'View Faculty' })}
                                        </p>
                                        <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{viewingFaculty.faculty_profile?.name || viewingFaculty.first_name || viewingFaculty.username}</h2>
                                    </div>
                                    <button type="button" onClick={() => navigate('/admin/faculty')} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="px-4 pb-4">
                                    <div className="space-y-4">
                                        {/* Basic Info Row */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="relative">
                                                <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                                    <input
                                                        id="view_faculty_id"
                                                        value={viewingFaculty.faculty_profile?.faculty_id || ''}
                                                        readOnly
                                                        className="w-full px-4 pt-5 pb-3 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                                    />
                                                    <label
                                                        htmlFor="view_faculty_id"
                                                        className={`absolute left-4 text-app-light-text-secondary font-medium pointer-events-none transform transition-all duration-200 ${viewingFaculty.faculty_profile?.faculty_id
                                                            ? 'top-0.5 -translate-y-0 text-xs'
                                                            : 'top-1/2 -translate-y-1/2 text-sm'
                                                            }`}
                                                    >
                                                        {t('admin.table.facultyId')}
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                                    <input
                                                        id="view_name"
                                                        value={viewingFaculty.faculty_profile?.name || viewingFaculty.first_name || ''}
                                                        readOnly
                                                        className="w-full px-4 pt-5 pb-3 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                                    />
                                                    <label
                                                        htmlFor="view_name"
                                                        className={`absolute left-4 text-app-light-text-secondary font-medium pointer-events-none transform transition-all duration-200 ${viewingFaculty.faculty_profile?.name || viewingFaculty.first_name
                                                            ? 'top-0.5 -translate-y-0 text-xs'
                                                            : 'top-1/2 -translate-y-1/2 text-sm'
                                                            }`}
                                                    >
                                                        {t('profile.name')}
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Gender and Birth Date */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="relative">
                                                <FloatingSelect
                                                    id="view_gender"
                                                    label={t('admin.table.gender')}
                                                    value={viewingFaculty.faculty_profile?.gender || ''}
                                                    onChange={() => { }}
                                                    disabled={true}
                                                    options={genderOptions(t)}
                                                />
                                            </div>
                                            <div className="relative">
                                                <CustomDatePicker
                                                    id="view_birth_date"
                                                    label={t('admin.faculty.birthDate')}
                                                    value={viewingFaculty.faculty_profile?.birth_date || ''}
                                                    onChange={() => { }}
                                                    disabled
                                                />
                                            </div>
                                        </div>

                                        {/* Department */}
                                        <div className="grid gap-4">
                                            <div className="relative">
                                                <div className="relative group border-2 rounded-lg transition-colors duration-200 border-app-light-border dark:border-app-dark-border bg-app-light-surface-secondary dark:bg-app-dark-surface-secondary">
                                                    <input
                                                        id="view_department"
                                                        value={departmentOptions(t).find(opt => opt.value === viewingFaculty.faculty_profile?.department)?.label || viewingFaculty.faculty_profile?.department || ''}
                                                        readOnly
                                                        className="w-full px-4 pt-5 pb-3 placeholder-transparent transition-colors duration-200 bg-transparent text-app-light-text-secondary dark:text-app-dark-text-secondary focus:outline-none rounded-lg"
                                                    />
                                                    <label
                                                        htmlFor="view_department"
                                                        className={`absolute left-4 text-app-light-text-secondary font-medium pointer-events-none transform transition-all duration-200 ${viewingFaculty.faculty_profile?.department
                                                            ? 'top-0.5 -translate-y-0 text-xs'
                                                            : 'top-1/2 -translate-y-1/2 text-sm'
                                                            }`}
                                                    >
                                                        {t('admin.table.department')}
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Position Info */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingSelect
                                                id="view_position_category"
                                                label={t('admin.faculty.positionCategory')}
                                                value={viewingFaculty.faculty_profile?.position_category || ''}
                                                onChange={() => { }}
                                                disabled={true}
                                                options={positionCategoryOptions(t)}
                                            />
                                            <FloatingSelect
                                                id="view_title_level"
                                                label={t('admin.faculty.titleLevel')}
                                                value={viewingFaculty.faculty_profile?.title_level || ''}
                                                onChange={() => { }}
                                                disabled={true}
                                                options={titleLevelOptions(t)}
                                            />
                                        </div>

                                        {/* Title and Staff Category */}
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingSelect
                                                id="view_title"
                                                label={t('admin.table.title')}
                                                value={viewingFaculty.faculty_profile?.title || ''}
                                                onChange={() => { }}
                                                disabled={true}
                                                options={titleOptions(t)}
                                            />
                                            <FloatingSelect
                                                id="view_staff_category"
                                                label={t('admin.faculty.staffCategory')}
                                                value={viewingFaculty.faculty_profile?.staff_category || ''}
                                                onChange={() => { }}
                                                disabled={true}
                                                options={staffCategoryOptions(t)}
                                            />
                                        </div>

                                        {/* Form Actions */}
                                        <div className="flex flex-col gap-3 pt-3 border-t border-app-light-border dark:border-app-dark-border">
                                            <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:justify-between sm:space-x-3 sm:space-y-0 sm:items-center">
                                                <button
                                                    type="button"
                                                    onClick={() => openDeleteConfirm(viewingFaculty)}
                                                    className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-error bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-surface dark:text-app-dark-error dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                                >
                                                    {t('common.delete')}
                                                </button>
                                                <div className="flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:space-x-3 sm:space-y-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate('/admin/faculty')}
                                                        className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                                    >
                                                        {t('common.close')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(viewingFaculty)}
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
                    </div>
                )}

                {/* Edit Faculty Modal */}
                {editModalOpen && editingFaculty && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
                        <div className="flex items-center justify-center min-h-full p-4">
                            <div className="w-full max-w-2xl border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                                <div className="flex items-center justify-between p-4 pb-3">
                                    <div>
                                        <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{t('admin.editFaculty', { defaultValue: 'Edit faculty' })}</h2>
                                    </div>
                                    <button type="button" onClick={() => navigate('/admin/faculty')} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="px-4 pb-4">
                                    <form onSubmit={submitEditFaculty} className="space-y-4" autoComplete="off">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingInput
                                                id="faculty_id"
                                                label={t('admin.table.facultyId')}
                                                value={editForm.faculty_id}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, faculty_id: value }))}
                                                required
                                            />
                                            <FloatingInput
                                                id="name"
                                                label={t('profile.name')}
                                                value={editForm.name}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, name: value }))}
                                            />
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingSelect
                                                id="gender"
                                                label={t('admin.table.gender')}
                                                value={editForm.gender}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, gender: value }))}
                                                options={[
                                                    { value: '', label: t('common.select', { defaultValue: 'Select' }) },
                                                    ...genderOptions(t)
                                                ]}
                                            />
                                            <FloatingInput
                                                id="birth_date"
                                                label={t('admin.faculty.birthDate')}
                                                type="date"
                                                value={editForm.birth_date}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, birth_date: value }))}
                                            />
                                        </div>
                                        <div className="grid gap-4">
                                            <FloatingSelect
                                                id="department"
                                                label={t('admin.table.department')}
                                                value={editForm.department}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, department: value }))}
                                                options={departmentOptions(t)}
                                            />
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingSelect
                                                id="position_category"
                                                label={t('admin.faculty.positionCategory')}
                                                value={editForm.position_category}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, position_category: value }))}
                                                options={positionCategoryOptions(t)}
                                            />
                                            <FloatingSelect
                                                id="title_level"
                                                label={t('admin.faculty.titleLevel')}
                                                value={editForm.title_level}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, title_level: value }))}
                                                options={titleLevelOptions(t)}
                                            />
                                        </div>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FloatingSelect
                                                id="title"
                                                label={t('admin.table.title')}
                                                value={editForm.title}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, title: value }))}
                                                options={titleOptions(t)}
                                            />
                                            <FloatingSelect
                                                id="staff_category"
                                                label={t('admin.faculty.staffCategory')}
                                                value={editForm.staff_category}
                                                onChange={(value: string) => setEditForm(prev => ({ ...prev, staff_category: value }))}
                                                options={staffCategoryOptions(t)}
                                            />
                                        </div>
                                        <div className="flex flex-col-reverse pt-3 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                            <button
                                                type="button"
                                                onClick={() => navigate('/admin/faculty')}
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
                                                    t('common.save')
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteConfirmModalOpen && facultyToDelete && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
                        <div className="flex items-center justify-center min-h-full p-4">
                            <div className="w-full max-w-md border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                                <div className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full dark:bg-red-900/30 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{t('admin.deleteFaculty', { defaultValue: 'Delete faculty' })}</h2>
                                            <p className="mt-1 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                {t('admin.deleteFacultyConfirm', { name: facultyToDelete.faculty_profile?.name || facultyToDelete.first_name || facultyToDelete.faculty_profile?.faculty_id })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col-reverse pt-4 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                        <button
                                            type="button"
                                            onClick={() => setDeleteConfirmModalOpen(false)}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={confirmDelete}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border border-transparent rounded-lg sm:w-auto text-app-light-text-on-accent bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-700"
                                        >
                                            {t('common.delete')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default AdminFacultyPage;