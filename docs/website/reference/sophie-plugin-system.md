---
title: Sophie LDS Content Plugin System reference
short_title: Sophie plugin system
description: User-facing specification for the Sophie LDS content plugin API — plugin shape, override semantics, autonomy guarantees.
tags: [reference, plugins, commons, cross-course, sophie-lds]
---

# Sophie LDS Content Plugin System

The user-facing specification for the LDS-content plugin API. The
underlying decision lives in
[ADR 0048](../decisions/0048-sophie-lds-content-plugins.md); this
page pins the contract.

Plugins ship **content additions** — pre-authored misconceptions,
concepts, interventions, equation biographies, and (rarely) moves
— that consumer courses can adopt, override per-entry, or ignore
entirely. Plugins do **not** ship audit invariants and **cannot**
gate consumer-course CI.

## Plugin shape

A plugin is a TypeScript package exporting a default
`SophiePlugin` value:

```ts
import type {
  SophiePlugin,
  MisconceptionEntry,
  ConceptEntry,
  InterventionEntry,
  EquationBiographyEntry,
  MoveEntry,
} from "@sophie/cli";

const myPlugin: SophiePlugin = {
  name: "@sophie/discipline-astrophysics",
  version: "1.0.0",
  description: "Astrophysics-discipline LDS content. Misconception taxonomy following Bailey (2011) + Sadler (1992).",
  taxonomic_stance: "bailey-2011-extended", // optional but
                                            // strongly encouraged
  contributes: {
    misconceptions: [...],
    concepts: [...],
    interventions: [...],
    equation_biographies: [...],
    moves: [...],   // rare
  },
};

export default myPlugin;
```

### Required fields

- **`name`** — fully-qualified package name; must match
  `package.json`.
- **`version`** — semver string; must match `package.json`.
- **`contributes`** — the content block. All sub-arrays optional;
  v1 of [ADR 0048](../decisions/0048-sophie-lds-content-plugins.md)
  ships `@sophie/commons-universal` and
  `@sophie/discipline-astrophysics` with empty `contributes`
  blocks intentionally (the content lands in successor ADRs).
  Production content-bearing plugins should have at least one
  non-empty sub-array, but empty-sentinel packages are valid.

### Optional fields

- **`description`** — one-line summary surfaced in `sophie audit
  --plugins` listing.
- **`taxonomic_stance`** — short slug naming the taxonomic
  framework the plugin's content follows. Strongly encouraged for
  content-bearing plugins so consumers can compare taxonomies
  before adopting. Examples: `"bailey-2011-extended"`,
  `"hestenes-mechanics-baseline"`, `"compcert-misconceptions"`.

## `contributes` sub-block shapes

Each sub-block is an array of entries with the same shape as
local declarations in consumer courses. The plugin loader merges
them into the populated `PedagogyIndex` before consumer chapters,
so consumer chapters can override.

### `misconceptions`

```ts
type MisconceptionEntry = {
  slug: string;
  description: string;
  prerequisite_misconceptions?: string[];
  depth?: "light" | "substantial"; // per ADR 0044
  references?: string[]; // citations
};
```

Same shape as `misconception-graph.yaml` entries (per
ADR 0044's MisconceptionGraphSchema).

### `concepts`

```ts
type ConceptEntry = {
  slug: string;
  canonical_symbol: string;
  aliases?: string[];
  unit?: string;
  description?: string;
  equivalent_to?: string[]; // per ADR 0043
};
```

Same shape as `notation-registry.yaml` entries (per ADR 0043).

### `interventions`

```ts
type InterventionEntry = {
  slug: string;
  type: string; // catalog type per ADR 0041
  move: string; // parent move slug per ADR 0044 I4
  addresses: string; // misconception slug
  body_template: string;
  depth?: "light" | "substantial";
};
```

Same shape as `intervention-index.ts` entries (per ADR 0044).

### `equation_biographies`

```ts
type EquationBiographyEntry = {
  slug: string; // matches <KeyEquation id=...>
  title: string;
  math: string; // LaTeX
  observable?: string;
  assumptions?: Array<{ type?: string; body: string }>;
  units?: Array<{ symbol: string; unit: string }>;
  breaks_when?: string;
  common_misuses?: Array<{ misconception?: string; body: string }>;
};
```

Same shape as `<KeyEquation>` children (per ADR 0046). A
consumer chapter can either `<KeyEquation>` the equation locally
(filling biography children) or reference the plugin's pre-
authored biography by slug match.

### `moves` (rare)

```ts
type MoveEntry = {
  slug: string;
  citation: string;
  body_template?: string;
  instantiated_by?: string[]; // component patterns
  validated_in?: string[]; // per ADR 0041
};
```

Same shape as `move-index.ts` entries. Most plugins won't
contribute moves; the slot is reserved.

## Plugin registration in consumer courses

Consumer course declares plugins in `sophie.config.ts`:

```ts
// courses/astr201-fa26/sophie.config.ts
import { defineSophieConfig } from "@sophie/cli";
import commonsUniversal from "@sophie/commons-universal";
import disciplineAstrophysics from "@sophie/discipline-astrophysics";

export default defineSophieConfig({
  course: "astr201",
  semester: "fa26",
  plugins: [commonsUniversal, disciplineAstrophysics],
});
```

Plugin order matters: later plugins override earlier ones on
entry-slug collision (last-write-wins). Conventional ordering:
**universal core first, then discipline-specific.**

## Per-field overrides and per-entry excludes

A consumer course can modify individual *fields* of any plugin
entry while inheriting the rest, or drop plugin entries entirely.
Both surfaces live in `pedagogy-contract.yaml`:

```yaml
# courses/astr201-fa26/pedagogy-contract.yaml
plugins:
  overrides:
    misconceptions:
      intensity-vs-luminosity:
        description: |
          ASTR 201 framing: students conflate the *measured energy
          per unit area at Earth* (intensity / flux) with the
          *total energy emitted per unit time* (luminosity).
        # Other fields unchanged from plugin default.
    concepts:
      inverse-square-law:
        aliases_add: ["irradiance"]              # extend array
        aliases_remove: ["legacy-irradiance"]    # trim array
        # Other fields unchanged.
    interventions:
      flux-distance-contrasting-cases:
        body_template: |
          Override body specific to ASTR 201 ordering.
  excludes:
    misconceptions:
      - unwanted-plugin-slug   # drop entry entirely (rare)
```

### Override operators

Three operators on individual fields, plus a separate `excludes:`
block for whole-entry removal:

- **`<field>:`** — replace the plugin's value for this scalar
  field entirely. Other fields inherit from the plugin.
- **`<field>_add:`** — for array fields (`aliases`,
  `references`, `prerequisite_misconceptions`, etc.), append to
  the plugin's array rather than replacing.
- **`<field>_remove:`** — for array fields, remove specific
  entries from the plugin's array.
- **`excludes:`** block — drop a plugin entry entirely. Use
  sparingly; the more common case is overriding individual
  fields.

Override granularity is **per-entry, per-field**. A consumer
course can keep 19 of 20 plugin-contributed misconceptions and
modify one field of one entry without affecting the other 19.

**Nested-field overrides are not supported in v1.** To modify
one element of an array-of-objects field (e.g., one assumption
within an `assumptions[]` array), replace the entire field
using the plain `<field>:` operator. A future ADR may extend
the grammar if real authoring data shows the need.

## Autonomy guarantees (per ADR 0048)

The plugin system enforces three autonomy guarantees. These are
load-bearing — they are what makes the plugin system additive
without becoming coercive.

### 1. No plugin is required

A course with no `plugins:` in `sophie.config.ts` authors all
content locally. The pedagogy audit validates exactly as if
plugins did not exist. The v1 default for new courses is
**no plugins declared.**

### 2. Per-entry override is always allowed

Any plugin-contributed entry can be overridden by the consumer
course. The CLI does not gate overrides; the override mechanism
is unconditional.

### 3. Plugins cannot impose ERROR-level invariants

Plugin `contributes` blocks have **no `invariants` field**. A
plugin cannot ship audit invariants that gate consumer-course
CI. If a future ADR relaxes this, plugin-declared invariants will
be **capped at WARNING** — ERROR-severity invariants are reserved
for foundation ADRs and consumer-course local audit_overrides
(per [ADR 0053](../decisions/0053-conformance-failure-modes.md)).

## Provenance in audit output

`sophie audit` surfaces which entries came from plugins:

```text
$ sophie audit chapter:flux-luminosity-distance --verbose

MG3 INFO: chapter:flux-luminosity-distance references misconception
         `intensity-vs-luminosity` (from plugin
         @sophie/discipline-astrophysics@1.0.0)
         Not addressed by an <Intervention> within this chapter,
         but addressed in chapter:luminosity-distance (OK).
```

When an audit finding touches a plugin-contributed entry, the
plugin name + version surfaces in the verbose output. This
prevents authors from being confused about which `intensity-vs-
luminosity` is the canonical declaration.

## Plugin discovery and versioning

### Discovery

The CLI reads `sophie.config.ts` (or `sophie.config.js` for
JavaScript-only consumer projects) at audit time. Plugins are
ordinary npm packages; `pnpm install` resolves them.

### Versioning

Plugins follow semver. The pnpm lockfile pins exact versions; a
consumer course's `pnpm-lock.yaml` captures plugin versions for
reproducible audits.

**Breaking changes require a major version bump.** Per ADR 0048:

- Adding a new entry slug = **minor** bump.
- Changing an entry's body fields = **patch** bump.
- Renaming an entry slug = **major** bump (consumer references
  to the old slug break).
- Removing an entry = **major** bump.

Plugin authors are responsible for honoring these conventions;
the CLI does not enforce semver at audit time.

### Version pinning

A consumer course pins plugin versions via standard pnpm:

```json
// courses/astr201-fa26/package.json
{
  "dependencies": {
    "@sophie/commons-universal": "^1.0.0",
    "@sophie/discipline-astrophysics": "^1.0.0"
  }
}
```

The course-version tag (per
[ADR 0051](../decisions/0051-chapter-status-course-versioning.md))
captures plugin versions transitively: `astr201-fa26-v1.0.0`
includes the lockfile state at tag time.

## Empty v1 packages

Per ADR 0048, the v1 packages ship empty:

- `@sophie/commons-universal@1.0.0` — empty `contributes` block.
- `@sophie/discipline-astrophysics@1.0.0` — empty `contributes`
  block.

The empty packages enable consumer-side imports without errors;
content lands in successor ADRs (0048-A, 0048-B, 0048-C).
Consumer courses can declare these plugins in v1 without
functional impact — the audit operates as if the plugins were
absent.

## Authoring a third-party plugin

External adopters can author their own plugins. The conventions:

- **Naming**: `@<scope>/sophie-plugin-<name>` (third-party) or
  `@sophie/<name>` (in the Sophie monorepo).
- **Documentation**: README must declare `taxonomic_stance` in
  prose; `description` field in the plugin export should
  summarize.
- **Testing**: vitest unit tests covering the
  `contributes` block's well-formedness. Sophie's CLI validates
  plugin shape at load time; runtime errors during load are
  fatal.

External plugins are not endorsed by the Sophie project; the
plugin system is intentionally pluralistic. The Sophie GitHub
org maintains only the `@sophie/`-namespaced plugins.

## See also

- [ADR 0048 — Sophie LDS Content Plugin System](../decisions/0048-sophie-lds-content-plugins.md)
- [ADR 0042 — Pedagogy Contract + AI Contribution Ledger](../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md)
  — `pedagogy-contract.yaml` is the override surface.
- [ADR 0043 — Notation Registry + MultiRep + Alignment Audit](../decisions/0043-notation-registry-multirep-alignment-audit.md)
  — concept entry shape.
- [ADR 0044 — Misconception Graph + Intervention Library](../decisions/0044-misconception-graph-and-intervention-library.md)
  — misconception + intervention entry shapes.
- [ADR 0046 — Equation Biography](../decisions/0046-equation-biography.md)
  — biography entry shape.
- [ADR 0051 — Chapter Status + Course Versioning](../decisions/0051-chapter-status-course-versioning.md)
  — course tags capture plugin versions transitively.
- [ADR 0053 — Conformance Failure Modes](../decisions/0053-conformance-failure-modes.md)
  — `audit_overrides` is consumer-side complement to plugin
  overrides.
