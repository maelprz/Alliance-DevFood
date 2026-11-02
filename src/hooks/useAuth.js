import { useState, useEffect, useCallback } from "react";
import {
  registerUser,
  loginUser,
  restoreSession,
} from "../services/authService";
import { isValidEmail, validatePassword, sanitize } from "../utils/validation";
import {
  checkLockout,
  recordFailedAttempt,
  clearAttempts,
  getAttemptsLeft,
} from "../utils/rateLimiter";
import { MAX_LOGIN_ATTEMPTS } from "../constants/auth";

// Exports only useAuth — React Compiler rule (one export type per file)

const INITIAL_LOGIN_FORM = { email: "", password: "" };
const INITIAL_REGISTER_FORM = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

/**
 * useAuth — Custom hook encapsulating all authentication logic.
 * Keeps Login.jsx as a pure UI layer (professor's pattern: logic separated from presentation).
 *
 * @param {{ onLoginSuccess: function }} params - Callback invoked with the user object on success
 * @returns {object} Auth state and handler functions
 */
export function useAuth({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState(INITIAL_LOGIN_FORM);
  const [registerForm, setRegisterForm] = useState(INITIAL_REGISTER_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_LOGIN_ATTEMPTS);

  // Wrap the callback so the useEffect below does not re-run when the
  // parent re-renders and passes a new inline function reference.
  const stableOnSuccess = useCallback(onLoginSuccess, []);

  // Restore session on mount — same useEffect pattern as professor's Main.jsx
  useEffect(() => {
    const { user } = restoreSession();
    if (user) {
      stableOnSuccess(user);
    }
    setAttemptsLeft(getAttemptsLeft());
  }, [stableOnSuccess]);

  // Clear messages when switching between Login / Sign Up tabs
  useEffect(() => {
    setErrors({});
    setServerError("");
    setSuccessMessage("");
  }, [isSignUp]);

  // ── Validation helpers ────────────────────────────────────────────────────

  /**
   * Validates the login form fields.
   * @returns {boolean} true if valid
   */
  function validateLoginForm() {
    const e = {};
    if (!loginForm.email) {
      e.email = "Email is required.";
    } else if (!isValidEmail(loginForm.email)) {
      e.email = "Enter a valid email address.";
    }
    if (!loginForm.password) {
      e.password = "Password is required.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  /**
   * Validates all registration form fields including password complexity.
   * @returns {boolean} true if valid
   */
  function validateRegisterForm() {
    const e = {};
    if (!sanitize(registerForm.name)) {
      e.name = "Full name is required.";
    }
    if (!registerForm.email) {
      e.email = "Email is required.";
    } else if (!isValidEmail(registerForm.email)) {
      e.email = "Enter a valid email address.";
    }
    const pwCheck = validatePassword(registerForm.password);
    if (!pwCheck.valid) {
      e.password = pwCheck.message;
    }
    if (!registerForm.confirmPassword) {
      e.confirmPassword = "Please confirm your password.";
    } else if (registerForm.password !== registerForm.confirmPassword) {
      e.confirmPassword = "Passwords do not match.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  /**
   * Handles login form submission.
   * Flow: check lockout → validate → call service → update context on success.
   * @param {React.FormEvent} e
   */
  async function handleLogin(e) {
    e.preventDefault();
    setServerError("");

    // Checklist: rate limiting — check lockout before anything else
    const { locked, remainingMs } = checkLockout();
    if (locked) {
      const mins = Math.ceil(remainingMs / 60000);
      setServerError(
        `Too many failed attempts. Try again in ${mins} minute(s).`,
      );
      return;
    }

    if (!validateLoginForm()) return;

    setLoading(true);
    try {
      const result = await loginUser({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (!result.success) {
        const { locked: nowLocked, attemptsLeft: left } = recordFailedAttempt();
        setAttemptsLeft(left);
        setServerError(
          nowLocked
            ? "Account locked after 5 failed attempts. Try again in 15 minutes."
            : `${result.message} (${left} attempt${left !== 1 ? "s" : ""} left)`,
        );
        return;
      }

      clearAttempts();
      setAttemptsLeft(MAX_LOGIN_ATTEMPTS);
      stableOnSuccess(result.user);
    } catch (err) {
      // Show the actual error message (e.g. "Cannot reach the server...")
      setServerError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handles registration form submission.
   * Flow: validate → call service → show success → auto-switch to login tab.
   * @param {React.FormEvent} e
   */
  async function handleRegister(e) {
    e.preventDefault();
    setServerError("");

    if (!validateRegisterForm()) return;

    setLoading(true);
    try {
      const result = await registerUser({
        name: registerForm.name,
        email: registerForm.email,
        password: registerForm.password,
      });

      if (!result.success) {
        setServerError(result.message);
        return;
      }

      setSuccessMessage(result.message);
      setRegisterForm(INITIAL_REGISTER_FORM);

      // Switch to login tab after short delay so user sees the success message
      setTimeout(() => {
        setIsSignUp(false);
        setSuccessMessage("");
      }, 1500);
    } catch (err) {
      // Show the actual error message (e.g. "Cannot reach the server...")
      setServerError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return {
    isSignUp,
    setIsSignUp,
    loading,
    loginForm,
    setLoginForm,
    registerForm,
    setRegisterForm,
    errors,
    serverError,
    successMessage,
    attemptsLeft,
    handleLogin,
    handleRegister,
  };
}
