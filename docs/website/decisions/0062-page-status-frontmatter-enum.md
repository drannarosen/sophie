---
date: 2026-05-18T00:00:00.000Z
tags:
  - frontmatter
  - schema
  - documentation
  - status
  - reasoning-os
status: shipped
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0062: Page-status frontmatter enum

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Related**: [0056](./0056-validation-tracker.md), [0061](./0061-ai-optimized-codebase-design.md)
:::

## Context

The 2026-05-18 Codex architecture audit's third P2 finding ("two
architectural timelines") observed that Sophie's docs carry both
implemented infrastructure and forward-looking specs side-by-side
without a consistent visual or schematic distinction. A reader landing
on [`plugin-api.md`](../reference/plugin-api.md) reads spec-style prose
about `registerComponent` / `registerAuditCheck` / `extendChapterSchema`
with no banner indicating "this contract is design-locked but the
implementation is a future package split."

Session 8's E3b (PR #116) shipped the first half of the mitigation: a
`status:` field on 24 reference pages' frontmatter, with a 4-value enum:

| Value | Semantic |
|---|---|
| `shipped` | The contract documented here is implemented + tested in the platform today. Reading this page is reading documentation of code that exists. |
| `accepted-design` | Design is decided and locked (ADR-or-equivalent), but implementation has not begun. The page describes the contract that *will* ship; the implementation work is still ahead. |
| `mixed` | Partial implementation. Some surfaces of the documented contract are shipped, others are still future work. Use sparingly — prefer splitting into separate pages when the line is clear. |
| `future-package-split` | The contract here is design-locked for the eventual Sophie *package split* (post-Phase-3, when single-repo monorepo decomposes into independently versioned packages). Reading this page is reading a forward-looking spec, not API documentation. |

E3b rolled out the field to 24 pages and called out in
[`docs/website/myst.yml`](../myst.yml) lines 46–67 that the field would
"render as a status banner on reference pages." E3b did not formalize
the vocabulary in code — the enum lives only as the rollout itself
plus a comment in `myst.yml`.

Session 9 closes the loop: promote the vocabulary to a `@sophie/core`
Zod schema, validate at extract time, surface in the validation
dashboard, inject a spec banner on `future-package-split` pages. The
present ADR locks the vocabulary before the schema commit, so the
4-value choice is defended by an audit-trail entry rather than implied
by the rollout.

## Decision

Adopt **`PageStatus`** as a first-class enum in `@sophie/core`:

```typescript
export const PageStatusSchema = z.enum([
  "shipped",
  "accepted-design",
  "mixed",
  "future-package-split",
]);
```

The field appears in **page-level frontmatter** (not inside the
`validation:` block — see Alternatives A2 below). It is **optional
during the current rollout**: pages without `status:` are valid input
to the extractor, surfaced as "no status" in the dashboard. Every
reference page is expected to have one eventually; decisions and
explanation pages may follow in a later sweep.

### Semantics per value

- **`shipped`** — implementation exists, tests cover it, the contract
  the page describes is what users get today. Use when the page is
  *documentation of running code*.
- **`accepted-design`** — an ADR (or equivalent decision artifact) has
  accepted the design, implementation has not begun or is in flight.
  Use when the page is *specification of code that will ship next*.
- **`mixed`** — partial. Prefer splitting; reserve this for cases where
  the surface is genuinely interleaved and a single page is the
  right unit (e.g., `cli.md` covers commands at varying maturity).
- **`future-package-split`** — design-locked, deferred until the
  monorepo splits into packages (post-Phase-3). The page describes
  *what will exist*, not what does. Spec-banner injection (see
  Consequences) makes this status visible to every reader.

### Validation discipline

Schema validation runs **at extract time** in
`packages/astro/src/lib/validation/extractor.ts`. The extractor calls
`PageStatusSchema.safeParse(data.status)` for every contract page; on
failure, it emits a V8-class extractor finding (matching the V8 "unknown
key" pattern already in place for `validation:` block keys, surfaced
INFO not ERROR). Pages with no `status:` field produce no finding —
the rollout incompleteness is observability, not a defect.

The page-level field is **separate from the `validation:` block's
`status:` subkey** (which is the validation lifecycle: `unvalidated` /
`in-progress` / `validated` / `re-validation-needed`, per
[ADR 0056](./0056-validation-tracker.md)). The two concepts are
orthogonal:

- A `future-package-split` page can have a `validated` validation
  block (the spec itself was reviewed).
- A `shipped` page can be `unvalidated` (the code exists but no
  validation evidence has been recorded yet).

The validation dashboard surfaces both columns side-by-side.

## Consequences

### Schema (`@sophie/core`)

A new file `packages/core/src/schema/page-status.ts` exports
`PageStatusSchema` + `PageStatus` type. The barrel
`packages/core/src/schema/index.ts` re-exports both.

`ContractValidationEntrySchema`
(`packages/core/src/schema/pedagogy-index-entries/contract-validation.ts`)
gains an optional `status: PageStatusSchema.optional()` field. Pages
without `status:` produce entries with `status: undefined`.

### Extractor (`@sophie/astro`)

`extractContractValidations` in
`packages/astro/src/lib/validation/extractor.ts` reads `data.status`
from each page's raw frontmatter, parses it through
`PageStatusSchema.safeParse()`, threads the parsed value (or `undefined`
on parse failure) into the emitted entry. Parse failures emit an INFO
finding under code `S0` (separate code from the `V*` validation-block
codes; the dashboard already groups findings by code).

### Validation dashboard

The generator
(`packages/astro/src/lib/validation/index-generator.ts`) adds:

1. A **new top-level summary section** counting pages per `PageStatus`
   value (parallels the existing validation-status summary).
2. A **new "Lifecycle" column** in the per-contract tables (ADRs +
   reference docs), rendering the `PageStatus` value or `_missing_`
   for pages without one.

The validation dashboard at `docs/website/status/validation.md` is
regenerated as part of the same PR.

### Spec banner (MyST plugin)

A new MyST plugin
`docs/website/scripts/spec-banner-plugin.mjs` (parallel to the existing
`validation-admonition-plugin.mjs`) injects a fixed-content
`:::{important} Forward-looking specification` admonition after the H1
on every page with `status === "future-package-split"`. Author burden
is zero — the banner appears at build time, removes at build time if
the status changes. The 6 currently-tagged pages
(`plugin-api.md`, `sophie-diff-cli.md`, `sophie-metrics-cli.md`,
`sophie-plugin-system.md`, `sophie-publish-schedule-cli.md`,
`sophie-refactor-cli.md`) get banners on next build.

The plugin honors a new env flag `SOPHIE_DOCS_INCLUDE_SPEC_BANNERS=0`
for parity with the validation admonition's
`SOPHIE_DOCS_INCLUDE_VALIDATION=0` gate (default = on; suppress for
private/test builds).

### Lint script

A new informational script `scripts/lint-status.ts` (parallel to
`scripts/link-check.ts`) walks `docs/website/**/*.md{,x}`, reports:

- Status distribution (count per `PageStatus` value).
- Pages with a `validation:` block but no `status:` field
  (rollout-gap observability).
- Pages with an unknown `status:` value (defensive — should always be
  empty once the extractor's S0 finding catches them).

Wired into CI under `pnpm lint:status`, informational (always exits
0), matching the E3b precedent for `pnpm lint:links`. Pattern can
harden later when the rollout reaches every page.

## Alternatives considered

### A1. No ADR; schema TSDoc carries the rationale

Schema files do carry TSDoc that justifies their shape (the `validation.ts`
schema's invariant-ownership commentary is a good example). The
4-value vocabulary could be locked in the schema file's docstring
without a separate ADR.

**Rejected** because (a) the vocabulary was rolled out before any
formal decision artifact existed, leaving a gap in the audit trail
the next reviewer would flag, and (b) the page-status enum has
cross-cutting implications (extractor, dashboard, plugin, lint) that
benefit from a single citable ADR for PR descriptions and commit
messages, paralleling the structural role of ADR 0056 for the
`validation:` block.

### A2. Embed status inside the `validation:` block as a subkey

Place `status: future-package-split` under the existing `validation:`
frontmatter block (alongside `status: unvalidated`, the validation
lifecycle).

**Rejected** because the two are semantically orthogonal. ADR 0056's
`validation:` block describes *evidence accumulation about a contract*
(have we validated that what's documented matches reality?). The
page-status field describes *the lifecycle of the contract itself* (has
it been implemented?). Conflating them under one key would force
authors to think about both axes simultaneously and would prevent
the dashboard from cross-tabulating them. Keeping them separate
preserves the orthogonality.

### A3. 2-value enum (shipped / not-shipped)

Collapse the 4-value enum to a binary "is the documented thing
implemented?"

**Rejected** because the audit trail distinguishes *why* something
isn't shipped: `accepted-design` (deliberately ahead of
implementation), `mixed` (partial), `future-package-split` (deferred to
post-Phase-3 packaging). Each has a different reader-orientation
implication; a binary enum loses that. Cost of the larger vocabulary
is small (the rollout was already manageable at 4 values).

### A4. Free-form string with documentation

Let authors pick any string; rely on docs convention.

**Rejected** because (a) the field is supposed to render a banner +
dashboard column — typos silently break both, and (b) the AI-author
model (ADR 0030, ADR 0061) benefits from machine-locked vocabularies
the AI can copy mechanically. A Zod enum gives the AI four valid
templates and zero ambiguity.

## Status

**Accepted 2026-05-18** — same session as the schema commit. First
application: the 24 pages already carrying `status:` from E3b plus
the 6 `future-package-split` pages getting spec banners on next docs
build.

## Revisions

§1 — 2026-05-18 — ADR created in the same PR as the schema commit
that promotes `PageStatus` from frontmatter convention to
`@sophie/core` enum. Closes the third P2 from the 2026-05-18 Codex
audit.
