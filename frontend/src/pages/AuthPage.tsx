import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const AuthPage: React.FC = () => {
    const { t } = useTranslation();
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const submitLogin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError('');
        const trimmedUser = username.trim();
        const trimmedPass = password.trim();
        if (!trimmedUser || !trimmedPass) {
            setError(t('auth.fieldsRequired'));
            return;
        }
        const numeric = /^\d+$/.test(trimmedUser);
        if (numeric && trimmedUser.length !== 12) {
            setError(t('auth.studentIdFormat'));
            return;
        }
        try {
            setSubmitting(true);
            await login(trimmedUser, trimmedPass);
            navigate('/');
        } catch (err: any) {
            const msg = (err?.message || '').toLowerCase();
            if (msg.includes('invalid') || msg.includes('no active account')) {
                setError(t('auth.invalidCredentials'));
            } else {
                setError(t('auth.loginFailed'));
            }
        } finally {
            setSubmitting(false);
        }
    };
    const minHeightStyle = { minHeight: 'calc(100vh - var(--ap-header-height, 64px) - var(--ap-footer-height, 80px))' } as const;

    return (
        <main className="flex flex-1 items-center justify-center px-4 py-6" style={minHeightStyle}>
            <section className="w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-7 shadow-sm">
                <form onSubmit={submitLogin} className="space-y-6">
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t('nav.login')}</h1>
                    <div>
                        <label className="text-sm text-gray-700 dark:text-gray-300">{t('login.username')}</label>
                        <input
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder={t('auth.studentId') || 'Student ID'}
                            className="mt-1 w-full border border-gray-300 dark:border-gray-700 rounded-md px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            autoComplete="username"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-700 dark:text-gray-300">{t('login.password')}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="000000"
                            className="mt-1 w-full border border-gray-300 dark:border-gray-700 rounded-md px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            autoComplete="current-password"
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm" role="alert" aria-live="assertive">{error}</p>}
                    <button type="submit" disabled={submitting} className="w-full mt-7 px-5 py-3 rounded-md bg-gray-900 dark:bg-gray-700 text-white hover:bg-black dark:hover:bg-gray-600 text-base border border-transparent dark:border-gray-600 disabled:opacity-70">
                        {submitting ? t('auth.loggingIn') : t('nav.login')}
                    </button>
                </form>
            </section>
        </main>
    );
};

export default AuthPage;
