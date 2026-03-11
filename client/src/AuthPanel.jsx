import { useCallback, useEffect, useRef, useState } from "react";
import "./css/AuthPanel.css";

const API_BASE = "http://localhost:5000/api/auth";
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "309276754683-5oaskor4cp6hs8i0o2so994a7al78vc3.apps.googleusercontent.com";

function AuthPanel({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const googleBtnRef = useRef(null);

  const persistAuth = useCallback(
    (payload) => {
      localStorage.setItem("ss_auth", JSON.stringify(payload));
      onAuthenticated(payload);
    },
    [onAuthenticated]
  );

  const submitLocalAuth = async () => {
    setMessage("");
    if (!email || !password || (mode === "register" && !name.trim())) {
      setMessage("Please fill all required fields.");
      return;
    }

    try {
      setLoading(true);
      const endpoint = mode === "register" ? "register" : "login";
      const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "Authentication failed");
        return;
      }
      persistAuth(data);
    } catch (error) {
      console.error(error);
      setMessage("Authentication request failed.");
    } finally {
      setLoading(false);
    }
  };

  const continueAsGuest = () => {
    persistAuth({
      token: null,
      user: {
        id: "guest",
        name: "Guest",
        email: "guest@local",
        provider: "guest",
      },
    });
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id) {
        setMessage("Google SDK did not load. Check internet access and reload.");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          try {
            const res = await fetch(`${API_BASE}/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential }),
            });
            const data = await res.json();
            if (!res.ok) {
              setMessage(data.message || "Google sign-in failed");
              return;
            }
            persistAuth(data);
          } catch (error) {
            console.error(error);
            setMessage("Google sign-in failed.");
          }
        },
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 260,
      });
    };

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [persistAuth]);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h2>Welcome to SonicSearch</h2>
        <p>Login/register, use Google Sign-In, or continue as guest.</p>

        <div className="tab-row">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
            Login
          </button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">
            Register
          </button>
        </div>

        {mode === "register" && (
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        )}

        <input
          placeholder="Email"
          value={email}
          type="email"
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <input
          placeholder="Password"
          value={password}
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
        />

        <button className="auth-primary" type="button" onClick={submitLocalAuth} disabled={loading}>
          {loading ? "Please wait..." : mode === "register" ? "Create account" : "Login"}
        </button>

        <button className="auth-guest" type="button" onClick={continueAsGuest}>
          Continue as Guest
        </button>

        <div className="divider">OR</div>

        {GOOGLE_CLIENT_ID ? (
          <div ref={googleBtnRef} className="google-slot" />
        ) : (
          <p className="google-hint">
            To enable Google sign-in, set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>client/.env</code> and
            <code> GOOGLE_CLIENT_ID</code> in <code>server/.env</code> to the same value, then restart both apps.
          </p>
        )}

        {message && <p className="auth-message">{message}</p>}
      </div>
    </div>
  );
}

export default AuthPanel;
