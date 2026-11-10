import { useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Bell, BookOpen, CircleHelp, LogOut, Menu, Search, Settings2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user, profile, subscription, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Researcher";
  const subscriptionActive = Boolean(
    subscription &&
    ["active", "trialing"].includes(subscription.status) &&
    (!subscription.expires_at || new Date(subscription.expires_at) > new Date()),
  );
  const researchAccess = subscriptionActive
    ? subscription.plans?.name ?? "Active plan"
    : "No active plan";

  async function handleSignOut() {
    setSignOutError("");
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      setSignOutError(error.message || "Unable to sign out. Please try again.");
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar${menuOpen ? " sidebar-open" : ""}`}>
        <div className="sidebar-brand"><Brand /></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="side-link active" href="/dashboard"><span className="side-link-icon"><Activity size={17} /></span>Overview</a>
          <span className="side-link disabled" aria-disabled="true"><span className="side-link-icon"><BookOpen size={17} /></span>Research library <span className="coming-soon">SOON</span></span>
          <Link className="side-link" to="/profile"><span className="side-link-icon"><Settings2 size={17} /></span>Your profile</Link>
        </nav>
        <div className="sidebar-bottom">
          <a className="help-link" href="mailto:hello@economiclab.co.za"><CircleHelp size={17} /> Help &amp; support <ArrowUpRight size={14} /></a>
          <div className="sidebar-user">
            <div className="user-avatar">{displayName.slice(0, 1).toUpperCase()}</div>
            <div className="user-copy"><strong>{displayName}</strong><span>{user?.email}</span></div>
            <button type="button" className="icon-button signout-button" onClick={handleSignOut} aria-label="Sign out"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <button className="icon-button mobile-menu" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation"><Menu size={20} /></button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="topbar-actions"><div className="secure-label"><span /> SECURE WORKSPACE</div><button className="icon-button" aria-label="Search" type="button"><Search size={18} /></button><button className="icon-button" aria-label="Notifications" type="button"><Bell size={18} /></button></div>
        </header>
        {signOutError && <div className="dashboard-alert" role="alert">{signOutError}</div>}
        <div className="dashboard-content">
          <div className="welcome-row">
            <div><div className="dashboard-eyebrow">YOUR RESEARCH WORKSPACE</div><h1>Good to have you here, {displayName}.</h1><p>Your EconomicLab workspace is ready. Here’s where your research journey begins.</p></div>
            <div className="today-date"><span>ACCOUNT</span><strong>Active</strong></div>
          </div>

          <section className="welcome-card">
            <div className="welcome-card-copy"><div className="welcome-card-tag"><span /> ECONOMICLAB INSIGHT</div><h2>Understand the forces<br />shaping our economy.</h2><p>Your workspace is set up. Research and analysis will be available here as your account gains access to EconomicLab resources.</p><a href="mailto:hello@economiclab.co.za" className="welcome-cta">Get in touch <ArrowUpRight size={15} /></a></div>
            <div className="chart-art" aria-hidden="true"><div className="chart-label">RESEARCH / OUTLOOK</div><div className="chart-lines"><span /><span /><span /><span /></div><div className="chart-path"><svg viewBox="0 0 360 170" preserveAspectRatio="none"><path d="M3 145 C35 128 45 144 72 112 S117 110 138 88 S174 105 205 68 S246 84 272 50 S321 54 357 14" fill="none" stroke="currentColor" strokeWidth="2.5" /><path d="M3 145 C35 128 45 144 72 112 S117 110 138 88 S174 105 205 68 S246 84 272 50 S321 54 357 14 L357 170 L3 170Z" fill="url(#chart-fill)" opacity=".15" /><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#05EEFC" /><stop offset="1" stopColor="#05EEFC" stopOpacity="0" /></linearGradient></defs></svg></div><div className="chart-endpoint" /></div>
          </section>

          <div className="section-heading"><div><h2>Workspace overview</h2><p>A secure space for your EconomicLab account.</p></div><span className="updated-label"><span /> LIVE ACCOUNT</span></div>
          <section className="overview-grid" aria-label="Account overview">
            <article className="overview-card"><div className="overview-card-top"><span>ACCOUNT STATUS</span><span className="metric-icon cyan"><Activity size={17} /></span></div><div className="overview-value">Active</div><div className="overview-foot"><span className="positive"><ArrowUpRight size={14} /> Verified session</span><span>Supabase Auth</span></div></article>
            <article className="overview-card"><div className="overview-card-top"><span>RESEARCH ACCESS</span><span className="metric-icon slate"><BookOpen size={17} /></span></div><div className="overview-value">{researchAccess}</div><div className="overview-foot"><span className={subscriptionActive ? "positive" : "muted-status"}>{subscriptionActive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {subscriptionActive ? subscription.status : "Subscription required"}</span><span>{subscriptionActive ? "Subscription" : "Library"}</span></div></article>
            <article className="overview-card"><div className="overview-card-top"><span>ACCOUNT EMAIL</span><span className="metric-icon violet"><Bell size={17} /></span></div><div className="overview-email">{user?.email}</div><div className="overview-foot"><span className="positive"><span className="tiny-dot" /> Signed in</span><span>Personal account</span></div></article>
          </section>

          <section className="empty-state"><div className="empty-graphic"><BookOpen size={24} /></div><div><h3>Your research library is ready when you are.</h3><p>There are no research items available in this workspace yet. Check back later or contact the EconomicLab team for assistance.</p></div><a href="mailto:hello@economiclab.co.za" aria-label="Contact EconomicLab"><ArrowUpRight size={18} /></a></section>
          <footer className="dashboard-footer"><span>© {new Date().getFullYear()} EconomicLab <span className="footer-dot">·</span> Independent research. Informed decisions.</span><span>Private &amp; secure workspace</span></footer>
        </div>
      </main>
    </div>
  );
}
