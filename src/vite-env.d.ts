/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Only for running the frontend without the nginx/Vite proxy. */
  readonly VITE_API_BASE_URL?: string;
  /** Cloudflare Turnstile site key (public). Unset = no bot challenge. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
