import { useState } from "react";
import MediaUpload from "./MediaUpload";
import AuthPanel from "./AuthPanel";

function App() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("ss_auth");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.user || null;
    } catch (error) {
      console.error(error);
      localStorage.removeItem("ss_auth");
      return null;
    }
  });

  const logout = () => {
    localStorage.removeItem("ss_auth");
    setUser(null);
  };

  if (!user) {
    return <AuthPanel onAuthenticated={setUser} />;
  }

  return (
    <div>
      <div style={{ padding: "10px 14px", textAlign: "right", fontSize: "0.92rem" }}>
        Signed in as <strong>{user.name || user.email}</strong>{" "}
        <em>({user.provider || "local"})</em>
        <button style={{ marginLeft: 12 }} onClick={logout} type="button">
          Logout
        </button>
      </div>
      <MediaUpload />
    </div>
  );
}

export default App;
