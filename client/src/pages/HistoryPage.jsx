import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { History, FileText, Youtube, HardDrive, Clock, ChevronRight, Loader2, AlertCircle, Upload, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const formatBytes = (bytes) => {
  if (!bytes) return "";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const StatusBadge = ({ status }) => {
  const styles = {
    ready: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    processing: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    failed: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${styles[status] || "bg-slate-500/15 text-slate-400 border-slate-500/20"}`}>
      {status}
    </span>
  );
};

export default function HistoryPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setLoading(true); setError("");
        const res = await fetch("http://localhost:5000/api/audio/history", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) { setError(data.message || "Failed to load history"); return; }
        setActivity(data.items || []);
      } catch { setError("Failed to load history. Check your connection."); }
      finally { setLoading(false); }
    };
    fetchActivity();
  }, [token]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this transcript? This cannot be undone.")) return;
    try {
      setDeletingId(id);
      const res = await fetch(`http://localhost:5000/api/audio/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActivity((prev) => prev.filter((item) => item._id !== id));
      }
    } catch { /* silent */ }
    finally { setDeletingId(null); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Transcript History</h1>
          <p className="text-slate-500 mt-2">All your processed audio &amp; video files.</p>
        </div>
        <button
          onClick={() => navigate("/upload")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-violet-500/20 cursor-pointer"
        >
          <Upload size={15} /> New Upload
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-4 py-24 text-slate-500">
          <Loader2 size={32} className="animate-spin text-violet-500" />
          <p>Loading history…</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-5 py-4 text-rose-400">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {!loading && !error && activity.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-24 text-slate-500">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <History size={28} className="text-slate-600" />
          </div>
          <div className="text-center">
            <p className="text-slate-400 font-medium">No transcripts yet</p>
            <p className="text-sm mt-1">Upload a file or process a link to get started.</p>
          </div>
          <button
            onClick={() => navigate("/upload")}
            className="mt-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Upload now
          </button>
        </div>
      )}

      {!loading && !error && activity.length > 0 && (
        <div className="grid gap-3">
          {activity.map((item) => {
            const isYoutube = item.source === "youtube" || item.source === "link";
            return (
              <div key={item._id} className="relative group">
              <button
                onClick={() => navigate(`/transcription/${item._id}`)}
                className="w-full text-left bg-[#0e1628] border border-white/6 rounded-2xl p-5 hover:border-violet-500/30 hover:bg-[#111e35] transition-all group cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/20 transition-colors">
                    {isYoutube ? <Youtube size={20} className="text-violet-400" /> : <HardDrive size={20} className="text-violet-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-semibold text-slate-200 truncate">
                        {item.originalName || item.filename}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-slate-500 capitalize">
                        <HardDrive size={11} /> {item.source}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={11} /> {new Date(item.uploadedAt).toLocaleString()}
                      </span>
                      {item.size && (
                        <span className="text-xs text-slate-600">{formatBytes(item.size)}</span>
                      )}
                    </div>
                    {(item.summary || item?.transcript?.fullText) && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                        {(item.summary || item.transcript.fullText).slice(0, 140)}…
                      </p>
                    )}
                  </div>

                  <ChevronRight size={18} className="text-slate-600 group-hover:text-violet-400 transition-colors flex-shrink-0 mt-0.5" />
                </div>
              </button>
              <button
                onClick={(e) => handleDelete(e, item._id)}
                disabled={deletingId === item._id}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100 disabled:opacity-50 z-10"
                title="Delete"
                aria-label="Delete transcript"
              >
                {deletingId === item._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
