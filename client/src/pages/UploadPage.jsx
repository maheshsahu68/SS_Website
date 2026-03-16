import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Link2, Music, Video, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const formatBytes = (bytes) => {
  if (!bytes) return "";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

export default function UploadPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("file"); // "file" | "link"
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null); // { type: "success"|"error", text }
  const inputRef = useRef(null);

  const handleFile = (f) => { setFile(f); setMsg(null); };
  const clearFile = () => { setFile(null); setMsg(null); if (inputRef.current) inputRef.current.value = ""; };

  const handleUpload = async () => {
    if (!file) { setMsg({ type: "error", text: "Please select an audio or video file." }); return; }
    const formData = new FormData();
    formData.append("audio", file);
    try {
      setLoading(true); setMsg(null);
      const res = await fetch("http://localhost:5000/api/audio/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: "error", text: data.message || "Upload failed" }); return; }
      setMsg({ type: "success", text: data.message || "Uploaded! Transcription is processing…" });
      if (data.mediaId) setTimeout(() => navigate(`/transcription/${data.mediaId}`), 1200);
    } catch { setMsg({ type: "error", text: "Upload failed. Check your connection." }); }
    finally { setLoading(false); }
  };

  const handleProcessLink = async () => {
    if (!linkUrl.trim()) { setMsg({ type: "error", text: "Paste a YouTube or media link." }); return; }
    try {
      setLoading(true); setMsg(null);
      const res = await fetch("http://localhost:5000/api/audio/process-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ url: linkUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: "error", text: data.message || "Failed to process link" }); return; }
      setMsg({ type: "success", text: data.message || "Processing started!" });
      if (data.mediaId) setTimeout(() => navigate(`/transcription/${data.mediaId}`), 1200);
    } catch { setMsg({ type: "error", text: "Link processing failed." }); }
    finally { setLoading(false); }
  };

  const isAudio = file?.type?.startsWith("audio");
  const isVideo = file?.type?.startsWith("video");

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Page heading */}
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Upload Media</h1>
        <p className="text-slate-500 mt-2">Upload an audio/video file or paste a YouTube link to generate a transcript.</p>
      </div>

      {/* Tabs */}
      <div className="bg-[#0e1628] border border-white/8 rounded-2xl p-5">
        <div className="flex bg-[#070d1a] rounded-xl p-1 mb-6">
          {[
            { id: "file", label: "File Upload", icon: Upload },
            { id: "link", label: "YouTube / Link", icon: Link2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setMsg(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                tab === id ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {tab === "file" && (
          <div className="flex flex-col gap-4">
            {/* Dropzone */}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                dragging
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-white/10 hover:border-violet-500/50 hover:bg-white/2"
              }`}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept="audio/*,video/*" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              <div className="flex flex-col items-center gap-3 pointer-events-none">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  {isAudio ? <Music size={28} className="text-violet-400" />
                   : isVideo ? <Video size={28} className="text-violet-400" />
                   : <Upload size={28} className="text-violet-400" />}
                </div>
                <div>
                  <p className="text-slate-200 font-semibold">Drop your file here</p>
                  <p className="text-sm text-slate-500 mt-0.5">or click to browse — audio &amp; video supported</p>
                </div>
              </div>
            </div>

            {/* File meta */}
            {file && (
              <div className="flex items-center justify-between bg-[#070d1a] border border-white/8 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                    {isAudio ? <Music size={16} className="text-violet-400" /> : <Video size={16} className="text-violet-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <button onClick={clearFile} className="ml-3 text-slate-500 hover:text-rose-400 transition-colors flex-shrink-0 cursor-pointer">
                  <X size={18} />
                </button>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : <><Upload size={16} /> Upload &amp; Transcribe</>}
            </button>
          </div>
        )}

        {tab === "link" && (
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Link2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="w-full bg-[#070d1a] border border-white/8 rounded-xl pl-11 pr-4 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="https://youtube.com/watch?v=..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </div>
            <button
              onClick={handleProcessLink}
              disabled={loading || !linkUrl.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : <><Link2 size={16} /> Process Link</>}
            </button>
          </div>
        )}

        {/* Message */}
        {msg && (
          <div className={`mt-4 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ${
            msg.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
          }`}>
            {msg.type === "success" ? <CheckCircle size={16} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />}
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}
