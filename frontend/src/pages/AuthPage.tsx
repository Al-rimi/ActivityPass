import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FloatingInput from '../components/FloatingInput';
import Logo from '../components/Logo';

const AuthPage: React.FC = () => {
    const { t } = useTranslation();
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [usernameError, setUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const validateUsername = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return t('auth.usernameRequired', { defaultValue: 'Username is required' });

        const isNumeric = /^\d+$/.test(trimmed);

        if (isNumeric) {
            // Student ID validation
            if (trimmed.length !== 12) {
                return t('auth.studentIdLength', { defaultValue: 'Student ID must be exactly 12 digits' });
            }
        } else {
            // Admin/Staff username validation - allow any non-numeric characters
            if (trimmed.length < 3) {
                return t('auth.usernameTooShort', { defaultValue: 'Username must be at least 3 characters' });
            }
        }

        return '';
    };

    const submitLogin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // Clear previous errors
        setUsernameError('');
        setPasswordError('');

        const trimmedUser = username.trim();
        const trimmedPass = password.trim();

        // Validate username
        const usernameValidation = validateUsername(username);
        if (usernameValidation) {
            setUsernameError(usernameValidation);
            return;
        }

        // Validate password
        if (!trimmedPass) {
            setPasswordError(t('auth.passwordRequired', { defaultValue: 'Password is required' }));
            return;
        }

        try {
            setSubmitting(true);
            await login(trimmedUser, trimmedPass);
            navigate('/');
        } catch (err: any) {
            const msg = (err?.detail || err?.message || '').toLowerCase();

            // Check for specific error types from backend
            if (err?.error_type) {
                if (err.error_type === 'user_not_found_student') {
                    setUsernameError(t('auth.studentIdNotRegistered', { defaultValue: 'Student ID not registered. Please contact your administrator.' }));
                } else if (err.error_type === 'user_not_found') {
                    setUsernameError(t('auth.usernameNotRegistered', { defaultValue: 'Username is not registered.' }));
                } else if (err.error_type === 'invalid_credentials_student') {
                    setPasswordError(t('auth.passwordIncorrect', { defaultValue: 'Password is incorrect.' }));
                } else if (err.error_type === 'invalid_credentials') {
                    setPasswordError(t('auth.passwordIncorrect', { defaultValue: 'Password is incorrect.' }));
                } else {
                    setUsernameError(t('auth.loginFailed', { defaultValue: 'Login failed. Please try again.' }));
                }
            } else {
                // Fallback for generic errors
                const isStudentId = /^\d+$/.test(trimmedUser);
                if (msg.includes('invalid') || msg.includes('no active account')) {
                    if (isStudentId) {
                        setPasswordError(t('auth.passwordIncorrect', { defaultValue: 'Password is incorrect.' }));
                    } else {
                        setPasswordError(t('auth.passwordIncorrect', { defaultValue: 'Password is incorrect.' }));
                    }
                } else {
                    setUsernameError(t('auth.loginFailed', { defaultValue: 'Login failed. Please try again.' }));
                }
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleUsernameChange = (value: string) => {
        setUsername(value);

        // Clear error when user starts typing
        if (usernameError) {
            setUsernameError('');
        }
    };

    const handlePasswordChange = (value: string) => {
        setPassword(value);

        // Clear error when user starts typing
        if (passwordError) {
            setPasswordError('');
        }
    };

    const minHeightStyle = { minHeight: 'calc(100vh - var(--ap-header-height, 64px) - var(--ap-footer-height, 80px))' } as const;

    return (
        <main className="flex items-center justify-center flex-1 px-4 py-6" style={minHeightStyle}>
            <section className="w-full max-w-md border shadow-sm rounded-xl border-app-light-border dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface p-7">
                <div className="flex flex-col items-center gap-4 mb-6">
                    <Logo width={64} height={64} />
                    <h1 className="text-2xl font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{t('nav.login')}</h1>
                </div>
                <form onSubmit={submitLogin} className="space-y-6">

                    {/* Username/Student ID Input */}
                    <div className="relative">
                        <FloatingInput
                            id="username"
                            label={t('auth.studentIdOrUsername', { defaultValue: 'Student ID / Username' })}
                            value={username}
                            onChange={handleUsernameChange}
                            error={!!usernameError}
                            autoComplete="username"
                        />
                        {usernameError && (
                            <div className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400">
                                <svg className="flex-shrink-0 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="m15 9-6 6" />
                                    <path d="m9 9 6 6" />
                                </svg>
                                <p className="text-sm font-medium">{usernameError}</p>
                            </div>
                        )}
                    </div>

                    {/* Password Input */}
                    <div className="relative">
                        <FloatingInput
                            id="password"
                            label={t('login.password')}
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={handlePasswordChange}
                            error={!!passwordError}
                            autoComplete="current-password"
                            icon={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-app-light-text-secondary dark:text-app-dark-text-secondary hover:text-app-light-text-primary dark:hover:text-app-dark-text-primary transition-colors duration-200 focus:outline-none rounded"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.99902 3L20.999 21M9.8433 9.91364C9.32066 10.4536 8.99902 11.1892 8.99902 12C8.99902 13.6569 10.3422 15 11.999 15C12.8215 15 13.5667 14.669 14.1086 14.133M6.49902 6.64715C4.59972 7.90034 3.15305 9.78394 2.45703 12C3.73128 16.0571 7.52159 19 11.9992 19C13.9881 19 15.8414 18.4194 17.3988 17.4184M10.999 5.04939C11.328 5.01673 11.6617 5 11.9992 5C16.4769 5 20.2672 7.94291 21.5414 12C21.2607 12.894 20.8577 13.7338 20.3522 14.5" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            }
                        />
                        {passwordError && (
                            <div className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400">
                                <svg className="flex-shrink-0 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="m15 9-6 6" />
                                    <path d="m9 9 6 6" />
                                </svg>
                                <p className="text-sm font-medium">{passwordError}</p>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full px-5 py-3 mt-8 font-medium transition-all duration-200 border border-transparent rounded-lg bg-app-light-accent dark:bg-app-dark-accent text-app-light-text-on-accent dark:text-app-dark-text-on-accent hover:bg-app-light-accent-hover dark:hover:bg-app-dark-accent-hover focus:ring-2 focus:ring-app-light-accent focus:ring-offset-2 dark:focus:ring-app-dark-accent disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </svg>
                                {t('auth.loggingIn')}
                            </span>
                        ) : (
                            t('nav.login')
                        )}
                    </button>
                </form>
            </section>
        </main>
    );
};

export default AuthPage;
