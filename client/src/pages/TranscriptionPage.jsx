import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader2, AlertCircle, CheckCircle2, Clock, Search, ChevronLeft,
  Volume2, Video, AudioLines, AlertTriangle, Eye, EyeOff
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const formatClock = (seconds = 0) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.round((safe - Math.floor(safe)) * 1000).toString().padStart(3, "0");
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`;
};

const StatusBadge = ({ status }) => {
  const map = {
    ready: { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: <CheckCircle2 size={12} /> },
    processing: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/20", icon: <Loader2 size={12} className="animate-spin" /> },
    failed: { cls: "bg-rose-500/15 text-rose-400 border-rose-500/20", icon: <AlertCircle size={12} /> },
  };
  const s = map[status] || { cls: "bg-slate-500/15 text-slate-400 border-slate-500/20", icon: null };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${s.cls}`}>
      {s.icon} {status}
    </span>
  );
};

export default function TranscriptionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWords, setShowWords] = useState(false);

  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [matchedStarts, setMatchedStarts] = useState(new Set());

  const playerRef = useRef(null);
  const pollRef = useRef(null);
  const hasShownSensitivePromptRef = useRef(false);

  const loadMedia = async (mediaId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/audio/${mediaId}`);
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to load"); return; }
      setMedia(data);
      if (data.status === "ready" || data.status === "failed") {
        clearInterval(pollRef.current); pollRef.current = null;
      }
    } catch { setError("Failed to load media."); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    hasShownSensitivePromptRef.current = false;
    setLoading(true); setMedia(null); setError(""); setMatches([]); setMatchedStarts(new Set());
    loadMedia(id);
  }, [id]);

  // Poll while processing
  useEffect(() => {
    if (!id || !media || media.status === "ready" || media.status === "failed") return;
    pollRef.current = setInterval(() => loadMedia(id), 2500);
    return () => clearInterval(pollRef.current);
  }, [id, media?.status]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const handleSearch = async () => {
    if (!query.trim() || !media?._id) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/audio/${media._id}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      const found = data.matches || [];
      setMatches(found);
      setMatchedStarts(new Set(found.map((m) => Number(m.start).toFixed(3))));
    } catch { /* silent */ }
    finally { setSearchLoading(false); }
  };

  const onSeek = (time) => {
    if (!playerRef.current) return;
    playerRef.current.currentTime = Math.max(0, Number(time));
    playerRef.current.play().catch(() => {});
  };

  const onTimeUpdate = () => {
    const p = playerRef.current;
    if (!p || !media?.sensitive?.length || hasShownSensitivePromptRef.current) return;
    for (const s of media.sensitive) {
      const preStop = Math.max(0, Number(s.start) - 0.35);
      if (p.currentTime >= preStop && p.currentTime < s.end + 0.15) {
        hasShownSensitivePromptRef.current = true;
        p.pause();
        if (window.confirm("Sensitive content detected. Continue playback?")) {
          p.play().catch(() => {});
        } else {
          p.currentTime = s.end + 0.1;
        }
        break;
      }
    }
  };

  // Always derive playback URL from filename — media.path is an absolute disk path from multer
  const src = media?.filename ? `http://localhost:5000/uploads/${media.filename}` : null;
  const isAudio = media?.mimeType?.startsWith("audio");
  const words = media?.transcript?.words || [];

  if (!id) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center gap-4 text-slate-500">
        <AudioLines size={40} className="text-slate-600" />
        <p className="text-slate-400 font-medium">No media selected</p>
        <button onClick={() => navigate("/history")} className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors cursor-pointer">
          Browse History
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-400 transition-colors mb-8 cursor-pointer">
        <ChevronLeft size={16} /> Back
      </button>

      {loading && (
        <div className="flex flex-col items-center gap-4 py-24 text-slate-500">
          <Loader2 size={32} className="animate-spin text-violet-500" />
          <p>Loading transcript…</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-5 py-4 text-rose-400">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {media && !loading && (
        <div className="flex flex-col gap-6">
          {/* Header card */}
          <div className="bg-[#0e1628] border border-white/8 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center flex-shrink-0">
                {isAudio ? <Volume2 size={22} className="text-violet-400" /> : <Video size={22} className="text-violet-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-slate-100 truncate">{media.originalName || media.filename}</h1>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <StatusBadge status={media.status} />
                  {media.status === "processing" && (
                    <span className="text-xs text-amber-400/80">Generating transcript with Whisper…</span>
                  )}
                </div>
              </div>
            </div>

            {/* Media player */}
            {src && (
              <div className="mt-5">
                {isAudio ? (
                  <audio ref={playerRef} controls src={src} onTimeUpdate={onTimeUpdate} className="w-full rounded-xl" />
                ) : (
                  <video ref={playerRef} controls src={src} onTimeUpdate={onTimeUpdate} className="w-full rounded-xl max-h-80" />
                )}
              </div>
            )}
          </div>

          {/* Sensitive content warning */}
          {media.sensitive?.length > 0 && (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-4 text-amber-400 text-sm">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">⚠ Sensitive content detected</p>
              </div>
            </div>
          )}

          {/* Search */}
          {media.status === "ready" && (
            <div className="bg-[#0e1628] border border-white/8 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><Search size={15} /> Search Transcript</h2>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    className="w-full bg-[#070d1a] border border-white/8 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                    placeholder="Search for a word or phrase…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searchLoading || !query.trim()}
                  className="px-5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {searchLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Find
                </button>
              </div>

              {/* Match results */}
              {matches.length > 0 && (
                <div className="mt-4 grid gap-2">
                  <p className="text-xs text-slate-500 mb-1"><span className="text-violet-400 font-semibold">{matches.length}</span> match{matches.length !== 1 ? "es" : ""}</p>
                  {matches.map((m, i) => (
                    <button
                      key={`${m.start}-${i}`}
                      onClick={() => onSeek(m.start)}
                      className="w-full text-left flex items-start gap-3 bg-violet-500/5 border border-violet-500/15 rounded-xl px-4 py-3 hover:bg-violet-500/10 transition-colors cursor-pointer"
                    >
                      <span className="font-mono text-xs text-violet-400 flex-shrink-0 mt-0.5 flex items-center gap-1">
                        <Clock size={11} /> {formatClock(m.start)}
                      </span>
                      <span className="text-sm text-slate-300">{m.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Transcript words */}
          {media.status === "ready" && words.length > 0 && (
            <div className="bg-[#0e1628] border border-white/8 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-300">Transcript</h2>
                <button
                  onClick={() => setShowWords((p) => !p)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-400 transition-colors cursor-pointer"
                >
                  {showWords ? <EyeOff size={13} /> : <Eye size={13} />}
                  {showWords ? "Hide" : "Show"}
                </button>
              </div>
              {showWords && (
                <div className="leading-8 text-slate-300 text-sm">
                  {words.map((w, i) => {
                    const isMatch = matchedStarts.has(Number(w.start).toFixed(3));
                    return (
                      <button
                        key={`${w.start}-${i}`}
                        type="button"
                        onClick={() => onSeek(w.start)}
                        title={formatClock(w.start)}
                        className={`inline cursor-pointer rounded px-0.5 transition-colors hover:bg-violet-500/20 hover:text-violet-300 ${
                          isMatch ? "bg-violet-500/25 text-violet-300 font-semibold" : ""
                        }`}
                      >
                        {w.word}{" "}
                      </button>
                    );
                  })}
                </div>
              )}
              {!showWords && <p className="text-sm text-slate-500">Click "Show" to reveal the transcript.</p>}
            </div>
          )}

          {media.status === "failed" && (
            <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-5 py-4 text-rose-400 text-sm">
              <AlertCircle size={16} /> Processing failed{media.error ? `: ${media.error}` : ""}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
