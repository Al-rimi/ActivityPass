import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <article className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </article>
);

const StaffDashboardPage: React.FC = () => {
    const { t } = useTranslation();
    const { me } = useAuth();
    const stats = [
        { label: t('staff.todo.reviews'), value: 2 },
        { label: t('staff.todo.pendingApprovals'), value: 5 },
        { label: t('staff.todo.activitiesOwned'), value: 3 },
    ];

    return (
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
            <div className="flex flex-col gap-6">
                {me?.username && <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">{me.username}</p>}

                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {stats.map(card => (
                        <StatCard key={card.label} label={card.label} value={card.value} />
                    ))}
                </section>

                <section className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900/40">
                    <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">{t('staff.quickActions')}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('staff.quickActionsDesc')}</p>
                    <div className="flex flex-wrap gap-3">
                        <button className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm hover:bg-black">{t('staff.actions.createActivity')}</button>
                        <button className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100">{t('staff.actions.approveRequests')}</button>
                        <button className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100">{t('staff.actions.viewSchedule')}</button>
                    </div>
                </section>

                <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">{t('staff.activityQueue.title')}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('staff.activityQueue.empty')}</p>
                </section>
            </div>
        </main>
    );
};

export default StaffDashboardPage;
