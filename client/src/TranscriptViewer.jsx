import { useMemo, useState } from "react";

const formatClock = (seconds = 0) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.round((safe - Math.floor(safe)) * 1000)
    .toString()
    .padStart(3, "0");
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`;
};

export default function TranscriptViewer({ media, onSeek, onSummaryReady }) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const words = media?.transcript?.words || [];

  const matchedStarts = useMemo(
    () => new Set(matches.map((m) => Number(m.start).toFixed(3))),
    [matches]
  );

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
    setSummaryLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/audio/${media._id}/summary`, { method: "POST" });
      const data = await res.json();
      if (data.summary) {
        onSummaryReady?.(data.summary);
      } else {
        alert("No summary returned");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div>
      {media.summary && <div className="summary-box">{media.summary}</div>}

      <div className="transcript-toolbar">
        <div className="transcript-search">
          <input
            placeholder="Search transcript (word or phrase)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={handleSearch}>Find</button>
        </div>
        <button className="secondary-btn" onClick={handleGenerateSummary} disabled={summaryLoading}>
          {summaryLoading ? "Generating..." : "Generate summary"}
        </button>
      </div>

      <div className="transcript-body">
        {words.length ? (
          words.map((w, i) => {
            const isMatch = matchedStarts.has(Number(w.start).toFixed(3));
            return (
              <button
                type="button"
                key={`${w.start}-${i}`}
                className={`transcript-word ${isMatch ? "highlight" : ""}`}
                onClick={() => onSeek(w.start)}
                title={`${w.word} — ${formatClock(w.start)}`}
              >
                {w.word}
              </button>
            );
          })
        ) : (
          <div className="transcript-empty">Transcript not available</div>
        )}
      </div>

      {matches.length > 0 && (
        <div className="matches-panel">
          <strong>Matches ({matches.length})</strong>
          <ul>
            {matches.map((m, i) => (
              <li key={`${m.start}-${i}`}>
                <button className="link-btn" onClick={() => onSeek(m.start)}>
                  <span className="timestamp">{formatClock(m.start)}</span>
                </button>
                <span>
                  {m.text} — <em>{m.context}</em>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {media.sensitive && media.sensitive.length > 0 && (
        <div className="sensitive-warning">
          Sensitive content detected at: {media.sensitive.map((s) => `${s.word} @ ${formatClock(s.start)}`).join(", ")}
        </div>
      )}
    </div>
  );
}
