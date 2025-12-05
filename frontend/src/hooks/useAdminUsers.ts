import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminUser } from '../types/admin';
import { useAuth } from '../context/AuthContext';
import { resolveApiUrl } from '../utils/api';

export type UseAdminUsersOptions = {
    role?: 'student' | 'staff';
};

export const useAdminUsers = (options: UseAdminUsersOptions = {}) => {
    const { tokens } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const headers = useMemo(() => ({
        'Content-Type': 'application/json',
        Authorization: tokens ? `Bearer ${tokens.access}` : '',
    }), [tokens]);

    const load = useCallback(async (query = '') => {
        if (!tokens) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (options.role) params.set('role', options.role);
            if (query.trim()) params.set('q', query.trim());
            const requestPath = `/api/admin/users/${params.toString() ? `?${params.toString()}` : ''}`;
            const res = await fetch(resolveApiUrl(requestPath), {
                headers,
            });
            if (!res.ok) throw new Error('fetch_failed');
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err : new Error('fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [tokens, headers, options.role]);

    useEffect(() => {
        if (tokens) {
            load();
        }
    }, [tokens, load]);

    return { users, loading, error, reload: load };
};
