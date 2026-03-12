import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AudioWaveform, Eye, EyeOff, Mail, Lock, User, Chrome } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_BASE = "http://localhost:5000/api/auth";
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "309276754683-5oaskor4cp6hs8i0o2so994a7al78vc3.apps.googleusercontent.com";

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (user) navigate("/upload", { replace: true });
  }, [user, navigate]);

  const persistAuth = useCallback(
    (payload) => { login(payload); navigate("/upload", { replace: true }); },
    [login, navigate]
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
      if (!res.ok) { setMessage(data.message || "Authentication failed"); return; }
      persistAuth(data);
    } catch {
      setMessage("Authentication request failed.");
    } finally {
      setLoading(false);
    }
  };

  const continueAsGuest = () =>
    persistAuth({ token: null, user: { id: "guest", name: "Guest", email: "guest@local", provider: "guest" } });

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
            if (!res.ok) { setMessage(data.message || "Google sign-in failed"); return; }
            persistAuth(data);
          } catch { setMessage("Google sign-in failed."); }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, { theme: "outline", size: "large", width: 280 });
    };
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true; script.defer = true; script.onload = initGoogle;
    document.body.appendChild(script);
    return () => { if (script.parentNode) script.parentNode.removeChild(script); };
  }, [persistAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#070d1a] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-violet-700/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[15%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 shadow-2xl shadow-violet-500/30 mb-4">
            <AudioWaveform size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Welcome to SonicSearch</h1>
          <p className="text-sm text-slate-500 mt-1">AI-powered transcription &amp; search</p>
        </div>

        <div className="bg-[#0e1628] border border-white/8 rounded-2xl shadow-2xl p-8">
          {/* Tabs */}
          <div className="flex bg-[#070d1a] rounded-xl p-1 mb-6">
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setMessage(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  mode === m
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3.5">
            {mode === "register" && (
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="w-full bg-[#070d1a] border border-white/8 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="w-full bg-[#070d1a] border border-white/8 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="w-full bg-[#070d1a] border border-white/8 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="Password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <button
              type="button"
              onClick={submitLocalAuth}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20 cursor-pointer mt-1"
            >
              {loading ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-white/6" />
              <span className="text-xs text-slate-600">OR</span>
              <div className="flex-1 h-px bg-white/6" />
            </div>

            {GOOGLE_CLIENT_ID ? (
              <div ref={googleBtnRef} className="flex justify-center min-h-[44px]" />
            ) : (
              <p className="text-xs text-slate-500 text-center">
                Set <code className="text-violet-400">VITE_GOOGLE_CLIENT_ID</code> to enable Google sign-in.
              </p>
            )}

            <button
              type="button"
              onClick={continueAsGuest}
              className="w-full py-2.5 rounded-xl border border-white/8 text-slate-400 text-sm font-medium hover:bg-white/5 hover:text-slate-200 transition-all cursor-pointer"
            >
              Continue as Guest
            </button>

            {message && (
              <p className="text-sm text-center text-rose-400 bg-rose-400/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
