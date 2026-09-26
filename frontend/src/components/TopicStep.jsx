import { useState } from "react";
import { TOPIC_SUGGESTIONS } from "../personas.js";

export default function TopicStep({ onContinue }) {
  const [topic, setTopic] = useState("");

  return (
    <section>
      <h1>Explain something you think you understand.</h1>
      <p className="lede">
        Pick a topic. You'll explain it to someone who isn't buying it — and
        find out exactly where your understanding runs out.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (topic.trim()) onContinue(topic.trim());
        }}
      >
        <div className="field">
          <input
            type="text"
            placeholder="e.g. why the sky is blue"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            autoFocus
          />
        </div>

        <div className="chip-row">
          {TOPIC_SUGGESTIONS.map((t) => (
            <button
              type="button"
              key={t}
              className="chip"
              onClick={() => setTopic(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={!topic.trim()}>
            Choose depth
          </button>
        </div>
      </form>
    </section>
  );
}