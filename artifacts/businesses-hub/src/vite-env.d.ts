/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Google Analytics 4 Measurement ID, format `G-XXXXXXXXXX`.
   * Optional — when unset, the cookie consent banner still works but no
   * analytics script is loaded. See `src/lib/analytics.ts`.
   */
  readonly VITE_GA4_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
