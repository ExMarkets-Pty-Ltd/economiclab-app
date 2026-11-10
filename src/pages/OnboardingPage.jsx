import { useEffect, useState } from "react";
import { ArrowRight, Globe2, MapPin, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";

export default function OnboardingPage({ editing = false }) {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [biography, setBiography] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setUsername(profile?.username ?? "");
    setFullName(profile?.full_name ?? "");
    setLocation(profile?.location ?? "");
    setWebsite(profile?.website ?? "");
    setBiography(profile?.biography ?? "");
  }, [profile]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await updateProfile({
        username: username.trim().toLowerCase(),
        full_name: fullName.trim(),
        location: location.trim() || null,
        website: website.trim() || null,
        biography: biography.trim() || null,
      });
      navigate("/dashboard", { replace: true });
    } catch (profileError) {
      setError(profileError.message || "Unable to save your profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow={editing ? "YOUR PROFILE" : "COMPLETE YOUR PROFILE"}
      title={editing ? "Update your profile" : "Make this workspace yours"}
      description={editing ? "Keep your EconomicLab profile details up to date." : "Add a few details to complete your EconomicLab profile."}
      footer={editing ? <p className="auth-switch"><Link to="/dashboard">Back to dashboard <ArrowRight size={14} /></Link></p> : null}
    >
      {error && <div className="form-error" role="alert">{error}</div>}
      <form className="auth-form profile-form" onSubmit={handleSubmit}>
        <label htmlFor="full-name">Full name</label>
        <div className="input-wrap"><UserRound size={17} /><input id="full-name" type="text" autoComplete="name" maxLength={120} placeholder="Your name" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></div>
        <label htmlFor="username">Username</label>
        <div className="input-wrap username-input"><span aria-hidden="true">@</span><input id="username" type="text" autoComplete="username" minLength={3} maxLength={32} pattern="[a-z0-9_]{3,32}" title="Use 3–32 lowercase letters, numbers, or underscores." placeholder="your_username" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} required /></div>
        <p className="field-hint">3–32 characters: lowercase letters, numbers, and underscores. Usernames are unique.</p>
        <label htmlFor="location">Location <span className="optional-label">OPTIONAL</span></label>
        <div className="input-wrap"><MapPin size={17} /><input id="location" type="text" autoComplete="address-level2" maxLength={120} placeholder="City, country" value={location} onChange={(event) => setLocation(event.target.value)} /></div>
        <label htmlFor="website">Website <span className="optional-label">OPTIONAL</span></label>
        <div className="input-wrap"><Globe2 size={17} /><input id="website" type="url" maxLength={2048} placeholder="https://example.com" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
        <label htmlFor="biography">About you <span className="optional-label">OPTIONAL</span></label>
        <textarea id="biography" className="profile-textarea" maxLength={2000} placeholder="A short introduction" value={biography} onChange={(event) => setBiography(event.target.value)} />
        <button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Saving profile…" : editing ? "Save profile" : "Continue to dashboard"} <ArrowRight size={16} /></button>
      </form>
    </AuthLayout>
  );
}
