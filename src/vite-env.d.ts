/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** Ops auth: sent as `Authorization: Bearer <token>`. */
  readonly VITE_OPS_TOKEN: string;
  /** When `true`, UI can use built-in mock data without a configured API. */
  readonly VITE_USE_MOCK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
