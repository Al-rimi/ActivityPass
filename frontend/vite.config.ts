import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
            '/api': 'http://127.0.0.1:8000',
            '/health': 'http://127.0.0.1:8000'
        }
    },
    build: {
        outDir: 'build',
        emptyOutDir: true
    }
});
