import { useRef, useState } from "react";
import gsap from "gsap";

export default function Flashcard({ front, back }) {
  const [flipped, setFlipped] = useState(false);
  const innerRef = useRef(null);

  function toggle() {
    const next = !flipped;
    setFlipped(next);
    if (innerRef.current) {
      gsap.to(innerRef.current, {
        rotateY: next ? 180 : 0,
        duration: 0.5,
        ease: "power2.inOut",
      });
    }
  }

  return (
    <div
      className="flashcard"
      role="button"
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") toggle();
      }}
    >
      <div className="flashcard-inner" ref={innerRef}>
        <div className="flashcard-face front">
          <p className="flashcard-eyebrow">Question — tap to flip</p>
          <p className="flashcard-text">{front}</p>
        </div>
        <div className="flashcard-face back">
          <p className="flashcard-eyebrow">Answer</p>
          <p className="flashcard-text">{back}</p>
        </div>
      </div>
    </div>
  );
}