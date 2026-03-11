import { useState, useRef, useEffect } from "react";
import "./css/MediaUpload.css";
import TranscriptViewer from "./TranscriptViewer";

const LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto detect" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
];

function MediaUpload({ authToken, selectedMediaId, onActivityChanged }) {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [media, setMedia] = useState(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [language, setLanguage] = useState("auto");
  const [triggeredSensitive, setTriggeredSensitive] = useState(new Set());
  const [showTranscript, setShowTranscript] = useState(false);
  const [quickQuery, setQuickQuery] = useState("");
  const [quickMatches, setQuickMatches] = useState([]);
  const [quickSearchLoading, setQuickSearchLoading] = useState(false);
  const inputRef = useRef(null);
  const playerRef = useRef(null);
  const pollRef = useRef(null);

  const formatBytes = (bytes) => {
    if (!bytes) return "";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleFile = (f) => {
    setFile(f);
    setMsg("");
    setUploadedFile(null);
    setMedia(null);
    setShowTranscript(false);
    setQuickQuery("");
    setQuickMatches([]);
  };

  const startPolling = (id) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/audio/${id}`);
        const data = await res.json();
        setMedia(data);
        if (data.status === "ready" || data.status === "failed") {
          clearInterval(pollRef.current);
          pollRef.current = null;
          onActivityChanged && onActivityChanged();
        }
      } catch (err) {
        console.error(err);
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    const loadSelectedMedia = async () => {
      if (!selectedMediaId) return;
      try {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setLoading(true);
        const res = await fetch(`http://localhost:5000/api/audio/${selectedMediaId}`);
        const data = await res.json();
        if (!res.ok) {
          setMsg(data.message || "Failed to load selected activity");
          return;
        }
        setMedia(data);
        setUploadedFile(null);
        setFile(null);
        setQuickQuery("");
        setQuickMatches([]);
        setShowTranscript(data.status === "ready");
      } catch (error) {
        console.error(error);
        setMsg("Failed to load selected activity");
      } finally {
        setLoading(false);
      }
    };

    loadSelectedMedia();
  }, [selectedMediaId]);

  const handleUpload = async () => {
    if (!file) {
      alert("Please select audio or video");
      return;
    }

    const formData = new FormData();
    formData.append("audio", file);
    formData.append("language", language);

    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/audio/upload", {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        body: formData,
      });

      const data = await res.json();
      setMsg(res.ok ? data.message : `${data.message}: ${data.error || "Unknown error"}`);
      setUploadedFile(data.file);
      if (data.mediaId) {
        setShowTranscript(false);
        setQuickMatches([]);
        startPolling(data.mediaId);
        onActivityChanged && onActivityChanged();
      }
    } catch (err) {
      console.error(err);
      setMsg("Upload failed ❌");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessLink = async () => {
    if (!linkUrl.trim()) return alert("Paste a media link (YouTube supported)");
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/audio/process-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ url: linkUrl, language }),
      });
      const data = await res.json();
      setMsg(res.ok ? data.message : `${data.message}: ${data.error || "Unknown error"}`);
      if (data.mediaId) {
        setShowTranscript(false);
        setQuickMatches([]);
        startPolling(data.mediaId);
        onActivityChanged && onActivityChanged();
      }
    } catch (err) {
      console.error(err);
      setMsg("Link processing failed");
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploadedFile(null);
    setMsg("");
    setMedia(null);
    setTriggeredSensitive(new Set());
    setShowTranscript(false);
    setQuickQuery("");
    setQuickMatches([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const formatClock = (seconds = 0) => {
    const safe = Math.max(0, Number(seconds) || 0);
    const mins = Math.floor(safe / 60);
    const secs = Math.floor(safe % 60);
    const ms = Math.round((safe - Math.floor(safe)) * 1000)
      .toString()
      .padStart(3, "0");
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`;
  };

  const handleQuickSearch = async () => {
    if (!media?._id || !quickQuery.trim()) return;
    setQuickSearchLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/audio/${media._id}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: quickQuery }),
      });
      const data = await res.json();
      setQuickMatches(data.matches || []);
    } catch (error) {
      console.error(error);
      setQuickMatches([]);
    } finally {
      setQuickSearchLoading(false);
    }
  };
  const onSeek = (time) => {
    if (!playerRef.current) return;
    playerRef.current.currentTime = Math.max(0, Number(time));
    playerRef.current.play().catch(() => {});
  };

  const onTimeUpdate = () => {
    const p = playerRef.current;
    if (!p || !media?.sensitive || !media.sensitive.length) return;

    for (const s of media.sensitive) {
      const key = `${s.word}@${s.start}`;
      if (triggeredSensitive.has(key)) continue;

      const preStop = Math.max(0, Number(s.start) - 0.35);
      if (p.currentTime >= preStop && p.currentTime < s.end + 0.15) {
        p.pause();
        setTriggeredSensitive((prev) => new Set(prev).add(key));
        const confirmed = window.confirm(
          `Sensitive data detected ("${s.word}") near ${s.start.toFixed(2)}s. Do you want to continue listening?`
        );
        if (confirmed) {
          p.play().catch(() => {});
        } else {
          p.currentTime = s.end + 0.1;
        }
        break;
      }
    }
  };

  const renderPreview = () => {
    const src = uploadedFile
      ? `http://localhost:5000/uploads/${uploadedFile.filename}`
      : media?.path
      ? `http://localhost:5000/${media.path.replace(/^\\/, "")}`
      : null;

    const mimetype = uploadedFile ? uploadedFile.mimetype : file?.type || media?.mimeType;

    if (!src) return null;

    if (mimetype?.startsWith("audio")) {
      return <audio ref={playerRef} controls src={src} onTimeUpdate={onTimeUpdate} />;
    }

    if (mimetype?.startsWith("video")) {
      return <video ref={playerRef} controls src={src} onTimeUpdate={onTimeUpdate} />;
    }

    return null;
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <header className="header-block">
          <h2 className="brand">🎵 SonicSearch</h2>
          <p className="subtitle">
            Accurate transcript search, better timestamp jumps, and multilingual support (including Hindi).
          </p>
        </header>

        <div className="controls-grid">
          <label>
            Transcription language
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <small>
            Tip: For Hindi, use a multilingual Whisper model (not <code>*.en</code> models).
          </small>
        </div>

        <div
          className={`dropzone ${dragging ? "dragging" : ""}`}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const dropped = e.dataTransfer.files && e.dataTransfer.files[0];
            if (dropped) handleFile(dropped);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current && inputRef.current.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,video/*"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            style={{ display: "none" }}
          />
          <div className="drop-inner">
            <div className="big-label">Choose or drop media file</div>
            <div className="small-label">Audio, video and YouTube links are supported</div>
          </div>
        </div>

        {file && (
          <div className="file-meta">
            <div className="file-info">
              <strong>{file.name}</strong>
              <span>{formatBytes(file.size)}</span>
            </div>
            <div className="file-actions">
              <button className="link-btn" onClick={clearFile}>
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="action-row">
          <button className="primary-btn" onClick={handleUpload} disabled={loading}>
            {loading ? "Uploading..." : "Upload file"}
          </button>
        </div>

        <div className="link-box">
          <input
            placeholder="Paste YouTube link and click Process"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
          <button className="primary-btn" onClick={handleProcessLink} disabled={loading}>
            {loading ? "Processing..." : "Process link"}
          </button>
        </div>

        {msg && <p className={`message ${msg.toLowerCase().includes("failed") ? "error" : "success"}`}>{msg}</p>}

        <div className="preview">{renderPreview()}</div>

        {media && (
          <div className="transcript-panel">
            <div className="status-row">
              <div>
                <strong>Status:</strong> <span className={`badge ${media.status}`}>{media.status}</span>
                {media.status === "processing" && <span> generating transcript with whisper.cpp…</span>}
              </div>
              <div>{media.size ? formatBytes(media.size) : ""}</div>
            </div>

            {media.status === "ready" && (
              <>
                <div className="quick-search-row">
                  <input
                    className="quick-search-input"
                    placeholder="Search word/phrase in this media"
                    value={quickQuery}
                    onChange={(e) => setQuickQuery(e.target.value)}
                  />
                  <button className="secondary-btn" type="button" onClick={handleQuickSearch} disabled={quickSearchLoading}>
                    {quickSearchLoading ? "Searching..." : "Search"}
                  </button>
                </div>

                {quickMatches.length > 0 && (
                  <div className="quick-matches-panel">
                    <strong>Search results ({quickMatches.length})</strong>
                    <ul>
                      {quickMatches.map((m, i) => (
                        <li key={`${m.start}-${i}`}>
                          <button className="link-btn" type="button" onClick={() => onSeek(m.start)}>
                            {formatClock(m.start)}
                          </button>
                          <span>{m.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="transcript-toggle-row">
                  <button className="secondary-btn" onClick={() => setShowTranscript((prev) => !prev)} type="button">
                    {showTranscript ? "Hide transcription" : "Show transcription"}
                  </button>
                </div>

                {showTranscript ? (
                  <TranscriptViewer
                    media={media}
                    onSeek={onSeek}
                    onSummaryReady={(summary) => setMedia((prev) => (prev ? { ...prev, summary } : prev))}
                  />
                ) : (
                  <p className="transcript-hidden-note">
                    Transcription is ready and generated. Click <strong>Show transcription</strong> to view it.
                  </p>
                )}
              </>
            )}

            {media.status === "failed" && <div className="sensitive-warning">Processing failed: {media.error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default MediaUpload;
