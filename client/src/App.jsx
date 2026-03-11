import { useEffect, useMemo, useState } from "react";
import MediaUpload from "./MediaUpload";
import AuthPanel from "./AuthPanel";

const AUTH_STORAGE_KEY = "ss_auth";

function App() {
  const [auth, setAuth] = useState(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error(error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  });

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState(null);

  const user = auth?.user || null;

  const userInitial = useMemo(() => {
    const source = user?.name || user?.email || "U";
    return source.trim().charAt(0).toUpperCase();
  }, [user]);

  const onAuthenticated = (payload) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
    setAuth(payload);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuth(null);
    setShowUserMenu(false);
    setLogs([]);
    setActivity([]);
    setSelectedActivityId(null);
  };

  const fetchLogs = async (token) => {
    try {
      setLogsLoading(true);
      setLogsError("");
      const res = await fetch("http://localhost:5000/api/auth/sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setLogsError(data.message || "Failed to load session logs");
      } else {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error(error);
      setLogsError("Failed to load session logs");
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchActivity = async (token, shouldAutoSelect = false) => {
    try {
      setActivityLoading(true);
      setActivityError("");
      const res = await fetch("http://localhost:5000/api/audio/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setActivityError(data.message || "Failed to load previous activity");
        return;
      }

      const items = data.items || [];
      setActivity(items);

      if (shouldAutoSelect && items.length > 0 && !selectedActivityId) {
        setSelectedActivityId(items[0]._id);
      }
    } catch (error) {
      console.error(error);
      setActivityError("Failed to load previous activity");
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    if (!auth?.token) {
      setLogs([]);
      setActivity([]);
      setLogsError("");
      setActivityError("");
      setSelectedActivityId(null);
      return;
    }

    fetchLogs(auth.token);
    fetchActivity(auth.token, true);
  }, [auth?.token]);

  if (!user) {
    return <AuthPanel onAuthenticated={onAuthenticated} />;
  }

  return (
    <div>
      <div style={{ padding: "12px 18px", display: "flex", justifyContent: "flex-end", position: "relative" }}>
        <button
          type="button"
          onClick={() => setShowUserMenu((prev) => !prev)}
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            border: "1px solid #d4d4d8",
            background: user.avatar ? `url(${user.avatar}) center/cover no-repeat` : "#1f2937",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
          aria-label="Open user menu"
          title={user.name || user.email}
        >
          {!user.avatar ? userInitial : ""}
        </button>

        {showUserMenu && (
          <div
            style={{
              position: "absolute",
              top: 62,
              right: 18,
              width: 380,
              maxHeight: 500,
              overflow: "auto",
              background: "#fff",
              border: "1px solid #e4e4e7",
              borderRadius: 12,
              boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
              padding: 14,
              zIndex: 30,
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <strong>{user.name || "User"}</strong>
              <div style={{ fontSize: 13, color: "#4b5563" }}>{user.email}</div>
              <div style={{ fontSize: 12, color: "#6b7280", textTransform: "capitalize" }}>{user.provider}</div>
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Past sessions (separate logs DB)</div>
            {logsLoading && <div style={{ fontSize: 13 }}>Loading logs...</div>}
            {logsError && <div style={{ color: "#b91c1c", fontSize: 13 }}>{logsError}</div>}
            {!logsLoading && !logsError && logs.length === 0 && (
              <div style={{ fontSize: 13, color: "#6b7280" }}>No sessions yet.</div>
            )}
            {!logsLoading && !logsError && logs.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px 0", display: "grid", gap: 8 }}>
                {logs.map((log) => (
                  <li key={log._id} style={{ border: "1px solid #f1f5f9", borderRadius: 8, padding: "8px 10px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{log.event.replace("_", " ")}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{new Date(log.createdAt).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}

            <button style={{ marginTop: 12 }} onClick={logout} type="button">
              Logout
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
        <aside style={{ marginLeft: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Your transcript history</div>
          {activityLoading && <div style={{ fontSize: 13 }}>Loading previous results...</div>}
          {activityError && <div style={{ fontSize: 13, color: "#b91c1c" }}>{activityError}</div>}
          {!activityLoading && !activityError && activity.length === 0 && (
            <div style={{ fontSize: 13, color: "#6b7280" }}>No saved transcript activity yet.</div>
          )}
          {!activityLoading && !activityError && activity.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
              {activity.map((item) => {
                const isActive = item._id === selectedActivityId;
                return (
                  <li key={item._id}>
                    <button
                      type="button"
                      onClick={() => setSelectedActivityId(item._id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: isActive ? "1px solid #2563eb" : "1px solid #e2e8f0",
                        background: isActive ? "#eff6ff" : "#fff",
                        borderRadius: 8,
                        padding: "8px 10px",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{item.originalName || item.filename}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", textTransform: "capitalize" }}>
                        {item.source} • {item.status}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{new Date(item.uploadedAt).toLocaleString()}</div>
                      {(item.summary || item?.transcript?.fullText) && (
                        <div style={{ fontSize: 12, color: "#4b5563", marginTop: 4 }}>
                          {(item.summary || item.transcript.fullText).slice(0, 90)}...
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <main>
          <MediaUpload
            authToken={auth?.token}
            selectedMediaId={selectedActivityId}
            onActivityChanged={() => auth?.token && fetchActivity(auth.token)}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
