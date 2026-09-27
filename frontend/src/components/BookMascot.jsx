/**
 * Small animated book, pinned in the corner of the viewport.
 *
 * Built from the 30-frame bookanimation.gif (composited into a single
 * sprite sheet, book-sprite.png, so the browser can step through frames
 * forward AND backward — a plain <img>/GIF can only ever play forward).
 *
 * One 5s loop:
 *   0.0s–1.0s  hold on frame 0  (bookstart — closed book)
 *   1.0s–2.5s  play forward through all 30 frames
 *   2.5s–3.5s  hold on frame 29 (bookend — open + sparkle)
 *   3.5s–5.0s  play backward through all 30 frames
 *   (loop)
 *
 * Pure CSS (steps() background-position animation) — no JS frame-timer
 * needed, and it respects prefers-reduced-motion.
 */
export default function BookMascot() {
  return <div className="book-mascot" aria-hidden="true" />;
}
