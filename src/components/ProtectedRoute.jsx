import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <main className="loading-screen"><span className="spinner" />Restoring your secure session…</main>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
