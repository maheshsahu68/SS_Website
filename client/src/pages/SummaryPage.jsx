import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sparkles, Loader2, AlertCircle, ChevronLeft, ChevronRight, FileText, Wand2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function SummaryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [media, setMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(id || "");

  const [summary, setSummary] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Load ready history
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/audio/history", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        const items = (data.items || []).filter((i) => i.status === "ready");
        setMedia(items);
        if (!selectedId && items.length) setSelectedId(items[0]._id);
      } catch { /* silent */ }
      finally { setMediaLoading(false); }
    };
    load();
  }, [token]);

  // Load existing summary when selection changes
  useEffect(() => {
    if (!selectedId) return;
    const item = media.find((m) => m._id === selectedId);
    setSummary(item?.summary || "");
    setError("");
  }, [selectedId, media]);

  const generateSummary = async () => {
    if (!selectedId) return;
    setGenerating(true); setError("");
    try {
      const res = await fetch(`http://localhost:5000/api/audio/${selectedId}/summary`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to generate summary"); return; }
      if (data.summary) {
        setSummary(data.summary);
        setMedia((prev) => prev.map((m) => m._id === selectedId ? { ...m, summary: data.summary } : m));
      } else {
        setError("No summary returned from the server.");
      }
    } catch { setError("Failed to generate summary. Check your connection."); }
    finally { setGenerating(false); }
  };

  const selectedItem = media.find((m) => m._id === selectedId);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </span>
          AI Summary
        </h1>
        <p className="text-slate-500 mt-2">Generate an AI-powered summary of any transcribed media.</p>
      </div>

      {/* Selector */}
      <div className="bg-[#0e1628] border border-white/8 rounded-2xl p-6 mb-6">
        <label className="text-xs uppercase tracking-widest text-slate-500 font-semibold block mb-3">Select transcript</label>
        {mediaLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> Loading…</div>
        ) : media.length === 0 ? (
          <div className="text-sm text-slate-500">
            No ready transcripts found.{" "}
            <button onClick={() => navigate("/upload")} className="text-violet-400 hover:underline cursor-pointer">Upload one</button>.
          </div>
        ) : (
          <div className="grid gap-2">
            {media.map((item) => (
              <button
                key={item._id}
                onClick={() => setSelectedId(item._id)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                  item._id === selectedId
                    ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                    : "border-white/6 hover:border-violet-500/25 hover:bg-white/3 text-slate-400"
                }`}
              >
                <FileText size={15} className="flex-shrink-0" />
                <span className="text-sm font-medium truncate">{item.originalName || item.filename}</span>
                {item.summary && (
                  <span className="ml-auto text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                    Summary ready
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary area */}
      {selectedItem && (
        <div className="bg-[#0e1628] border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-300 truncate max-w-xs">{selectedItem.originalName || selectedItem.filename}</h2>
              <p className="text-xs text-slate-500 mt-0.5">AI-generated summary</p>
            </div>
            <button
              onClick={generateSummary}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/20 cursor-pointer"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              {generating ? "Generating…" : summary ? "Regenerate" : "Generate Summary"}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm mb-4">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {!summary && !generating && !error && (
            <div className="flex flex-col items-center gap-4 py-12 text-slate-500">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
                <Wand2 size={24} className="text-violet-400" />
              </div>
              <div className="text-center">
                <p className="text-slate-400 font-medium">No summary yet</p>
                <p className="text-sm mt-1">Click "Generate Summary" to create an AI summary.</p>
              </div>
            </div>
          )}

          {generating && (
            <div className="flex flex-col items-center gap-4 py-12 text-slate-500">
              <Loader2 size={28} className="animate-spin text-violet-500" />
              <p className="text-sm">AI is summarizing your transcript…</p>
            </div>
          )}

          {summary && !generating && (
            <div className="bg-[#070d1a] border border-white/6 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-violet-400" />
                <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">AI Summary</span>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
            </div>
          )}

          {/* Navigate to full transcript */}
          <div className="mt-5 pt-5 border-t border-white/5 flex justify-end">
            <button
              onClick={() => navigate(`/transcription/${selectedItem._id}`)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-violet-400 transition-colors cursor-pointer"
            >
              View full transcript <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
