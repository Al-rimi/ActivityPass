import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface DashboardNavItem {
    label: string;
    href: string;
    active?: boolean;
}

const DashboardNav: React.FC<{ items: DashboardNavItem[] }> = ({ items }) => {
    const location = useLocation();
    return (
        <nav className="mb-6 border-b border-gray-200 dark:border-gray-800">
            <ul className="flex flex-wrap gap-4 text-sm">
                {items.map(item => {
                    const isActive = item.active ?? location.pathname === item.href;
                    return (
                        <li key={item.href}>
                            <Link
                                to={item.href}
                                className={`inline-flex items-center gap-2 border-b-2 px-1.5 pb-2 font-medium transition-colors ${isActive ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}`}
                            >
                                {item.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default DashboardNav;
