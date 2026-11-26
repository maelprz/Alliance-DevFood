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
import { useNav } from "../context/useNav";



const INITIAL_LOGIN_FORM = { email: "", password: "" };
const INITIAL_REGISTER_FORM = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};


export function useAuth({ onLoginSuccess }) {
  // The Login / Sign Up tab follows the address: /login or /signup.
  const { view, navigate } = useNav();
  const isSignUp = view === "signup";
  const setIsSignUp = useCallback((signUp) => navigate(signUp ? "signup" : "login"), [navigate]);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState(INITIAL_LOGIN_FORM);
  const [registerForm, setRegisterForm] = useState(INITIAL_REGISTER_FORM);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(getAttemptsLeft);

  
  
  const stableOnSuccess = useCallback(onLoginSuccess, []);

  
  useEffect(() => {
    const { user } = restoreSession();
    if (user) {
      stableOnSuccess(user);
    }
  }, [stableOnSuccess]);

  
  useEffect(() => {
    setErrors({});
    setServerError("");
    setSuccessMessage("");
  }, [isSignUp]);

  

  
  function validateLoginForm() {
    const e = {};
    if (!loginForm.email) {
      e.email = "Enter your email.";
    } else if (!isValidEmail(loginForm.email)) {
      e.email = "Enter a valid email address.";
    }
    if (!loginForm.password) {
      e.password = "Enter your password.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  
  function validateRegisterForm() {
    const e = {};
    if (!sanitize(registerForm.name)) {
      e.name = "Enter your name.";
    }
    if (!registerForm.email) {
      e.email = "Enter your email.";
    } else if (!isValidEmail(registerForm.email)) {
      e.email = "Enter a valid email address.";
    }
    const pwCheck = validatePassword(registerForm.password);
    if (!pwCheck.valid) {
      e.password = pwCheck.message;
    }
    if (!registerForm.confirmPassword) {
      e.confirmPassword = "Re-enter your password.";
    } else if (registerForm.password !== registerForm.confirmPassword) {
      e.confirmPassword = "Passwords don't match.";
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
        `Too many tries. Try again in ${mins} min.`,
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

      
      if (!result.success && result.deactivated) {
        setServerError(result.message);
        return;
      }

      if (!result.success) {
        const { locked: nowLocked, attemptsLeft: left } = recordFailedAttempt();
        setAttemptsLeft(left);
        setServerError(
          nowLocked
            ? "Too many tries. Try again in 15 min."
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
