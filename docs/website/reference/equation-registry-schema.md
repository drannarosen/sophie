---
title: Equation Registry schema
short_title: Equation registry
description: >-
  MDX schema for a Sophie equation registry entry — one file per equation
  under `src/content/equations/<id>.mdx`. Frontmatter declares the canonical
  shape (id, title, tex, symbols, optional constants / rearranged_forms /
  related); body holds the biography children (Observable, Assumption,
  BreaksWhen, CommonMisuse, DerivationStep). Chapters cite via
  `<KeyEquation refId>` / `<EquationRef refId>`. Per ADR 0060.
tags:
  - pedagogy
  - reference
  - equations
  - registry
  - schema
  - lds
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# Equation Registry schema

The Equation Registry is a course's declaration of *which equations
this course commits to teaching*. Each registry entry is a single
MDX file under `src/content/equations/<id>.mdx`. Frontmatter is the
structured contract (validated by Zod via Astro's content layer);
the body holds the biography prose authored once and cited from
chapters by `refId`.

The full rationale lives at [ADR 0060 — Registry Ecosystem](../decisions/0060-registry-ecosystem.md)
and [ADR 0046 — Equation Biography](../decisions/0046-equation-biography.md)
§R8 / §R9 / §R10 (the storage-migration amendment).

## When does a course need this?

A course uses the equation registry by:

1. Registering an `equations` content collection in
   `src/content.config.ts` with `EquationRegistryEntrySchema`:

   ```ts
   import { EquationRegistryEntrySchema } from "@sophie/core/schema";
   import { glob } from "astro/loaders";
   import { defineCollection } from "astro:content";

   const equations = defineCollection({
     loader: glob({ pattern: "**/*.mdx", base: "./src/content/equations" }),
     schema: EquationRegistryEntrySchema,
   });

   export const collections = { chapters, modules, equations };
   ```

2. Creating one MDX file per equation at
   `src/content/equations/<id>.mdx`.

3. Citing from chapter MDX via `<KeyEquation refId="..." />` blocks
   and `<EquationRef refId="..." />` inline references.

## File location

`src/content/equations/<id>.mdx` — one file per equation. The
file's basename (without `.mdx`) becomes the route slug at
`/equations/<id>` and the lookup key for `<KeyEquation refId>` /
`<EquationRef refId>` callsites.

## Frontmatter shape

```mdx
---
id: wiens-law
title: "Wien's Law"
tex: "\\lambda_{peak} = b \\, T^{-1}"
symbols: ["T", "\\lambda_{peak}"]
constants:
  - symbol: "b"
    value: "0.29"
    unit: "cm K"
    name: "Wien's displacement constant"
rearranged_forms:
  - tex: "T = b \\, \\lambda_{peak}^{-1}"
    solves_for: "T"
    label: "Temperature from peak wavelength"
related:
  - refId: "stefan-boltzmann"
    kind: "see-also"
    description: "Both link blackbody temperature to its emission."
tags: ["thermal", "spectroscopy", "blackbody"]
version: "1"
---
```

### Required fields

| Field     | Type                  | Constraint            |
| --------- | --------------------- | --------------------- |
| `id`      | `Slug` (kebab-case)   | URL-safe; matches filename basename. |
| `title`   | `NonEmptyString`      | Human-readable; rendered in cards. |
| `tex`     | `NonEmptyString`      | Primary `$$tex$$` form (KaTeX-rendered). |
| `symbols` | `NonEmptyString[]` (≥1) | Canonical TeX-form symbols; cross-checked against notation-registry by NR1/NR3/NR4 audit invariants. |

### Optional fields

| Field              | Type                            | Purpose                                                                |
| ------------------ | ------------------------------- | ---------------------------------------------------------------------- |
| `constants`        | `EquationConstant[]`            | Equation-specific physical constants (Wien's b, Newton's G, Planck's h). |
| `rearranged_forms` | `RearrangedForm[]`              | Sibling forms of the primary equation; rendered as a list under the main tex. |
| `related`          | `RelatedEquation[]`             | Structured cross-refs to prerequisite / see-also / derives-from registry entries. |
| `tags`             | `NonEmptyString[]`              | Discoverability hints.                                                 |
| `version`          | `NonEmptyString`                | Schema-version forward-compat seam (default `"1"`).                    |

### Sub-shapes

`EquationConstant`:

```ts
{
  symbol: NonEmptyString;   // e.g. "b"
  value:  NonEmptyString;   // e.g. "0.29" or "6.67430 \\times 10^{-8}"
  unit?:  NonEmptyString;   // e.g. "cm K"
  name?:  NonEmptyString;   // e.g. "Wien's displacement constant"
}
```

`RearrangedForm`:

```ts
{
  tex:        NonEmptyString;   // KaTeX-rendered
  solves_for: NonEmptyString;   // which symbol the rearranged form solves for
  label?:     NonEmptyString;   // optional human-readable description
}
```

`RelatedEquation`:

```ts
{
  refId:        Slug;
  kind:         "see-also" | "prereq" | "derives-from";
  description?: NonEmptyString;
}
```

## Body shape

The MDX body holds the biography children — the deep pedagogy
extracted to a per-entry `Biography` payload by the registry
walker. Imports the same components ADR 0046 declares; chapter-
inline biography is no longer supported (per ADR 0046 §R8).

```mdx
import {
  Assumption,
  BreaksWhen,
  CommonMisuse,
  DerivationStep,
  Observable,
} from "@sophie/components";

<Observable>
  The wavelength at which a thermal source's emission spectrum peaks.
</Observable>

<Assumption type="thermal-equilibrium">
  The source is in local thermodynamic equilibrium.
</Assumption>

<BreaksWhen>
  Non-thermal emission; absorption-dominated spectra.
</BreaksWhen>

<CommonMisuse misconception="wiens-law-absorption-spectra">
  Applying Wien's law to an absorption-line spectrum.
</CommonMisuse>

<DerivationStep label="Start from Planck's law">
  $$B_\lambda(T) = ...$$
</DerivationStep>
```

Every biography child is **optional** (per-equation opt-in per ADR
0046). The audit invariants E7 / E8 / E9 only fire when biography
children are present; equations without biographies are valid
registry entries that render with just title + tex.

## Cross-references

Chapters cite registry entries in two ways:

- **`<KeyEquation refId="X" />`** — block-level inclusion of the
  full card (framing prose → title → tex → biography → derivation
  accordion → related footer). Renders the entry at the citation
  site.
- **`<EquationRef refId="X" />`** — inline cross-reference; renders
  the equation's title with a Sigma icon, opens a hover popover
  with the title + KaTeX tex + biography summary, links to
  `/equations/<id>`.

## Audit invariants (R-prefix)

The registry layer is policed by four audit invariants per ADR
0060 §Decision:

| Code | Severity | Fires when…                                                                              |
| ---- | -------- | ---------------------------------------------------------------------------------------- |
| R1   | ERROR    | Chapter cites `refId="X"` but no registry entry with `id="X"` exists.                    |
| R2   | WARNING  | Registry declares an entry but no chapter cites it (orphan declaration).                 |
| R3   | ERROR    | Registry entry fails `EquationRegistryEntrySchema` validation (defense in depth).        |
| R4   | WARNING  | `related[].refId` points at a non-existent registry entry.                               |

R-prefix invariants compose with the existing E-prefix family
(E7 / E8 / E9 / E10) and the NR-prefix family (NR1 / NR3 / NR4)
to police the full equation-pedagogy chain.

## References

- [ADR 0060 — Registry Ecosystem](../decisions/0060-registry-ecosystem.md) —
  the canonical decision.
- [ADR 0046 — Equation Biography](../decisions/0046-equation-biography.md) —
  §R8 / §R9 / §R10 (storage migration to registry; four new fields;
  units-from-notation-registry).
- [ADR 0058 — Epistemic Component Contract](../decisions/0058-epistemic-component-contract.md) —
  the 8-role taxonomy; biography children declare their roles.
- [Notation Registry schema](./notation-registry-schema.md) — the
  symbols listed in `symbols: [...]` are validated against this
  registry by the NR1/NR3/NR4 audit invariants.
- [Equation Biography schema](./equation-biography-schema.md) —
  the deep-detail reference for the body biography children.
- [Chapter components reference](./chapter-components.md) —
  `<KeyEquation refId>` and `<EquationRef refId>` authoring shapes.
