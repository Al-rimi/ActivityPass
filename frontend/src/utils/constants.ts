// Shared constants for the application
export const DEPARTMENT_OPTIONS = [
    { value: '计算机科学与技术学院', labelKey: 'admin.department.computerScience' },
    { value: '国际经济与贸易学院', labelKey: 'admin.department.internationalEconomics' },
    { value: '初阳学院', labelKey: 'admin.department.chuYang' },
    { value: '经管学院', labelKey: 'admin.department.economicsManagement' },
    { value: '法学院', labelKey: 'admin.department.law' },
    { value: '马克思学院', labelKey: 'admin.department.marxism' },
    { value: '教育学院', labelKey: 'admin.department.education' },
    { value: '联合教育学院', labelKey: 'admin.department.jointEducation' },
    { value: '心理学院', labelKey: 'admin.department.psychology' },
    { value: '儿童教育学院', labelKey: 'admin.department.earlyChildhoodEducation' },
    { value: '体育学院', labelKey: 'admin.department.physicalEducation' },
    { value: '人文学院', labelKey: 'admin.department.humanities' },
    { value: '外语学院', labelKey: 'admin.department.foreignLanguages' },
    { value: '艺术学院', labelKey: 'admin.department.arts' },
    { value: '设计学院', labelKey: 'admin.department.design' },
    { value: '数学学院', labelKey: 'admin.department.mathematics' },
    { value: '计算机学院', labelKey: 'admin.department.computerScience' },
    { value: '数理医学院', labelKey: 'admin.department.mathematicsPhysicsMedicine' },
    { value: '物电学院', labelKey: 'admin.department.physicsElectronics' },
    { value: '化材学院', labelKey: 'admin.department.chemistryMaterials' },
    { value: '生命科学学院', labelKey: 'admin.department.lifeSciences' },
    { value: '地环学院', labelKey: 'admin.department.earthEnvironmental' },
    { value: '工学院', labelKey: 'admin.department.engineering' },
    { value: '国社学院', labelKey: 'admin.department.nationalSociety' },
    { value: '非洲学院', labelKey: 'admin.department.africaStudies' },
    { value: '终身学院', labelKey: 'admin.department.lifelongEducation' },
    { value: '杭州自动化学院', labelKey: 'admin.department.hangzhouAutomation' },
];

export const getDepartmentOptions = (t: any) => {
    return DEPARTMENT_OPTIONS.map(dept => ({
        value: dept.value,
        label: t(dept.labelKey, { defaultValue: dept.value })
    }));
};