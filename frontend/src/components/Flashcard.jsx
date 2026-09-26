import { useState } from "react";

export default function Flashcard({ front, back }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="flashcard"
      data-flipped={flipped}
      role="button"
      tabIndex={0}
      onClick={() => setFlipped((f) => !f)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setFlipped((f) => !f);
      }}
    >
      <p className="flashcard-eyebrow">{flipped ? "Answer" : "Question — tap to flip"}</p>
      <p className="flashcard-text">{flipped ? back : front}</p>
    </div>
  );
}
