/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** Ops 鉴权：会作为 `Authorization: Bearer <token>` 发送 */
  readonly VITE_OPS_TOKEN: string;
  /** 设为 `true` 时未配置 API 也能用内置假数据演示 UI */
  readonly VITE_USE_MOCK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
