import { Activity } from "lucide-react";

export default function Brand({ compact = false }) {
  return (
    <a className={`brand${compact ? " brand-compact" : ""}`} href="/" aria-label="EconomicLab home">
      <span className="brand-mark" aria-hidden="true">
        <Activity size={21} strokeWidth={2.2} />
      </span>
      <span className="brand-name">
        ECONOMIC<span>LAB</span>
        {!compact && <small>RESEARCH &amp; INSIGHT</small>}
      </span>
    </a>
  );
}
