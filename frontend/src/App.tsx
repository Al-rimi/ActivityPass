import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminStudentsPage from './pages/AdminStudentsPage';
import AdminStaffPage from './pages/AdminStaffPage';
import StaffDashboardPage from './pages/StaffDashboardPage';

const setDocumentCssVar = (name: string, value: number) => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty(name, `${Math.round(value)}px`);
};

const Navbar: React.FC = () => {
    const { t } = useTranslation();
    const { tokens, logout, me } = useAuth();
    const navigate = useNavigate();
    const loc = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const settingsRef = useRef<HTMLDivElement>(null);
    const navRef = useRef<HTMLElement>(null);

    const dashboardLabel = useMemo(() => {
        if (me?.role === 'admin') {
            return t('nav.adminDashboard', { defaultValue: t('nav.dashboard') });
        }
        if (me?.role === 'staff') {
            return t('nav.staffDashboard', { defaultValue: t('nav.dashboard') });
        }
        return t('nav.dashboard');
    }, [me?.role, t]);

    const navLinks = useMemo(() => {
        if (!tokens) return [] as { label: string; to: string }[];
        const target = me?.role === 'admin' ? '/admin' : me?.role === 'staff' ? '/staff' : '/';
        return [{ label: dashboardLabel, to: target }];
    }, [tokens, me?.role, dashboardLabel]);

    useEffect(() => {
        setSidebarOpen(false);
        setSettingsOpen(false);
    }, [loc.pathname]);

    useEffect(() => {
        if (!settingsOpen) return;
        const handler = (evt: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(evt.target as Node)) {
                setSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [settingsOpen]);

    const isActive = (href: string) => {
        if (href === '/') return loc.pathname === '/';
        return loc.pathname.startsWith(href);
    };

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    useLayoutEffect(() => {
        const el = navRef.current;
        if (!el || typeof window === 'undefined') {
            setDocumentCssVar('--ap-header-height', el?.offsetHeight || 64);
            return;
        }
        const updateHeight = () => setDocumentCssVar('--ap-header-height', el.getBoundingClientRect().height);
        updateHeight();
        let observer: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(updateHeight);
            observer.observe(el);
        } else {
            window.addEventListener('resize', updateHeight);
        }
        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

    const settingsLabel = t('nav.settings', { defaultValue: 'Settings' });
    const preferencesLabel = t('nav.preferences', { defaultValue: 'Preferences' });
    const quickPreferencesLabel = t('nav.quickPreferences', { defaultValue: 'Quick preferences' });
    const menuLabel = t('nav.menu', { defaultValue: 'Menu' });
    const isAuthPage = loc.pathname === '/auth' || loc.pathname === '/login';
    const inlinePreferencesVisible = !tokens && !isAuthPage;
    const showLoginCTA = !tokens && !isAuthPage;
    const showPreferencesInsideSettings = tokens || isAuthPage;

    return (
        <nav ref={navRef} className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl dark:border-gray-800">
            <div className="w-full px-4 sm:px-6">
                <div className="flex items-center justify-between h-16 gap-4 lg:h-20">
                    <div className="flex items-center gap-3">
                        {tokens && (
                            <button
                                type="button"
                                className="inline-flex items-center justify-center p-2 text-gray-600 rounded-md sm:hidden hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
                                onClick={() => setSidebarOpen(true)}
                                aria-label="Open navigation"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 7h16M4 12h16M4 17h16" />
                                </svg>
                            </button>
                        )}
                        <Link to="/" className="text-xl font-semibold tracking-tight lg:text-2xl">{t('app.title')}</Link>
                    </div>
                    <div className="items-center hidden gap-6 sm:flex">
                        {navLinks.map(link => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`text-sm lg:text-base font-medium transition-colors ${isActive(link.to) ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                        {inlinePreferencesVisible && (
                            <div className="flex items-center gap-2" aria-label={quickPreferencesLabel}>
                                <LanguageSwitcher />
                                <ThemeToggle />
                            </div>
                        )}
                        {tokens && (
                            <button onClick={handleLogout} className="px-4 py-2 text-sm text-white bg-gray-900 rounded-md lg:text-base hover:bg-black" data-testid="logout-button">
                                {t('nav.logout')}
                            </button>
                        )}
                        {showLoginCTA && (
                            <Link to="/auth" className="px-4 py-2 text-sm text-white bg-gray-900 rounded-md lg:text-base hover:bg-black">
                                {t('nav.login')}
                            </Link>
                        )}
                        <div className="relative" ref={settingsRef}>
                            <button
                                type="button"
                                onClick={() => setSettingsOpen(prev => !prev)}
                                className="inline-flex items-center justify-center p-2 text-gray-600 bg-white border border-gray-200 rounded-md dark:border-gray-700 dark:bg-gray-900 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                                aria-haspopup="true"
                                aria-expanded={settingsOpen}
                            >
                                <span className="sr-only">{settingsLabel}</span>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="4" y1="21" x2="4" y2="14" />
                                    <line x1="4" y1="10" x2="4" y2="3" />
                                    <line x1="12" y1="21" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12" y2="3" />
                                    <line x1="20" y1="21" x2="20" y2="16" />
                                    <line x1="20" y1="12" x2="20" y2="3" />
                                    <line x1="1" y1="14" x2="7" y2="14" />
                                    <line x1="9" y1="8" x2="15" y2="8" />
                                    <line x1="17" y1="16" x2="23" y2="16" />
                                </svg>
                            </button>
                            {settingsOpen && (
                                <div className="absolute right-0 w-64 mt-2 bg-white border border-gray-200 divide-y divide-gray-100 shadow-xl rounded-xl dark:border-gray-700 dark:bg-gray-900 dark:divide-gray-800">
                                    <div className="px-4 py-3">
                                        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">{preferencesLabel}</p>
                                    </div>
                                    <div className="flex flex-col gap-3 p-4">
                                        {showPreferencesInsideSettings ? (
                                            <>
                                                <LanguageSwitcher />
                                                <ThemeToggle />
                                            </>
                                        ) : (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {t('nav.loginToCustomize', { defaultValue: 'Sign in to customize your experience.' })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {sidebarOpen && tokens && (
                <div className="fixed inset-0 z-30 sm:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
                    <div className="relative ml-auto h-full w-72 max-w-[80vw] bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col p-6 gap-6">
                        <div className="flex items-center justify-between">
                            <p className="text-base font-semibold text-gray-900 dark:text-white">{menuLabel}</p>
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(false)}
                                className="p-2 text-gray-500 rounded-md hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                aria-label="Close navigation"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex flex-col gap-3">
                            {navLinks.map(link => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`rounded-lg px-4 py-2 text-sm font-medium ${isActive(link.to) ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                        <div className="flex flex-col gap-4 mt-auto">
                            <div className="p-4 border border-gray-200 rounded-xl dark:border-gray-800">
                                <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">{preferencesLabel}</p>
                                <div className="flex flex-col gap-3 mt-3">
                                    <LanguageSwitcher />
                                    <ThemeToggle />
                                </div>
                            </div>
                            {tokens ? (
                                <button onClick={handleLogout} className="w-full px-4 py-2 text-sm text-white bg-gray-900 rounded-md hover:bg-black" data-testid="logout-button-mobile">
                                    {t('nav.logout')}
                                </button>
                            ) : (
                                <Link to="/auth" onClick={() => setSidebarOpen(false)} className="w-full px-4 py-2 text-sm text-center text-white bg-gray-900 rounded-md hover:bg-black">
                                    {t('nav.login')}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
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
    const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    useEffect(() => {
        fetch('/api/activities/')
            .then(r => r.json())
            .then((data: Activity[]) => { setActivities(data); setLoading(false); })
            .catch((err: unknown) => { setError(err instanceof Error ? err.message : String(err)); setLoading(false); });
    }, []);

    const apply = async (id: number) => {
        if (!tokens) {
            setNotice({ type: 'error', text: t('auth.loginRequired') });
            return;
        }
        const res = await fetch(`/api/activities/${id}/apply/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokens.access}`
            }
        });
        if (res.ok) {
            setNotice({ type: 'success', text: t('apply.success') });
        } else {
            const data = await res.json().catch(() => ({ detail: 'Error' }));
            setNotice({ type: 'error', text: data.detail || t('apply.fail') });
        }
    };

    const fmt = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }), []);
    return (
        <main className="px-4 mx-auto max-w-7xl">
            {notice && (
                <div className={`mb-4 rounded-md border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-100' : notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100' : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-100'}`}>{notice.text}</div>
            )}
            {loading && <p className="py-6 text-gray-700">{t('activities.loading')}</p>}
            {error && <p className="py-6 text-red-500">{t('error.generic')}: {error}</p>}
            {!loading && !error && (
                <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
                    {activities.map(a => (
                        <article key={a.id} className="flex flex-col p-5 bg-white border border-gray-200 shadow-sm rounded-xl dark:border-gray-800 dark:bg-gray-900">
                            <h3 className="mb-2 text-base font-semibold lg:text-lg">{a.title}</h3>
                            <p className="flex-1 text-sm text-gray-600 lg:text-base dark:text-gray-300">{a.description || '—'}</p>
                            <div className="mt-3 text-xs text-gray-500 lg:text-sm dark:text-gray-400">
                                <div>Starts: {fmt.format(new Date(a.start_datetime))}</div>
                                <div>Ends: {fmt.format(new Date(a.end_datetime))}</div>
                            </div>
                            <button onClick={() => apply(a.id)} className="mt-4 px-4 py-2.5 rounded-md bg-gray-900 text-white text-sm lg:text-base hover:bg-black">{t('activity.apply')}</button>
                        </article>
                    ))}
                </div>
            )}
            {!loading && !error && activities.length === 0 && (
                <p className="py-6 text-gray-500 dark:text-gray-400">{t('activities.none')}</p>
            )}
        </main>
    );
};

const RoleAwareHome: React.FC = () => {
    const { me, meLoading } = useAuth();
    const navigate = useNavigate();
    useEffect(() => {
        if (meLoading || !me) return;
        if (me.role === 'admin') {
            navigate('/admin', { replace: true });
        } else if (me.role === 'staff') {
            navigate('/staff', { replace: true });
        }
    }, [me, meLoading, navigate]);

    if (meLoading || !me) {
        return (
            <main className="flex items-center justify-center flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-300">Loading dashboard…</p>
            </main>
        );
    }
    if (me.role === 'admin' || me.role === 'staff') return null;
    return <ActivityList />;
};

const Footer: React.FC = () => {
    const { t } = useTranslation();
    const footerRef = useRef<HTMLElement>(null);

    useLayoutEffect(() => {
        const el = footerRef.current;
        if (!el || typeof window === 'undefined') {
            setDocumentCssVar('--ap-footer-height', el?.offsetHeight || 80);
            return;
        }
        const updateHeight = () => setDocumentCssVar('--ap-footer-height', el.getBoundingClientRect().height);
        updateHeight();
        let observer: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(updateHeight);
            observer.observe(el);
        } else {
            window.addEventListener('resize', updateHeight);
        }
        return () => {
            observer?.disconnect();
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

    return (
        <footer ref={footerRef} className="px-6 py-10 mx-auto mt-auto text-xs text-gray-500 max-w-7xl">© {new Date().getFullYear()} {t('app.title')}</footer>
    );
};

const App: React.FC = () => {
    const { t, i18n } = useTranslation();
    useEffect(() => {
        document.title = t('app.title') + ' · ActivityPass';
    }, [i18n.language, t]);
    return (
        <div className="flex flex-col min-h-screen text-gray-900 bg-gray-50 dark:bg-gray-950 dark:text-gray-100">
            <Navbar />
            <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/login" element={<Navigate to="/auth" replace />} />
                <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboardPage /></AdminRoute></ProtectedRoute>} />
                <Route path="/admin/students" element={<ProtectedRoute><AdminRoute><AdminStudentsPage /></AdminRoute></ProtectedRoute>} />
                <Route path="/admin/staff" element={<ProtectedRoute><AdminRoute><AdminStaffPage /></AdminRoute></ProtectedRoute>} />
                <Route path="/staff" element={<ProtectedRoute><StaffRoute><StaffDashboardPage /></StaffRoute></ProtectedRoute>} />
                <Route path="/" element={<ProtectedRoute><RoleAwareHome /></ProtectedRoute>} />
            </Routes>
            <Footer />
        </div>
    );
};

const AdminRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { me, meLoading } = useAuth();
    if (meLoading) {
        return (
            <main className="flex items-center justify-center flex-1 py-10">
                <p className="text-sm text-gray-600 dark:text-gray-400">Confirming admin access…</p>
            </main>
        );
    }
    if (!me) return null;
    if (me.role !== 'admin') return <Navigate to="/" replace />;
    return <>{children}</>;
};

const StaffRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { me, meLoading } = useAuth();
    if (meLoading) {
        return (
            <main className="flex items-center justify-center flex-1 py-10">
                <p className="text-sm text-gray-600 dark:text-gray-400">Confirming staff access…</p>
            </main>
        );
    }
    if (!me) return null;
    if (me.role !== 'staff') return <Navigate to="/" replace />;
    return <>{children}</>;
};

export default App;
