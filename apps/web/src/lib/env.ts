/**
 * Environment configuration.
 *
 * Every external credential is optional at boot: the app has to start and
 * render even when nothing is configured yet, so missing values resolve to
 * `undefined` and the relevant feature reports itself as "not connected".
 */

const bool = (value: string | undefined): boolean =>
  value === "1" || value?.toLowerCase() === "true";

export const env = {
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  sessionSecret: process.env.APP_SESSION_SECRET ?? "dev-only-insecure-session-secret",
  adminEmail: process.env.APP_ADMIN_EMAIL ?? "admin@careerpulse.local",
  adminPassword: process.env.APP_ADMIN_PASSWORD ?? "careerpulse",
  adminName: process.env.APP_ADMIN_NAME ?? "Operator",

  /** Postgres connection string (Supabase or any managed Postgres). */
  databaseUrl: process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? "",
  /** Embedded Postgres (PGlite) data directory used when DATABASE_URL is unset. */
  pglitePath: process.env.PGLITE_PATH ?? ".data/pglite",

  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY ?? "dev-only-insecure-token-key",

  githubClientId: process.env.GITHUB_CLIENT_ID ?? "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
  githubOAuthRedirectUri:
    process.env.GITHUB_OAUTH_REDIRECT_URI ?? "http://localhost:3000/api/connections/github/callback",

  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleOAuthRedirectUri:
    process.env.GOOGLE_OAUTH_REDIRECT_URI ??
    "http://localhost:3000/api/connections/google_drive/callback",
  googleDriveApiKey: process.env.GOOGLE_DRIVE_API_KEY ?? "",

  linkedinClientId: process.env.LINKEDIN_CLIENT_ID ?? "",
  linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
  linkedinOAuthRedirectUri:
    process.env.LINKEDIN_OAUTH_REDIRECT_URI ??
    "http://localhost:3000/api/connections/linkedin/callback",

  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  githubModelsToken: process.env.GITHUB_MODELS_TOKEN ?? "",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
  ollamaModel: process.env.OLLAMA_MODEL ?? "llama3.1:8b",

  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? "",

  emailFrom: process.env.EMAIL_FROM ?? "",
  smtpUrl: process.env.SMTP_URL ?? "",

  systemCronSecret: process.env.SYSTEM_CRON_SECRET ?? "",

  /** Forces the deterministic offline agent provider (no network calls). */
  demoMode: bool(process.env.DEMO_MODE),
  /** Disables the kill switch guard for local development. */
  allowUnauthenticatedCron: bool(process.env.ALLOW_UNAUTHENTICATED_CRON),
} as const;

export type Env = typeof env;

/**
 * Fail fast in production if security-critical secrets were left at their
 * insecure development defaults. These sign session cookies / OAuth state
 * (sessionSecret) and encrypt every stored OAuth token at rest
 * (tokenEncryptionKey) — both are hardcoded, publicly-known strings in the
 * shipped source, so running with them in production allows session
 * forgery and makes "encrypted" tokens trivially decryptable.
 */
if (process.env.NODE_ENV === "production") {
  const insecureDefaults: Array<[string, string]> = [
    ["APP_SESSION_SECRET", env.sessionSecret],
    ["TOKEN_ENCRYPTION_KEY", env.tokenEncryptionKey],
  ];
  const stillDefault = insecureDefaults.filter(
    ([, value]) => value === "dev-only-insecure-session-secret" || value === "dev-only-insecure-token-key",
  );
  if (stillDefault.length > 0) {
    throw new Error(
      `Refusing to start in production with insecure default secret(s): ${stillDefault
        .map(([name]) => name)
        .join(", ")}. Set real, random values for these environment variables.`,
    );
  }
  if (env.adminPassword === "careerpulse") {
    throw new Error(
      "Refusing to start in production with the default APP_ADMIN_PASSWORD. Set a strong, unique value.",
    );
  }
}

/** True when the app runs without any real Postgres instance (embedded PGlite). */
export const isEmbeddedDatabase = !env.databaseUrl;

/** True when at least one real AI provider is configured. */
export const hasRealAiProvider = Boolean(
  env.geminiApiKey || env.groqApiKey || env.openRouterApiKey || env.githubModelsToken,
);
