---
date: 2026-05-09T00:00:00.000Z
tags:
  - foundation
  - repo-structure
  - distribution
validation:
  status: validated
  last_validated_date: 2026-05-16
  evidence:
    - kind: review
      ref: docs/reviews/2026-05-15-bucket-b-c-architecture-audit.md
      date: 2026-05-15
      notes: "D1 boundary purity audit — confirms @sophie/* packages cleanly isolated from consumer-app code; the platform-not-monorepo shape held under the bucket B+C cross-cutting work."
    - kind: manual
      ref: pnpm-workspace.yaml
      date: 2026-05-16
      notes: "Repo shape: pnpm workspace + packages/* + examples/smoke as a single consumer; no per-course directories. Standalone-platform contract held."
  notes: "Repo-shape contract is structurally enforced: any course importing @sophie/* is by definition a separate consumer. The smoke example exercises that consumer relationship in-repo."
---

# ADR 0001: Sophie is a standalone platform, not a course monorepo

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

An earlier draft of the Sophie repository layout placed both the
platform packages *and* the first courses inside one monorepo:

```text
sophie/
  packages/{schema, components, theme, cli}
  apps/textbooks/{astr201, comp521}
  apps/courses/{astr201-fa26, comp521-fa26}
```

This shape made the platform feel "owned by" its first two courses.
It also forced four deployable Astro apps to exist in parallel before
a single chapter was written. Phase 4 (the bulk of v1 calendar time)
was scoped as parallel content authoring across four apps.

During the May 2026 design-stress-test, the user steered explicitly
toward a different shape: **a standalone, distributable platform like
{abbr}`MyST` or Quarto.** ASTR 201 and COMP 521 should be *consumers*
of the platform, not folders inside it.

## Decision

The platform repo (`drannarosen/sophie`) contains only platform
code, dogfooded docs, a reference example textbook, and tests. Course
content (ASTR 201, COMP 521, etc.) lives in **separate consumer
repositories** that depend on the published `@sophie/*` packages.

## Rationale

- **Open-source-shaped from day one.** The platform is publishable
  whenever it's ready; the timing decision is calendar, not
  architectural.
- **Public API discipline starts immediately.** Exports get stability
  tags (`@stable` / `@experimental` / `@internal`); SemVer enforced
  via Changesets; breaking changes require migration scripts. This is
  the discipline that makes external adoption possible later — and
  costs nothing to do now since you're your own first external
  consumer.
- **Phase 4 simplifies.** Two consumer repos (one per course) instead
  of four parallel apps. Course textbook and semester shell live as
  separate content collections under different routes within one
  course repo.
- **Sophie's release cadence decouples from any one course's
  calendar.** Pinning a Sophie version in a course repo means the
  course doesn't break under a Sophie minor bump.
- **Existing tools' shape works.** MyST, Quarto, Astro Starlight all
  follow this pattern: a CLI/integration plus published packages,
  consumed by external project repos.

## Alternatives considered

- **One monorepo with apps/ folders for courses** (the prior draft).
  Pros: vertical integration, one git history, easy cross-cutting
  edits. Cons: forces parallel-apps work, blurs the platform/content
  boundary, makes external adoption a fork-the-monorepo move.
  Rejected: the platform/content boundary is exactly the seam that
  makes adoption tractable for external instructors.
- **One repo per package + one repo per course.** Pros: maximum
  independence. Cons: heavy git overhead for cross-package changes;
  tooling proliferation. Rejected: pnpm workspaces give the
  cross-package agility without separate-repo overhead.
- **Platform repo + courses inside it as `examples/`.** Pros: simple.
  Cons: same blurring problem as monorepo; the courses aren't
  examples, they're real classroom-deployed content. Rejected.

## Consequences

**Easier:**

- Sophie is publishable on npm whenever the API surface stabilizes.
- External instructors can adopt by `sophie create textbook ...`,
  not by forking the monorepo.
- Phase 4 work is two consumer repos, simpler routes, one Pagefind
  index per course, clearer ownership.
- `apps/docs/` (Sophie self-hosted docs) and `apps/example-textbook/`
  remain *inside* the platform repo as dogfood — that distinction
  becomes meaningful.

**Harder:**

- Cross-cutting changes that touch both platform and consumer require
  coordinated commits across repos.
- The Sophie team (currently: Anna) maintains version-pinning
  discipline across courses — bumping `@sophie/*` in `astr201/` is
  a deliberate act, not automatic.
- "Edit a chapter and a component in the same PR" becomes
  "two PRs, one per repo" — annoying for cross-cutting edits.

**Triggers:**

- Public API discipline ([ADR 0001 itself]) becomes load-bearing.
- Plugin architecture as v1 public API ([reference/plugin-api.md](../reference/plugin-api.md)).
- `sophie upgrade` ships in v1 (no-op until first breaking change) so
  consumer repos have a stable migration path.
- Changesets configured from Phase 0 to manage SemVer.

## References

- Brainstorming session, May 2026: user steer "build the best now,
  plan ahead — not what's simple now causing more work later."
- [explanation/architecture.md](../explanation/architecture.md) — the
  current shape of the platform repo and consumer repos.
