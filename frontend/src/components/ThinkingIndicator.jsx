export default function ThinkingIndicator({ label }) {
  return (
    <p className="thinking-indicator" role="status" aria-live="polite">
      {label && <span>{label}</span>}
      <span className="thinking-dots">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </span>
    </p>
  );
}