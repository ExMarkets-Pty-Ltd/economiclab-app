import { ArrowUpRight, BarChart3, ShieldCheck } from "lucide-react";
import Brand from "./Brand";

export default function AuthLayout({ children, eyebrow, title, description, footer }) {
  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="story-grid" aria-hidden="true" />
        <header className="auth-brand"><Brand /></header>
        <div className="story-content">
          <div className="story-kicker"><span /> INDEPENDENT ECONOMIC RESEARCH</div>
          <h1>Clarity for a<br /><em>changing</em> economy.</h1>
          <p>Research, analysis and perspective to help you understand the forces shaping markets and policy.</p>
          <div className="story-note">
            <span className="story-icon"><BarChart3 size={19} /></span>
            <span><strong>Insight grounded in evidence</strong><small>A focused workspace for informed decisions.</small></span>
            <ArrowUpRight size={17} className="story-arrow" />
          </div>
        </div>
        <div className="story-footer"><span>© {new Date().getFullYear()} EconomicLab</span><span>Independent by design.</span></div>
      </section>

      <section className="auth-panel">
        <div className="auth-mobile-brand"><Brand compact /></div>
        <div className="auth-card">
          <div className="auth-eyebrow">{eyebrow}</div>
          <h2>{title}</h2>
          <p className="auth-description">{description}</p>
          {children}
          <div className="auth-trust"><ShieldCheck size={15} /> Your account is protected with secure authentication.</div>
          {footer}
        </div>
        <div className="auth-panel-footer">ECONOMICLAB <span>·</span> RESEARCH WORKSPACE</div>
      </section>
    </main>
  );
}
