import { z } from "zod";

/**
 * Page-status frontmatter enum (ADR 0062). Locks the 4-value
 * vocabulary the E3b rollout established (PR #116) as a first-class
 * Zod schema in `@sophie/core`, so the contract-validation extractor
 * can validate `data.status` at extract time and surface typos as
 * audit findings instead of silently rendering them in the dashboard.
 *
 * Lives on page-level frontmatter (NOT inside the `validation:` block
 * — those are orthogonal axes per ADR 0062). The validation-tracker
 * dashboard surfaces both as separate columns.
 *
 * Values:
 *
 *   - **`shipped`** — implementation exists, tests cover it; reading
 *     the page is reading documentation of running code.
 *   - **`accepted-design`** — design-locked, implementation has not
 *     begun or is in flight; reading the page is reading specification
 *     of code that will ship next.
 *   - **`mixed`** — partial implementation. Prefer splitting the page
 *     into separate `shipped` and `accepted-design` pages when the
 *     line is clear; reserve for genuinely interleaved surfaces.
 *   - **`future-package-split`** — design-locked but deferred until
 *     the monorepo splits into versioned packages (post-Phase-3).
 *     Reading the page is reading a forward-looking spec; the MyST
 *     spec-banner plugin auto-injects a "Forward-looking specification"
 *     admonition on these pages at build time.
 *
 * Vocabulary changes require an ADR amendment (or a new ADR
 * superseding 0062). Adding a new value also requires updates to the
 * dashboard generator's status-summary table and the spec-banner
 * plugin's trigger logic.
 */
export const PageStatusSchema = z.enum([
  "shipped",
  "accepted-design",
  "mixed",
  "future-package-split",
]);
export type PageStatus = z.infer<typeof PageStatusSchema>;
