---
date: 2026-05-21T00:00:00.000Z
tags:
  - migration
  - playbook
  - tdr
  - process
  - reasoning-os
status: shipped
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0064: Chapter-migration playbook

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Amends**: [0040](./0040-teaching-decision-records.md) (extends the TDR pattern with a fixed pilot-report template)
- **Related**: [0001](./0001-platform-not-monorepo.md), [0030](./0030-audience-and-ai-author-model.md), [0038](./0038-pedagogy-index-pattern.md), [0040](./0040-teaching-decision-records.md), [0055](./0055-squash-merge-for-code-prs.md), [0058](./0058-epistemic-component-contract.md), [0063](./0063-omiflow-composite-primitive.md)
:::

## Context

The ASTR 201 Module 2 Lecture 3 pilot (Spectra & Composition) landed on
2026-05-20 in PR #143 — see the [pilot report](../pilots/m2-l3-spectra-composition.md)
for the full evidence record. The pilot was scoped as the motivating
chapter for [ADR 0063](./0063-omiflow-composite-primitive.md)'s
`<OMIFlow>` graduation, but it ran into three findings that go beyond
that single ADR's scope and need to be locked as doctrine before the
*second* chapter migration:

1. **Platform-shaping work dominated chapter-conversion work.** Of
   roughly 16 hours spent across the session, ~13 went to platform
   changes (visual polish sprints E–J, Sprint I reading furniture,
   two verify-pass hardening rounds) and only ~3 went to the
   chapter conversion itself. The next migration risks paying the
   same discovery cost from scratch unless the pattern is named.
2. **A bug latent in `<GlossaryTerm>` for months only surfaced because
   the pilot had high enough GlossaryTerm density to trigger it.**
   The HTML5 implied-end-tag rule (a `<p>` opening inside an inline
   element auto-closes the surrounding chapter paragraph) split
   18 of 22 chapter sentences. The fix lives in PR #143; the
   *generalization* — that any inline-context HTML injection has the
   same shape — has not been codified anywhere.
3. **The pilot's structure invented itself.** The report's section
   ordering, the OMI-arc map, the pedagogical-decisions log, the
   surprises section — none of these were planned; they emerged from
   the work. The second pilot needs them as a template, not as
   examples to be re-invented.

This ADR locks the playbook so the next chapter migration is bounded,
the worked-example artifacts are comparable across pilots, and the
class of bugs Bug 1 belonged to is closed by author-author convention
rather than re-discovered.

The pilot report is the *evidence base*; this ADR is the *doctrine*.
The report stays as a worked example; this ADR's template makes the
report's shape normative for future pilots.

## Decision

Six locked rules govern chapter migrations to Sophie.

### 1. Seven-step migration protocol

Every chapter migration **shall** follow these steps in order:

1. **Inventory the source.** Count shortcode usage, callout types,
   `GlossaryTerm` density (terms × matching definition asides),
   figure count, equation count, OMI-arc structure. Output: a
   one-page inventory pinned to the pilot report's *Shortcode
   dictionary* section.
2. **Identify gaps against the platform.** Any source shortcode or
   pedagogy pattern that lacks a Sophie component is a gap. File a
   platform issue against `drannarosen/sophie` **and halt
   conversion** until the gap is resolved (see §3). Exception:
   doc-level cosmetic gaps (e.g. a missing icon) may ship with a
   tracked TODO comment.
3. **Baseline-test the existing smoke fixture.** Run the Playwright
   suite at desktop + mobile + dark mode *before* relying on the
   chapter's specifics, so regressions surface as the conversion
   adds content.
4. **Stub the chapter with frontmatter only.** Verify any framing
   declaration (e.g. `framing: "OMI"` for OF-2 conformance per
   [ADR 0063](./0063-omiflow-composite-primitive.md)) is correctly
   enforced before content lands.
5. **Convert section by section, atomic commit per Part.** Run
   `pnpm exec biome check` and `pnpm turbo run test --filter=@sophie/smoke`
   after each Part. Do not batch multi-Part commits.
6. **Re-verify end-to-end after each Part lands.** Budget ~30% of
   per-chapter time on verification. Visual regression, paragraph-
   split inspection, dark-mode pass, and mobile-viewport pass are
   all part of "verify."
7. **Ship.** Add the chapter to its consumer-course module if ready;
   otherwise hold in `examples/smoke` for staging.

### 2. Per-pilot TDR template (extends ADR 0040)

Every chapter migration **shall** produce a pilot report at
`docs/website/pilots/<chapter-slug>.md`. This extends
[ADR 0040](./0040-teaching-decision-records.md)'s TDR pattern from
"per-decision audit trail" to "per-pilot evidence record." The
template's sections are fixed; their *contents* are pilot-specific.

The template:

| Section | Purpose |
| --- | --- |
| **Pilot context** | What chapter, why it's the next pilot, what consumer course it serves, what scope this report covers. |
| **Shortcode → component dictionary** | One row per source-shortcode or pattern. Mark gaps explicitly. |
| **Pedagogy structure map** | OMI arcs (if applicable), eight-role component-mapping decisions per [ADR 0058](./0058-epistemic-component-contract.md), and any multi-representation usage per [ADR 0043](./0043-notation-registry-multirep-alignment-audit.md). |
| **Pedagogical decisions log** | Departures from a literal source-rename; authoring judgments. Cross-link to TDRs in the consumer-course repo when relevant. |
| **Time spent per phase** | Rough log. Distinguish conversion-time from platform-shaping-time. |
| **Surprises** | Numbered list of *unanticipated* findings. Each one is a candidate for either a fix-and-close (one-off) or a doctrine bump (pattern). The §6 inline-block-leak rule below originated as one of these. |
| **Recommendations + ADR backlog** | What this pilot teaches the next one. Candidate ADRs go here, not directly into the audit trail. |
| **Platform issues to file** | One bullet per gap identified in §2 above. Pre-filed when blocking the conversion. |
| **Success criteria** | The acceptance checklist for the pilot's stated goal. |

A markdown skeleton lives at
[`docs/website/pilots/_template.md`](../pilots/_template.md). Copy it
verbatim and edit; do not reshape the section list.

### 3. Gap-handling protocol — missing components block

When inventory (§1.1) surfaces a Sophie-component gap, the conversion
**shall** halt until the gap is resolved. Three resolution paths,
in priority order:

1. **Implement the missing component** in `@sophie/components` and
   land it through the normal PR flow.
2. **Substitute a semantically equivalent component** when one
   exists — e.g. Quarto's `:::{.callout-warning}` "myth-busting"
   block → `<Callout variant="misconception">`. The substitution
   must preserve the *epistemic role* (per
   [ADR 0058](./0058-epistemic-component-contract.md)), not just the
   visual.
3. **File the gap as a platform issue and pause** until path 1 or
   path 2 is available. The default is *not* to ship an inline
   workaround.

The M2-L3 pilot's `<WorkedExample>` gap was a doctrine violation in
hindsight: the chapter shipped five worked examples approximated as
`<Callout variant="deep-dive" title="Worked Example N — …">`, which
loses the structural-role signal a dedicated `<WorkedExample>`
component would have carried. Going forward this approximation is
not allowed; the gap blocks the next migration that surfaces it.

Exception: doc-level cosmetic gaps (a missing icon variant, a
missing Tailwind utility) may ship inline with a tracked TODO + an
issue link. The test: does the gap distort *epistemic structure*
(blocking) or just *finish* (deferrable)?

### 4. Second-chapter criterion — structural diversity required

No two consecutive pilots **may** exercise the same dominant
component-density profile. Bug-discovery efficacy depends on profile
coverage: M2-L3 surfaced Bug 1 because of GlossaryTerm density; a
second OMI-heavy spectroscopy-style chapter would mostly re-prove
what's already proven and miss the next class of bugs.

The next migration after a pilot **shall** differ in at least one of:

- **Component density profile** (e.g. high `<KeyEquation>` density
  with multi-equation paragraphs, not GlossaryTerm density).
- **Math complexity** (heavy display math + cross-referenced
  derivations vs. mostly inline math).
- **Multi-representation usage** (chapters that use
  `<MultiRep>` heavily vs. chapters that don't).
- **Track-A / Track-B forking** (once the platform supports it; gap
  #4 in the M2-L3 report).

The pilot report's *Surprises* section is the primary source for
the "what's still uncovered" judgment; the next chapter's selection
**should** cite which gap in the surprise-coverage matrix it
addresses.

### 5. Platform-change-with-chapter PR convention

When platform changes fall out of a pilot, the **default** is to
bundle them into the same PR as the chapter. [ADR 0055](./0055-squash-merge-for-code-prs.md)'s
squash-merge collapses the history regardless, and the bundled PR
keeps the *evidence-and-fix* pairing intact for git archaeology.

The **alternative** — splitting platform changes off into a separate
PR — is reasonable when:

- The platform change's blast radius substantially exceeds the
  chapter's (a renamed schema field used by N other components, a
  cross-cutting CSS reorganization).
- The platform change passes CI on its own merits and the chapter
  PR would be artificially blocked waiting for it.
- A reviewer specifically asks for the split.

The default is **bundle**, not split. Splitting is a deliberate
exception; document the reason in the split PR's description.

### 6. Component-author safety guideline — inline-context block-leak

This locks the generalization of Bug 1 (the M2-L3 pilot's
`<GlossaryTerm>` paragraph-split issue) as a component-author rule.

Any component that:

- **renders via `dangerouslySetInnerHTML`** (or Astro's `set:html`),
- **inside an inline container** (`<span>`, `<a>`, `<em>`,
  `<strong>`, `<label>` in inline contexts, …), and
- **inside chapter prose** (any descendant of an MDX-emitted `<p>`)

**shall** EITHER:

- normalize the injected body to remove block-level wrappers — see
  `stripWrappingParagraph` in
  [`packages/components/src/components/GlossaryTerm/GlossaryTerm.tsx`](https://github.com/drannarosen/sophie/blob/main/packages/components/src/components/GlossaryTerm/GlossaryTerm.tsx)
  for the canonical implementation, OR
- use a **flow-content container** (`<div>` with CSS `display:
  inline` is the standard pattern; see
  [`Objective.tsx`](https://github.com/drannarosen/sophie/blob/main/packages/components/src/components/Objective/Objective.tsx)
  and [`CourseObjectives.astro`](https://github.com/drannarosen/sophie/blob/main/packages/astro/src/components/CourseObjectives.astro)).

Why the rule matters: HTML5's "if a `<p>` open tag is seen in a `<p>`
button-scope, close the open `<p>`" parser rule auto-closes the
outer chapter paragraph when an inner `<p>` opens. Components that
inject mdast→html content (which `mdast-util-to-hast` commonly
wraps in `<p>`) into inline containers inside chapter prose
*structurally* trigger this. The bug is silent — the rendered
chapter looks reasonable — but it splits sentences across multiple
top-level paragraphs and breaks reading flow.

Safe shapes that do NOT trigger this rule (and do NOT need the
guideline applied):

- Injection into a block container (`<div>`, `<section>`, `<dd>`,
  `<li>`). The mdast wrapper `<p>` opens as a normal block child;
  no parent-paragraph close.
- Injection into a Radix-Portal-rendered popover or hover-card.
  Portals render outside the chapter prose's DOM context.
- Injection of KaTeX inline output, which is span-only and never
  contains `<p>`.
- Injection of build-time-sanitized SVG icon strings (no `<p>`
  content possible).

Audit follow-up: once a third instance lands (currently two —
`GlossaryTerm` footnote + the `Objective` / `CourseObjectives`
pair), elevate this guideline to a custom Biome lint rule.

## Rationale

**Why now.** Sophie is one pilot in. The cost of locking the
playbook *before* the second pilot is one ADR plus a template file;
the cost of locking it *after* the second pilot is whatever the
second pilot's surprises end up being, plus retroactive doctrine
reconciliation. The cheaper play is now.

**Why Frame 3 (decision framework) rather than Frame 1 (mechanical
dictionary) or Frame 2 (full pedagogy-restructuring playbook).** The
Quarto → Sophie shortcode dictionary the M2-L3 pilot used is
chapter-source-specific: the next migration might come from a
Jupyter notebook, a `.tex` source, or hand-written LMS HTML, and
its dictionary will look different. Encoding the M2-L3 dictionary
in the ADR would freeze it; keeping it in the pilot report leaves
each future pilot free to build its own. The same logic applies to
OMI-arc maps and per-chapter eight-role decisions: those are
*evidence* about the chapter, not *decisions* about the platform.

What's load-bearing for *every* future pilot — the protocol, the
template, the gap rule, the diversity criterion, the PR convention,
and the inline-block-leak rule — is what gets locked.

**Why the inline-block-leak rule is in this ADR rather than its
own.** The pilot's recommendation called out the possibility of a
standalone ADR for it. The decision to fold it in: a single instance
(Bug 1) plus a defensive same-class fix (PR #144) is not enough
data points to justify a standalone ADR. Folding into 0064 keeps
the *pilot-driven doctrine* together — this is what the pilot
taught us; this is what we lock as a result. When the rule needs
to grow (third instance → lint rule promotion), it earns its own
ADR or amends 0064.

**Why "gap blocks conversion" instead of "gap can be worked around."**
The M2-L3 pilot demonstrated that workarounds erode the
*epistemic-role* signal that distinguishes Sophie from other
authoring platforms. A `<Callout variant="deep-dive">` workaround
for a missing `<WorkedExample>` looks fine in render but cannot be
audited against the eight-role contract. The platform's
distinguishing claim is the contract; honoring it means refusing
shortcuts that dilute it. The pre-launch posture is the right time
to be strict: there are no production students inconvenienced by
the halt.

## Alternatives considered

- **Frame 1 — mechanical playbook (shortcode dictionary as ADR
  doctrine).** Pros: very concrete; future migrations have a
  copy-paste reference. Cons: source-format-specific (Quarto today,
  something else next); freezes evolving dictionary in an audit
  trail that's hard to amend. Rejected — the dictionary belongs in
  the pilot report, which is the right home for evolving evidence.

- **Frame 2 — full pedagogy-restructuring playbook (math audit +
  OMIFlow opportunity scoring + eight-role tables).** Pros: covers
  the chapter-shaping work that's invisible in Frame 1. Cons: most
  of this is chapter-specific judgment that resists doctrine
  encoding; trying to lock it as doctrine produces a 1000-line ADR
  that future migrations don't actually consult. Rejected — those
  judgments stay in each pilot report's *pedagogical decisions log*
  section.

- **Defer until the second pilot ships.** Pros: more data; the second
  pilot may surface a different load-bearing pattern. Cons: the
  second pilot then runs without a playbook and inherits all the
  re-discovery cost the first one paid. Rejected — the cost of an
  ADR amendment after pilot 2 is much smaller than the cost of pilot
  2 re-paying pilot 1's bill.

- **Standalone ADR for the inline-block-leak rule.** Pros: focused
  scope. Cons: thin evidence base (two instances total — Bug 1 and
  PR #144's defensive fixes) does not justify a standalone audit
  trail entry yet. Rejected — fold into §6 here; promote to its own
  ADR when the lint rule lands.

## Consequences

**Easier:**

- The next chapter migration has a copy-pasteable seven-step
  protocol and a template that produces a comparable evidence
  record without re-deriving the report shape.
- Cross-pilot diffing becomes meaningful — the *Surprises* section
  of pilot N can be checked against the gap-coverage of pilot N+1.
- The platform-vs-chapter time split is now an explicit metric in
  the template, so the next migration can budget against it.
- The §6 safety guideline gives component authors a single
  reference for the inline-HTML-injection class of bugs, replacing
  the per-callsite re-derivation the audit had to do.

**Harder:**

- §3's strict gap-blocking rule means a future migration may halt
  for days waiting on a missing component to land. The pre-launch
  no-students posture absorbs this; once students exist, this rule
  may need an exception path.
- §2's fixed TDR template removes the freedom future pilots had to
  invent their own structure. Mitigation: §2 lists *sections*, not
  contents; pilots remain free to surface what their chapter
  surfaces.
- §6's "third instance → lint rule" trigger needs someone to notice
  when the third instance lands. The audit-invariant follow-up is
  *informal* until that lint rule exists; if a fourth instance
  ships before the lint rule, the discipline failed.

**Triggers:**

- [`docs/website/pilots/_template.md`](../pilots/_template.md): create
  the markdown skeleton matching §2's section list. (Triggered by
  this ADR; lands alongside it.)
- [`docs/website/pilots/m2-l3-spectra-composition.md`](../pilots/m2-l3-spectra-composition.md):
  align with §2's template (re-order sections, rename
  *OMI arc map* → *Pedagogy structure map*) so the worked example
  matches the doctrine.
- [ADR 0040](./0040-teaching-decision-records.md): receives a one-line
  amendment noting that ADR 0064 extends the TDR pattern with the
  pilot-report template variant. (Frontmatter `Amends:` already
  declared on this ADR.)
- Custom Biome rule for §6's inline-block-leak shape, once a third
  instance lands.
- M2-L3 pilot report's *Platform issues* section (§3 of the report)
  has six unfiled platform issues. They **should** be filed against
  `drannarosen/sophie` before the next pilot starts, per §3 of
  this ADR.

## References

- [pilots/m2-l3-spectra-composition.md](../pilots/m2-l3-spectra-composition.md) —
  evidence base; aligned to this ADR's TDR template post-acceptance.
- [PR #143](https://github.com/drannarosen/sophie/pull/143) — the
  M2-L3 pilot conversion + visual-polish sprints + Sprint I reading
  furniture + Bug 1 + Bug 2 hardening.
- [PR #144](https://github.com/drannarosen/sophie/pull/144) — the
  inline-block-leak audit and the two defensive fixes that
  motivated §6's worked-example pair.
- [ADR 0040](./0040-teaching-decision-records.md) — the TDR pattern
  this ADR extends. (Frontmatter `Amends:`.)
- [ADR 0055](./0055-squash-merge-for-code-prs.md) — the squash-merge
  convention this ADR's §5 references.
- [ADR 0058](./0058-epistemic-component-contract.md) — the eight-role
  contract that the gap rule (§3) and the template's pedagogy
  structure map (§2) both rest on.
- [ADR 0063](./0063-omiflow-composite-primitive.md) — the chapter-
  level OF-2 conformance check the protocol's step 4 verifies.
