import { useCallback, useEffect, useState } from 'react';
import { useAuthenticatedApi } from '../utils/api';
import {
    ActivityEligibility,
    EligibleActivityRecord,
    StudentCourseEventRecord,
    StudentParticipationRecord
} from '../types/student';

interface StudentScheduleState {
    courseEvents: StudentCourseEventRecord[];
    participations: StudentParticipationRecord[];
    eligibleActivities: EligibleActivityRecord[];
    loading: boolean;
    error: string | null;
}

const INITIAL_STATE: StudentScheduleState = {
    courseEvents: [],
    participations: [],
    eligibleActivities: [],
    loading: true,
    error: null
};

const parseEligibility = (value: ActivityEligibility | undefined): ActivityEligibility | undefined => {
    if (!value) return undefined;
    return {
        eligible: Boolean(value.eligible),
        reasons: Array.isArray(value.reasons) ? value.reasons : []
    };
};

export const useStudentSchedule = () => {
    const { authenticatedJsonFetch } = useAuthenticatedApi();
    const [state, setState] = useState<StudentScheduleState>(INITIAL_STATE);

    const load = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const [events, participations, eligible] = await Promise.all([
                authenticatedJsonFetch<StudentCourseEventRecord[]>('/api/course-events/?ordering=start_datetime'),
                authenticatedJsonFetch<StudentParticipationRecord[]>('/api/participations/?ordering=-applied_at'),
                authenticatedJsonFetch<EligibleActivityRecord[]>('/api/activities/eligible/?limit=8').catch(() => [])
            ]);

            const normalizedEligible = (eligible || []).map(item => ({
                ...item,
                eligibility: parseEligibility(item.eligibility)
            }));

            setState({
                courseEvents: events || [],
                participations: participations || [],
                eligibleActivities: normalizedEligible,
                loading: false,
                error: null
            });
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : String(error)
            }));
        }
    }, [authenticatedJsonFetch]);

    useEffect(() => {
        void load();
    }, [load]);

    const refresh = useCallback(async () => {
        await load();
    }, [load]);

    return {
        ...state,
        refresh
    };
};
