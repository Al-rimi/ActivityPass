import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import './i18n';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <PreferencesProvider>
                    <App />
                </PreferencesProvider>
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
);

reportWebVitals();
