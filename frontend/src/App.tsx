import React, { useEffect, useMemo, useState } from 'react';
// Tailwind handles styling; legacy CRA styles not required
// import './App.css';
import { Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';
import ThemeToggle from './components/ThemeToggle';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import CompleteProfilePage from './pages/CompleteProfilePage';

const Navbar: React.FC = () => {
    const { t } = useTranslation();
    const { tokens, logout } = useAuth();
    const navigate = useNavigate();
    const loc = useLocation();
    const isAuthPage = loc.pathname.startsWith('/auth');
    // removed mobile menu state (no hamburger)
    return (
        <nav className="sticky top-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between h-16 lg:h-20">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="text-xl lg:text-2xl font-semibold tracking-tight">{t('app.title')}</Link>
                    </div>
                    <div className="hidden sm:flex items-center gap-6">
                        {!isAuthPage && (
                            <>
                                {/* Home hidden per request; only language + auth actions */}
                                {tokens ? (
                                    <button onClick={() => { logout(); navigate('/auth'); }} className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm lg:text-base hover:bg-black">{t('nav.logout')}</button>
                                ) : (
                                    <Link to="/auth" className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm lg:text-base hover:bg-black">{t('nav.login')}</Link>
                                )}
                                <LanguageSwitcher />
                                <ThemeToggle />
                            </>
                        )}
                        {isAuthPage && (
                            <div className="flex items-center gap-4">
                                <LanguageSwitcher />
                                <ThemeToggle />
                            </div>
                        )}
                    </div>
                    {/* Mobile: remove hamburger; keep language only */}
                    <div className="sm:hidden flex items-center gap-3 pr-2">
                        <LanguageSwitcher />
                        <ThemeToggle />
                    </div>
                </div>
                {/* No mobile dropdown menu */}
            </div>
        </nav>
    );
};

// Legacy inline Login removed in favor of unified AuthPage

type Activity = {
    id: number;
    title: string;
    description?: string | null;
    start_datetime: string;
    end_datetime: string;
};

const ActivityList: React.FC = () => {
    const { t } = useTranslation();
    const { tokens } = useAuth();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/activities/')
            .then(r => r.json())
            .then((data: Activity[]) => { setActivities(data); setLoading(false); })
            .catch((err: unknown) => { setError(err instanceof Error ? err.message : String(err)); setLoading(false); });
    }, []);

    const apply = async (id: number) => {
        if (!tokens) { alert('Login first'); return; }
        const res = await fetch(`/api/activities/${id}/apply/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokens.access}`
            }
        });
        if (res.ok) {
            alert(t('apply.success'));
        } else {
            const data = await res.json().catch(() => ({ detail: 'Error' }));
            alert(data.detail || t('apply.fail'));
        }
    };

    const fmt = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }), []);
    return (
        <main className="px-4 mx-auto max-w-7xl">
            {loading && <p className="py-6 text-gray-700">{t('activities.loading')}</p>}
            {error && <p className="py-6 text-red-500">{t('error.generic')}: {error}</p>}
            {!loading && !error && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                    {activities.map(a => (
                        <article key={a.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-5 flex flex-col">
                            <h3 className="text-base lg:text-lg font-semibold mb-2">{a.title}</h3>
                            <p className="text-sm lg:text-base text-gray-600 dark:text-gray-300 flex-1">{a.description || '—'}</p>
                            <div className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-3">
                                <div>Starts: {fmt.format(new Date(a.start_datetime))}</div>
                                <div>Ends: {fmt.format(new Date(a.end_datetime))}</div>
                            </div>
                            <button onClick={() => apply(a.id)} className="mt-4 px-4 py-2.5 rounded-md bg-gray-900 text-white text-sm lg:text-base hover:bg-black">{t('activity.apply')}</button>
                        </article>
                    ))}
                </div>
            )}
            {!loading && !error && activities.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 py-6">{t('activities.none')}</p>
            )}
        </main>
    );
};

const App: React.FC = () => {
    const { t, i18n } = useTranslation();
    const loc = useLocation();
    useEffect(() => {
        document.title = t('app.title') + ' · ActivityPass';
    }, [i18n.language, t]);
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
            <Navbar />
            {!loc.pathname.startsWith('/auth') && (
                <header className="max-w-7xl mx-auto px-6 py-10 lg:py-12">
                    <h1 className="text-2xl lg:text-4xl font-bold">{t('app.title')}</h1>
                    <p className="text-sm lg:text-lg text-gray-600 dark:text-gray-300">{t('app.subtitle')}</p>
                </header>
            )}
            <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/login" element={<Navigate to="/auth" replace />} />
                <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />
                <Route path="/" element={<ProtectedRoute><ActivityList /></ProtectedRoute>} />
            </Routes>
            <footer className="max-w-7xl mx-auto px-6 py-10 text-xs text-gray-500 mt-auto">© {new Date().getFullYear()} {t('app.title')}</footer>
        </div>
    );
};

export default App;
