interface ImportMetaEnv {
  readonly NG_APP_PRODUCTION: boolean;
  readonly NG_APP_API_URL: string;
  readonly NG_APP_HTTPS_API_URL: string;
  readonly NG_APP_ENFORCE_HTTPS: boolean;
  readonly VITE_NG_APP_STRIPE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
