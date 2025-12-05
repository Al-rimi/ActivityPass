/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_BASE_PATH?: string;
    readonly VITE_API_BASE_PATH?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
