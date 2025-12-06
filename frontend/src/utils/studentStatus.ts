import { TFunction } from 'i18next';
import { ParticipationStatus } from '../types/student';

export const statusStyles: Record<ParticipationStatus, string> = {
    approved: 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
    applied: 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200',
    rejected: 'bg-rose-500/15 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
};

export const getStatusLabel = (status: ParticipationStatus | undefined, t: TFunction): string => {
    if (!status) return '';
    switch (status) {
        case 'approved':
            return t('student.status.approved', { defaultValue: 'Approved' });
        case 'rejected':
            return t('student.status.rejected', { defaultValue: 'Rejected' });
        default:
            return t('student.status.applied', { defaultValue: 'Pending' });
    }
};
