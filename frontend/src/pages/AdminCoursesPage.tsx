import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { AdminCourse } from '../types/admin';
import FloatingInput from '../components/FloatingInput';
import FloatingSelect from '../components/FloatingSelect';
import FloatingMultiSelect from '../components/FloatingMultiSelect';
import SearchInput from '../components/SearchInput';
import CustomDatePicker from '../components/CustomDatePicker';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getDepartmentOptions } from '../utils/constants';
import { useAuthenticatedApi } from '../utils/api';

const defaultCourseForm = () => ({
    code: '',
    title: '',
    course_type_detail: '',
    teacher: '',
    location: '',
    term: '',
    academic_year: '',
    term_start_date: '',
    weekday: '',
    periods: [] as number[],
    weeks: [] as number[],
    credits: '',
    department_name: '',
    category: '',
    nature: '',
    teaching_mode: '',
    exam_type: '',
    grading_method: '',
    hours_per_week: '',
    total_course_hours: '',
    enrolled_students: '',
    class_students: '',
    campus_name: '',
    majors: '',
    grades: '',
    audience: '',
});

type CourseFormState = ReturnType<typeof defaultCourseForm>;

const weekdayKeys = [-1, 1, 2, 3, 4, 5, 6, 7] as const;

// Section → time mapping (24h)
const SECTION_TIMES: Record<number, [string, string]> = {
    1: ["08:00", "08:40"],
    2: ["08:45", "09:25"],
    3: ["09:40", "10:20"],
    4: ["10:35", "11:15"],
    5: ["11:20", "12:00"],
    6: ["14:00", "14:40"],
    7: ["14:45", "15:25"],
    8: ["15:40", "16:20"],
    9: ["16:30", "17:10"],
    10: ["18:00", "18:40"],
    11: ["18:45", "19:25"],
    12: ["19:40", "20:20"],
    13: ["20:30", "21:10"],
};



const AdminCoursesPage: React.FC = () => {
    const { tokens } = useAuth();
    const { t } = useTranslation();
    const { '*': path } = useParams<{ '*': string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { authenticatedJsonFetch } = useAuthenticatedApi();

    // Capture saved form data before it gets cleared
    const capturedFormData = React.useRef<string | null>(null);

    // Capture the data on mount
    React.useEffect(() => {
        const savedForm = localStorage.getItem('admin-course-add-form');
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
        const studentsMatch = path.match(/^(\d+)\/students$/);
        const viewMatch = path.match(/^(\d+)$/);

        if (editMatch) {
            identifier = editMatch[1];
            action = 'edit';
        } else if (deleteMatch) {
            identifier = deleteMatch[1];
            action = 'delete';
        } else if (studentsMatch) {
            identifier = studentsMatch[1];
            action = 'students';
        } else if (viewMatch) {
            identifier = viewMatch[1];
            action = null; // view
        }
    }
    const [courses, setCourses] = useState<AdminCourse[]>([]);
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [search, setSearch] = useState('');
    const [termFilter, setTermFilter] = useState('');
    const [dayFilter, setDayFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState<CourseFormState>(() => {
        const saved = localStorage.getItem('admin-course-add-form');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const clean = Object.fromEntries(Object.entries(parsed).filter(([k, v]) => v !== undefined && v !== null));
                return { ...defaultCourseForm(), ...clean };
            } catch (e) {
                return defaultCourseForm();
            }
        }
        return defaultCourseForm();
    });
    const [saving, setSaving] = useState(false);
    const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [academicTerms, setAcademicTerms] = useState<any[]>([]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState<AdminCourse | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewingCourse, setViewingCourse] = useState<AdminCourse | null>(null);

    // Course students page states
    const [selectedCourseForStudents, setSelectedCourseForStudents] = useState<AdminCourse | null>(null);
    const [selectedCourseStudents, setSelectedCourseStudents] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Track if we've loaded initial form data to prevent overwriting localStorage on mount
    const hasLoadedInitialData = React.useRef(false);

    // Track if we're currently loading initial data to prevent saving during load
    const isLoadingInitialData = React.useRef(false);

    // Track if data has been fetched to prevent multiple fetches
    const hasFetchedData = React.useRef(false);

    // Save form data whenever it changes (as user types)
    React.useEffect(() => {
        if (!editingCourse && !isLoadingInitialData.current && hasLoadedInitialData.current) {
            localStorage.setItem('admin-course-add-form', JSON.stringify(form));
        }
    }, [form, editingCourse]);



    // Determine where to navigate when closing the view modal
    const getViewClosePath = useCallback(() => {
        const from = searchParams.get('from');
        const studentId = searchParams.get('studentId');

        if (from === 'student' && studentId) {
            return `/admin/students/${studentId}/courses`;
        }
        return '/admin/courses';
    }, [searchParams]);

    const fetchCourses = useCallback(async () => {
        if (!tokens) return;
        setLoading(true);
        try {
            const data = await authenticatedJsonFetch('/api/admin/courses/');
            setCourses(data);
            console.log('Fetched courses:', data);
        } catch (err) {
            console.error('Failed to fetch courses:', err);
            setNotice({ type: 'error', text: t('admin.courseSaveError') });
        } finally {
            setLoading(false);
        }
    }, [tokens, authenticatedJsonFetch, t]);

    const fetchAcademicTerms = useCallback(async () => {
        if (!tokens) return;
        try {
            const data = await authenticatedJsonFetch('/api/admin/academic-terms/?is_active=true');
            setAcademicTerms(data);
            console.log('Fetched academic terms:', data);
        } catch (err) {
            console.error('Failed to fetch academic terms:', err);
        }
    }, [tokens, authenticatedJsonFetch]);

    useEffect(() => {
        if (!hasFetchedData.current) {
            hasFetchedData.current = true;
            fetchCourses();
            fetchAcademicTerms();
        }
    }, [fetchCourses, fetchAcademicTerms]);

    const loadCourseStudents = useCallback(async (course: AdminCourse) => {
        setLoadingStudents(true);
        try {
            const data = await authenticatedJsonFetch(`/api/admin/course-enrollments/?course=${course.id}`);
            const students = data.filter((enrollment: any) => enrollment.student).map((enrollment: any) => enrollment.student);
            setSelectedCourseStudents(students);
            setSelectedCourseForStudents(course);
        } catch (err) {
            console.error('Failed to load course students:', err);
            setNotice({ type: 'error', text: t('admin.error.loadingStudents', { defaultValue: 'Failed to load students' }) });
        } finally {
            setLoadingStudents(false);
        }
    }, [authenticatedJsonFetch, t]);

    const termOptions = useMemo(() => {
        const unique = new Set<string>();
        courses.forEach(course => { if (course.term) unique.add(course.term); });
        return Array.from(unique);
    }, [courses]);

    const filteredCourses = useMemo(() => {
        const q = search.trim().toLowerCase();
        return courses.filter(course => {
            if (termFilter && course.term !== termFilter) return false;
            if (dayFilter && String(course.weekday) !== dayFilter) return false;
            if (!q) return true;
            const bag = [course.title, course.code, course.teacher?.name || course.teacher_id || '', course.location];
            return bag.some(field => (field || '').toLowerCase().includes(q));
        });
    }, [courses, search, termFilter, dayFilter]);

    const formatTime = (course: AdminCourse) => {
        if (course.periods && course.periods.length > 0) {
            const minPeriod = Math.min(...course.periods);
            const maxPeriod = Math.max(...course.periods);
            const startTime = SECTION_TIMES[minPeriod]?.[0];
            const endTime = SECTION_TIMES[maxPeriod]?.[1];
            if (startTime && endTime) {
                return `${startTime} - ${endTime}`;
            }
        }
        return '—';
    };

    const formatDay = (value: number) => {
        if (value === -1) {
            return t('admin.weekday.-1');
        }
        return t(`admin.weekday.${value}`, { defaultValue: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][value - 1] });
    };
    const formatPeriods = (course: AdminCourse) => (course.periods?.length ? course.periods.join(', ') : '—');
    const formatWeeks = (course: AdminCourse) => (course.weeks?.length ? course.weeks.join(', ') : '—');

    // Translation helper functions for course select values
    const translateCategory = (value: string) => {
        const translations: Record<string, string> = {
            '通识一': t('admin.courseForm.category.general1'),
            '通识二': t('admin.courseForm.category.general2'),
            '专业核心课': t('admin.courseForm.category.core'),
            '专业拓展课': t('admin.courseForm.category.elective'),
            '无': t('admin.courseForm.category.none'),
            '【新】专业方向课程': t('admin.courseForm.category.newMajorDirection'),
            '【新】专业核心课程': t('admin.courseForm.category.newMajorCore'),
            '【新】学科基础课程': t('admin.courseForm.category.newDisciplineFoundation'),
            '【新】综合实践课程': t('admin.courseForm.category.newComprehensivePractice'),
            '实践课程': t('admin.courseForm.category.practice'),
            '教师教育课程': t('admin.courseForm.category.teacherEducation'),
        };
        return translations[value] || value;
    };

    const translateNature = (value: string) => {
        const translations: Record<string, string> = {
            '必修': t('admin.courseForm.nature.required'),
            '选修': t('admin.courseForm.nature.elective'),
        };
        return translations[value] || value;
    };

    const translateTeachingMode = (value: string) => {
        const translations: Record<string, string> = {
            '线下授课': t('admin.courseForm.teachingMode.offline'),
            '线上授课': t('admin.courseForm.teachingMode.online'),
            '线上线下混合授课': t('admin.courseForm.teachingMode.hybrid'),
        };
        return translations[value] || value;
    };

    const translateExamType = (value: string) => {
        const translations: Record<string, string> = {
            '考试': t('admin.courseForm.examType.exam'),
            '考查': t('admin.courseForm.examType.assessment'),
        };
        return translations[value] || value;
    };

    const translateGradingMethod = (value: string) => {
        const translations: Record<string, string> = {
            '考试': t('admin.courseForm.gradingMethod.exam'),
            '考查': t('admin.courseForm.gradingMethod.assessment'),
        };
        return translations[value] || value;
    };

    const translateMajor = (value: string) => {
        const translations: Record<string, string> = {
            '智能科学与技术': t('admin.courseForm.major.intelligentScience'),
            '理科试验班（计算机科学与技术）': t('admin.courseForm.major.scienceExperimentClass'),
            '虚拟专业01': t('admin.courseForm.major.virtualMajor01'),
            '计算机科学与技术': t('admin.courseForm.major.computerScience'),
            '计算机科学与技术,计算机科学与技术（初阳荣誉班）': t('admin.courseForm.major.computerScienceHonor'),
            '计算机科学与技术,计算机科学与技术（初阳荣誉班）,计算机科学与技术（非师范）': t('admin.courseForm.major.computerScienceHonorNonNormal'),
            '计算机科学与技术,计算机科学与技术（非师范）': t('admin.courseForm.major.computerScienceNonNormal'),
            '计算机科学与技术（全英文班）': t('admin.courseForm.major.computerScienceEnglish'),
            '计算机科学与技术（初阳荣誉班）': t('admin.courseForm.major.computerScienceHonorOnly'),
            '计算机科学与技术（初阳荣誉班）,计算机科学与技术（非师范）': t('admin.courseForm.major.computerScienceHonorNonNormal'),
            '计算机科学与技术（初阳荣誉班）,软件工程': t('admin.courseForm.major.computerScienceHonorSoftware'),
            '计算机科学与技术（非师范）': t('admin.courseForm.major.computerScienceNonNormalOnly'),
            '软件工程': t('admin.courseForm.major.softwareEngineering'),
            '软件工程（中外合作办学）': t('admin.courseForm.major.softwareEngineeringInternational'),
        };
        return translations[value] || value;
    };

    const translateDepartment = (value: string) => {
        const translations: Record<string, string> = {
            '计算机科学与技术学院': t('faculty.departments.计算机科学与技术学院'),
            '工学院': t('faculty.departments.工学院'),
            '数学科学学院': t('faculty.departments.数学科学学院'),
            '物理与电子信息工程学院': t('faculty.departments.物理与电子信息工程学院'),
            '数理医学院': t('faculty.departments.数理医学院'),
            '国际经济与贸易学院': t('faculty.departments.国际经济与贸易学院'),
        };
        return translations[value] || value;
    };

    const translateCampus = (value: string) => {
        const translations: Record<string, string> = {
            '主校区（金华）': t('admin.courseForm.campus.mainJinhua'),
        };
        return translations[value] || value;
    };

    const translateCourseTitle = (value: string) => {
        const translations: Record<string, string> = {
            '人工智能导论': t('admin.course.title.aiIntro'),
            '大模型引领的人工智能通识与实践': t('admin.course.title.largeModelAI'),
            '动手学 AI：人工智能通识与实践（人文艺术版）': t('admin.course.title.handsOnAIHumanities'),
            '动手学 AI：人工智能通识与实践（社科版）': t('admin.course.title.handsOnAISocialScience'),
            '动手学 AI：人工智能通识与实践（理工版）': t('admin.course.title.handsOnAIScience'),
            '人工智能通识与实践应用': t('admin.course.title.aiGeneralPractice'),
            '人工智能实践应用（师范类、人文社科）': t('admin.course.title.aiPracticeNormalHumanities'),
            '人工智能实践应用（师范类、理工科）': t('admin.course.title.aiPracticeNormalScience'),
            'WPS智能办公': t('admin.course.title.wpsOffice'),
            '人工智能应用-网站设计': t('admin.course.title.aiWebDesign'),
            '人工智能基础-Python程序设计': t('admin.course.title.pythonProgramming'),
            'C语言程序设计': t('admin.course.title.cProgramming'),
            'Java程序设计': t('admin.course.title.javaProgramming'),
            'Python与数据分析': t('admin.course.title.pythonDataAnalysis'),
            'Python数据分析应用实训': t('admin.course.title.pythonDataAnalysisTraining'),
            'UI/UX交互设计': t('admin.course.title.uiUxDesign'),
            'Web前端开发技术': t('admin.course.title.webFrontendDevelopment'),
            'Web应用程序开发': t('admin.course.title.webAppDevelopment'),
            '专业基础技能考核': t('admin.course.title.professionalSkillsAssessment'),
            '专业实习': t('admin.course.title.internship'),
            '专业导论': t('admin.course.title.professionalIntroduction'),
            '专业英语': t('admin.course.title.professionalEnglish'),
            '专业见习': t('admin.course.title.professionalVisit'),
            '个人项目实训': t('admin.course.title.individualProjectTraining'),
            '交互设计': t('admin.course.title.interactionDesign'),
            '人工智能基础': t('admin.course.title.aiFoundation'),
            '人工智能算法实训': t('admin.course.title.aiAlgorithmTraining'),
            '分布式系统': t('admin.course.title.distributedSystems'),
            '团队协作与职业素质': t('admin.course.title.teamworkProfessionalQuality'),
            '团队规范项目实训': t('admin.course.title.teamProjectTraining'),
            '多媒体技术与应用': t('admin.course.title.multimediaTechnology'),
            '嵌入式软件开发': t('admin.course.title.embeddedSoftwareDevelopment'),
            '开源硬件实训': t('admin.course.title.openSourceHardwareTraining'),
            '教育实习': t('admin.course.title.educationInternship'),
            '教育研习': t('admin.course.title.educationResearch'),
            '数字信号处理': t('admin.course.title.digitalSignalProcessing'),
            '数字图像处理与计算机视觉': t('admin.course.title.digitalImageProcessing'),
            '数据库原理及应用': t('admin.course.title.databasePrinciples'),
            '数据库及应用技术': t('admin.course.title.databaseTechnology'),
            '数据结构课程设计': t('admin.course.title.dataStructuresDesign'),
            '智能科学新技术讲座': t('admin.course.title.intelligentScienceSeminar'),
            '智能移动设备软件开发': t('admin.course.title.mobileSoftwareDevelopment'),
            '机器人学': t('admin.course.title.robotics'),
            '概率与数理统计': t('admin.course.title.probabilityStatistics'),
            '离散数学': t('admin.course.title.discreteMathematics'),
            '科技文献检索及专利申请': t('admin.course.title.techLiteratureSearch'),
            '移动应用开发': t('admin.course.title.mobileAppDevelopment'),
            '算法设计与分析': t('admin.course.title.algorithmDesign'),
            '系统分析与设计：理论和方法': t('admin.course.title.systemAnalysisDesign'),
            '线性代数': t('admin.course.title.linearAlgebra'),
            '编译原理': t('admin.course.title.compilerPrinciples'),
            '网络安全': t('admin.course.title.networkSecurity'),
            '网络安全技能综合实训': t('admin.course.title.networkSecurityTraining'),
            '网络攻击与防御技术': t('admin.course.title.networkAttackDefense'),
            '计算方法': t('admin.course.title.computationalMethods'),
            '计算机新技术讲座': t('admin.course.title.computerScienceSeminar'),
            '计算机科学导论': t('admin.course.title.computerScienceIntro'),
            '计算机组成与结构': t('admin.course.title.computerArchitecture'),
            '软件新技术讲座': t('admin.course.title.softwareSeminar'),
            '软件设计模式': t('admin.course.title.softwareDesignPatterns'),
            '软件质量保证与测试': t('admin.course.title.softwareQualityTesting'),
            '软件过程与文档写作': t('admin.course.title.softwareProcessDocumentation'),
            '软件项目管理': t('admin.course.title.softwareProjectManagement'),
            '防火墙与入侵检测技术': t('admin.course.title.firewallIntrusionDetection'),
            '面向对象分析与设计': t('admin.course.title.ooAnalysisDesign'),
            '面向对象程序设计C#': t('admin.course.title.ooProgrammingCsharp'),
            '面向对象程序设计Java': t('admin.course.title.ooProgrammingJava'),
            '面向对象编程基础': t('admin.course.title.ooProgrammingFoundation'),
            '项目管理与工程实训': t('admin.course.title.projectManagementTraining'),
        };
        return translations[value] || value;
    };

    // Generate academic year options dynamically (1 year behind to 4 years ahead)
    const generateAcademicYearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [];

        // Add 1 year behind
        years.push(`${currentYear - 1}-${currentYear}`);

        // Add current year and 4 years ahead
        for (let i = 0; i <= 4; i++) {
            years.push(`${currentYear + i}-${currentYear + i + 1}`);
        }

        return years.map(year => ({ value: year, label: year }));
    }, []);

    // Calculate week 1 Monday date from academic year and term
    const calculateWeekOneMonday = useCallback((academicYear: string, term: string): string => {
        // Find the academic term that matches the academic year and semester
        const semester = term === 'first' ? 1 : term === 'second' ? 2 : 1;
        const matchingTerm = academicTerms.find(t =>
            t.academic_year === academicYear && t.semester === semester
        );
        return matchingTerm ? matchingTerm.first_week_monday : '';
    }, [academicTerms]);

    // Calculate academic year from a week 1 Monday date
    const calculateAcademicYearFromDate = useCallback((firstWeekMonday: string): string => {
        if (!firstWeekMonday) return '';

        const matchingTerm = academicTerms.find(t => t.first_week_monday === firstWeekMonday);
        return matchingTerm ? matchingTerm.academic_year : '';
    }, [academicTerms]);

    // Handle academic year change
    const handleAcademicYearChange = useCallback((academicYear: string) => {
        const firstWeekMonday = calculateWeekOneMonday(academicYear, form.term);
        setForm(prev => ({
            ...prev,
            academic_year: academicYear,
            term_start_date: firstWeekMonday
        }));
    }, [calculateWeekOneMonday, form.term]);

    // Handle term change
    const handleTermChange = useCallback((term: string) => {
        const firstWeekMonday = calculateWeekOneMonday(form.academic_year, term);
        setForm(prev => ({
            ...prev,
            term: term,
            term_start_date: firstWeekMonday
        }));
    }, [calculateWeekOneMonday, form.academic_year]);

    const openEditModal = (course: AdminCourse) => {
        setEditingCourse(course);
        const academicYear = calculateAcademicYearFromDate(course.term_start_date || '');
        setForm({
            code: course.code || '',
            title: course.title || '',
            course_type_detail: course.course_type_detail || '',
            teacher: course.teacher?.faculty_id || '',
            location: course.location || '',
            term: course.term || '',
            academic_year: academicYear,
            term_start_date: course.term_start_date || '',
            weekday: String(course.weekday || 1),
            periods: course.periods || [],
            weeks: course.weeks || [],
            credits: course.credits?.toString() || '',
            department_name: course.department_name || '',
            category: course.category || '',
            nature: course.nature || '',
            teaching_mode: course.teaching_mode || '',
            exam_type: course.exam_type || '',
            grading_method: course.grading_method || '',
            hours_per_week: course.hours_per_week?.toString() || '',
            total_course_hours: course.total_course_hours?.toString() || '',
            enrolled_students: course.enrolled_students?.toString() || '',
            class_students: course.class_students?.toString() || '',
            campus_name: course.campus_name || '',
            majors: course.majors || '',
            grades: course.grades || '',
            audience: course.audience || '',
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSaving(false);
        setEditingCourse(null);
        setForm(defaultCourseForm());
    };

    const submitCourse = async (evt: React.FormEvent) => {
        evt.preventDefault();
        if (!tokens) return;
        setSaving(true);

        // Check if the academic term exists
        const semester = form.term === 'first' ? 1 : form.term === 'second' ? 2 : 1;
        const termExists = academicTerms.some(term =>
            term.academic_year === form.academic_year && term.semester === semester
        );

        if (!termExists && form.academic_year && form.term) {
            // Academic term doesn't exist, show date picker
            setShowDatePicker(true);
            setSaving(false);
            return;
        }

        await saveCourse();
    };

    const saveCourse = async () => {
        const payload = {
            code: form.code.trim(),
            title: form.title.trim(),
            course_type_detail: form.course_type_detail.trim(),
            teacher: form.teacher.trim(),
            location: form.location.trim(),
            term: form.term.trim(),
            term_start_date: form.term_start_date,
            weekday: Number(form.weekday),
            periods: form.periods,
            weeks: form.weeks,
            credits: form.credits ? Number(form.credits) : null,
            department_name: form.department_name.trim(),
            category: form.category.trim(),
            nature: form.nature.trim(),
            teaching_mode: form.teaching_mode.trim(),
            exam_type: form.exam_type.trim(),
            grading_method: form.grading_method.trim(),
            hours_per_week: form.hours_per_week ? Number(form.hours_per_week) : null,
            total_course_hours: form.total_course_hours ? Number(form.total_course_hours) : null,
            enrolled_students: form.enrolled_students ? Number(form.enrolled_students) : null,
            class_students: form.class_students ? Number(form.class_students) : null,
            campus_name: form.campus_name.trim(),
            majors: form.majors.trim(),
            grades: form.grades.trim(),
            audience: form.audience.trim(),
        };
        try {
            const url = editingCourse ? `/api/admin/courses/${editingCourse.id}/` : '/api/admin/courses/';
            const method = editingCourse ? 'PATCH' : 'POST';
            await authenticatedJsonFetch(url, { method, body: JSON.stringify(payload) });
            setNotice({ type: 'success', text: t('admin.courseSaveSuccess') });
            if (!editingCourse) {
                localStorage.removeItem('admin-course-add-form');
            }
            navigate('/admin/courses');
            fetchCourses();
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.courseSaveError') });
        } finally {
            setSaving(false);
        }
    };

    const saveWithNewTerm = async () => {
        if (!selectedDate) return;

        // Create the academic term first
        const semester = form.term === 'first' ? 1 : form.term === 'second' ? 2 : 1;
        const termData = {
            term: `${form.academic_year}-${semester}`,
            academic_year: form.academic_year,
            semester: semester,
            first_week_monday: selectedDate,
            is_active: true
        };

        try {
            await authenticatedJsonFetch('/api/admin/academic-terms/', {
                method: 'POST',
                body: JSON.stringify(termData)
            });

            // Update local state
            setAcademicTerms(prev => [...prev, termData]);

            // Update form with the selected date
            setForm(prev => ({ ...prev, term_start_date: selectedDate }));

            // Hide date picker and save course
            setShowDatePicker(false);
            setSelectedDate('');
            await saveCourse();

        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: 'Failed to create academic term' });
            setSaving(false);
        }
    };

    const deleteCourse = async (courseId: number) => {
        if (!tokens) return;
        setDeletingId(courseId);
        try {
            await authenticatedJsonFetch(`/api/admin/courses/${courseId}/`, { method: 'DELETE' });
            fetchCourses();
        } catch (err) {
            console.error(err);
            setNotice({ type: 'error', text: t('admin.courseSaveError') });
        } finally {
            setDeletingId(null);
        }
    };

    const openDeleteConfirm = (course: AdminCourse) => {
        setCourseToDelete(course);
        setDeleteConfirmModalOpen(true);
    };

    const confirmDeleteCourse = async () => {
        if (!courseToDelete) return;
        const courseId = courseToDelete.id;
        setDeleteConfirmModalOpen(false);
        setCourseToDelete(null);
        await deleteCourse(courseId);
        navigate('/admin/courses');
    };

    const cancelDelete = () => {
        setDeleteConfirmModalOpen(false);
        setCourseToDelete(null);
        if (courseToDelete) {
            navigate(`/admin/courses/${courseToDelete.id}`);
        }
    };

    useEffect(() => {
        // Always close all modals first
        setModalOpen(false);
        setEditingCourse(null);
        setDeleteConfirmModalOpen(false);
        setCourseToDelete(null);
        setViewModalOpen(false);
        setViewingCourse(null);

        if (action === 'add') {
            isLoadingInitialData.current = true;
            const saved = localStorage.getItem('admin-course-add-form');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    const clean = Object.fromEntries(Object.entries(parsed).filter(([k, v]) => v !== undefined && v !== null));
                    setForm({ ...defaultCourseForm(), ...clean });
                } catch (e) {
                    console.error('Failed to parse saved course form:', e);
                    setForm(defaultCourseForm());
                }
            } else {
                setForm(defaultCourseForm());
            }
            hasLoadedInitialData.current = true;
            isLoadingInitialData.current = false;
            setEditingCourse(null);
            setModalOpen(true);
        } else if (identifier) {
            const courseId = parseInt(identifier, 10);
            if (!isNaN(courseId) && courses.length > 0) {
                const course = courses.find(c => c.id === courseId);
                if (course) {
                    if (action === 'edit') {
                        openEditModal(course);
                    } else if (action === 'delete') {
                        openDeleteConfirm(course);
                    } else if (action === 'students') {
                        loadCourseStudents(course);
                    } else if (action === null) {
                        // view action
                        setViewingCourse(course);
                        setViewModalOpen(true);
                    }
                }
            }
            // If course not found, modals stay closed
        }
        // If no identifier, modals stay closed
    }, [identifier, action, courses]);

    useEffect(() => {
        const isAnyModalOpen = modalOpen || viewModalOpen || deleteConfirmModalOpen || showDatePicker;
        const originalOverflow = document.body.style.overflow;
        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [modalOpen, viewModalOpen, deleteConfirmModalOpen, showDatePicker]);

    return (
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-6">
                <header className="flex items-center justify-between gap-3">
                    <h1 className="text-xl font-semibold flex-shrink-0">{t('admin.manageCourses', { defaultValue: 'Manage courses' })}</h1>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <button type="button" onClick={() => navigate('/admin/courses/add')} className="px-3 py-2 text-sm transition-colors border border-transparent rounded-lg text-app-light-text-on-accent bg-app-light-accent hover:bg-app-light-accent-hover dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover whitespace-nowrap">
                            {t('admin.addCourse', { defaultValue: 'Add course' })}
                        </button>
                    </div>
                </header>

                {notice && (
                    <div className={`rounded-md border px-4 py-3 text-sm ${notice.type === 'success'
                        ? 'border-app-light-accent bg-app-light-accent/10 text-app-light-text-primary dark:border-app-dark-accent dark:bg-app-dark-accent/10 dark:text-app-dark-text-primary'
                        : 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100'}`}>
                        {notice.text}
                    </div>
                )}

                {/* Show course students page */}
                {action === 'students' && selectedCourseForStudents && (
                    <>
                        <header className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate(`/admin/courses/${selectedCourseForStudents.id}`)}
                                    className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover"
                                    aria-label={t('common.back')}
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M15 18l-6-6 6-6" />
                                    </svg>
                                </button>
                                <div>
                                    <h1 className="text-xl font-semibold">{t('admin.course.students', { defaultValue: 'Course Students' })}</h1>
                                    <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {selectedCourseForStudents.title} ({selectedCourseForStudents.code})
                                    </p>
                                </div>
                            </div>
                        </header>

                        <section className="p-5 border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface">
                            {loadingStudents ? (
                                <div className="py-8 text-center">
                                    <div className="inline-block w-4 h-4 border-4 border-app-light-accent/30 border-t-app-light-accent rounded-full animate-spin dark:border-app-dark-accent/30 dark:border-t-app-dark-accent"></div>
                                    <p className="mt-2 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {t('common.loading')}
                                    </p>
                                </div>
                            ) : selectedCourseStudents.length === 0 ? (
                                <div className="py-8 text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.course.noStudents', { defaultValue: 'No students found for this course.' })}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-medium">{t('admin.course.students')}</h2>
                                        <span className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                            {selectedCourseStudents.length} {t('admin.table.students', { defaultValue: 'students' })}
                                        </span>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {selectedCourseStudents.map((student: any) => (
                                            <div key={student.student_id} className="p-4 border rounded-lg border-app-light-border dark:border-app-dark-border hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover cursor-pointer transition-colors" onClick={() => navigate(`/admin/students/${student.student_id}?from=course&courseId=${selectedCourseForStudents.id}`)}>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-medium text-app-light-text-primary dark:text-app-dark-text-primary truncate">
                                                            {student.student_id}
                                                        </h3>
                                                        <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary mt-1">
                                                            {student.user?.first_name || '—'}
                                                        </p>
                                                        {student.class_name && (
                                                            <p className="text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary mt-1">
                                                                Class: {student.class_name}
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

                {/* Show main courses list when not on students page */}
                {action !== 'students' && (
                    <section className="p-5 border shadow-sm bg-app-light-surface border-app-light-border rounded-xl dark:border-app-dark-border dark:bg-app-dark-surface">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <SearchInput
                                id="course-search"
                                label={t('admin.searchCourses', { defaultValue: 'Search courses...' })}
                                value={search}
                                onChange={setSearch}
                                placeholder={t('admin.searchCourses', { defaultValue: 'Search courses...' })}
                            />
                            <FloatingSelect
                                id="term-filter"
                                label={t('admin.course.term')}
                                value={termFilter}
                                onChange={setTermFilter}
                                options={[
                                    { value: '', label: t('admin.course.term') },
                                    ...termOptions.map(term => ({ value: term, label: term }))
                                ]}
                                hideSelectedTextWhen={(value) => value === ''}
                            />
                            <FloatingSelect
                                id="day-filter"
                                label={t('admin.course.day')}
                                value={dayFilter}
                                onChange={setDayFilter}
                                options={[
                                    { value: '', label: t('admin.course.day') },
                                    ...weekdayKeys.map(key => ({ value: String(key), label: formatDay(key) }))
                                ]}
                                hideSelectedTextWhen={(value) => value === ''}
                            />
                        </div>

                        <div className="mt-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                            <th className="px-4 py-2 whitespace-nowrap">{t('admin.course.term')}</th>
                                            <th className="px-4 py-2 whitespace-nowrap min-w-[200px]">{t('admin.course.title')}</th>
                                            <th className="px-4 py-2 whitespace-nowrap">{t('admin.course.teacher')}</th>
                                            <th className="px-4 py-2 whitespace-nowrap text-center">{t('admin.courseForm.credits')}</th>
                                            <th className="px-4 py-2 whitespace-nowrap text-center">{t('admin.courseForm.enrolledStudents')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!filteredCourses.length && !loading && (
                                            <tr>
                                                <td colSpan={5} className="py-6 text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('admin.noCourses')}</td>
                                            </tr>
                                        )}
                                        {loading && (
                                            <tr>
                                                <td colSpan={5} className="py-6 text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                                    <div className="inline-block w-4 h-4 border-4 border-app-light-accent/30 border-t-app-light-accent rounded-full animate-spin dark:border-app-dark-accent/30 dark:border-t-app-dark-accent mr-2"></div>
                                                    {t('common.loading')}
                                                </td>
                                            </tr>
                                        )}
                                        {filteredCourses.map(course => (
                                            <tr key={course.id} className="border-t border-app-light-border dark:border-app-dark-border">
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/admin/courses/${course.id}`)}
                                                        className="text-sm font-medium transition-colors text-app-light-text-primary dark:text-app-dark-text-primary hover:text-app-light-text-secondary dark:hover:text-app-dark-text-secondary"
                                                    >
                                                        {course.term === 'first' ? t('admin.courseForm.term.first') :
                                                            course.term === 'second' ? t('admin.courseForm.term.second') :
                                                                course.term || ''}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-2 min-w-[200px]">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/admin/courses/${course.id}`)}
                                                        className="w-full text-left block"
                                                    >
                                                        <p className="font-medium text-app-light-text-primary dark:text-app-dark-text-primary hover:text-app-light-text-secondary dark:hover:text-app-dark-text-secondary">{translateCourseTitle(course.title || '')}</p>
                                                        <p className="text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">{course.code || ''}{course.course_type_detail ? ` · ${course.course_type_detail === 'Theory' ? t('admin.courseForm.type.theory') :
                                                            course.course_type_detail === 'Technical' ? t('admin.courseForm.type.technical') :
                                                                course.course_type_detail === 'Practice' ? t('admin.courseForm.type.practice') :
                                                                    course.course_type_detail === 'Experiment' ? t('admin.courseForm.type.experiment') :
                                                                        course.course_type_detail
                                                            }` : ''}</p>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/admin/faculty/${course.teacher?.id || course.teacher_id}`)}
                                                        className="text-sm font-medium transition-colors text-app-light-text-primary dark:text-app-dark-text-primary hover:text-app-light-text-secondary dark:hover:text-app-dark-text-secondary"
                                                    >
                                                        {course.teacher?.name || course.teacher_id || ''}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/admin/courses/${course.id}`)}
                                                        className="text-sm font-medium transition-colors text-app-light-text-primary dark:text-app-dark-text-primary hover:text-app-light-text-secondary dark:hover:text-app-dark-text-secondary"
                                                    >
                                                        {course.credits || ''}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/admin/courses/${course.id}/students`)}
                                                        className="text-sm font-medium transition-colors text-app-light-text-primary dark:text-app-dark-text-primary hover:text-app-light-text-secondary dark:hover:text-app-dark-text-secondary"
                                                    >
                                                        {course.enrolled_students ?? 0}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                )}

            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
                    <div className="flex items-center justify-center min-h-full p-4">
                        <div className="w-full max-w-2xl border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                            <div className="flex items-center justify-between p-4 pb-3">
                                <div>
                                    <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {editingCourse ? t('admin.editCourse') : t('admin.addCourse')}
                                    </p>
                                    <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{form.title || t('admin.course.title')}</h2>
                                </div>
                                <button type="button" onClick={() => {
                                    if (!editingCourse) {
                                        // Save current form data before closing
                                        localStorage.setItem('admin-course-add-form', JSON.stringify(form));
                                    }
                                    editingCourse ? navigate(`/admin/courses/${editingCourse.id}`) : navigate('/admin/courses');
                                }} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="px-4 pb-4">
                                <form onSubmit={submitCourse} className="space-y-4" autoComplete="off">
                                    {/* Basic Info Row */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="course-code"
                                            label={t('admin.courseForm.code')}
                                            value={form.code}
                                            onChange={(value) => setForm(prev => ({ ...prev, code: value }))}
                                        />
                                        <FloatingSelect
                                            id="course-type"
                                            label={t('admin.courseForm.type')}
                                            value={form.course_type_detail}
                                            onChange={(value: string) => setForm(prev => ({ ...prev, course_type_detail: value }))}
                                            options={[
                                                { value: '', label: t('admin.courseForm.type') },
                                                { value: 'Theory', label: t('admin.courseForm.type.theory') },
                                                { value: 'Technical', label: t('admin.courseForm.type.technical') },
                                                { value: 'Practice', label: t('admin.courseForm.type.practice') },
                                                { value: 'Experiment', label: t('admin.courseForm.type.experiment') },
                                            ]}
                                            hideSelectedTextWhen={(value) => value === ''}
                                        />
                                    </div>

                                    {/* Title */}
                                    <FloatingInput
                                        id="course-title"
                                        label={t('admin.courseForm.title')}
                                        value={form.title}
                                        onChange={(value) => setForm(prev => ({ ...prev, title: value }))}
                                        required
                                    />

                                    {/* Teacher and Location */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="course-teacher"
                                            label={t('admin.courseForm.teacher')}
                                            value={form.teacher}
                                            onChange={(value) => setForm(prev => ({ ...prev, teacher: value }))}
                                        />
                                        <FloatingInput
                                            id="course-location"
                                            label={t('admin.courseForm.location')}
                                            value={form.location}
                                            onChange={(value) => setForm(prev => ({ ...prev, location: value }))}
                                        />
                                    </div>

                                    {/* Term, Date, Day */}
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <FloatingSelect
                                            id="course-term"
                                            label={t('admin.courseForm.term')}
                                            value={form.term}
                                            onChange={handleTermChange}
                                            options={[
                                                { value: '', label: t('admin.courseForm.term') },
                                                { value: 'first', label: t('admin.courseForm.term.first') },
                                                { value: 'second', label: t('admin.courseForm.term.second') },
                                            ]}
                                            hideSelectedTextWhen={(value) => value === ''}
                                        />
                                        <FloatingSelect
                                            id="academic-year"
                                            label={t('admin.courseForm.academicYear', { defaultValue: 'Academic Year' })}
                                            value={form.academic_year}
                                            onChange={handleAcademicYearChange}
                                            options={[
                                                { value: '', label: t('admin.courseForm.academicYear', { defaultValue: 'Academic Year' }) },
                                                ...generateAcademicYearOptions
                                            ]}
                                            hideSelectedTextWhen={(value) => value === ''}
                                        />
                                        <FloatingSelect
                                            id="day-of-week"
                                            label={t('admin.course.day')}
                                            value={form.weekday}
                                            onChange={(value: string) => setForm(prev => ({ ...prev, weekday: value }))}
                                            options={[
                                                { value: '', label: t('admin.course.day') },
                                                ...weekdayKeys.map(key => ({ value: String(key), label: formatDay(key) }))
                                            ]}
                                            hideSelectedTextWhen={(value) => value === ''}
                                        />
                                    </div>

                                    {/* Sessions and Weeks */}
                                    <div className="space-y-4">
                                        <FloatingMultiSelect
                                            id="course-periods"
                                            label={t('admin.courseForm.periods')}
                                            value={form.periods.map(String)}
                                            onChange={(value) => setForm(prev => ({ ...prev, periods: value.map(Number) }))}
                                            options={Array.from({ length: 13 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                                        />
                                        <FloatingMultiSelect
                                            id="course-weeks"
                                            label={t('admin.courseForm.weeks')}
                                            value={form.weeks.map(String)}
                                            onChange={(value) => setForm(prev => ({ ...prev, weeks: value.map(Number) }))}
                                            options={Array.from({ length: 17 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                                            showSearch={true}
                                        />
                                    </div>

                                    {/* Course Details */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="course-credits"
                                            label={t('admin.courseForm.credits')}
                                            value={form.credits}
                                            onChange={(value) => setForm(prev => ({ ...prev, credits: value }))}
                                            type="number"
                                            step="0.5"
                                        />
                                        <FloatingSelect
                                            id="course-department"
                                            label={t('admin.courseForm.department')}
                                            value={form.department_name}
                                            onChange={(value) => setForm(prev => ({ ...prev, department_name: value }))}
                                            options={getDepartmentOptions(t)}
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingSelect
                                            id="course-category"
                                            label={t('admin.courseForm.category')}
                                            value={form.category}
                                            onChange={(value: string) => setForm(prev => ({ ...prev, category: value }))}
                                            options={[
                                                { value: '', label: t('admin.courseForm.category') },
                                                { value: '通识一', label: t('admin.courseForm.category.general1') },
                                                { value: '通识二', label: t('admin.courseForm.category.general2') },
                                                { value: '专业核心课', label: t('admin.courseForm.category.core') },
                                                { value: '专业拓展课', label: t('admin.courseForm.category.elective') },
                                                { value: '无', label: t('admin.courseForm.category.none') },
                                                { value: '【新】专业方向课程', label: t('admin.courseForm.category.newMajorDirection') },
                                                { value: '【新】专业核心课程', label: t('admin.courseForm.category.newMajorCore') },
                                                { value: '【新】学科基础课程', label: t('admin.courseForm.category.newDisciplineFoundation') },
                                                { value: '【新】综合实践课程', label: t('admin.courseForm.category.newComprehensivePractice') },
                                                { value: '实践课程', label: t('admin.courseForm.category.practice') },
                                                { value: '教师教育课程', label: t('admin.courseForm.category.teacherEducation') },
                                            ]}
                                            hideSelectedTextWhen={(value) => value === ''}
                                        />
                                        <FloatingSelect
                                            id="course-nature"
                                            label={t('admin.courseForm.nature')}
                                            value={form.nature}
                                            onChange={(value: string) => setForm(prev => ({ ...prev, nature: value }))}
                                            options={[
                                                { value: '', label: t('admin.courseForm.nature') },
                                                { value: '必修', label: t('admin.courseForm.nature.required') },
                                                { value: '选修', label: t('admin.courseForm.nature.elective') },
                                            ]}
                                            hideSelectedTextWhen={(value) => value === ''}
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingSelect
                                            id="course-teaching-mode"
                                            label={t('admin.courseForm.teachingMode')}
                                            value={form.teaching_mode}
                                            onChange={(value: string) => setForm(prev => ({ ...prev, teaching_mode: value }))}
                                            options={[
                                                { value: '', label: t('admin.courseForm.teachingMode') },
                                                { value: '线下授课', label: t('admin.courseForm.teachingMode.offline') },
                                                { value: '线上授课', label: t('admin.courseForm.teachingMode.online') },
                                                { value: '线上线下混合授课', label: t('admin.courseForm.teachingMode.hybrid') },
                                            ]}
                                            hideSelectedTextWhen={(value) => value === ''}
                                        />
                                        <FloatingSelect
                                            id="course-exam-type"
                                            label={t('admin.courseForm.examType')}
                                            value={form.exam_type}
                                            onChange={(value: string) => setForm(prev => ({ ...prev, exam_type: value }))}
                                            options={[
                                                { value: '', label: t('admin.courseForm.examType') },
                                                { value: '考试', label: t('admin.courseForm.examType.exam') },
                                                { value: '考查', label: t('admin.courseForm.examType.assessment') },
                                            ]}
                                            hideSelectedTextWhen={(value) => value === ''}
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingSelect
                                            id="course-grading-method"
                                            label={t('admin.courseForm.gradingMethod')}
                                            value={form.grading_method}
                                            onChange={(value: string) => setForm(prev => ({ ...prev, grading_method: value }))}
                                            options={[
                                                { value: '', label: t('admin.courseForm.gradingMethod') },
                                                { value: '考试', label: t('admin.courseForm.gradingMethod.exam') },
                                                { value: '考查', label: t('admin.courseForm.gradingMethod.assessment') },
                                            ]}
                                            hideSelectedTextWhen={(value) => value === ''}
                                        />
                                        <FloatingInput
                                            id="course-hours-per-week"
                                            label={t('admin.courseForm.hoursPerWeek')}
                                            value={form.hours_per_week}
                                            onChange={(value) => setForm(prev => ({ ...prev, hours_per_week: value }))}
                                            type="number"
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="course-total-hours"
                                            label={t('admin.courseForm.totalCourseHours')}
                                            value={form.total_course_hours}
                                            onChange={(value) => setForm(prev => ({ ...prev, total_course_hours: value }))}
                                            type="number"
                                        />
                                        <FloatingInput
                                            id="course-enrolled-students"
                                            label={t('admin.courseForm.enrolledStudents')}
                                            value={form.enrolled_students}
                                            onChange={(value) => setForm(prev => ({ ...prev, enrolled_students: value }))}
                                            type="number"
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="course-class-students"
                                            label={t('admin.courseForm.classStudents')}
                                            value={form.class_students}
                                            onChange={(value) => setForm(prev => ({ ...prev, class_students: value }))}
                                            type="number"
                                        />
                                        <FloatingInput
                                            id="course-campus"
                                            label={t('admin.courseForm.campusName')}
                                            value={form.campus_name}
                                            onChange={(value) => setForm(prev => ({ ...prev, campus_name: value }))}
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="course-majors"
                                            label={t('admin.courseForm.majors')}
                                            value={form.majors}
                                            onChange={(value) => setForm(prev => ({ ...prev, majors: value }))}
                                        />
                                        <FloatingInput
                                            id="course-grades"
                                            label={t('admin.courseForm.grades')}
                                            value={form.grades}
                                            onChange={(value) => setForm(prev => ({ ...prev, grades: value }))}
                                        />
                                    </div>

                                    <FloatingInput
                                        id="course-audience"
                                        label={t('admin.courseForm.audience')}
                                        value={form.audience}
                                        onChange={(value) => setForm(prev => ({ ...prev, audience: value }))}
                                    />

                                    {/* Form Actions */}
                                    <div className="flex flex-col-reverse pt-3 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!editingCourse) {
                                                    localStorage.removeItem('admin-course-add-form');
                                                }
                                                editingCourse ? navigate(`/admin/courses/${editingCourse.id}`) : navigate('/admin/courses');
                                            }}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border border-transparent rounded-lg sm:w-auto text-app-light-text-on-accent bg-app-light-accent hover:bg-app-light-accent-hover disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover"
                                        >
                                            {saving ? (
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



            {viewModalOpen && viewingCourse && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
                    <div className="flex items-center justify-center min-h-full p-4">
                        <div className="w-full max-w-2xl border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                            <div className="flex items-center justify-between p-4 pb-3">
                                <div>
                                    <p className="text-xs tracking-wider uppercase text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {t('admin.viewCourse', { defaultValue: 'View Course' })}
                                    </p>
                                    <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{translateCourseTitle(viewingCourse.title || '')}</h2>
                                </div>
                                <button type="button" onClick={() => navigate(getViewClosePath())} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="px-4 pb-4">
                                <div className="space-y-4">
                                    {/* Basic Info Row */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="view-course-code"
                                            label={t('admin.courseForm.code')}
                                            value={viewingCourse.code || ''}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                        <FloatingSelect
                                            id="view-course-type"
                                            label={t('admin.courseForm.type')}
                                            value={viewingCourse.course_type_detail || ''}
                                            onChange={() => { }}
                                            options={[
                                                { value: 'Theory', label: t('admin.courseForm.type.theory') },
                                                { value: 'Technical', label: t('admin.courseForm.type.technical') },
                                                { value: 'Practice', label: t('admin.courseForm.type.practice') },
                                                { value: 'Experiment', label: t('admin.courseForm.type.experiment') },
                                            ]}
                                            disabled={true}
                                            hideSelectedTextWhen={(value) => value === ''}
                                        />
                                    </div>

                                    {/* Title */}
                                    <FloatingInput
                                        id="view-course-title"
                                        label={t('admin.courseForm.title')}
                                        value={translateCourseTitle(viewingCourse.title || '')}
                                        onChange={() => { }}
                                        disabled={true}
                                    />                                    {/* Teacher and Location */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="view-course-teacher"
                                            label={t('admin.courseForm.teacher')}
                                            value={viewingCourse.teacher?.name || ''}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                        <FloatingInput
                                            id="view-course-location"
                                            label={t('admin.courseForm.location')}
                                            value={viewingCourse.location || ''}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>

                                    {/* Term, Date, Day */}
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <FloatingSelect
                                            id="view-course-term"
                                            label={t('admin.courseForm.term')}
                                            value={viewingCourse.term || ''}
                                            onChange={() => { }}
                                            options={[
                                                { value: 'first', label: t('admin.courseForm.term.first') },
                                                { value: 'second', label: t('admin.courseForm.term.second') },
                                            ]}
                                            disabled={true}
                                            hideSelectedTextWhen={(value) => value === ''}
                                        />
                                        <FloatingInput
                                            id="view-academic-year"
                                            label={t('admin.courseForm.academicYear', { defaultValue: 'Academic Year' })}
                                            value={calculateAcademicYearFromDate(viewingCourse.term_start_date || '')}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                        <FloatingSelect
                                            id="view-weekday"
                                            label={t('admin.course.day')}
                                            value={String(viewingCourse.weekday ?? 1)}
                                            onChange={() => { }}
                                            options={weekdayKeys.map(key => ({ value: String(key), label: formatDay(key) }))}
                                            disabled={true}
                                            hideSelectedTextWhen={(value) => value === ''}
                                        />
                                    </div>

                                    {/* Sessions and Weeks */}
                                    <div className="space-y-4">
                                        <FloatingMultiSelect
                                            id="view-course-periods"
                                            label={t('admin.courseForm.periods')}
                                            value={(viewingCourse.periods || []).map(String)}
                                            onChange={() => { }}
                                            options={Array.from({ length: 13 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                                            disabled={true}
                                        />
                                        <FloatingMultiSelect
                                            id="view-course-weeks"
                                            label={t('admin.courseForm.weeks')}
                                            value={(viewingCourse.weeks || []).map(String)}
                                            onChange={() => { }}
                                            options={Array.from({ length: 17 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                                            disabled={true}
                                            showSearch={true}
                                        />
                                    </div>

                                    {/* Course Details */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="view-course-credits"
                                            label={t('admin.courseForm.credits')}
                                            value={viewingCourse.credits?.toString() || ''}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                        <FloatingInput
                                            id="view-course-department"
                                            label={t('admin.courseForm.department')}
                                            value={translateDepartment(viewingCourse.department_name || '')}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="view-course-category"
                                            label={t('admin.courseForm.category')}
                                            value={translateCategory(viewingCourse.category || '')}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                        <FloatingInput
                                            id="view-course-nature"
                                            label={t('admin.courseForm.nature')}
                                            value={translateNature(viewingCourse.nature || '')}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="view-course-teaching-mode"
                                            label={t('admin.courseForm.teachingMode')}
                                            value={translateTeachingMode(viewingCourse.teaching_mode || '')}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                        <FloatingInput
                                            id="view-course-exam-type"
                                            label={t('admin.courseForm.examType')}
                                            value={translateExamType(viewingCourse.exam_type || '')}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="view-course-grading-method"
                                            label={t('admin.courseForm.gradingMethod')}
                                            value={translateGradingMethod(viewingCourse.grading_method || '')}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                        <FloatingInput
                                            id="view-course-hours-per-week"
                                            label={t('admin.courseForm.hoursPerWeek')}
                                            value={viewingCourse.hours_per_week?.toString() || ''}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="view-course-total-hours"
                                            label={t('admin.courseForm.totalCourseHours')}
                                            value={viewingCourse.total_course_hours?.toString() || ''}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                        <FloatingInput
                                            id="view-course-enrolled-students"
                                            label={t('admin.courseForm.enrolledStudents')}
                                            value={viewingCourse.enrolled_students?.toString() || ''}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="view-course-class-students"
                                            label={t('admin.courseForm.classStudents')}
                                            value={viewingCourse.class_students?.toString() || ''}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                        <FloatingInput
                                            id="view-course-campus"
                                            label={t('admin.courseForm.campusName')}
                                            value={translateCampus(viewingCourse.campus_name || '')}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <FloatingInput
                                            id="view-course-majors"
                                            label={t('admin.courseForm.majors')}
                                            value={translateMajor(viewingCourse.majors || '')}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                        <FloatingInput
                                            id="view-course-grades"
                                            label={t('admin.courseForm.grades')}
                                            value={viewingCourse.grades || ''}
                                            onChange={() => { }}
                                            disabled={true}
                                        />
                                    </div>

                                    <FloatingInput
                                        id="view-course-audience"
                                        label={t('admin.courseForm.audience')}
                                        value={viewingCourse.audience || ''}
                                        onChange={() => { }}
                                        disabled={true}
                                    />

                                    {/* Form Actions */}
                                    <div className="flex flex-col-reverse pt-3 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-between sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/admin/courses/${viewingCourse.id}/delete`)}
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
                                                onClick={() => navigate(`/admin/courses/${viewingCourse.id}/edit`)}
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

            {showDatePicker && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
                    <div className="flex items-center justify-center min-h-full p-4">
                        <div className="w-full max-w-md border shadow-2xl bg-app-light-surface border-app-light-border rounded-2xl dark:bg-app-dark-surface dark:border-app-dark-border">
                            <div className="flex items-center justify-between p-4 pb-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">
                                        {t('admin.missingAcademicTerm')}
                                    </h2>
                                </div>
                                <button type="button" onClick={() => setShowDatePicker(false)} className="p-2 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary hover:bg-app-light-surface-hover dark:hover:bg-app-dark-surface-hover" aria-label={t('common.close')}>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="px-4 pb-4">
                                <div className="space-y-4">
                                    <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                        {t('admin.selectFirstWeekMondayDescription')}
                                    </p>
                                    <CustomDatePicker
                                        id="first-week-monday"
                                        label={t('admin.firstWeekMonday')}
                                        value={selectedDate}
                                        onChange={setSelectedDate}
                                    />
                                    <div className="flex flex-col-reverse pt-3 space-y-2 space-y-reverse border-t sm:flex-row sm:justify-end sm:space-x-3 sm:space-y-0 border-app-light-border dark:border-app-dark-border">
                                        <button
                                            type="button"
                                            onClick={() => setShowDatePicker(false)}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border rounded-lg sm:w-auto text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={saveWithNewTerm}
                                            disabled={!selectedDate || saving}
                                            className="w-full px-4 py-2 text-sm font-medium transition-colors border border-transparent rounded-lg sm:w-auto text-app-light-text-on-accent bg-app-light-accent hover:bg-app-light-accent-hover disabled:opacity-50 disabled:cursor-not-allowed dark:bg-app-dark-accent dark:text-app-dark-text-on-accent dark:hover:bg-app-dark-accent-hover"
                                        >
                                            {saving ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <div className="inline-block w-4 h-4 border-4 border-app-light-text-on-accent/30 border-t-app-light-text-on-accent rounded-full animate-spin"></div>
                                                    {t('profile.saving')}
                                                </span>
                                            ) : (
                                                t('admin.createTermAndSave')
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmModalOpen && courseToDelete && (
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
                                    {t('admin.courseDeleteConfirmTitle', { defaultValue: 'Delete Course' })}
                                </h3>
                                <p className="mb-6 text-sm text-center text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                    {t('admin.courseDeleteConfirm', { defaultValue: 'Are you sure you want to delete this course? This action cannot be undone.', name: courseToDelete.title })}
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
                                        onClick={confirmDeleteCourse}
                                        disabled={deletingId === courseToDelete.id}
                                        className="w-full px-4 py-2 text-sm font-medium text-white transition-colors border border-transparent rounded-lg sm:w-auto bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-600 dark:hover:bg-red-700"
                                    >
                                        {deletingId === courseToDelete.id ? t('common.deleting', { defaultValue: 'Deleting...' }) : t('common.delete')}
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

export default AdminCoursesPage;
