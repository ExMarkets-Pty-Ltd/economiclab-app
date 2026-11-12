import { useMemo, useState } from "react";
import { ArrowRight, BarChart3, BrainCircuit, CalendarClock, MessageSquareText, Plus, SendHorizonal, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import Brand from "../components/Brand";

const starterQuestions = [
  "What is the current outlook for the US economy?",
  "What are the latest developments in the Federal Reserve?",
  "What is the probability of an interest-rate cut at the next FOMC meeting?",
  "What is the expected US CPI inflation rate?",
  "What is happening in the South African economy?",
  "How are global central banks responding to inflation?",
];

const newsHighlights = [
  { label: "US CPI", value: "3.2%", tone: "neutral" },
  { label: "Federal funds", value: "5.25-5.50%", tone: "hawkish" },
  { label: "South Africa", value: "Rand under pressure", tone: "watch" },
  { label: "Eurozone", value: "Growth cooling", tone: "soft" },
];

const promptHistory = [
  "US inflation outlook",
  "SARB rate path",
  "ECB decision watch",
  "Global growth headwinds",
];

function buildAssistantReply(question) {
  const normalized = question.toLowerCase();

  if (normalized.includes("fed") || normalized.includes("fomc") || normalized.includes("interest-rate") || normalized.includes("rate cut")) {
    return {
      headline: "Policy outlook and risk balance",
      text: "The policy signal is still restrictive, but the probability of a future easing step is beginning to rise as inflation cools and labour-market momentum moderates. The main risk remains whether services inflation and wage growth stay sticky enough to delay the next move.",
      bullets: [
        "The Fed remains data-dependent, with the labour-market and inflation mix driving the next decision.",
        "A moderation in annual inflation would improve the case for a later easing cycle, but not yet a certainty.",
        "Market pricing should be interpreted as a range of scenarios rather than a guaranteed path.",
      ],
      sources: [
        { title: "Federal Reserve statement", source: "FOMC / Fed", date: "Latest meeting" },
        { title: "BLS inflation release", source: "U.S. Bureau of Labor Statistics", date: "Most recent CPI report" },
      ],
    };
  }

  if (normalized.includes("south africa") || normalized.includes("rand") || normalized.includes("sarb")) {
    return {
      headline: "South Africa macro snapshot",
      text: "The SARB remains focused on inflation persistence, the currency, and the potential pass-through from energy and food costs. The rand remains a key transmission channel, which is why local yields and pricing continue to react quickly to global risk sentiment.",
      bullets: [
        "Inflation pressure is especially sensitive to fuel and food costs, which can distort the near-term picture.",
        "The pace of domestic policy easing is likely to remain cautious unless inflation cools more materially.",
        "Rand volatility continues to matter for imported inflation and broader market confidence.",
      ],
      sources: [
        { title: "SARB MPC statement", source: "South African Reserve Bank", date: "Latest policy update" },
        { title: "Stats SA inflation data", source: "Statistics South Africa", date: "Recent release" },
      ],
    };
  }

  if (normalized.includes("europe") || normalized.includes("ecb") || normalized.includes("eurozone")) {
    return {
      headline: "European growth and policy mix",
      text: "Eurozone growth remains uneven, with weaker manufacturing and softer sentiment reinforcing the case for a measured policy stance. Inflation is improving, but the path remains uneven across services and energy-sensitive components.",
      bullets: [
        "The ECB is balancing disinflation progress against slower growth and weak industrial activity.",
        "Energy and wage effects remain the key variables to watch for the next policy step.",
        "Market expectations should remain conditioned on data revisions and headline volatility.",
      ],
      sources: [
        { title: "ECB policy assessment", source: "European Central Bank", date: "Latest meeting" },
        { title: "Eurostat inflation data", source: "Eurostat", date: "Current release" },
      ],
    };
  }

  return {
    headline: "Macro view and current risks",
    text: "The current picture is balanced across major economies: inflation is cooling, but labour and services data still matter for policy timing. Growth remains uneven across the US, Europe, and South Africa, while external risk sentiment and currency volatility continue to shape the macro backdrop.",
    bullets: [
      "Inflation and labour-market data remain the dominant inputs for central-bank expectations.",
      "Global risk sentiment is still reinforcing a cautious, data-dependent policy posture.",
      "The best approach is to evaluate the latest official data, compare it with consensus, and track policy probabilities rather than rely on a single narrative.",
    ],
    sources: [
      { title: "FRED macro series", source: "Federal Reserve Bank of St. Louis", date: "Updated series" },
      { title: "Official releases", source: "BLS / SARB / ECB / Eurostat", date: "Cross-check data" },
    ],
  };
}

export default function EconomicLabAIPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "assistant",
      text: "I’m monitoring inflation, policy, labour markets, and macro news across the US, Europe, and South Africa. Ask for a forecast, a data read-through, or a scenario analysis.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);

  const summaryCards = useMemo(
    () => [
      { title: "Current policy mix", value: "Neutral to restrictive", tone: "cyan" },
      { title: "Data confidence", value: "High", tone: "mint" },
      { title: "Forecast cadence", value: "Updated daily", tone: "purple" },
    ],
    [],
  );

  function handlePromptClick(prompt) {
    setDraft(prompt);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;

    const nextUserMessage = { id: Date.now(), sender: "user", text: trimmed };
    setMessages((current) => [...current, nextUserMessage]);
    setDraft("");
    setThinking(true);

    window.setTimeout(() => {
      const assistantReply = buildAssistantReply(trimmed);
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          sender: "assistant",
          headline: assistantReply.headline,
          text: assistantReply.text,
          bullets: assistantReply.bullets,
          sources: assistantReply.sources,
        },
      ]);
      setThinking(false);
    }, 500);
  }

  return (
    <div className="ai-page">
      <aside className="ai-sidebar">
        <div className="ai-sidebar-head">
          <Brand />
          <Link to="/dashboard" className="sidebar-return">Workspace</Link>
        </div>

        <div className="ai-utility">
          <button type="button" className="icon-button ai-new-conversation" aria-label="Start new conversation">
            <Plus size={18} />
            New conversation
          </button>
        </div>

        <div className="ai-sidebar-section">
          <span className="sidebar-kicker">Recent research</span>
          {promptHistory.map((entry) => (
            <button key={entry} type="button" className="history-pill" onClick={() => setDraft(entry)}>
              {entry}
            </button>
          ))}
        </div>

        <div className="ai-sidebar-section ai-metrics">
          {summaryCards.map((card) => (
            <div key={card.title} className={`metric-chip ${card.tone}`}>
              <span>{card.title}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>
      </aside>

      <main className="ai-main">
        <header className="ai-header">
          <div>
            <div className="dashboard-eyebrow"><span /> ECONOMICLAB AI</div>
            <h1>Macro research assistant</h1>
          </div>
          <Link to="/forecasting" className="secondary-button compact-button">
            Open forecasting centre <ArrowRight size={16} />
          </Link>
        </header>

        <div className="ai-toolbar">
          <div className="chip-row">
            <span className="mini-chip"><BrainCircuit size={12} /> AI research</span>
            <span className="mini-chip"><TrendingUp size={12} /> Forecasting</span>
            <span className="mini-chip"><CalendarClock size={12} /> News intelligence</span>
          </div>
        </div>

        <section className="ai-chat-panel">
          <div className="ai-message-list">
            {messages.map((message) => (
              <div key={message.id} className={`ai-message ${message.sender}`}>
                <div className="message-avatar">
                  {message.sender === "assistant" ? <Sparkles size={14} /> : <MessageSquareText size={14} />}
                </div>
                <div className="message-copy">
                  {message.sender === "assistant" && message.headline ? <strong>{message.headline}</strong> : null}
                  <p>{message.text}</p>
                  {message.bullets && (
                    <ul>
                      {message.bullets.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {message.sources && (
                    <div className="source-grid">
                      {message.sources.map((source) => (
                        <div key={`${source.title}-${source.date}`} className="source-card">
                          <span>{source.source}</span>
                          <strong>{source.title}</strong>
                          <small>{source.date}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="ai-message assistant">
                <div className="message-avatar"><BrainCircuit size={14} /></div>
                <div className="message-copy typing-copy">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <div className="ai-suggestions">
            {starterQuestions.map((prompt) => (
              <button key={prompt} type="button" className="suggestion-pill" onClick={() => handlePromptClick(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <form className="ai-composer" onSubmit={handleSubmit}>
            <textarea
              aria-label="Ask a macroeconomic research question"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about inflation, the Fed, GDP, the rand, or the next major release..."
            />
            <button className="primary-button ai-send" type="submit" disabled={!draft.trim() || thinking}>
              {thinking ? "Researching…" : "Send question"} <SendHorizonal size={15} />
            </button>
          </form>
        </section>

        <section className="mini-metrics-grid">
          {newsHighlights.map((item) => (
            <article key={item.label} className="mini-metric">
              <span className={`tone ${item.tone}`} />
              <div>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
