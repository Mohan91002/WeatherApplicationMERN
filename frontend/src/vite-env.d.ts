/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the World Weather API. Empty string = same origin. */
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
