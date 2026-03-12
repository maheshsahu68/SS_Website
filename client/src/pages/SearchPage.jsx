import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, AlertCircle, Clock, ChevronRight, FileText } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const formatClock = (seconds = 0) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export default function SearchPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [media, setMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("all");

  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Load history for selector
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/audio/history", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        setMedia((data.items || []).filter((i) => i.status === "ready"));
      } catch { /* silent */ }
      finally { setMediaLoading(false); }
    };
    load();
  }, [token]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearchLoading(true); setSearchError(""); setMatches([]); setHasSearched(true);
    try {
      if (selectedId === "all") {
        // Search across all ready media sequentially and combine
        const results = [];
        for (const item of media) {
          try {
            const res = await fetch(`http://localhost:5000/api/audio/${item._id}/search`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query }),
            });
            const data = await res.json();
            if (data.matches?.length) {
              results.push(...data.matches.map((m) => ({ ...m, mediaId: item._id, mediaName: item.originalName || item.filename })));
            }
          } catch { /* skip */ }
        }
        setMatches(results);
      } else {
        const res = await fetch(`http://localhost:5000/api/audio/${selectedId}/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const data = await res.json();
        const selected = media.find((m) => m._id === selectedId);
        setMatches((data.matches || []).map((m) => ({ ...m, mediaId: selectedId, mediaName: selected?.originalName || selected?.filename })));
      }
    } catch { setSearchError("Search failed. Check your connection."); }
    finally { setSearchLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Search Transcripts</h1>
        <p className="text-slate-500 mt-2">Search for words or phrases across your transcripts with timestamp links.</p>
      </div>

      <div className="bg-[#0e1628] border border-white/8 rounded-2xl p-6 mb-6">
        {/* Media selector */}
        <div className="mb-4">
          <label className="text-xs uppercase tracking-widest text-slate-500 font-semibold block mb-2">Search in</label>
          {mediaLoading ? (
            <div className="text-sm text-slate-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>
          ) : (
            <select
              className="w-full bg-[#070d1a] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
              value={selectedId}
              onChange={(e) => { setSelectedId(e.target.value); setMatches([]); setHasSearched(false); }}
            >
              <option value="all">All transcripts ({media.length})</option>
              {media.map((item) => (
                <option key={item._id} value={item._id}>{item.originalName || item.filename}</option>
              ))}
            </select>
          )}
        </div>

        {/* Search input */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="w-full bg-[#070d1a] border border-white/8 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
              placeholder="Search for a word or phrase…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searchLoading || !query.trim() || media.length === 0}
            className="px-6 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-lg shadow-violet-500/20 flex items-center gap-2 cursor-pointer"
          >
            {searchLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            Search
          </button>
        </div>
      </div>

      {/* Results */}
      {searchError && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-5 py-4 text-rose-400 text-sm mb-4">
          <AlertCircle size={16} /> {searchError}
        </div>
      )}

      {hasSearched && !searchLoading && matches.length === 0 && !searchError && (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
            <Search size={24} className="text-slate-600" />
          </div>
          <p className="text-slate-400 font-medium">No matches found</p>
          <p className="text-sm">Try a different word or phrase.</p>
        </div>
      )}

      {matches.length > 0 && (
        <div>
          <p className="text-sm text-slate-500 mb-4">
            Found <span className="text-violet-400 font-semibold">{matches.length}</span> match{matches.length !== 1 ? "es" : ""}
          </p>
          <div className="grid gap-3">
            {matches.map((m, i) => (
              <button
                key={`${m.mediaId}-${m.start}-${i}`}
                onClick={() => navigate(`/transcription/${m.mediaId}`)}
                className="w-full text-left bg-[#0e1628] border border-white/6 rounded-2xl px-5 py-4 hover:border-violet-500/30 hover:bg-[#111e35] transition-all group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 font-medium truncate mb-1">{m.mediaName}</p>
                    <p className="text-sm text-slate-200">{m.text || m.context}</p>
                    {m.context && m.text && <p className="text-xs text-slate-500 mt-1 italic">{m.context}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-violet-400 flex-shrink-0">
                    <Clock size={11} /> {formatClock(m.start)}
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-violet-400 transition-colors ml-1" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
