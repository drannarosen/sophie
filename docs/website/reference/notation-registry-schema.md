---
title: Notation Registry schema
short_title: Notation registry
description: YAML schema for a Sophie-LDS-compliant STEM course's notation-registry.yaml — the course-level declaration of canonical symbols, their meanings, units, code aliases, and common confusions. Includes a fully-filled ASTR 201 example.
tags: [pedagogy, reference, notation, schema, stem, lds, multirep]
---

# Notation Registry schema

The Notation Registry is a STEM course's declaration of *what
symbols this course commits to using*. Each concept in the
registry has a canonical symbol, a verbal label, units, a code
alias, and a list of common confusions. The registry is the
external source of truth that the [Representation Alignment Audit](../decisions/0043-notation-registry-multirep-alignment-audit.md)
checks chapters against — chapters are audited *against* the
registry, not the other way around.

The full rationale lives at
[ADR 0043 — Notation Registry + MultiRep + Representation Alignment Audit](../decisions/0043-notation-registry-multirep-alignment-audit.md).

## When does a course need this?

A course opts in by setting `math_and_units_standards.notation_registry`
in its [`pedagogy-contract.yaml`](pedagogy-contract-schema.md):

```yaml
math_and_units_standards:
  require_units: true
  notation_registry: "astr201"   # opts in
```

Without that declaration, the audit doesn't run. Non-STEM courses
(creative writing, intellectual history, etc.) skip the registry
entirely.

## File location

```
drannarosen/astr201/
  ├── pedagogy-contract.yaml      ← per ADR 0042
  ├── notation-registry.yaml      ← this file
  ├── teaching-decisions/         ← per ADR 0040
  └── src/content/...
```

Single file at repo root. Parallels ADR 0042's
`pedagogy-contract.yaml` placement.

## Schema overview

Top-level keys:

| Key | Type | Required | Purpose |
|---|---|---|---|
| `version` | string | required | Schema version (currently `"1"`) |
| `course` | string | required | Course slug, matches `pedagogy-contract.yaml.course.slug` |
| `last_updated` | ISO date | required | Most-recent revision date |
| `concepts` | list | required | The registry's concept entries |
| `extensions` | object | optional | Course-specific custom fields (passthrough mode) |

## Concept entry schema

Each concept entry has these fields:

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | kebab-case string | required | Stable identifier; referenced by `<MultiRep concept="…" />` |
| `verbal_label` | string | required | Plain-language name ("orbital radius") |
| `canonical_symbol` | string | required | The course's committed symbol ("r") |
| `latex` | string | required | LaTeX rendering (`"r"`, `"R_\\odot"`, `"\\mathcal{M}"`) |
| `units` | string | recommended | Unit specification (CGS primary; display units optional) |
| `code_alias` | string | recommended | Variable name convention for `<CodeCell>` references |
| `common_confusions` | list of objects | recommended | Symbols students conflate with this one |
| `introduced_in` | string | optional | Locator: `"module-NN/lecture-MM"` or chapter slug |
| `related_concepts` | list of concept `id`s | optional | Sibling concepts for cross-reference |
| `notes` | prose string | optional | Free-form authoring notes (not rendered to students) |

### `common_confusions` sub-schema

Each entry in `common_confusions` is an object:

| Field | Type | Required | Purpose |
|---|---|---|---|
| `symbol` | string | required | The confusable symbol |
| `meaning` | string | required | What the confusable symbol *actually* means |
| `concept_ref` | concept `id` | optional | Link to the other concept's registry entry if it has one |

Example:

```yaml
common_confusions:
  - symbol: "R"
    meaning: "stellar radius — reserved for the central body"
    concept_ref: "stellar-radius"
  - symbol: "d"
    meaning: "Earth-observer distance — a different concept"
    concept_ref: "earth-observer-distance"
```

The `concept_ref` field lets the registry encode a small
semantic graph — concepts that get conflated link to each other
explicitly.

## Fully-filled example: ASTR 201

A real `notation-registry.yaml` for ASTR 201 illustrating the
voice, depth, and cross-referencing expected.

```yaml
version: "1"
course: "astr201"
last_updated: "2026-05-14"

concepts:
  # --- Geometric & orbital quantities ---

  - id: "orbital-radius"
    verbal_label: "orbital radius"
    canonical_symbol: "r"
    latex: "r"
    units: "cm (CGS); AU (display)"
    code_alias: "r_au"
    common_confusions:
      - symbol: "R"
        meaning: "stellar radius — reserved for the central body"
        concept_ref: "stellar-radius"
      - symbol: "d"
        meaning: "Earth-observer distance — a different concept"
        concept_ref: "earth-observer-distance"
      - symbol: "a"
        meaning: "semi-major axis — equal to r only for circular orbits"
        concept_ref: "semi-major-axis"
    introduced_in: "module-02/lecture-04"
    related_concepts: ["semi-major-axis", "orbital-period"]

  - id: "semi-major-axis"
    verbal_label: "semi-major axis"
    canonical_symbol: "a"
    latex: "a"
    units: "cm (CGS); AU (display)"
    code_alias: "a_au"
    common_confusions:
      - symbol: "r"
        meaning: "instantaneous orbital radius — coincides with a only for circular orbits"
        concept_ref: "orbital-radius"
    introduced_in: "module-02/lecture-05"
    related_concepts: ["orbital-radius", "eccentricity"]

  - id: "stellar-radius"
    verbal_label: "stellar radius"
    canonical_symbol: "R"
    latex: "R"
    units: "cm (CGS); R_sun (display)"
    code_alias: "R_sun"
    common_confusions:
      - symbol: "r"
        meaning: "orbital radius — for the orbiting body, not the star"
        concept_ref: "orbital-radius"
    introduced_in: "module-03/lecture-01"
    related_concepts: ["solar-radius", "stellar-luminosity"]

  # --- Cosmological quantities ---

  - id: "redshift"
    verbal_label: "redshift"
    canonical_symbol: "z"
    latex: "z"
    units: "dimensionless"
    code_alias: "z"
    common_confusions:
      - symbol: "Z"
        meaning: "metallicity (mass fraction of metals) — unrelated"
        concept_ref: "metallicity"
      - symbol: "v/c"
        meaning: "valid only as the non-relativistic limit of z"
    introduced_in: "module-04/lecture-02"
    related_concepts: ["recession-velocity", "hubble-distance"]

  - id: "hubble-parameter"
    verbal_label: "Hubble parameter"
    canonical_symbol: "H"
    latex: "H"
    units: "1/s (CGS); km/s/Mpc (display)"
    code_alias: "H_kmsMpc"
    common_confusions:
      - symbol: "H_0"
        meaning: "Hubble parameter at the present epoch — a specific value of H"
    introduced_in: "module-04/lecture-03"
    related_concepts: ["hubble-distance", "cosmic-time"]
    notes: |
      The course distinguishes H (general redshift-dependent parameter)
      from H_0 (present-day value, the empirical constant). Some texts
      treat them interchangeably — we don't.

  # --- Stellar quantities ---

  - id: "stellar-luminosity"
    verbal_label: "stellar luminosity"
    canonical_symbol: "L"
    latex: "L"
    units: "erg/s (CGS); L_sun (display)"
    code_alias: "L_sun"
    common_confusions:
      - symbol: "F"
        meaning: "flux — power per unit area at the observer, not the source"
        concept_ref: "flux"
    introduced_in: "module-03/lecture-02"
    related_concepts: ["flux", "stellar-temperature"]

  - id: "flux"
    verbal_label: "flux"
    canonical_symbol: "F"
    latex: "F"
    units: "erg/s/cm^2 (CGS)"
    code_alias: "F_cgs"
    common_confusions:
      - symbol: "L"
        meaning: "luminosity — intrinsic source power, not observer-side"
        concept_ref: "stellar-luminosity"
      - symbol: "B"
        meaning: "specific intensity — per unit solid angle per unit frequency"
    introduced_in: "module-03/lecture-04"
    related_concepts: ["stellar-luminosity", "distance-modulus"]

extensions:
  research_context_for_astr201: |
    Symbol commitments are constrained by AAS journal convention so
    students transitioning to graduate-level reading aren't retrained.
```

## Authoring the registry

### When to add an entry

Add a concept to the registry when:

- It appears in a `<KeyEquation>` (audit NR1 would otherwise warn).
- It will appear in a `<MultiRep>` binding (audit MR1 would
  otherwise error).
- Students will encounter a confusable cognate symbol (the
  `common_confusions` field surfaces these proactively).

### When *not* to add an entry

Skip concepts where:

- The symbol is used once, in a single `<KeyEquation>`, with
  immediate prose definition, and never reused. The registry's
  purpose is *recurring* notation; one-off symbols don't need it.
- The symbol is a generic placeholder (*x*, *y*, *t* used in a
  general derivation example without specific meaning).

### How to evolve an entry

When a concept's meaning sharpens or a confusion is discovered:

1. Edit the entry directly.
2. Update `last_updated` at the top of the file.
3. Write a TDR (per [ADR 0040](../decisions/0040-teaching-decision-records.md))
   capturing the rationale if the change is load-bearing.

The registry is *append-mostly* but not strictly so — entries can
be edited or removed when the underlying curriculum decision
changes. The TDR provides the audit trail.

## Audit invariants this registry feeds

The [Representation Alignment Audit](../decisions/0043-notation-registry-multirep-alignment-audit.md#artifact-3-representation-alignment-audit-v1-8-invariants)
uses the registry to check:

- **NR1** — every `<KeyEquation>`'s primary symbol matches a
  registered concept's `canonical_symbol`.
- **NR2** — every registered concept is referenced by at least
  one chapter (or marked forward-looking).
- **NR3** — no symbol collisions across registered concepts.
- **NR4** — symbols with declared units appear in prose with
  unit context.
- **MR1** — every `<MultiRep concept="…" />` references a
  registered `concept.id`.
- **MR2** — `<RepEquation>` bindings match the concept's
  canonical symbol.
- **MR3** — `<RepCode>` bindings match the concept's
  `code_alias`.
- **MR4** — `<RepFigure>` alt text references the concept's
  verbal label or canonical symbol.

## Adding custom fields

The schema accepts `extensions:` at the top level (passthrough
mode). Course-specific metadata Sophie hasn't anticipated can be
carried there without blocking. Custom fields aren't audited or
rendered by Sophie at v1 unless the course adds its own logic.

```yaml
extensions:
  journal_convention_source: "AAS style guide 2024"
  graduate_course_alignment: "astr596"
```

## Rendering on the course site

A Sophie-LDS-compliant course renders the registry at
`/about-this-course/notation/` (analogous to the
`/about-this-course/pedagogy-contract/` and
`/about-this-course/ai-ledger/` routes per ADR 0042). The page
displays entries grouped by family (declared via the optional
`group` field or via `related_concepts` clustering) with:

- The canonical symbol, verbal label, units, code alias.
- A *common confusions* table.
- Cross-links to the first `introduced_in` chapter.
- A reverse index ("this symbol appears in: …chapters") sourced
  from the build-time index walk.

Implementation lands in the follow-up code PR per
[ADR 0043 Consequences](../decisions/0043-notation-registry-multirep-alignment-audit.md#consequences).
