import { NavLink } from "react-router-dom";
import { AudioWaveform, Github, Twitter } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-violet-900/20 bg-[#070d1a] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col md:flex-row gap-8 justify-between">
          {/* Brand */}
          <div className="flex flex-col gap-3 max-w-xs">
            <NavLink to="/" className="flex items-center gap-2.5 w-fit">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 text-white">
                <AudioWaveform size={17} />
              </span>
              <span className="text-base font-extrabold text-slate-100">
                Sonic<span className="text-violet-400">Search</span>
              </span>
            </NavLink>
            <p className="text-sm text-slate-500 leading-relaxed">
              AI-powered audio &amp; video transcription with semantic search and instant summaries.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">Features</h4>
            {[
              { to: "/upload", label: "Upload Media" },
              { to: "/history", label: "Transcript History" },
              { to: "/search", label: "Semantic Search" },
              { to: "/transcription", label: "Transcription" },
              { to: "/summary", label: "AI Summary" },
            ].map(({ to, label }) => (
              <NavLink key={to} to={to} className="text-sm text-slate-500 hover:text-violet-400 transition-colors w-fit">
                {label}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-600">© {year} SonicSearch. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub"
              className="text-slate-600 hover:text-violet-400 transition-colors">
              <Github size={16} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter"
              className="text-slate-600 hover:text-violet-400 transition-colors">
              <Twitter size={16} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
