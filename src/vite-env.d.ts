/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_HOST: string;
  readonly VITE_API_NODE_HOST: string;
  readonly VITE_CABLE_URL: string;
  readonly VITE_RECAPTCHA_SITE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
