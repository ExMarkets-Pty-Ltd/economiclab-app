import { useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { signUp, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signUp(email.trim(), password);
      setSuccess(true);
    } catch (authError) {
      setError(authError.message || "We couldn't create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="GET STARTED"
      title="Create your account"
      description="Set up your secure EconomicLab workspace."
      footer={<p className="auth-switch">Already have an account? <Link to="/login">Sign in <ArrowRight size={14} /></Link></p>}
    >
      {!configured && <div className="notice" role="status">Authentication is not configured yet. Add the Supabase environment variables in your deployment settings.</div>}
      {error && <div className="form-error" role="alert">{error}</div>}
      {success ? (
        <div className="success-panel" role="status"><CheckCircle2 size={26} /><h3>Check your inbox</h3><p>If email confirmation is enabled, follow the link we sent to <strong>{email}</strong> to finish setting up your account.</p><Link to="/login">Return to sign in <ArrowRight size={14} /></Link></div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <div className="input-wrap"><Mail size={17} /><input id="email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
          <label htmlFor="password">Password</label>
          <div className="input-wrap"><LockKeyhole size={17} /><input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Create a password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /><button className="visibility-button" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          <p className="field-hint">Use at least 8 characters. Supabase may enforce additional password requirements.</p>
          <button className="primary-button" type="submit" disabled={!configured || submitting}>{submitting ? "Creating account…" : "Create account"} <ArrowRight size={16} /></button>
        </form>
      )}
    </AuthLayout>
  );
}
