import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import './i18n';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

const renderApp = () => render(
    <BrowserRouter>
        <AuthProvider>
            <App />
        </AuthProvider>
    </BrowserRouter>
);

test('renders app title translation', () => {
    renderApp();
    expect(screen.getAllByText(/ActivityPass/i).length).toBeGreaterThan(0);
});
