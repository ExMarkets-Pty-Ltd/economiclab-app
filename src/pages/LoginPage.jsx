import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { signIn, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(location.state?.from?.pathname ?? "/dashboard", { replace: true });
    } catch (authError) {
      setError(authError.message || "We couldn't sign you in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="WELCOME BACK"
      title="Sign in to your account"
      description="Access your EconomicLab research workspace."
      footer={<p className="auth-switch">New to EconomicLab? <Link to="/register">Create an account <ArrowRight size={14} /></Link></p>}
    >
      {!configured && <div className="notice" role="status">Authentication is not configured yet. Add the Supabase environment variables in your deployment settings.</div>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="email">Email address</label>
        <div className="input-wrap"><Mail size={17} /><input id="email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
        <div className="label-row"><label htmlFor="password">Password</label></div>
        <div className="input-wrap"><LockKeyhole size={17} /><input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="visibility-button" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
        <button className="primary-button" type="submit" disabled={!configured || submitting}>{submitting ? "Signing in…" : "Sign in"} <ArrowRight size={16} /></button>
      </form>
    </AuthLayout>
  );
}
