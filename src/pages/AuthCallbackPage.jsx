import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthCallbackPage() {
  const { user, loading, configured } = useAuth();
  const navigate = useNavigate();
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!configured) {
      setExpired(true);
      return undefined;
    }
    if (user) {
      navigate("/onboarding", { replace: true });
      return undefined;
    }
    const timeout = window.setTimeout(() => setExpired(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [configured, user, navigate]);

  if (!expired || (loading && configured)) {
    return <main className="loading-screen"><span className="spinner" />Verifying your email link…</main>;
  }
  return (
    <main className="callback-screen">
      <div className="callback-card">
        <span className="callback-mark">EL</span>
        <h1>Link unavailable</h1>
        <p>This confirmation link may have expired, or your email address may already be verified. Try signing in or request a fresh confirmation email.</p>
        <Link className="primary-button callback-button" to="/login">Continue to sign in</Link>
      </div>
    </main>
  );
}
