// Auth constants — single source of truth for all auth-related magic values.
// Follows checklist: constants file for hardcoded values, UPPER_SNAKE_CASE naming.

// Exports only AUTH_CONSTANTS — React Compiler rule (one export type per file)

/** Base URL for all auth API calls. No hardcoded port — uses Vite proxy in dev. */
export const API_BASE = "/api";

/** Maximum login attempts before account lockout */
export const MAX_LOGIN_ATTEMPTS = 5;

/** Lockout duration in milliseconds (15 minutes) */
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/** Minimum password length per checklist */
export const PASSWORD_MIN_LENGTH = 8;

/** sessionStorage keys — token and user session only (never the password) */
export const STORAGE_KEYS = {
  TOKEN: "devfood_token",
  USER: "devfood_user",
  LOGIN_ATTEMPTS: "devfood_login_attempts",
  LOCKOUT_UNTIL: "devfood_lockout_until",
};
