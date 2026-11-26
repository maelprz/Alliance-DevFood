import { useNav } from "../context/useNav";
import { useApp } from "../context/useApp";
import { useAuth } from "../hooks/useAuth";
import { PERMISSIONS } from "../constants/auth";
import { hasPermission } from "../utils/rbac";
import { VIEW } from "../constants/views";
import { AUTH_VIEW } from "../constants/authViews";
import { authLinkStyle } from "../constants/authStyles";
import FormAlert from "../components/FormAlert";



export default function Login() {
  const { navigate } = useNav();
  const { setUser, setAdminUser } = useApp();



  const {
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
  } = useAuth({
    
    onLoginSuccess: (user) => {
      if (hasPermission(user, PERMISSIONS.ADMIN_PANEL)) {
        setAdminUser(user);
        navigate(AUTH_VIEW.ADMIN);
      } else {
        setUser(user);
        navigate(VIEW.MENU);
      }
    },
  });

  return (
    <>
      
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(135deg, rgba(255, 90, 54, 0.86) 0%, rgba(251, 146, 60, 0.78) 45%, rgba(251, 191, 36, 0.7) 100%), url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          overflow: "hidden",
          zIndex: 0,
        }}
      >
        
        <div
          style={{
            position: "absolute",
            top: "-120px",
            left: "-100px",
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.18)",
            filter: "blur(20px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-160px",
            right: "-120px",
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
            filter: "blur(20px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "30%",
            right: "12%",
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.18)",
          }}
        />
      </div>

      
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100dvh",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          boxSizing: "border-box",
        }}
      >
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => navigate(VIEW.MENU)}
            style={{ ...authLinkStyle, color: "#ffffff", fontSize: 14, fontWeight: 600, textShadow: "0 1px 6px rgba(0,0,0,0.15)" }}
          >
            ← Back to Menu
          </button>
        </div>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: "#ffffff",
              margin: "0 0 8px",
              fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
              letterSpacing: "-0.02em",
              textShadow: "0 2px 12px rgba(0,0,0,0.12)",
            }}
          >
            DevFood
          </h1>
          <p style={{ color: "rgba(255,255,255,0.95)", margin: 0, fontSize: 15 }}>
            Order delicious food, delivered to you
          </p>
        </div>

        
        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            border: "1px solid #f3e8df",
            boxShadow: "0 8px 32px rgba(255, 90, 54, 0.08)",
            padding: 0,
            overflow: "hidden",
          }}
        >
          
          <div
            style={{
              height: 6,
              background:
                "linear-gradient(90deg, #FF5A36 0%, #FB923C 50%, #FBBF24 100%)",
            }}
          />
          <div style={{ padding: 32 }}>
          
          <div
            style={{
              display: "flex",
              gap: 0,
              marginBottom: 24,
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            {["Login", "Sign Up"].map((tab) => {
              const active = tab === "Login" ? !isSignUp : isSignUp;
              return (
                <button
                  key={tab}
                  onClick={() => setIsSignUp(tab === "Sign Up")}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    background: "none",
                    border: "none",
                    borderBottom: active
                      ? "2px solid #FF5A36"
                      : "2px solid transparent",
                    color: active ? "#FF5A36" : "#6b7280",
                    fontWeight: active ? 600 : 400,
                    fontSize: 14,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    marginBottom: -1,
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {serverError && <FormAlert style={{ marginBottom: 16 }}>{serverError}</FormAlert>}

          {successMessage && (
            <FormAlert tone="success" style={{ marginBottom: 16 }}>{successMessage}</FormAlert>
          )}

          
          {!isSignUp && (
            <form
              onSubmit={handleLogin}
              noValidate
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 6,
                    color: "#374151",
                  }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                  aria-label="Email Address"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: errors.email
                      ? "1px solid #ef4444"
                      : "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                    background: "#fdf6ef",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
                {errors.email && (
                  <p
                    role="alert"
                    style={{
                      fontSize: 12,
                      color: "#ef4444",
                      margin: "4px 0 0",
                    }}
                  >
                    {errors.email}
                  </p>
                )}
              </div>

              
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 6,
                    color: "#374151",
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  aria-label="Password"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: errors.password
                      ? "1px solid #ef4444"
                      : "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                    background: "#fdf6ef",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
                {errors.password && (
                  <p
                    role="alert"
                    style={{
                      fontSize: 12,
                      color: "#ef4444",
                      margin: "4px 0 0",
                    }}
                  >
                    {errors.password}
                  </p>
                )}
              </div>

              
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  marginTop: -8,
                }}
              >
                <button
                  type="button"
                  onClick={() => navigate(AUTH_VIEW.FORGOT_PASSWORD)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#FF5A36",
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Forgot Password?
                </button>
              </div>

              
              <button
                type="submit"
                disabled={loading || attemptsLeft === 0}
                aria-label="Sign in"
                style={{
                  width: "100%",
                  padding: "12px",
                  background:
                    loading || attemptsLeft === 0 ? "#fdba74" : "#FF5A36",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor:
                    loading || attemptsLeft === 0 ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  marginTop: 4,
                }}
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          )}

          
          {isSignUp && (
            <form
              onSubmit={handleRegister}
              noValidate
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 6,
                    color: "#374151",
                  }}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Juan dela Cruz"
                  value={registerForm.name}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, name: e.target.value })
                  }
                  aria-label="Full Name"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: errors.name
                      ? "1px solid #ef4444"
                      : "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                    background: "#fdf6ef",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
                {errors.name && (
                  <p
                    role="alert"
                    style={{
                      fontSize: 12,
                      color: "#ef4444",
                      margin: "4px 0 0",
                    }}
                  >
                    {errors.name}
                  </p>
                )}
              </div>

              
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 6,
                    color: "#374151",
                  }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, email: e.target.value })
                  }
                  aria-label="Email Address"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: errors.email
                      ? "1px solid #ef4444"
                      : "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                    background: "#fdf6ef",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
                {errors.email && (
                  <p
                    role="alert"
                    style={{
                      fontSize: 12,
                      color: "#ef4444",
                      margin: "4px 0 0",
                    }}
                  >
                    {errors.email}
                  </p>
                )}
              </div>

              
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 6,
                    color: "#374151",
                  }}
                >
                  Password
                </label>
                <p
                  style={{ fontSize: 12, color: "#6b7280", margin: "0 0 6px" }}
                >
                  8+ characters, with a capital letter, a number and a symbol.
                </p>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      password: e.target.value,
                    })
                  }
                  autoComplete="new-password"
                  aria-label="Password"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: errors.password
                      ? "1px solid #ef4444"
                      : "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                    background: "#fdf6ef",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
                {errors.password && (
                  <p
                    role="alert"
                    style={{
                      fontSize: 12,
                      color: "#ef4444",
                      margin: "4px 0 0",
                    }}
                  >
                    {errors.password}
                  </p>
                )}
              </div>

              
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 6,
                    color: "#374151",
                  }}
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={registerForm.confirmPassword}
                  onChange={(e) =>
                    setRegisterForm({
                      ...registerForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  autoComplete="new-password"
                  aria-label="Confirm Password"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: errors.confirmPassword
                      ? "1px solid #ef4444"
                      : "1px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                    background: "#fdf6ef",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
                {errors.confirmPassword && (
                  <p
                    role="alert"
                    style={{
                      fontSize: 12,
                      color: "#ef4444",
                      margin: "4px 0 0",
                    }}
                  >
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              
              <button
                type="submit"
                disabled={loading}
                aria-label="Create Account"
                style={{
                  width: "100%",
                  padding: "12px",
                  background: loading ? "#fdba74" : "#FF5A36",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  marginTop: 4,
                }}
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>
          )}

          </div>
        </div>

      </div>
      </div>
    </>
  );
}
