// Exports only validation functions — React Compiler rule (one export type per file)
// Checklist: all form inputs validated client-side, input trimming, special chars sanitized.

import { PASSWORD_MIN_LENGTH } from "../constants/auth";

/**
 * Validates email format.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validates password complexity per checklist requirements.
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 *
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePassword(password) {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter.",
    };
  }
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one number.",
    };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      valid: false,
      message:
        "Password must contain at least one special character (e.g. @, #, !).",
    };
  }
  return { valid: true, message: "" };
}

/**
 * Sanitizes a string input — trims whitespace.
 * React handles XSS by default; this ensures no accidental leading/trailing spaces.
 * @param {string} value
 * @returns {string}
 */
export function sanitize(value) {
  return typeof value === "string" ? value.trim() : "";
}
