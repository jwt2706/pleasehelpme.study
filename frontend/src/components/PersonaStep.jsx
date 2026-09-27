import { useRef } from "react";
import { PERSONAS } from "../personas.js";
import { useStagger } from "../useAnimations.js";

export default function PersonaStep({ topic, onSelect, onBack }) {
  const listRef = useRef(null);
  useStagger(listRef, ".persona-row", []);

  return (
    <section>
      <h1>How deep should this go?</h1>
      <p className="lede">Explaining “{topic}” — pick how hard the follow-ups should push.</p>

      <div className="persona-list" ref={listRef}>
        {PERSONAS.map((persona) => (
          <button
            key={persona.id}
            className="persona-row"
            style={{ "--dot-color": persona.color }}
            onClick={() => onSelect(persona)}
          >
            <span className="persona-mark" />
            <span className="persona-copy">
              <p className="persona-name">{persona.name}</p>
              <p className="persona-desc">{persona.description}</p>
            </span>
          </button>
        ))}
      </div>

      <div className="actions">
        <button className="btn btn-quiet" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}