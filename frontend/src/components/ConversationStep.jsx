import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { api } from "../api.js";
import ThinkingIndicator from "./ThinkingIndicator.jsx";
import AudioVisualizer from "./AudioVisualizer.jsx";
import { useTtsPlayer } from "../hooks/useTtsPlayer.js";
import { useMicInput } from "../hooks/useMicInput.js";

const MAX_EXCHANGES = 3;

function MicIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

export default function ConversationStep({
  topic,
  persona,
  getToken,
  voiceEnabled,
  voiceId,
  onFinish,
  onBack,
}) {
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState([]); // { role, text }
  const [gaps, setGaps] = useState([]);
  const [lastTurnId, setLastTurnId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState(null);
  const [narrationError, setNarrationError] = useState(null);
  const conversationRef = useRef(null);

  const tts = useTtsPlayer({ getToken, apiSpeak: api.speakText });
  const mic = useMicInput({ onResult: (text) => setDraft(text) });

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

  // Narrate the newest persona turn, if the person has voice turned on.
  useEffect(() => {
    if (!lastTurnId || !voiceEnabled || !voiceId) return;
    const last = history[history.length - 1];
    if (!last || last.role !== "persona") return;
    setNarrationError(null);
    tts.speak(last.text, voiceId).catch((err) => setNarrationError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastTurnId]);

  // Stop any open mic stream / playing audio if the person navigates away.
  useEffect(() => {
    return () => {
      mic.stop();
      tts.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleMic() {
    if (mic.isRecording) {
      mic.stop();
    } else {
      tts.stop();
      mic.start(draft);
    }
  }

  async function submitExplanation() {
    const text = draft.trim();
    if (!text || busy) return;
    mic.stop();
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
    mic.stop();
    tts.stop();
    setBusy(true);
    setFinishing(true);
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
      setFinishing(false);
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

        {tts.isSpeaking && (
          <div className="narration-row">
            <AudioVisualizer analyser={tts.analyser} active={tts.isSpeaking} />
            <button className="narration-stop" onClick={() => tts.stop()}>
              Stop
            </button>
          </div>
        )}
        {narrationError && <p className="error-note">{narrationError}</p>}

        {busy && (
          <ThinkingIndicator
            label={finishing ? "Reading between the lines" : `${persona.name} is thinking`}
          />
        )}
      </div>

      {!reachedMax && (
        <div className="field">
          <div className="input-row">
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
            <button
              type="button"
              className={`mic-button${mic.isRecording ? " recording" : ""}`}
              onClick={toggleMic}
              disabled={busy || !mic.supported}
              title={
                mic.supported
                  ? mic.isRecording
                    ? "Stop recording"
                    : "Speak your answer"
                  : "Speech input isn't supported in this browser"
              }
              aria-label={mic.isRecording ? "Stop recording" : "Speak your answer"}
            >
              <MicIcon />
            </button>
          </div>
          {mic.isRecording && (
            <div className="mic-visualizer-row">
              <AudioVisualizer analyser={mic.analyser} active={mic.isRecording} color="var(--error)" />
            </div>
          )}
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