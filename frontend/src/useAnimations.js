import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Fades + lifts a section in whenever `deps` changes — use this on the
 * wrapper around whatever step/section is currently mounted, so switching
 * steps feels like a soft transition instead of a hard cut.
 */
export function useSectionTransition(deps = []) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }
      );
    });
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/**
 * Staggers every element matching `selector` inside `containerRef` — use
 * for lists (persona rows, report bullets, flashcards, history rows) so
 * they settle in one after another instead of popping in as a block.
 */
export function useStagger(containerRef, selector, deps = []) {
  useEffect(() => {
    if (!containerRef.current) return undefined;
    const targets = containerRef.current.querySelectorAll(selector);
    if (!targets.length) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", stagger: 0.06 }
      );
    }, containerRef);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}