import { useState } from "react";

export default function TranscriptViewer({ media, onSeek }) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState([]);
  const words = media?.transcript?.words || [];

  const handleSearch = async () => {
    if (!query.trim()) return;
    const res = await fetch(`http://localhost:5000/api/audio/${media._id}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    setMatches(data.matches || []);
  };

  const handleGenerateSummary = async () => {
    const res = await fetch(`http://localhost:5000/api/audio/${media._id}/summary`, { method: "POST" });
    const data = await res.json();
    alert(data.summary || "No summary returned");
  };

  const renderWord = (w, i) => {
    const isMatch = matches.some((m) => Math.abs(m.start - w.start) < 0.001 && Math.abs(m.end - w.end) < 0.001);
    return (
      <span
        key={i}
        className={`transcript-word ${isMatch ? "highlight" : ""}`}
        onClick={() => onSeek(w.start)}
        title={`${w.word} — ${w.start.toFixed(2)}s`}
      >
        {w.word + " "}
      </span>
    );
  };

  return (
    <div>
      {media.summary && <div className="summary-box">{media.summary}</div>}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <div className="transcript-search" style={{ flex: 1 }}>
          <input placeholder="Search transcript (word or phrase)" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button onClick={handleSearch}>Find</button>
        </div>
        <div>
          <button onClick={handleGenerateSummary} style={{ padding: '8px 10px' }}>Local Summary</button>
        </div>
      </div>

      <div className="transcript-body">
        {words.length ? words.map(renderWord) : <div style={{ color: '#666' }}>Transcript not available</div>}
      </div>

      {matches.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <strong>Matches:</strong>
          <ul>
            {matches.map((m, i) => (
              <li key={i} style={{ marginTop: 6 }}>
                <button className="link-btn" onClick={() => onSeek(m.start)}>
                  <span className="timestamp">{m.start.toFixed(2)}s</span>
                </button>
                <span style={{ marginLeft: 8 }}>{m.text} — <em style={{ color: '#666' }}>{m.context}</em></span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {media.sensitive && media.sensitive.length > 0 && (
        <div className="sensitive-warning" style={{ marginTop: 10 }}>
          Sensitive content detected at: {media.sensitive.map((s) => `${s.word} @ ${s.start.toFixed(2)}s`).join(', ')}
        </div>
      )}
    </div>
  );
}
