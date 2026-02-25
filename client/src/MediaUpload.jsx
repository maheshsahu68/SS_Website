import { useState, useRef, useEffect } from "react";
import "./css/MediaUpload.css";
import TranscriptViewer from "./TranscriptViewer";

function MediaUpload() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [mediaId, setMediaId] = useState(null);
  const [media, setMedia] = useState(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [polling, setPolling] = useState(false);
  const [triggeredSensitive, setTriggeredSensitive] = useState(new Set());
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
    setMediaId(null);
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
          setPolling(false);
        }
      } catch (err) {
        console.error(err);
      }
    }, 2000);
    setPolling(true);
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleUpload = async () => {
    if (!file) {
      alert("Please select audio or video");
      return;
    }

    const formData = new FormData();
    formData.append("audio", file);

    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/audio/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setMsg(data.message);
      setUploadedFile(data.file);
      if (data.mediaId) {
        setMediaId(data.mediaId);
        startPolling(data.mediaId);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkUrl }),
      });
      const data = await res.json();
      setMsg(data.message);
      if (data.mediaId) {
        setMediaId(data.mediaId);
        startPolling(data.mediaId);
      }
    } catch (err) {
      console.error(err);
      setMsg("Link processing failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files && e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const clearFile = () => {
    setFile(null);
    setUploadedFile(null);
    setMsg("");
    setMedia(null);
    setMediaId(null);
    setTriggeredSensitive(new Set());
    if (inputRef.current) inputRef.current.value = "";
  };

  const onSeek = (time) => {
    if (!playerRef.current) return;
    playerRef.current.currentTime = Math.max(0, time - 0.25);
    playerRef.current.play().catch(() => {});
  };

  const onTimeUpdate = () => {
    const p = playerRef.current;
    if (!p || !media?.sensitive || !media.sensitive.length) return;
    const t = p.currentTime;

    for (const s of media.sensitive) {
      const key = `${s.word}@${s.start}`;
      if (triggeredSensitive.has(key)) continue; // already handled
      // pause shortly before the sensitive timestamp (0.4s)
      if (t >= Math.max(0, s.start - 0.45) && t < s.start + 0.5) {
        p.pause();
        setTriggeredSensitive((prev) => new Set(prev).add(key));
        const confirmed = window.confirm(
          `Sensitive content detected ("${s.word}") at ${s.start.toFixed(2)}s. Continue playback?`
        );
        if (confirmed) {
          p.play().catch(() => {});
        } else {
          // skip past the sensitive chunk
          p.currentTime = s.end + 0.25;
        }
        break;
      }
    }
  };

  const renderPreview = () => {
    const src = uploadedFile
      ? `http://localhost:5000/uploads/${uploadedFile.filename}`
      : media?.path
      ? `http://localhost:5000/${media.path.replace(/^\\/,'')}`
      : null;

    const mimetype = uploadedFile ? uploadedFile.mimetype : file?.type || media?.mimeType;

    if (!src) return null;

    if (mimetype && mimetype.startsWith("audio")) {
      return <audio ref={playerRef} controls src={src} onTimeUpdate={onTimeUpdate} />;
    }

    if (mimetype && mimetype.startsWith("video")) {
      return <video ref={playerRef} controls src={src} onTimeUpdate={onTimeUpdate} />;
    }

    return null;
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <h2 className="brand">🎵 SonicSearch</h2>
        <p className="subtitle">Upload Audio/Video or paste a public link (YouTube)</p>

        <div
          className={`dropzone ${dragging ? "dragging" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
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
            <div className="big-label">Choose or drop file here</div>
            <div className="small-label">Supports audio, video & YouTube links</div>
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

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="primary-btn" onClick={handleUpload} disabled={loading} style={{ flex: 1 }}>
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Paste YouTube link and press Process"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
            />
            <button className="primary-btn" onClick={handleProcessLink} disabled={loading} style={{ padding: '8px 12px' }}>
              {loading ? 'Processing...' : 'Process link'}
            </button>
          </div>
        </div>

        {msg && <p className={`message ${msg.toLowerCase().includes('success') ? 'success' : 'error'}`}>{msg}</p>}

        <div className="preview">{renderPreview()}</div>

        {media && (
          <div className="transcript-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <strong>Status:</strong> {media.status}
                {media.status === 'processing' && <span> — processing transcript...</span>}
                {media.status === 'ready' && <span> — ready</span>}
              </div>
              <div style={{ width: 160, textAlign: 'right' }}>{media.size ? formatBytes(media.size) : ''}</div>
            </div>

            {media.status === 'ready' && (
              <TranscriptViewer media={media} onSeek={onSeek} />
            )}

            {media.status === 'failed' && <div className="sensitive-warning">Processing failed: {media.error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default MediaUpload;
