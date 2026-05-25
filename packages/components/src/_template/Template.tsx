import { useHydrated } from "../runtime/useHydrated.ts";
import { lookupX } from "./template-store.ts";

/**
 * `<Template>` — canonical skeleton for a store-backed component.
 *
 * **This file is a starter template, not a live component.** Copy the
 * `_template/` directory to `components/<ComponentName>/`, then:
 *
 * 1. Rename `Template` → `<ComponentName>` and `lookupX` →
 *    `lookup<Something>` (the actual store-lookup function).
 * 2. Replace `TemplateProps` with the real prop type (typically
 *    sourced from a sibling `.schema.ts`).
 * 3. Write the RED test in `Template.test.tsx` FIRST (TDD); the SSR
 *    snapshot assertion below is the gate test for ADR 0038
 *    Amendment 2 — keep it.
 * 4. Customize the post-mount JSX (anchor, popover, etc.).
 *
 * ### Why this shape exists
 *
 * Per **ADR 0038 § A2.2** (`useHydrated` gate at the top of render):
 * packed-copy consumers populate the pedagogy store AFTER island SSR.
 * Without the gate, the server pass sees an empty store and emits the
 * bare-children fallback, while the client's first render sees the
 * script-tag-auto-hydrated store and emits the full tree. Same
 * component, two tree shapes → React #418 hydration mismatch.
 *
 * The gate forces SSR + first client render to emit only bare children
 * regardless of store state; the full tree appears once the
 * mount-effect flips the gate. The trigger anchor also flips
 * `data-react-hydrated="true"` (e2e signal per `useHydrated.ts`
 * docstring + followup #10).
 *
 * Per **ADR 0038 § A2.6**: store-backed components must use
 * `client:load` (not `client:visible`) so the mount-effect fires
 * early enough to flip the gate before the user interacts.
 *
 * @see {@link ../runtime/useHydrated.ts}
 * @see {@link ../../components/GlossaryTerm/GlossaryTerm.tsx} — first consumer (PR-C1)
 * @see {@link ../../components/KeyEquation} — second consumer
 */
export interface TemplateProps {
  /** Lookup key. Replace with the real prop shape. */
  name: string;
  /** Inline children rendered both pre-mount (bare) and post-mount (wrapped). */
  children?: React.ReactNode;
}

export function Template({ name, children }: TemplateProps) {
  // Hooks called UNCONDITIONALLY at top — React rule-of-hooks
  // applies regardless of whether the store has resolved.
  const entry = lookupX(name);
  const hydrated = useHydrated();

  // ADR 0038 § A2.2 — hydration gate.
  // SSR + first client render emit identical bare-children output
  // regardless of store state. Without this gate, packed-copy
  // consumers hit React #418 because SSR sees an empty store while
  // hydration sees an auto-populated one.
  if (!hydrated) {
    return <>{children}</>;
  }

  // ADR 0038 § A2.6 — miss path.
  // After the gate flips we always run on the client; emit a
  // dev-only authoring-drift warning and fall back to bare prose.
  if (!entry) {
    if (process.env?.NODE_ENV !== "production") {
      console.warn(
        `[Template] No entry found for "${name}". Rendering bare children.`
      );
    }
    return <>{children}</>;
  }

  // Post-mount full tree. The `data-react-hydrated="true"` attribute
  // on the trigger is the e2e signal — Playwright waits on it before
  // hovering (per useHydrated.ts docstring + followup #10). Replace
  // this placeholder shape with the real trigger + popover / anchor /
  // KaTeX block / etc. for the actual component.
  return (
    <a data-react-hydrated='true' href={entry.href}>
      {children}
    </a>
  );
}
