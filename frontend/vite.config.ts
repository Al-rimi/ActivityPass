import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    let basePath = env.VITE_BASE_PATH ?? '/';

    if (!basePath.startsWith('/')) {
        basePath = `/${basePath}`;
    }
    if (!basePath.endsWith('/')) {
        basePath = `${basePath}/`;
    }

    return {
        base: basePath,
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
    };
});
