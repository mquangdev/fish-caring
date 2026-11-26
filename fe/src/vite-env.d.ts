/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of every API call, including "/api". Empty means "/api" on the same domain. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
