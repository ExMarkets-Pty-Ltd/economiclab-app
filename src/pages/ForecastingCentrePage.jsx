import { ArrowRight, CalendarRange, CircleGauge, Gauge, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const forecastCards = [
  {
    region: "United States",
    event: "US CPI inflation",
    date: "18 Nov 2026",
    previous: "3.2%",
    consensus: "3.1%",
    forecast: "3.0%",
    range: "2.8% - 3.2%",
    probability: "62%",
    confidence: "Medium",
    sentiment: "Neutral",
  },
  {
    region: "United States",
    event: "FOMC decision",
    date: "20 Nov 2026",
    previous: "5.25-5.50%",
    consensus: "5.25%",
    forecast: "5.25%",
    range: "5.00% - 5.50%",
    probability: "54%",
    confidence: "Moderate",
    sentiment: "Hawkish",
  },
  {
    region: "United States",
    event: "Non-farm payrolls",
    date: "06 Dec 2026",
    previous: "185k",
    consensus: "190k",
    forecast: "176k",
    range: "140k - 215k",
    probability: "59%",
    confidence: "Moderate",
    sentiment: "Mixed",
  },
  {
    region: "Europe",
    event: "ECB policy meeting",
    date: "12 Dec 2026",
    previous: "3.00%",
    consensus: "3.00%",
    forecast: "3.00%",
    range: "2.75% - 3.25%",
    probability: "48%",
    confidence: "Medium",
    sentiment: "Neutral",
  },
  {
    region: "South Africa",
    event: "SARB repo rate",
    date: "19 Nov 2026",
    previous: "7.25%",
    consensus: "7.25%",
    forecast: "7.00%",
    range: "6.75% - 7.25%",
    probability: "63%",
    confidence: "Medium",
    sentiment: "Dovish",
  },
];

export default function ForecastingCentrePage() {
  return (
    <div className="forecasting-page">
      <header className="forecast-header">
        <div>
          <div className="dashboard-eyebrow"><span /> ECONOMIC FORECASTING CENTRE</div>
          <h1>Upcoming macro releases and model estimates</h1>
        </div>
        <Link to="/ai" className="secondary-button compact-button">
          Return to AI research <ArrowRight size={16} />
        </Link>
      </header>

      <section className="forecast-summary">
        <div className="summary-box">
          <span className="summary-label"><CircleGauge size={14} /> Model confidence</span>
          <strong>Medium</strong>
          <small>Rolling validation against recent releases.</small>
        </div>
        <div className="summary-box">
          <span className="summary-label"><TrendingUp size={14} /> Current forecast bias</span>
          <strong>Moderately bullish</strong>
          <small>Growth and inflation signals remain mixed.</small>
        </div>
        <div className="summary-box">
          <span className="summary-label"><Gauge size={14} /> Data coverage</span>
          <strong>Core markets</strong>
          <small>US · Eurozone · UK · South Africa · APAC</small>
        </div>
      </section>

      <section className="forecast-grid">
        {forecastCards.map((card) => (
          <article key={card.event} className="forecast-card">
            <div className="forecast-head">
              <div>
                <span className="forecast-region">{card.region}</span>
                <h2>{card.event}</h2>
              </div>
              <span className={`sentiment-badge ${card.sentiment.toLowerCase()}`}>{card.sentiment}</span>
            </div>

            <div className="event-meta">
              <span><CalendarRange size={13} /> {card.date}</span>
              <span>Official consensus: {card.consensus}</span>
            </div>

            <div className="forecast-stack">
              <div>
                <small>Previous</small>
                <strong>{card.previous}</strong>
              </div>
              <div>
                <small>EconomicLab AI</small>
                <strong>{card.forecast}</strong>
              </div>
              <div>
                <small>Range</small>
                <strong>{card.range}</strong>
              </div>
            </div>

            <div className="forecast-probability">
              <div className="probability-row">
                <span>Probability estimate</span>
                <strong>{card.probability}</strong>
              </div>
              <div className="probability-bar"><span style={{ width: card.probability }} /></div>
            </div>

            <div className="forecast-card-footer">
              <span>Confidence: {card.confidence}</span>
              <span>Last update: today</span>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
