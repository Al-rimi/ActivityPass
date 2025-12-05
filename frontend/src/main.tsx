import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import './i18n';

const resolveRouterBase = (): string | undefined => {
    const raw = import.meta.env.VITE_BASE_PATH ?? '/';
    let value = raw.trim();
    if (value === '' || value === '/') {
        return undefined;
    }
    if (!value.startsWith('/')) {
        value = `/${value}`;
    }
    if (value.endsWith('/')) {
        value = value.slice(0, -1);
    }
    return value.length > 0 ? value : undefined;
};

const routerBaseName = resolveRouterBase();

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(
    <React.StrictMode>
        <BrowserRouter basename={routerBaseName}>
            <AuthProvider>
                <PreferencesProvider>
                    <App />
                </PreferencesProvider>
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
);

reportWebVitals();
