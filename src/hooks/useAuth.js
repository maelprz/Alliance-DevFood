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



const INITIAL_LOGIN_FORM = { email: "", password: "", rememberMe: false };
const INITIAL_REGISTER_FORM = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};


export function useAuth({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState(INITIAL_LOGIN_FORM);
  const [registerForm, setRegisterForm] = useState(INITIAL_REGISTER_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_LOGIN_ATTEMPTS);

  
  
  const stableOnSuccess = useCallback(onLoginSuccess, []);

  
  useEffect(() => {
    const { user } = restoreSession();
    if (user) {
      stableOnSuccess(user);
    }
    setAttemptsLeft(getAttemptsLeft());
  }, [stableOnSuccess]);

  
  useEffect(() => {
    setErrors({});
    setServerError("");
    setSuccessMessage("");
  }, [isSignUp]);

  

  
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

  

  
  async function handleLogin(e) {
    e.preventDefault();
    setServerError("");

    
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
        rememberMe: loginForm.rememberMe,
      });

      
      if (!result.success && result.deactivated) {
        setServerError(result.message);
        return;
      }

      if (!result.success) {
        const { locked: nowLocked, attemptsLeft: left } = recordFailedAttempt();
        setAttemptsLeft(left);
        setServerError(
          nowLocked
            ? "Account locked after 5 failed attempts. Try again in 15 minutes."
            : `${result.message} ${left} attempt${left !== 1 ? "s" : ""} left.`,
        );
        return;
      }

      clearAttempts();
      setAttemptsLeft(MAX_LOGIN_ATTEMPTS);
      stableOnSuccess(result.user);
    } catch (err) {
      
      setServerError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  
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

      
      setTimeout(() => {
        setIsSignUp(false);
        setSuccessMessage("");
      }, 1500);
    } catch (err) {
      
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
