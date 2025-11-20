import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { tokens, me } = useAuth();
    const loc = useLocation();
    if (!tokens) return <Navigate to="/auth" replace />;
    // If authenticated but first_name missing and not already on complete-profile, redirect there
    if (me && !me.first_name?.trim() && loc.pathname !== '/complete-profile') {
        return <Navigate to="/complete-profile" replace />;
    }
    return <>{children}</>;
};

export default ProtectedRoute;
