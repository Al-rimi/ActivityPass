import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { tokens, me, meLoading } = useAuth();
    const loc = useLocation();
    if (!tokens) return <Navigate to="/auth" replace />;
    if (meLoading) {
        return (
            <main className="flex-1 flex items-center justify-center py-10">
                <p className="text-sm text-gray-600 dark:text-gray-300">Checking your access…</p>
            </main>
        );
    }
    // Only require profile completion for students without recorded name
    const needsProfile = me?.role === 'student' && !me.first_name?.trim();
    if (needsProfile && loc.pathname !== '/complete-profile') {
        return <Navigate to="/complete-profile" replace />;
    }
    return <>{children}</>;
};

export default ProtectedRoute;
