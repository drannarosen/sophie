import { useEffect, useState } from "react";
import styles from "./HydrationAnnouncer.module.css.js";

/**
 * Per-component live region that announces when a persistence-bearing
 * useInteractive site has finished hydrating from IndexedDB.
 *
 * WCAG 4.1.3 (Status Messages): the transition from "loading" to
 * "interactive" should be programmatically communicated to assistive
 * technologies. The hydration guard's `aria-busy` flip is one signal;
 * this announcer adds a polite live-region announcement so screen-
 * reader users hear a discrete confirmation rather than having to
 * re-poke the control.
 *
 * Per ADR 0029 + the Phase 1 hardening audit P2-2.
 *
 * Pattern: empty `role="status" aria-live="polite"` element while
 * loading. When `hydrated` flips true, write the label into the
 * region — the screen reader announces the change. Subsequent
 * re-renders with `hydrated=true` keep the label stable (no flicker,
 * no re-announce loop).
 */
export function HydrationAnnouncer({
  hydrated,
  label,
}: {
  hydrated: boolean;
  label: string;
}) {
  // `announced` flips once and stays true. Subsequent `hydrated`
  // toggles (e.g., a key-change reset to loading and back) don't
  // re-announce within the same component lifetime.
  const [announced, setAnnounced] = useState(hydrated);
  useEffect(() => {
    if (hydrated && !announced) setAnnounced(true);
  }, [hydrated, announced]);

  return (
    <span role='status' aria-live='polite' className={styles.live}>
      {announced ? label : ""}
    </span>
  );
}
