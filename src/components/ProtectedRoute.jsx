import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const {
    user,
    loading,
    profile,
    accountLoading,
    accountError,
    accountUserId,
    refreshAccount,
  } = useAuth();
  const location = useLocation();

  if (loading || (user && (accountLoading || accountUserId !== user.id))) {
    return <main className="loading-screen"><span className="spinner" />Restoring your secure session…</main>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  if (accountError) {
    return (
      <main className="account-error-screen">
        <section className="account-error-card">
          <span className="callback-mark">EL</span>
          <h1>We couldn't load your account</h1>
          <p>{accountError}</p>
          <button className="primary-button" type="button" onClick={() => refreshAccount(user.id).catch((error) => console.error("Unable to retry account loading:", error))}>
            Retry account connection
          </button>
        </section>
      </main>
    );
  }

  const profileComplete = Boolean(profile?.username && profile.full_name?.trim());
  const isOnboarding = location.pathname === "/onboarding";
  if (isOnboarding && profileComplete) return <Navigate to="/dashboard" replace />;
  if (!isOnboarding && !profileComplete) return <Navigate to="/onboarding" replace />;

  return children;
}
