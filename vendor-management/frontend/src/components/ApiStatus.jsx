import { useEffect, useState } from "react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const HEALTH_URL = `${BASE_URL.replace(/\/api\/?$/, "")}/health`;

// Real connectivity check against the backend's /health route, polled
// periodically — occupies the sidebar-footer slot the reference reserves
// for workspace/status chrome, but with a real signal instead of static text.
export function ApiStatus() {
  const [ok, setOk] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(HEALTH_URL);
        if (!cancelled) setOk(res.ok);
      } catch {
        if (!cancelled) setOk(false);
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="sidebar-footer">
      <span className={`status-dot ${ok ? "ok" : ok === false ? "danger" : ""}`} />
      <span>{ok === null ? "Connecting…" : ok ? "API Connected" : "API Unreachable"}</span>
    </div>
  );
}
