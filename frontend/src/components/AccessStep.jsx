import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function AccessStep({ getToken, onBack }) {
  const [code, setCode] = useState(null);
  const [guardians, setGuardians] = useState([]);
  const [error, setError] = useState(null);

  async function refresh() {
    try {
      const token = await getToken();
      const { guardians } = await api.getGuardians(token);
      setGuardians(guardians);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function generateCode() {
    try {
      const token = await getToken();
      const result = await api.generateLinkCode(token);
      setCode(result);
    } catch (err) {
      setError(err.message);
    }
  }

  async function revoke(sub) {
    const token = await getToken();
    await api.removeLink(token, sub);
    refresh();
  }

  return (
    <section>
      <h1>Who can see your reports?</h1>
      <p className="lede">
        Generate a code and share it with a parent or teacher. It expires in 15
        minutes and works once.
      </p>

      <div className="actions">
        <button className="btn btn-primary" onClick={generateCode}>Generate invite code</button>
      </div>
      {code && <p className="session-note">Code: <strong>{code.code}</strong> (expires {new Date(code.expiresAt).toLocaleTimeString()})</p>}
      {error && <p className="error-note">{error}</p>}

      <div className="report-section">
        <h2>Currently have access</h2>
        {guardians.length === 0 && <p className="lede">No one yet.</p>}
        <ul className="report-list">
          {guardians.map((g) => (
            <li key={g.auth0_sub}>
              {g.email || g.auth0_sub} ({g.guardian_role})
              <button className="btn btn-quiet" onClick={() => revoke(g.auth0_sub)} style={{ marginLeft: "1rem" }}>
                Revoke
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="actions">
        <button className="btn btn-quiet" onClick={onBack}>Back</button>
      </div>
    </section>
  );
}