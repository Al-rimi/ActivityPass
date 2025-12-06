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
import AdminFacultyPage from './pages/AdminFacultyPage';
import AdminStaffPage from './pages/AdminStaffPage';
import AdminCoursesPage from './pages/AdminCoursesPage';
import AdminActivitiesPage from './pages/AdminActivitiesPage';
import StaffDashboardPage from './pages/StaffDashboardPage';
import StudentHomePage from './pages/StudentHomePage';
import StudentCalendarPage from './pages/StudentCalendarPage';
import Logo from './components/Logo';

const setDocumentCssVar = (name: string, value: number) => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty(name, `${Math.round(value)}px`);
};

type GreetingPeriod = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

const NAV_GREETING_DEFAULTS: Record<GreetingPeriod, { base: string; named: string }> = {
    Morning: { base: 'Good morning', named: 'Good morning, {{name}}' },
    Afternoon: { base: 'Good afternoon', named: 'Good afternoon, {{name}}' },
    Evening: { base: 'Good evening', named: 'Good evening, {{name}}' },
    Night: { base: 'Hello', named: 'Hello, {{name}}' }
};

const resolveGreetingPeriod = (hour: number): GreetingPeriod => {
    if (hour < 5) return 'Night';
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    if (hour < 22) return 'Evening';
    return 'Night';
};

const Navbar: React.FC = () => {
    const { t } = useTranslation();
    const { tokens, logout, me } = useAuth();
    const navigate = useNavigate();
    const loc = useLocation();
    const navRef = useRef<HTMLElement>(null);
    const bottomNavRef = useRef<HTMLElement>(null);
    const [preferencesOpen, setPreferencesOpen] = useState(false);

    const greetingPeriod = resolveGreetingPeriod(new Date().getHours());
    const firstName = me?.first_name?.trim();
    const username = me?.username?.trim();
    const displayName = firstName || username;
    const navGreeting = displayName
        ? t(`student.home.greeting${greetingPeriod}Named`, {
            defaultValue: NAV_GREETING_DEFAULTS[greetingPeriod].named,
            name: displayName
        })
        : t(`student.home.greeting${greetingPeriod}`, {
            defaultValue: NAV_GREETING_DEFAULTS[greetingPeriod].base
        });

    type NavIcon = 'home' | 'calendar' | 'dashboard' | 'people' | 'courses' | 'activities' | 'settings';
    type NavLinkConfig = { label: string; to: string; icon?: NavIcon };

    const dashboardLabel = useMemo(() => {
        if (me?.role === 'admin') {
            return t('nav.adminDashboard', { defaultValue: t('nav.dashboard') });
        }
        if (me?.role === 'staff') {
            return t('nav.staffDashboard', { defaultValue: t('nav.dashboard') });
        }
        return t('nav.dashboard');
    }, [me?.role, t]);

    const navLinks = useMemo<NavLinkConfig[]>(() => {
        if (!tokens) return [];
        if (me?.role === 'admin') {
            return [
                { label: dashboardLabel, to: '/admin', icon: 'dashboard' },
                { label: t('admin.studentsTab', { defaultValue: 'Students' }), to: '/admin/students', icon: 'people' },
                { label: t('admin.facultyTab', { defaultValue: 'Faculty' }), to: '/admin/faculty', icon: 'people' },
                { label: t('admin.staffTab', { defaultValue: 'Staff' }), to: '/admin/staff', icon: 'people' },
                { label: t('admin.coursesTab', { defaultValue: 'Courses' }), to: '/admin/courses', icon: 'courses' },
                { label: t('admin.activitiesTab', { defaultValue: 'Activities' }), to: '/admin/activities', icon: 'activities' },
            ];
        }
        if (me?.role === 'staff') {
            return [{ label: dashboardLabel, to: '/staff', icon: 'dashboard' }];
        }
        if (me?.role === 'student') {
            return [
                { label: t('nav.studentHome', { defaultValue: 'Today' }), to: '/student', icon: 'home' },
                { label: t('nav.studentCalendar', { defaultValue: 'Calendar' }), to: '/student/calendar', icon: 'calendar' }
            ];
        }
        return [{ label: dashboardLabel, to: '/', icon: 'dashboard' }];
    }, [tokens, me?.role, dashboardLabel, t]);

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
    const showBottomNav = tokens && me?.role === 'student' && navLinks.length > 0;

    const handleLogout = () => {
        logout();
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

    useLayoutEffect(() => {
        if (!showBottomNav) {
            setDocumentCssVar('--ap-bottom-nav-height', 0);
            return;
        }
        const el = bottomNavRef.current;
        const updateHeight = () => {
            if (el) {
                setDocumentCssVar('--ap-bottom-nav-height', el.getBoundingClientRect().height);
            }
        };
        updateHeight();
        if (!el || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(updateHeight);
        observer.observe(el);
        return () => observer.disconnect();
    }, [showBottomNav]);

    useEffect(() => {
        if (!preferencesOpen || typeof document === 'undefined') return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setPreferencesOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = originalOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [preferencesOpen]);

    const renderNavIcon = (icon: NavIcon | undefined, active: boolean) => {
        const className = `w-6 h-6 transition-colors ${active ? 'text-app-light-accent dark:text-app-dark-accent' : 'text-app-light-text-secondary dark:text-app-dark-text-secondary'}`;
        const stroke = 'currentColor';
        switch (icon) {
            case 'home':
                return (
                    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 11l9-8 9 8" />
                        <path d="M5 11v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V11" />
                    </svg>
                );
            case 'calendar':
                return (
                    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                );
            case 'dashboard':
                return (
                    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 13h8V3H3z" />
                        <path d="M13 21h8V11h-8z" />
                        <path d="M13 3h8" />
                        <path d="M13 7h8" />
                        <path d="M3 17h8" />
                        <path d="M3 21h8" />
                    </svg>
                );
            case 'people':
                return (
                    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <path d="M20 8v6" />
                        <path d="M23 11h-6" />
                    </svg>
                );
            case 'courses':
                return (
                    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 4h18v4H3z" />
                        <path d="M5 8v12h14V8" />
                        <path d="M9 12h6" />
                        <path d="M9 16h6" />
                    </svg>
                );
            case 'activities':
                return (
                    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 14.59 8.26 21.27 8.27 15.97 12.14 18.5 18.4 12 14.77 5.5 18.4 8.03 12.14 2.73 8.27 9.41 8.26" fill="currentColor" />
                    </svg>
                );
            case 'settings':
                return (
                    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                );
            default:
                return (
                    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 3" />
                    </svg>
                );
        }
    };

    const preferencesLabel = t('nav.preferences', { defaultValue: 'Preferences' });
    const closeLabel = t('common.close', { defaultValue: 'Close' });
    const isAuthPage = loc.pathname === '/auth' || loc.pathname === '/login';
    const showLoginCTA = !tokens && !isAuthPage;
    const navHasLinks = navLinks.length > 0;
    const desktopNavClasses = showBottomNav ? 'items-center hidden gap-6 md:flex' : 'items-center hidden gap-4 sm:flex';
    const desktopLinkClass = (href: string) => `text-sm lg:text-base font-medium transition-colors ${isActive(href) ? 'text-app-light-text-primary dark:text-app-dark-text-primary' : 'text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary'}`;
    const mobileLinkClass = (href: string) => `inline-flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors border rounded-lg whitespace-nowrap ${isActive(href) ? 'text-app-light-text-primary border-app-light-border bg-app-light-surface-hover dark:text-app-dark-text-primary dark:border-app-dark-border dark:bg-app-dark-surface-hover' : 'text-app-light-text-secondary border-transparent dark:text-app-dark-text-secondary'}`;
    const preferenceButtonClass = `inline-flex items-center justify-center w-10 h-10 transition-all duration-200 border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-app-light-accent/50 dark:focus-visible:ring-app-dark-accent/40 ${preferencesOpen ? 'border-app-light-accent/40 text-app-light-accent bg-app-light-surface-hover dark:border-app-dark-accent/40 dark:text-app-dark-accent dark:bg-app-dark-surface-hover' : 'border-app-light-border bg-app-light-surface text-app-light-text-secondary hover:text-app-light-text-primary hover:bg-app-light-surface-hover dark:border-app-dark-border dark:bg-app-dark-surface dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary dark:hover:bg-app-dark-surface-hover'}`;

    const PreferencesContent = ({ onClose }: { onClose: () => void }) => (
        <div role="dialog" aria-modal="true" aria-label={preferencesLabel} className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-app-light-text-primary dark:text-app-dark-text-primary">{preferencesLabel}</h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center w-9 h-9 transition-colors rounded-lg text-app-light-text-secondary hover:text-app-light-text-primary hover:bg-app-light-surface-hover dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary dark:hover:bg-app-dark-surface-hover"
                    aria-label={closeLabel}
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div className="flex items-stretch gap-3">
                <div className="flex-1 min-w-0">
                    <LanguageSwitcher />
                </div>
                <div className="flex items-center justify-center flex-shrink-0">
                    <ThemeToggle />
                </div>
            </div>
            <div>
                {tokens ? (
                    <button
                        onClick={() => { onClose(); handleLogout(); }}
                        className="w-full px-4 py-3 text-sm font-medium transition-all duration-200 border rounded-lg text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover hover:text-app-light-text-primary dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:hover:text-app-dark-text-primary"
                    >
                        <span className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
                        onClick={onClose}
                        className="block w-full px-4 py-3 text-sm font-medium text-center transition-all duration-200 border rounded-lg text-app-light-text-primary bg-app-light-surface border-app-light-border hover:bg-app-light-surface-hover hover:text-app-light-text-primary dark:bg-app-dark-surface dark:text-app-dark-text-primary dark:border-app-dark-border dark:hover:bg-app-dark-surface-hover dark:hover:text-app-dark-text-primary"
                    >
                        <span className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            {t('nav.login')}
                        </span>
                    </Link>
                )}
            </div>
        </div>
    );
    const openPreferences = () => setPreferencesOpen(true);
    const closePreferences = () => setPreferencesOpen(false);

    return (
        <>
            <nav ref={navRef} className="sticky top-0 z-20 border-b border-app-light-border bg-app-light-surface/80 dark:bg-app-dark-surface/80 backdrop-blur-xl dark:border-app-dark-border">
                <div className="w-full px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16 gap-4 lg:h-20">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <Link
                                to="/"
                                className="flex items-center gap-3 text-lg font-semibold tracking-tight lg:text-xl"
                                aria-label={t('app.title')}
                            >
                                <Logo width={32} height={32} className="flex-shrink-0" />
                                {!tokens && (
                                    <span>{t('app.title')}</span>
                                )}
                            </Link>
                            {tokens && (
                                <p className="text-[11px] font-medium leading-snug text-app-light-text-secondary dark:text-app-dark-text-secondary sm:text-xs">
                                    {navGreeting}
                                </p>
                            )}
                        </div>
                        {navHasLinks && (
                            <div className={desktopNavClasses}>
                                {navLinks.map(link => (
                                    <Link key={link.to} to={link.to} className={desktopLinkClass(link.to)}>
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        )}
                        <div className="flex items-center gap-2 sm:gap-3">
                            {showLoginCTA && (
                                <Link to="/auth" className="px-4 py-2 text-sm text-white rounded-md bg-primary-500 lg:text-base hover:bg-primary-600">
                                    {t('nav.login')}
                                </Link>
                            )}
                            <button
                                type="button"
                                onClick={preferencesOpen ? closePreferences : openPreferences}
                                className={preferenceButtonClass}
                                aria-label={preferencesLabel}
                                aria-expanded={preferencesOpen}
                                aria-haspopup="dialog"
                            >
                                {renderNavIcon('settings', preferencesOpen)}
                            </button>
                        </div>
                    </div>
                </div>
                {!showBottomNav && navHasLinks && (
                    <div className="flex items-center gap-2 px-1 pb-3 mt-2 overflow-x-auto sm:hidden">
                        {navLinks.map(link => (
                            <Link key={link.to} to={link.to} className={mobileLinkClass(link.to)}>
                                {link.label}
                            </Link>
                        ))}
                    </div>
                )}
            </nav>
            {showBottomNav && (
                <nav
                    ref={bottomNavRef}
                    className="fixed inset-x-0 bottom-0 z-30 border-t border-app-light-border bg-app-light-surface/95 dark:border-app-dark-border dark:bg-app-dark-surface/95 backdrop-blur-xl sm:hidden"
                >
                    <ul className="flex items-center justify-around gap-1 px-2 py-2">
                        {navLinks.map(link => {
                            const active = isActive(link.to);
                            return (
                                <li key={link.to} className="flex-1">
                                    <Link
                                        to={link.to}
                                        className={`flex flex-col items-center justify-center gap-1 px-3 py-1 text-xs font-medium transition-colors ${active ? 'text-app-light-accent dark:text-app-dark-accent' : 'text-app-light-text-secondary hover:text-app-light-text-primary dark:text-app-dark-text-secondary dark:hover:text-app-dark-text-primary'}`}
                                        aria-current={active ? 'page' : undefined}
                                    >
                                        {renderNavIcon(link.icon, active)}
                                        <span>{link.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            )}
            {preferencesOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[90]">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
                        aria-hidden="true"
                        onClick={closePreferences}
                    />
                    <div className="absolute inset-0 z-10 flex flex-col justify-end pointer-events-none sm:justify-start">
                        <div className="pointer-events-auto sm:hidden flex justify-center">
                            <div className="w-full max-w-lg px-5 pb-8 pt-6 border-t border-app-light-border rounded-t-3xl bg-app-light-surface shadow-2xl dark:border-app-dark-border dark:bg-app-dark-surface">
                                <PreferencesContent onClose={closePreferences} />
                            </div>
                        </div>
                        <div className="hidden w-full sm:block">
                            <div
                                className="pointer-events-auto fixed z-20 w-full max-w-sm rounded-2xl border border-app-light-border bg-app-light-surface p-5 shadow-2xl ring-1 ring-black/5 dark:border-app-dark-border dark:bg-app-dark-surface"
                                style={{ top: 'calc(var(--ap-header-height, 64px) + 12px)', right: 'clamp(1rem, 2vw, 1.5rem)' }}
                            >
                                <PreferencesContent onClose={closePreferences} />
                            </div>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </>
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
        } else if (me.role === 'student') {
            navigate('/student', { replace: true });
        }
    }, [me, meLoading, navigate]);

    if (meLoading || !me) {
        return (
            <main className="flex items-center justify-center flex-1">
                <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('app.loadingDashboard')}</p>
            </main>
        );
    }
    return (
        <main className="flex items-center justify-center flex-1 py-10">
            <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('app.loadingDashboard')}</p>
        </main>
    );
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
        <footer ref={footerRef} className="px-6 pt-8 pb-3 mx-auto mt-auto text-xs text-app-light-text-tertiary bg-app-light-input-bg dark:bg-app-dark-input-bg dark:text-app-dark-text-tertiary max-w-7xl">
            © {new Date().getFullYear()}{' '}
            <a
                href="https://github.com/Al-rimi/ActivityPass"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-200 hover:text-app-light-text-secondary dark:hover:text-app-dark-text-secondary"
            >
                {t('app.title')}
            </a>
        </footer>
    );
};

const App: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { tokens, me } = useAuth();
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

    useLayoutEffect(() => {
        if (typeof window === 'undefined') return;
        const updateHeight = () => {
            const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
            setDocumentCssVar('--ap-viewport-height', viewportHeight);
        };
        const viewport = window.visualViewport;
        updateHeight();
        window.addEventListener('resize', updateHeight);
        window.addEventListener('orientationchange', updateHeight);
        viewport?.addEventListener('resize', updateHeight);
        viewport?.addEventListener('scroll', updateHeight);
        return () => {
            window.removeEventListener('resize', updateHeight);
            window.removeEventListener('orientationchange', updateHeight);
            viewport?.removeEventListener('resize', updateHeight);
            viewport?.removeEventListener('scroll', updateHeight);
        };
    }, []);
    const shouldPadForBottomNav = tokens && me?.role === 'student';
    const containerStyle: React.CSSProperties = shouldPadForBottomNav
        ? {
            minHeight: 'calc(var(--ap-viewport-height, 100vh) - var(--ap-bottom-nav-height, 0px))',
            paddingBottom: 'var(--ap-bottom-nav-height, 0px)',
        }
        : {
            minHeight: 'calc(var(--ap-viewport-height, 100vh))',
        };
    return (
        <div
            data-scroll-root="true"
            className="flex flex-col overflow-auto text-app-light-text-primary bg-app-light-input-bg dark:bg-app-dark-input-bg dark:text-app-dark-text-primary"
            style={containerStyle}
        >
            <Navbar />
            <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/login" element={<Navigate to="/auth" replace />} />
                <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminDashboardPage /></AdminRoute></ProtectedRoute>} />
                <Route path="/admin/students/*" element={<ProtectedRoute><AdminRoute><AdminStudentsPage /></AdminRoute></ProtectedRoute>} />
                <Route path="/admin/faculty/*" element={<ProtectedRoute><AdminRoute><AdminFacultyPage /></AdminRoute></ProtectedRoute>} />
                <Route path="/admin/staff/*" element={<ProtectedRoute><AdminRoute><AdminStaffPage /></AdminRoute></ProtectedRoute>} />
                <Route path="/admin/courses/*" element={<ProtectedRoute><AdminRoute><AdminCoursesPage /></AdminRoute></ProtectedRoute>} />
                <Route path="/admin/activities/*" element={<ProtectedRoute><AdminRoute><AdminActivitiesPage /></AdminRoute></ProtectedRoute>} />
                <Route path="/staff" element={<ProtectedRoute><StaffRoute><StaffDashboardPage /></StaffRoute></ProtectedRoute>} />
                <Route path="/student" element={<ProtectedRoute><StudentRoute><StudentHomePage /></StudentRoute></ProtectedRoute>} />
                <Route path="/student/calendar" element={<ProtectedRoute><StudentRoute><StudentCalendarPage /></StudentRoute></ProtectedRoute>} />
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

const StudentRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { t } = useTranslation();
    const { me, meLoading } = useAuth();
    if (meLoading) {
        return (
            <main className="flex items-center justify-center flex-1 py-10">
                <p className="text-sm text-app-light-text-secondary dark:text-app-dark-text-secondary">{t('app.loadingDashboard')}</p>
            </main>
        );
    }
    if (!me) return null;
    if (me.role !== 'student') return <Navigate to="/" replace />;
    return <>{children}</>;
};

export default App;
