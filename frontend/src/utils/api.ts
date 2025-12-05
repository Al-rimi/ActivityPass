import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

const normalizeBasePath = (raw?: string | null): string => {
    if (!raw || raw.trim() === '') {
        return '/api/';
    }
    let value = raw.trim();
    if (!value.startsWith('/')) {
        value = `/${value}`;
    }
    if (!value.endsWith('/')) {
        value = `${value}/`;
    }
    return value;
};

const inferApiBase = (): string => {
    const configured = normalizeBasePath(import.meta.env.VITE_API_BASE_PATH);
    if (configured !== '/api/') {
        return configured;
    }

    const basePath = normalizeBasePath(import.meta.env.VITE_BASE_PATH ?? '/');
    if (basePath === '/') {
        return '/api/';
    }
    return `${basePath}api/`;
};

const API_BASE = inferApiBase();

export const resolveApiUrl = (url: string): string => {
    if (/^https?:\/\//i.test(url)) {
        return url;
    }
    let trimmed = url.startsWith('/') ? url.slice(1) : url;
    if (API_BASE.endsWith('/api/') && trimmed.startsWith('api/')) {
        trimmed = trimmed.slice(4);
    }
    return `${API_BASE}${trimmed}`;
};

export interface ApiError extends Error {
    status?: number;
}

/**
 * Custom hook that provides authenticated API calls with automatic 403 error handling
 */
export const useAuthenticatedApi = () => {
    const { tokens, logout } = useAuth();
    const navigate = useNavigate();

    const handleApiError = useCallback((error: ApiError, response?: Response) => {
        if (response?.status === 403) {
            // Token is invalid or expired, logout and redirect to auth
            logout();
            navigate('/auth');
            throw new Error('Authentication failed - redirected to login');
        }
        throw error;
    }, [logout, navigate]);

    const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
        const headers = new Headers(options.headers);

        // Add authorization header if we have tokens
        if (tokens?.access && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${tokens.access}`);
        }

        // Ensure Content-Type is set for JSON requests
        if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
            try {
                JSON.parse(options.body); // Check if it's JSON
                headers.set('Content-Type', 'application/json');
            } catch {
                // Not JSON, don't set content type
            }
        }

        try {
            const response = await fetch(resolveApiUrl(url), {
                ...options,
                headers
            });

            if (response.status === 403) {
                handleApiError(new Error('Forbidden'), response);
            }

            return response;
        } catch (error) {
            if (error instanceof Error) {
                handleApiError(error);
            }
            throw error;
        }
    }, [tokens?.access, handleApiError]);

    const authenticatedJsonFetch = useCallback(async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
        const response = await authenticatedFetch(url, options);

        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as ApiError;
            error.status = response.status;
            handleApiError(error, response);
        }

        return response.json();
    }, [authenticatedFetch, handleApiError]);

    return {
        authenticatedFetch,
        authenticatedJsonFetch
    };
};

/**
 * Utility function for making authenticated API calls outside of React components
 * This should be used sparingly and only when you can't use the useAuthenticatedApi hook
 */
export const makeAuthenticatedRequest = async (
    url: string,
    options: RequestInit = {},
    tokens?: { access: string; refresh: string } | null,
    onAuthError?: () => void
): Promise<Response> => {
    const headers = new Headers(options.headers);

    // Add authorization header if we have tokens
    if (tokens?.access && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${tokens.access}`);
    }

    // Ensure Content-Type is set for JSON requests
    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
        try {
            JSON.parse(options.body); // Check if it's JSON
            headers.set('Content-Type', 'application/json');
        } catch {
            // Not JSON, don't set content type
        }
    }

    const response = await fetch(resolveApiUrl(url), {
        ...options,
        headers
    });

    if (response.status === 403) {
        onAuthError?.();
        throw new Error('Authentication failed');
    }

    return response;
};