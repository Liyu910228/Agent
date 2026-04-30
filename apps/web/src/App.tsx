import { useEffect, useState } from "react";
import { apiClient } from "./api/client";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import WorkerPage from "./pages/WorkerPage";
import type { BootstrapStatus, SessionUser } from "./types";

const STORAGE_KEY = "agent-platform-session";

const readSession = (): SessionUser | null => {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

function App() {
  const [user, setUser] = useState<SessionUser | null>(() => readSession());
  const [status, setStatus] = useState<BootstrapStatus | null>(null);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    apiClient
      .bootstrap()
      .then(setStatus)
      .catch((error: Error) => setStatusError(error.message));
  }, []);

  const handleLogin = (nextUser: SessionUser) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} statusError={statusError} />;
  }

  if (user.role === "admin") {
    return <AdminPage user={user} status={status} onLogout={handleLogout} />;
  }

  return <WorkerPage user={user} status={status} onLogout={handleLogout} />;
}

export default App;

