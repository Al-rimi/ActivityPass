import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FloatingInput from '../components/FloatingInput';
import { resolveApiUrl } from '../utils/api';

const CompleteProfilePage: React.FC = () => {
    const { t } = useTranslation();
    const { me, tokens } = useAuth();
    const [name, setName] = useState(me?.first_name || '');
    const [phone, setPhone] = useState(me?.student_profile?.phone || '');
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (me && me.role !== 'student') {
            navigate('/');
        }
    }, [me, navigate]);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tokens) return;
        setSaving(true);
        await fetch(resolveApiUrl('/api/auth/me/'), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.access}` },
            body: JSON.stringify({ first_name: name, phone }),
        }).catch(() => { });
        setSaving(false);
        navigate('/');
    };

    return (
        <main className="flex-1">
            <div className="flex flex-col items-center px-4 pb-8 text-center pt-14">
                <h1 className="text-3xl font-bold">{t('profile.completeTitle')}</h1>
                <p className="mt-2 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('profile.completeSubtitle')}</p>
            </div>
            <div className="flex items-center justify-center px-4 pb-16">
                <section className="w-full max-w-md border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface p-7">
                    <form onSubmit={save} className="space-y-6">
                        <FloatingInput
                            id="profile-name"
                            label={t('profile.name')}
                            value={name}
                            onChange={setName}
                            required
                        />
                        <FloatingInput
                            id="profile-phone"
                            label={t('profile.phone')}
                            value={phone}
                            onChange={setPhone}
                        />
                        <button disabled={saving || !name.trim()} type="submit" className="w-full px-5 py-3 text-white border border-transparent rounded-md mt-7 bg-primary-500 dark:bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-600 disabled:opacity-60 dark:border-app-dark-border">
                            {saving ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="inline-block w-4 h-4 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    {t('profile.saving')}
                                </span>
                            ) : (
                                t('profile.save')
                            )}
                        </button>
                    </form>
                </section>
            </div>
        </main>
    );
};

export default CompleteProfilePage;
