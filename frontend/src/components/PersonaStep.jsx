import { PERSONAS } from "../personas.js";

export default function PersonaStep({ topic, unlockedIds, onSelect, onBack }) {
  const isLocked = (persona) =>
    persona.unlockNote && unlockedIds && !unlockedIds.includes(persona.id);

  return (
    <section>
      <h1>Who's going to ask the annoying questions?</h1>
      <p className="lede">Explaining “{topic}” to:</p>

      <div className="persona-list">
        {PERSONAS.map((persona) => {
          const locked = isLocked(persona);
          return (
            <button
              key={persona.id}
              className="persona-row"
              style={{ "--dot-color": persona.color }}
              disabled={locked}
              onClick={() => onSelect(persona)}
            >
              <span className="persona-mark" />
              <span className="persona-copy">
                <p className="persona-name">{persona.name}</p>
                <p className="persona-desc">{persona.description}</p>
              </span>
              {locked && <span className="persona-lock">{persona.unlockNote}</span>}
            </button>
          );
        })}
      </div>

      <div className="actions">
        <button className="btn btn-quiet" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
