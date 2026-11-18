// Exports only rate limiter functions — React Compiler rule (one export type per file)
// Checklist: rate limiting on login attempts, max 5 attempts, account lock after limit.

import {
  MAX_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MS,
  STORAGE_KEYS,
} from "../constants/auth";

/**
 * Checks whether the user is currently locked out.
 * @returns {{ locked: boolean, remainingMs: number }}
 */
export function checkLockout() {
  const lockoutUntil = parseInt(
    sessionStorage.getItem(STORAGE_KEYS.LOCKOUT_UNTIL) || "0",
    10,
  );
  const now = Date.now();
  if (lockoutUntil > now) {
    return { locked: true, remainingMs: lockoutUntil - now };
  }
  return { locked: false, remainingMs: 0 };
}

/**
 * Records one failed login attempt.
 * Triggers a 15-minute lockout after MAX_LOGIN_ATTEMPTS failures.
 * @returns {{ locked: boolean, attemptsLeft: number }}
 */
export function recordFailedAttempt() {
  const attempts =
    parseInt(sessionStorage.getItem(STORAGE_KEYS.LOGIN_ATTEMPTS) || "0", 10) +
    1;
  sessionStorage.setItem(STORAGE_KEYS.LOGIN_ATTEMPTS, String(attempts));

  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
    sessionStorage.setItem(STORAGE_KEYS.LOCKOUT_UNTIL, String(lockoutUntil));
    return { locked: true, attemptsLeft: 0 };
  }

  return { locked: false, attemptsLeft: MAX_LOGIN_ATTEMPTS - attempts };
}

/**
 * Clears all rate-limit counters on successful login.
 */
export function clearAttempts() {
  sessionStorage.removeItem(STORAGE_KEYS.LOGIN_ATTEMPTS);
  sessionStorage.removeItem(STORAGE_KEYS.LOCKOUT_UNTIL);
}

/**
 * Returns how many attempts are left before lockout.
 * @returns {number}
 */
export function getAttemptsLeft() {
  const used = parseInt(
    sessionStorage.getItem(STORAGE_KEYS.LOGIN_ATTEMPTS) || "0",
    10,
  );
  return Math.max(0, MAX_LOGIN_ATTEMPTS - used);
}
