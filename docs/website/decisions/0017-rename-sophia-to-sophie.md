---
date: 2026-05-09T00:00:00.000Z
tags:
  - naming
  - branding
  - foundation
status: shipped
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0017: Rename Sophia → Sophie

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

The platform was originally named **Sophia** (Greek σοφία, "wisdom").
The first README captured the rationale: scholarly pedigree (Hagia
Sophia, philosophy), recognizable etymology, no abbreviation needed.
Cultural saturation as a baby name was acknowledged as the known cost.

Three months into design (May 2026), revisiting the name surfaced
concerns the original analysis underweighted:

- **Brand collision with Hanson Robotics' Sophia robot.** That brand
  has substantial presence in *AI-in-education* search results — the
  exact context where this platform competes. Conflation risk is
  real, especially for external instructors searching for
  AI-authoring tools.
- **Tone mismatch with the product.** The platform's differentiator
  is *AI-native authoring* (a friendly, collaborative experience),
  not formal scholarly publishing. "Sophia" reads as a textbook
  publisher's brand; the product feels different.
- **Sub-brand readability.** "Sophia Astro" and "Sophia Compute"
  read as stiff academic imprints. "Sophie Astro" / "Sophie Compute"
  read as approachable, modern, memorable.

Cost of changing now (pre-implementation, no published packages,
docs only): ~30 minutes of mechanical find-replace plus this ADR.
Cost of changing after Phase 0 (after npm publish, after consumer
adoption): substantial — every consumer's `package.json` migrates,
SEO resets, link-rot.

This is the cheapest moment.

## Decision

The platform is renamed from **Sophia** to **Sophie** across all
artifacts: docs, package scopes, repo names, sub-brand patterns.

- Platform name: **Sophie**.
- npm scope: `@sophie/*` (`@sophie/schema`, `@sophie/components`,
  `@sophie/theme`, `@sophie/audit`, `@sophie/cli`,
  `@sophie/renderer-contract`, `@sophie/astro`,
  `@sophie/cosmic-playground`).
- GitHub org/repo: `drannarosen/sophie` (the platform repo);
  consumer course repos retain their per-course names.
- CLI binary: `sophie` (was `sophia`).
- Sub-brands: `Sophie Astro`, `Sophie Compute` (was `Sophia Astro`,
  `Sophia Compute`).
- Etymology: same Greek root; **Sophie is the diminutive of
  Sophia**, retaining the "wisdom" association.

## Rationale

- **Same etymological core** ("wisdom"). The rename doesn't
  abandon the meaning; it presents it differently.
- **Cleaner search-engine namespace.** "Sophie AI education" doesn't
  collide with the Hanson robot the way "Sophia AI education" does.
- **Tone-matches the product.** AI-native authoring is friendly and
  collaborative; the name should feel that way too.
- **Sub-brands read better.** "Sophie Astro" works; "Sophia Astro"
  is stiff.
- **No published packages yet.** This is the only window where the
  rename costs minutes rather than weeks.

## Alternatives considered

- **Keep Sophia.** Pros: muscle memory across 16 prior ADRs and 30+
  doc pages; etymology connection is more obvious to educated
  English readers; gravitas for formal academic settings. Cons: as
  documented above. Rejected.
- **Hypatia, Minerva, Urania, Aletheia** (alternatives surfaced in
  the original README's "Also considered"). Each has its own
  trade-offs (Hypatia: too obscure for non-classicist readers;
  Minerva: McGraw-Hill's pre-existing imprint; Urania: muse of
  astronomy specifically — loses the cross-disciplinary claim;
  Aletheia: even more philosophical-formal than Sophia). Rejected
  in favor of staying close to the original Sophia root.
- **A non-Greek name entirely** (e.g., "Beacon", "Lumen", "Codex").
  Rejected — the Greek-wisdom etymology is the connective tissue
  with the platform's pedagogical mission, and Sophie preserves it.

## Consequences

**Easier:**

- Cleaner brand.
- Friendlier sub-brands.
- Fewer "is this related to the Hanson robot?" emails.

**Harder:**

- ~30 minutes of find-replace across 30+ docs (this PR's work).
- Some readers will hear "Sophie" as the *diminutive* of "Sophia"
  — a "smaller" version of something else. Acceptable: every name
  has connotations; we trade Hanson conflation for diminutive
  perception.
- Anna's muscle memory has been trained on "Sophia" through this
  design phase. Re-training takes a few weeks of repetition.
- Existing brainstorming notes, slack messages, tweets (if any)
  reference the old name.

**Triggers:**

- Find-replace `Sophia` → `Sophie` and `sophia` → `sophie` across
  `docs/website/` (preserving capitalization). Skip `_archive/` —
  those files preserve the pre-rename historical record.
- Skip proper nouns that legitimately contain "sophia" (e.g.,
  `Hagia Sophia`, `philosophy`, references to *the* Sophia robot in
  this ADR's Context section).
- All future ADRs and docs use Sophie.
- This ADR itself uses Sophia in past tense ("the platform was
  named Sophia") and Sophie in present/future tense, marking the
  pivot.
- Earlier ADRs (0001–0016) get the rename applied for consistency;
  this is a cosmetic update, not a substantive change to those
  decisions.
- The historical record of the pre-rename docs lives in
  `/Users/anna/Teaching/sophie/_archive/`, which stays
  untouched.

## References

- Original naming rationale in
  `/Users/anna/Teaching/sophie/_archive/README.md` (the
  pre-conversion README).
- Brainstorming session, May 2026: naming revisit.
- Hanson Robotics' Sophia robot
  ([https://www.hansonrobotics.com/sophia/](https://www.hansonrobotics.com/sophia/))
  — the brand-collision context.
