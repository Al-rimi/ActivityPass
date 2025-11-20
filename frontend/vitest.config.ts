import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vite.config';

export default mergeConfig(
    baseConfig,
    defineConfig({
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: './src/setupTests.ts'
        }
    })
);
