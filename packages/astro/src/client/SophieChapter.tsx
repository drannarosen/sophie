import type { ReactNode } from "react";

export interface SophieChapterProps {
  children: ReactNode;
}

/**
 * Chapter wrapper. Renders children inside the chapter React root.
 *
 * Global CSS (theme tokens + base element layer + component bundle +
 * KaTeX) is NO LONGER loaded here — it is delivered to every route via
 * the shared <SophieHead> in the document `<head>` (ADR 0095). Coupling
 * CSS to this React root left the non-reading "course spine" unstyled
 * (astr201 review F1/B1); the import list now lives at the head level so
 * styling is route-shell-scoped, never React-root-scoped.
 *
 * **Architectural note (per ADR 0027):**
 * Astro 6 + @astrojs/mdx 5 renders MDX content as Astro server-side;
 * React components inside MDX get isolated SSR passes that don't see
 * context providers from this wrapper. Threading data through provider
 * context is therefore not viable for MDX-rendered components.
 * Course/chapter/figures are passed as props on the persistence-bearing
 * components (`<InteractiveCallout course chapter id>`); the figure
 * registry is passed via `<Content components={makeStaticComponents({
 * figures })} />`.
 *
 * No `<ProfileProvider>` here: it can't reach the per-instance React
 * islands either. Phase 5's instructor-mode toggle will need a separate
 * mechanism (most likely a per-island prop driven by a page-level state
 * source). For Phase 0, profile defaults to `"student"` everywhere.
 */
export function SophieChapter({ children }: SophieChapterProps) {
  return <>{children}</>;
}
