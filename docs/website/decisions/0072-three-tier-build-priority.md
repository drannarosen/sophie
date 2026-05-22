---
date: 2026-05-21T00:00:00.000Z
tags:
  - architecture
  - tiers
  - priority
  - course-website
  - sequencing
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0072: Three-tier build priority for the course-website platform

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Amends**: [0023](./0023-vertical-slice-first.md) (extends with a multi-tier sequencing strategy beyond the initial vertical slice)
- **Related**: [0001](./0001-platform-not-monorepo.md), [0007](./0007-persistence-indexeddb.md), [0024](./0024-license-agpl.md), [0065](./0065-lti-1-3-integration.md), [0066](./0066-pseudonymous-first-data-model.md)
:::

## Context

The
[Course-Website Platform Roadmap](../status/course-website-roadmap.md)
expands Sophie's scope by an order of magnitude — from
schema-driven textbook authoring to full course-website platform with
LMS integration, computational labs, adaptive remediation, SoTL
telemetry, and more. Shipping all of it as one undifferentiated mass
risks the failure mode every ambitious platform hits: half-finished
features everywhere, no surface complete enough to use.

Anna's tenure-narrative timeline (Cottrell + CAREER) wants something
demonstrable in semester-scale increments. Operational and compliance
burden (FERPA, hosting, auth) should not be paid upfront before the
content surface is mature enough to use.

Sophie's existing architectural commitments suggest a natural tier
boundary: per-browser state ([ADR 0007](./0007-persistence-indexeddb.md))
gives Sophie its "static-deploy with full interactivity" property.
That envelope is large — it fits content, slides, computational labs,
practice problems, retrieval, spaced repetition, diagnostic, even
adaptive remediation per-browser. Auth + cross-device + cohort
analytics + Canvas integration are a separate operational tier.

## Decision

**Course-website platform work shall be sequenced into three tiers,
with explicit operational boundaries:**

### Tier 1 — Must-ship (static-deploy, per-browser state)

| Aspect | Value |
|---|---|
| **Auth** | None |
| **State location** | Per-browser IndexedDB ([ADR 0007](./0007-persistence-indexeddb.md)) |
| **Hosting** | Static (GitHub Pages-class: Vercel-static, Cloudflare Pages, Netlify) |
| **What ships** | Course Info, Syllabus, Schedule, Content (Section/Subsection/Unit/Artifact), Library, bridge rooms, Resources, retrieval/spaced-review/worked-example/faded-prompt/interleaved-set components, FSRS scheduler, Subsection auto-grouping, view-mode toggle, iCal Schedule export |

Tier 1 is the **fully-static-deploy envelope**. Anna's existing Quarto
/ MyST sites deploy here today; Sophie's Tier 1 inherits that
operational simplicity while gaining the pedagogy components, Library,
FSRS, and bridge systems Quarto/MyST can't host.

### Tier 2 — Differentiators (still static-deploy, per-browser state)

| Aspect | Value |
|---|---|
| **Auth** | None |
| **State location** | Per-browser IndexedDB |
| **Hosting** | Static |
| **What ships** | Assignments (Sophie-hosted; submissions still flow through Canvas externally), Exams (low-stakes hosted), Computational Labs (Pyodide per [ADR 0071](./0071-pyodide-computational-labs.md)), Diagnostics (self-served), Practice problems with auto-feedback, Adaptive remediation (single-browser), BKT mastery state |

Tier 2 is **still static-deploy** but adds the bigger pedagogy
machinery: full Assessment schema, Pyodide computational labs, BKT
mastery + adaptive remediation. All per-browser; all FERPA-elegant by
construction; all on the same hosting envelope as Tier 1.

### Tier 3 — Scale + integration (server + auth)

| Aspect | Value |
|---|---|
| **Auth** | LTI 1.3 (Canvas-issued sessions per [ADR 0065](./0065-lti-1-3-integration.md)) |
| **State location** | Server-side + per-browser |
| **Hosting** | Compliant SaaS (Fly.io / Render / Vercel-functions with DPA + SOC 2 inherited) |
| **What ships** | Canvas integration (LTI 1.3 launch + NRPS roster + AGS grade-back + Deep Linking 2.0), Instructor room (Console + Prep tabs), Discussions, Announcements, Cohort-aggregated SoTL telemetry, Cross-device sync, Mastery tracking + adaptive remediation across-device, High-stakes exam hosting with proctoring handoff |

Tier 3 activates **server + auth + compliance** stack. This is the
operational tier that unlocks Canvas integration, cohort analytics, and
cross-device functionality.

### Sequencing rationale

1. **Tier 1 establishes the content + pedagogy surface** at zero
   operational cost. Sophie becomes Anna's primary course site
   without taking on auth/FERPA/server burden.
2. **Tier 2 adds the differentiators** Quarto/MyST can't match
   (computational labs, diagnostics, adaptive remediation) — still
   without server. This is where Sophie genuinely substitutes for
   Codespaces + Canvas-content-tools.
3. **Tier 3 layers Canvas integration + cohort capabilities** on top
   of the proven Tier 1+2 surface. Operational complexity arrives
   *because* the content surface is mature enough to justify it, not
   *before*.

### Tier-boundary commitments

- **Schema forward-compatibility from day one**: per
  [ADR 0066](./0066-pseudonymous-first-data-model.md), all Tier 1/2
  record schemas use a stable `user_id` shape (per-browser UUID at
  Tier 1/2; LTI sub at Tier 3). Tier 2 → Tier 3 migration is
  mechanical, not a rewrite.
- **No Tier-3 affordances leak into Tier 1/2**: the static-deploy
  envelope is preserved; courses can run indefinitely at Tier 1/2 if
  Tier 3 never activates.
- **Tier 3 layers, doesn't replace**: existing Tier 1/2 affordances
  continue to work at Tier 3 (per-browser FSRS state migrates +
  continues; per-browser BKT state migrates + continues).

## Consequences

### Positive

- **Operational complexity pays for itself stage by stage**: Tier 1
  + 2 deploy as static sites; no infrastructure burden until Tier 3
  is genuinely needed.
- **Tenure-narrative incremental wins**: each tier completion is a
  defensible milestone. Tier 1 alone is "I built a course platform
  that replaces Quarto + Canvas content tools." Tier 2 is "I added
  computational labs + adaptive remediation." Tier 3 is "I integrated
  with Canvas + scaled to cohort analytics."
- **FERPA exposure is deferred until necessary**: Tier 1+2 hold no
  PII; Tier 3 is when the compliance vocabulary becomes load-bearing.
- **Compatible with AGPL license commitment**
  ([ADR 0024](./0024-license-agpl.md)): static-deploy at Tier 1+2 is
  trivially distributable; Tier 3 SaaS is also AGPL-compatible.
- **Backed off the "build everything at once" risk**: each tier has a
  clear "done" criterion; not done until done.

### Negative

- **Some features genuinely want Tier 3 capabilities sooner**:
  cross-device sync, instructor cohort view, LTI grade-back. Tier 3
  is operationally heavy; staging may feel slow for these. Mitigated
  by the existence of these features in *design* (per other ADRs)
  even before implementation, so the path is clear.
- **Schema forward-compatibility requires discipline**: every
  persisted-record change at Tier 1/2 must consider its Tier 3
  implications. Mitigated by the `createPedagogyRecord` helper +
  curriculum-CI audits.

### Neutral

- **Tier boundaries are not academic**: Sophie's existing
  per-browser state ([ADR 0007](./0007-persistence-indexeddb.md))
  already operates at the tier-1/2 envelope. The tier model
  formalizes what's already true; it doesn't introduce a new
  architectural constraint.

## Implementation notes

- Each ADR for course-website work declares its tier placement (see
  ADRs 0065–0073).
- Sprint planning organizes around tier boundaries; cross-tier
  sprints are explicitly flagged as exceptions.
- Per-sprint implementation plans (in `docs/plans/`) declare which
  tier(s) they advance.
- Schema-level forward-compatibility audited by curriculum-CI
  ([ADR 0045](./0045-pedagogical-diff.md)).

## References

- [Course-Website Platform Roadmap](../status/course-website-roadmap.md)
- [ADR 0023 — Vertical Slice First](./0023-vertical-slice-first.md)
- [ADR 0007 — Persistence (IndexedDB)](./0007-persistence-indexeddb.md)
- [ADR 0066 — Pseudonymous-First Data Model](./0066-pseudonymous-first-data-model.md)
