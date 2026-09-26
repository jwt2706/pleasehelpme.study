import { useEffect, useState } from "react";
import { api } from "../api.js";
import HistoryStep from "./HistoryStep.jsx";

export default function GuardianDashboard({ getToken }) {
  const [students, setStudents] = useState(null);
  const [selected, setSelected] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);

  async function refresh() {
    const token = await getToken();
    const { students } = await api.getLinkedStudents(token);
    setStudents(students);
  }

  useEffect(() => { refresh(); }, []);

  async function redeem(e) {
    e.preventDefault();
    setError(null);
    try {
      const token = await getToken();
      await api.redeemLinkCode(token, code.trim());
      setCode("");
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  if (selected) {
    return <HistoryStep getToken={getToken} studentSub={selected} onStartNew={() => setSelected(null)} />;
  }

  return (
    <section>
      <h1>Your students.</h1>
      <p className="lede">Add a student with a code they share with you.</p>

      <form onSubmit={redeem} className="field">
        <input
          type="text"
          placeholder="Invite code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <div className="actions">
          <button className="btn btn-primary" type="submit" disabled={!code.trim()}>Add student</button>
        </div>
      </form>
      {error && <p className="error-note">{error}</p>}

      <div className="report-section">
        <h2>Linked students</h2>
        {students?.length === 0 && <p className="lede">None yet — redeem a code above.</p>}
        <div className="history-list">
          {students?.map((s) => (
            <button key={s.auth0_sub} className="history-row-header" onClick={() => setSelected(s.auth0_sub)}>
              <span className="history-topic">{s.email || s.auth0_sub}</span>
              <span className="history-meta">{s.sessions_completed} sessions · {s.streak_count} streak</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}