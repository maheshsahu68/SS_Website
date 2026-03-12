import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AudioWaveform, Upload, History, Search, FileText, Sparkles, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/history", label: "History", icon: History },
  { to: "/search", label: "Search", icon: Search },
  { to: "/transcription", label: "Transcription", icon: FileText },
  { to: "/summary", label: "AI Summary", icon: Sparkles },
];

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setUserMenuOpen(false);
    setMenuOpen(false);
  };

  const initial = (user?.name || user?.email || "U").trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-[#070d1a]/80 backdrop-blur-xl border-b border-violet-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">

        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 flex-shrink-0 group" onClick={() => setMenuOpen(false)}>
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 text-white shadow-lg shadow-violet-500/20">
            <AudioWaveform size={20} />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-slate-100">
            Sonic<span className="text-violet-400">Search</span>
          </span>
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1" aria-label="Main navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "text-violet-300 bg-violet-500/15 font-semibold"
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-3 ml-auto">
          {user && (
            <div className="relative">
              <button
                className="w-9 h-9 rounded-full border-2 border-violet-500/40 overflow-hidden flex items-center justify-center bg-gradient-to-br from-indigo-900 to-violet-900 text-white font-bold text-sm hover:border-violet-400 transition-all cursor-pointer"
                onClick={() => setUserMenuOpen((p) => !p)}
                aria-label="User menu"
                title={user.name || user.email}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute top-[calc(100%+10px)] right-0 w-60 bg-[#111827] border border-violet-900/30 rounded-2xl shadow-2xl shadow-black/60 p-4 z-50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center font-bold text-lg text-white flex-shrink-0 overflow-hidden">
                        {user.avatar ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" /> : initial}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-100">{user.name || "User"}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[140px]">{user.email}</div>
                        <div className="text-xs text-slate-600 capitalize">{user.provider}</div>
                      </div>
                    </div>
                    <div className="h-px bg-white/5 my-2" />
                    <button
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      onClick={handleLogout}
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Hamburger */}
          <button
            className="md:hidden text-slate-400 hover:text-slate-100 transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
            onClick={() => setMenuOpen((p) => !p)}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="md:hidden border-t border-violet-900/20 px-4 py-3 flex flex-col gap-1 bg-[#070d1a]/95" aria-label="Mobile navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? "bg-violet-500/15 text-violet-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                }`
              }
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={17} /> {label}
            </NavLink>
          ))}
          {user && (
            <button
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors mt-2 cursor-pointer w-full text-left"
              onClick={handleLogout}
            >
              <LogOut size={16} /> Sign out
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
