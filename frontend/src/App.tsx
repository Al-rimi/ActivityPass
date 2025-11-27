import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import AdminCoursesPage from './pages/AdminCoursesPage';
import AdminActivitiesPage from './pages/AdminActivitiesPage';
import StaffDashboardPage from './pages/StaffDashboardPage';
import Logo from './components/Logo';

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
    const [sidebarAnimating, setSidebarAnimating] = useState(false);
    const [isOpening, setIsOpening] = useState(false);
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
        if (me?.role === 'admin') {
            return [
                { label: dashboardLabel, to: '/admin' },
                { label: t('admin.studentsTab', { defaultValue: 'Students' }), to: '/admin/students' },
                { label: t('admin.staffTab', { defaultValue: 'Staff' }), to: '/admin/staff' },
                { label: t('admin.coursesTab', { defaultValue: 'Courses' }), to: '/admin/courses' },
                { label: t('admin.activitiesTab', { defaultValue: 'Activities' }), to: '/admin/activities' },
            ];
        }
        if (me?.role === 'staff') {
            return [{ label: dashboardLabel, to: '/staff' }];
        }
        return [{ label: dashboardLabel, to: '/' }];
    }, [tokens, me?.role, dashboardLabel, t]);

    useEffect(() => {
        setSidebarOpen(false);
    }, [loc.pathname]);

    const normalizePath = (path: string) => {
        if (!path) return '/';
        const withLeading = path.startsWith('/') ? path : `/${path}`;
        const withoutTrailing = withLeading.replace(/\/+$/, '');
        return withoutTrailing || '/';
    };

    const activeLink = useMemo(() => {
        if (!navLinks.length) return null;
        const current = normalizePath(loc.pathname);
        return navLinks.reduce<string | null>((best, link) => {
            const target = normalizePath(link.to);
            const matches = current === target || current.startsWith(`${target}/`);
            if (!matches) return best;
            if (!best) return target;
            return target.length > best.length ? target : best;
        }, null);
    }, [loc.pathname, navLinks]);

    const isActive = (href: string) => activeLink === normalizePath(href);

    const handleSidebarToggle = () => {
        if (sidebarOpen) {
            // Start closing animation
            setSidebarAnimating(true);
            setIsOpening(false);
            // Close after animation completes
            setTimeout(() => {
                setSidebarOpen(false);
                setSidebarAnimating(false);
            }, 300);
        } else {
            // Start opening animation - render with translate-x-full first
            setSidebarOpen(true);
            setSidebarAnimating(true);
            setIsOpening(true);
            // Then transition to translate-x-0
            setTimeout(() => {
                setSidebarAnimating(false);
            }, 10); // Small delay to ensure initial render happens first
        }
    };

    const handleSidebarClose = () => {
        if (sidebarOpen) {
            setSidebarAnimating(true);
            setTimeout(() => {
                setSidebarOpen(false);
                setSidebarAnimating(false);
            }, 300);
        }
    };

    const handleLogout = () => {
        logout();
        // Delay navigation to allow state update to complete
        setTimeout(() => {
            navigate('/auth');
        }, 0);
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

    const preferencesLabel = t('nav.preferences', { defaultValue: 'Preferences' });
    const menuLabel = t('nav.menu', { defaultValue: 'Menu' });
    const isAuthPage = loc.pathname === '/auth' || loc.pathname === '/login';
    const showLoginCTA = !tokens && !isAuthPage;

    return (
        <nav ref={navRef} className="sticky top-0 z-20 border-b border-app-light-border bg-app-light-surface/80 dark:bg-app-dark-surface/80 backdrop-blur-xl dark:border-app-dark-border">
            <div className="w-full px-4 sm:px-6">
                <div className="flex items-center justify-between h-16 gap-4 lg:h-20">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="flex items-center gap-3 text-lg font-semibold tracking-tight lg:text-xl">
                            <Logo width={32} height={32} className="flex-shrink-0" />
                            {t('app.title')}
                        </Link>
                        {me && (
                            <p className="text-xs text-app-light-text-secondary dark:text-app-dark-text-secondary">
                                {t('nav.welcomeBack', { defaultValue: 'Welcome back', name: me.first_name || me.username })}
                            </p>
                        )}
                    </div>
                    <div className="items-center hidden gap-6 sm:flex">
                        {navLinks.map(link => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`text-sm lg:text-base font-medium transition-colors ${isActive(link.to) ? 'text-app-light-text-primary dark:text-app-dark-text-primary' : 'text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary'}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                        {showLoginCTA && (
                            <Link to="/auth" className="px-4 py-2 text-sm text-white rounded-md bg-primary-500 lg:text-base hover:bg-primary-600">
                                {t('nav.login')}
                            </Link>
                        )}
                        <button
                            type="button"
                            onClick={handleSidebarToggle}
                            className="inline-flex items-center justify-center p-2 transition-all duration-200 border rounded-lg text-app-light-textSecondary bg-app-light-surface border-app-light-border dark:border-app-dark-border dark:bg-app-dark-surface hover:text-app-light-text dark:text-app-dark-textSecondary dark:hover:text-app-dark-text hover:shadow-md"
                            aria-label={menuLabel}
                        >
                            <svg
                                className="w-5 h-5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M4 7h16M4 12h16M4 17h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            {(sidebarOpen || sidebarAnimating) && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[80]">
                    {/* Enhanced backdrop with smooth animation */}
                    <div
                        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 ease-out ${isOpening ? (sidebarAnimating ? 'opacity-0' : 'opacity-100') : (sidebarAnimating ? 'opacity-100' : 'opacity-0')
                            }`}
                        onClick={handleSidebarClose}
                        aria-hidden="true"
                    />

                    {/* Enhanced sidebar with smooth slide animation */}
                    <div
                        className={`relative ml-auto h-full w-80 max-w-[85vw] sm:w-96 bg-app-light-surface dark:bg-app-dark-surface border-l border-app-light-border dark:border-app-dark-border shadow-2xl flex flex-col p-6 gap-6 overflow-hidden transition-all duration-300 ease-out ${sidebarAnimating ? 'translate-x-full' : 'translate-x-0'
                            }`}
                    >
                        {/* Content overlay */}
                        <div className="relative z-10 flex flex-col h-full">
                            {/* Animated header */}
                            <div
                                className="flex items-center justify-between transition-all duration-300 delay-100"
                                style={{
                                    animation: sidebarOpen ? 'slideDownFade 0.4s ease-out 0.1s both' : 'none'
                                }}
                            >
                                <p className="text-base font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{menuLabel}</p>
                                <button
                                    type="button"
                                    onClick={handleSidebarClose}
                                    className="p-2 transition-all duration-200 rounded-md text-app-light-text-secondary hover:text-app-light-text-primary hover:bg-app-light-surface-hover dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary dark:hover:bg-app-dark-surface-hover"
                                    aria-label={t('common.close', { defaultValue: 'Close' })}
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Animated navigation links with stagger */}
                            <div className="flex flex-col gap-3 mt-8">
                                {navLinks.length ? navLinks.map((link, index) => (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        onClick={handleSidebarClose}
                                        className={`rounded-lg px-4 py-3 text-sm font-medium transition-all duration-300 hover:shadow-md relative overflow-hidden ${isActive(link.to) ? 'bg-app-light-accent text-white dark:bg-app-dark-accent dark:text-white shadow-lg' : 'text-app-light-text hover:bg-app-light-surface-hover dark:text-app-dark-text dark:hover:bg-app-dark-surface-hover'}`}
                                        style={{
                                            animation: sidebarOpen ? `slideUpFade 0.4s ease-out ${0.2 + index * 0.1}s both` : 'none'
                                        }}
                                    >
                                        <span className="flex items-center gap-3">
                                            {/* Add icons for visual interest */}
                                            <span className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive(link.to) ? 'bg-white' : 'bg-app-light-accent dark:bg-app-dark-accent'}`}></span>
                                            {link.label}
                                        </span>
                                    </Link>
                                )) : (
                                    <p
                                        className="px-4 py-3 text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary"
                                        style={{
                                            animation: sidebarOpen ? 'slideUpFade 0.4s ease-out 0.2s both' : 'none'
                                        }}
                                    >
                                        {t('nav.noLinks', { defaultValue: 'Sign in to access the pages.' })}
                                    </p>
                                )}
                            </div>

                            {/* Animated preferences section */}
                            <div
                                className="flex flex-col gap-4 mt-auto transition-all duration-300"
                                style={{
                                    animation: sidebarOpen ? 'slideUpFade 0.4s ease-out 0.6s both' : 'none'
                                }}
                            >
                                <div className="p-4 transition-all duration-300 border border-app-light-border rounded-xl dark:border-app-dark-border bg-app-light-surface dark:bg-app-dark-surface hover:shadow-lg" role="group" aria-label={preferencesLabel}>
                                    <div className="flex flex-wrap items-center justify-between w-full gap-4">
                                        <div className="transition-all duration-200">
                                            <LanguageSwitcher />
                                        </div>
                                        <div className="transition-all duration-200">
                                            <ThemeToggle />
                                        </div>
                                    </div>
                                </div>

                                {/* Animated action button */}
                                {tokens ? (
                                    <button
                                        onClick={() => { handleLogout(); handleSidebarClose(); }}
                                        className="w-full px-4 py-3 text-sm font-medium transition-all duration-300 border rounded-lg text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover hover:text-app-light-text-primary dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:hover:text-app-dark-text-primary hover:shadow-md"
                                        style={{
                                            animation: sidebarOpen ? 'slideUpFade 0.4s ease-out 0.7s both' : 'none'
                                        }}
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                                <polyline points="16,17 21,12 16,7" />
                                                <line x1="21" y1="12" x2="9" y2="12" />
                                            </svg>
                                            {t('nav.logout')}
                                        </span>
                                    </button>
                                ) : (
                                    <Link
                                        to="/auth"
                                        onClick={handleSidebarClose}
                                        className="block w-full px-4 py-3 text-sm font-medium text-center transition-all duration-300 border rounded-lg text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover hover:text-app-light-text-primary dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:hover:text-app-dark-text-primary hover:shadow-md"
                                        style={{
                                            animation: sidebarOpen ? 'slideUpFade 0.4s ease-out 0.7s both' : 'none'
                                        }}
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                <circle cx="12" cy="7" r="4" />
                                            </svg>
                                            {t('nav.login')}
                                        </span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body,
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
                <div className={`mb-4 rounded-md border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-app-light-accent bg-app-light-accent/10 text-app-light-text-primary dark:border-app-dark-accent dark:bg-app-dark-accent/20 dark:text-app-dark-text-primary' : notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-100' : 'border-app-light-border bg-app-light-surface-secondary text-app-light-text-primary dark:border-app-dark-border dark:bg-app-dark-surface-secondary dark:text-app-dark-text-primary'}`}>{notice.text}</div>
            )}
            {loading && <p className="py-6 text-app-light-text-primary">{t('activities.loading')}</p>}
            {error && <p className="py-6 text-red-500">{t('error.generic')}: {error}</p>}
            {!loading && !error && (
                <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
                    {activities.map(a => (
                        <article key={a.id} className="flex flex-col p-5 border shadow-sm bg-app-light-surface border-app-light-border rounded-xl dark:border-app-dark-border dark:bg-app-dark-surface">
                            <h3 className="mb-2 text-base font-semibold lg:text-lg">{a.title}</h3>
                            <p className="flex-1 text-sm text-app-light-text-secondary lg:text-base dark:text-app-dark-text-secondary">{a.description || '—'}</p>
                            <div className="mt-3 text-xs text-app-light-text-secondary lg:text-sm dark:text-app-dark-text-secondary">
                                <div>Starts: {fmt.format(new Date(a.start_datetime))}</div>
                                <div>Ends: {fmt.format(new Date(a.end_datetime))}</div>
                            </div>
                            <button onClick={() => apply(a.id)} className="mt-4 px-4 py-2.5 rounded-md bg-primary-500 text-white text-sm lg:text-base hover:bg-primary-600">{t('activity.apply')}</button>
                        </article>
                    ))}
                </div>
            )}
            {!loading && !error && activities.length === 0 && (
                <p className="py-6 text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('activities.none')}</p>
            )}
        </main>
    );
};

const RoleAwareHome: React.FC = () => {
    const { t } = useTranslation();
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
                <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('app.loadingDashboard')}</p>
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
        <footer ref={footerRef} className="px-6 py-10 mx-auto mt-auto text-xs text-app-light-text-secondary bg-app-light-input-bg dark:bg-app-dark-input-bg dark:text-app-dark-text-secondary max-w-7xl">© {new Date().getFullYear()} {t('app.title')}</footer>
    );
};

const App: React.FC = () => {
    const { t, i18n } = useTranslation();
    useEffect(() => {
        document.title = t('app.windowTitle');

        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', t('app.description'));
        }

        // Update noscript content
        const noscript = document.querySelector('noscript[data-i18n="app.noscript"]');
        if (noscript) {
            noscript.textContent = t('app.noscript');
        }
    }, [i18n.language, t]);
    return (
        <div className="flex flex-col min-h-screen text-app-light-text-primary bg-app-light-input-bg dark:bg-app-dark-input-bg dark:text-app-dark-text-primary">
            <Navbar />
            <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/login" element={<Navigate to="/auth" replace />} />
                <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboardPage /></AdminRoute></ProtectedRoute>} />
                <Route path="/admin/students/*" element={<ProtectedRoute><AdminRoute><AdminStudentsPage /></AdminRoute></ProtectedRoute>} />
                <Route path="/admin/staff/*" element={<ProtectedRoute><AdminRoute><AdminStaffPage /></AdminRoute></ProtectedRoute>} />
                <Route path="/admin/courses/*" element={<ProtectedRoute><AdminRoute><AdminCoursesPage /></AdminRoute></ProtectedRoute>} />
                <Route path="/admin/activities/*" element={<ProtectedRoute><AdminRoute><AdminActivitiesPage /></AdminRoute></ProtectedRoute>} />
                <Route path="/staff" element={<ProtectedRoute><StaffRoute><StaffDashboardPage /></StaffRoute></ProtectedRoute>} />
                <Route path="/" element={<ProtectedRoute><RoleAwareHome /></ProtectedRoute>} />
            </Routes>
            <Footer />
        </div>
    );
};

const AdminRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { t } = useTranslation();
    const { me, meLoading } = useAuth();
    if (meLoading) {
        return (
            <main className="flex items-center justify-center flex-1 py-10">
                <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('app.confirmingAdminAccess')}</p>
            </main>
        );
    }
    if (!me) return null;
    if (me.role !== 'admin') return <Navigate to="/" replace />;
    return <>{children}</>;
};

const StaffRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { t } = useTranslation();
    const { me, meLoading } = useAuth();
    if (meLoading) {
        return (
            <main className="flex items-center justify-center flex-1 py-10">
                <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('app.confirmingStaffAccess')}</p>
            </main>
        );
    }
    if (!me) return null;
    if (me.role !== 'staff') return <Navigate to="/" replace />;
    return <>{children}</>;
};

export default App;
