import { useEffect, useState } from "react";
import { ArrowRight, CalendarRange, CircleGauge, Gauge, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ForecastingCentrePage() {
  const { session } = useAuth();
  const [forecastingData, setForecastingData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setForecastingData(null);
      setError("Sign in again to verify forecasting access.");
      return undefined;
    }

    const controller = new AbortController();
    setForecastingData(null);
    setError("");

    fetch("/.netlify/functions/forecasting", {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Unable to load forecasting data.");
        return result;
      })
      .then(setForecastingData)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError(requestError.message || "Unable to load forecasting data.");
        }
      });

    return () => controller.abort();
  }, [session?.access_token]);

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

      {error && <div className="dashboard-alert" role="alert">{error}</div>}
      {!forecastingData && !error && (
        <main className="loading-screen"><span className="spinner" />Verifying access and loading forecasts…</main>
      )}
      {forecastingData && (
        <>
          <section className="forecast-summary">
            <div className="summary-box">
              <span className="summary-label"><CircleGauge size={14} /> Model confidence</span>
              <strong>{forecastingData.summary.confidence}</strong>
              <small>Rolling validation against recent releases.</small>
            </div>
            <div className="summary-box">
              <span className="summary-label"><TrendingUp size={14} /> Current forecast bias</span>
              <strong>{forecastingData.summary.bias}</strong>
              <small>Growth and inflation signals remain mixed.</small>
            </div>
            <div className="summary-box">
              <span className="summary-label"><Gauge size={14} /> Data coverage</span>
              <strong>{forecastingData.summary.coverage}</strong>
              <small>{forecastingData.summary.coverageDetail}</small>
            </div>
          </section>

          <p className="ai-local-note" role="note">
            These are the existing illustrative sample estimates, not a live forecasting feed.
          </p>
          <section className="forecast-grid">
            {forecastingData.forecasts.map((card) => (
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
        </>
      )}
    </div>
  );
}
