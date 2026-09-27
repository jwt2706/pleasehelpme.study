import { useRef } from "react";
import Flashcard from "./Flashcard.jsx";
import { useStagger } from "../useAnimations.js";

export default function ReportStep({ topic, report, streak, onRestart }) {
  const { nailed = [], gaps = [], flashcards = [] } = report.gapReport || {};
  const containerRef = useRef(null);
  useStagger(containerRef, ".report-list li, .flashcard", [report]);

  return (
    <section ref={containerRef}>
      <h1>Here's what actually happened.</h1>
      <p className="lede">Your explanation of “{topic}”, sorted into what held up.</p>

      {nailed.length > 0 && (
        <div className="report-section">
          <h2>What you nailed</h2>
          <ul className="report-list report-list--nailed">
            {nailed.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {gaps.length > 0 && (
        <div className="report-section">
          <h2>Where it thinned out</h2>
          <ul className="report-list report-list--gaps">
            {gaps.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {flashcards.length > 0 && (
        <div className="report-section">
          <h2>Study these</h2>
          <div className="flashcard-grid">
            {flashcards.map((card, i) => (
              <Flashcard key={i} front={card.front} back={card.back} />
            ))}
          </div>
        </div>
      )}

      {typeof streak === "number" && (
        <p className="session-note" style={{ marginTop: "2rem" }}>
          {streak} session{streak === 1 ? "" : "s"} in a row.
        </p>
      )}

      <div className="actions">
        <button className="btn btn-primary" onClick={onRestart}>
          Explain something else
        </button>
      </div>
    </section>
  );
}