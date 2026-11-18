import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, premium = false, requiredPermission = null }) {
  const {
    user,
    loading,
    profile,
    accountLoading,
    accountError,
    accountUserId,
    refreshAccount,
    entitlement,
    entitlementUserId,
    entitlementLoading,
    entitlementError,
    refreshEntitlement,
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

  if (premium) {
    if (entitlementLoading || !entitlement || entitlementUserId !== user.id) {
      if (entitlementError) {
        return (
          <main className="account-error-screen">
            <section className="account-error-card">
              <span className="callback-mark">EL</span>
              <h1>We couldn't verify your subscription</h1>
              <p>{entitlementError}</p>
              <button className="primary-button" type="button" onClick={() => refreshEntitlement().catch(() => {})}>
                Try again
              </button>
            </section>
          </main>
        );
      }
      return <main className="loading-screen"><span className="spinner" />Checking your subscription access…</main>;
    }

    const hasPermission = !requiredPermission
      ? entitlement.granted
      : entitlement.permissions?.includes(requiredPermission);
    if (!hasPermission) {
      const insufficientPermission = requiredPermission
        && entitlement.granted
        && !entitlement.permissions?.includes(requiredPermission);
      return (
        <main className="account-error-screen">
          <section className="account-error-card">
            <span className="callback-mark">EL</span>
            <h1>{insufficientPermission ? "Plan upgrade required" : "Premium access required"}</h1>
            <p>
              {insufficientPermission
                ? `This workspace requires the ${requiredPermission} feature included in a higher EconomicLab plan.`
                : "This workspace requires an active EconomicLab subscription."}
            </p>
            <a className="primary-button" href="/dashboard">View subscription options</a>
          </section>
        </main>
      );
    }
  }

  return children;
}
