import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { api } from "../api.js";

const MAX_EXCHANGES = 3;

export default function ConversationStep({
  topic,
  persona,
  getToken,
  onFinish,
  onBack,
}) {
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState([]); // { role, text }
  const [gaps, setGaps] = useState([]);
  const [lastTurnId, setLastTurnId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const conversationRef = useRef(null);

  const exchangeCount = history.filter((h) => h.role === "user").length;
  const canFinish = exchangeCount >= 1;
  const reachedMax = exchangeCount >= MAX_EXCHANGES;

  // Animate only the newest turn in, so replies feel like they settle into
  // place rather than the whole thread jumping.
  useEffect(() => {
    if (!lastTurnId || !conversationRef.current) return;
    const fresh = conversationRef.current.querySelector(".turn-fresh");
    if (!fresh) return;
    gsap.fromTo(
      fresh,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }
    );
  }, [lastTurnId]);

  async function submitExplanation() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);

    const nextHistory = [...history, { role: "user", text }];
    setHistory(nextHistory);
    setDraft("");

    try {
      const token = await getToken();
      const turn = await api.postTurn(token, {
        topic,
        personaId: persona.id,
        history,
        latestExplanation: text,
      });

      setHistory((h) => [
        ...h,
        { role: "persona", text: `${turn.reaction} ${turn.follow_up_question}` },
      ]);
      setGaps((g) => [...g, turn.detected_gap]);
      setLastTurnId(Date.now());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await api.completeSession(token, {
        topic,
        personaId: persona.id,
        history,
        detectedGaps: gaps,
      });
      onFinish(result);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <section>
      <h1>Go on, explain it.</h1>
      <p className="lede">
        Answering at the <strong>{persona.name}</strong> level. Answer plainly
        — the follow-up question will find the soft spot.
      </p>

      <div className="conversation" ref={conversationRef}>
        {history.map((turn, i) => (
          <div
            key={i}
            className={`turn turn-${turn.role} ${
              turn.role === "persona" && i === history.length - 1 && lastTurnId
                ? "turn-fresh"
                : ""
            }`}
          >
            <div
              className="turn-label"
              style={{
                "--speaker-color": turn.role === "persona" ? persona.color : undefined,
              }}
            >
              {turn.role === "persona" ? persona.name : "You"}
            </div>
            <div className="turn-body">
              <p className={turn.role === "persona" ? "persona-question" : undefined}>
                {turn.text}
              </p>
            </div>
          </div>
        ))}
        {busy && <p className="thinking">Thinking it over…</p>}
      </div>

      {!reachedMax && (
        <div className="field">
          <textarea
            rows={4}
            placeholder={
              exchangeCount === 0
                ? `Explain ${topic} in a couple of sentences…`
                : "Answer the question above…"
            }
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitExplanation();
            }}
            disabled={busy}
          />
        </div>
      )}

      {error && <p className="error-note">{error}</p>}

      <div className="actions">
        {!reachedMax && (
          <button
            className="btn btn-primary"
            onClick={submitExplanation}
            disabled={busy || !draft.trim()}
          >
            Send
          </button>
        )}
        {canFinish && (
          <button className="btn btn-quiet" onClick={finish} disabled={busy}>
            See what I missed
          </button>
        )}
        {!canFinish && (
          <button className="btn btn-quiet" onClick={onBack} disabled={busy}>
            Back
          </button>
        )}
      </div>
    </section>
  );
}