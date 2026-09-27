import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import Flashcard from "./Flashcard.jsx";
import { api } from "../api.js";

const PERSONA_COLORS = {
  light: "#8b6f47",
  working: "#55677a",
  deep: "#6f5f82",
};

const PIE_COLORS = ["#3f5d52", "#a85c3f"];

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function HistoryStep({ getToken, studentSub, onStartNew }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const result = studentSub
          ? await api.getStudentHistory(token, studentSub)
          : await api.getHistory(token);
        setData(result);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [getToken, studentSub]);

  if (error) {
    return (
      <section>
        <h1>History</h1>
        <p className="error-note">{error}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section>
        <h1>History</h1>
        <p className="thinking">Pulling up your past sessions…</p>
      </section>
    );
  }

  const { sessions, stats, allFlashcards } = data;

  if (sessions.length === 0) {
    return (
      <section>
        <h1>Nothing here yet.</h1>
        <p className="lede">Finish a session and it'll show up here, gaps and all.</p>
        <div className="actions">
          <button className="btn btn-primary" onClick={onStartNew}>
            Explain something
          </button>
        </div>
      </section>
    );
  }

  const nailedTotal = sessions.reduce((sum, s) => sum + s.nailed.length, 0);
  const pieData = [
    { name: "Nailed", value: nailedTotal },
    { name: "Gaps", value: stats.totalGaps },
  ];

  return (
    <section>
      <h1>What you've learned about yourself.</h1>
      <p className="lede">
        {stats.totalSessions} session{stats.totalSessions === 1 ? "" : "s"} so far.
      </p>

      <div className="stat-grid">
        <div className="stat-card">
          <p className="stat-number">{stats.totalSessions}</p>
          <p className="stat-label">Sessions</p>
        </div>
        <div className="stat-card">
          <p className="stat-number">{stats.totalGaps}</p>
          <p className="stat-label">Gaps found</p>
        </div>
        <div className="stat-card">
          <p className="stat-number">{stats.totalFlashcards}</p>
          <p className="stat-label">Flashcards</p>
        </div>
      </div>

      <div className="chart-row">
        <div className="chart-card">
          <h2>Sessions by depth</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.personaBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d9d5c9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b675e" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6b675e" }} />
              <Tooltip contentStyle={{ fontFamily: "Public Sans, sans-serif", fontSize: 13 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stats.personaBreakdown.map((entry) => (
                  <Cell key={entry.personaId} fill={PERSONA_COLORS[entry.personaId] || "#6b675e"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h2>Nailed vs. gaps</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {pieData.map((entry, i) => (
                  <Cell key={entry.name} fill={PIE_COLORS[i]} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                height={24}
                wrapperStyle={{ fontFamily: "Public Sans, sans-serif", fontSize: 12 }}
              />
              <Tooltip contentStyle={{ fontFamily: "Public Sans, sans-serif", fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card chart-card--wide">
        <h2>Gaps over time</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={stats.gapsOverTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d9d5c9" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 12, fill: "#6b675e" }}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6b675e" }} />
            <Tooltip
              labelFormatter={formatDate}
              formatter={(value) => [value, "Gaps"]}
              contentStyle={{ fontFamily: "Public Sans, sans-serif", fontSize: 13 }}
            />
            <Line type="monotone" dataKey="gapCount" stroke="#3f5d52" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="report-section">
        <h2>Every topic you've explained</h2>
        <div className="history-list">
          {sessions.map((s) => {
            const isOpen = openId === s.id;
            return (
              <div key={s.id} className="history-row">
                <button
                  className="history-row-header"
                  onClick={() => setOpenId(isOpen ? null : s.id)}
                >
                  <span
                    className="history-dot"
                    style={{ "--dot-color": PERSONA_COLORS[s.personaId] || "#6b675e" }}
                  />
                  <span className="history-topic">{s.topic}</span>
                  <span className="history-meta">
                    {formatDate(s.createdAt)} · {s.gaps.length} gap{s.gaps.length === 1 ? "" : "s"}
                  </span>
                  <span className="history-chevron">{isOpen ? "–" : "+"}</span>
                </button>

                {isOpen && (
                  <div className="history-row-body">
                    {s.nailed.length > 0 && (
                      <div className="report-section">
                        <h2>What held up</h2>
                        <ul className="report-list report-list--nailed">
                          {s.nailed.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {s.gaps.length > 0 && (
                      <div className="report-section">
                        <h2>Where it thinned out</h2>
                        <ul className="report-list report-list--gaps">
                          {s.gaps.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {s.flashcards.length > 0 && (
                      <div className="report-section">
                        <h2>Flashcards from this one</h2>
                        <div className="flashcard-grid">
                          {s.flashcards.map((card, i) => (
                            <Flashcard key={i} front={card.front} back={card.back} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {allFlashcards.length > 0 && (
        <div className="report-section">
          <h2>Every flashcard, in one place</h2>
          <div className="flashcard-grid">
            {allFlashcards.map((card, i) => (
              <Flashcard key={i} front={card.front} back={card.back} />
            ))}
          </div>
        </div>
      )}

      <div className="actions">
        <button className="btn btn-primary" onClick={onStartNew}>
          Explain something else
        </button>
      </div>
    </section>
  );
}
