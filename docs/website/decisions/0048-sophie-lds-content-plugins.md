---
date: 2026-05-14T00:00:00.000Z
tags:
  - pedagogy
  - decisions
  - plugins
  - commons
  - cross-course
  - lds
status: future-package-split
validation:
  status: in-progress
  last_validated_date: "2026-05-16"
  evidence:
    - kind: manual
      ref: docs/website/reference/sophie-plugin-system.md
      date: "2026-05-14"
      notes: "Plugin-system reference doc shipped."
    - kind: deployment
      ref: null
      date: null
      notes: "Plugin extension points + first content-plugin shipped together pending; LDS-content-plugins remain spec-only."
  notes: "Contract spec'd; runtime plugin system implementation deferred until first cross-course consumer surfaces a concrete need."
---

# ADR 0048: Sophie LDS Content Plugin System

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

The 2026-05-14 foundation review's S3 systemic concern named the
gap most likely to cause unbounded growth in the LDS foundation:
**every course independently authors its own
misconception-graph.yaml, notation-registry.yaml, intervention
catalog, key-equation set, and move-instantiations.** Two
consequences follow:

1. **Authoring redundancy.** ASTR 201 and ASTR 596 both teach
   inverse-square law; both will declare similar misconceptions
   ("students conflate intensity with luminosity"), similar
   notation (`F`, `L`, `r`), similar interventions. The same
   author re-authoring the same content is wasted instructor
   labor.

2. **Cross-course coherence loss.** When ASTR 201's
   `flux-distance-doubles` misconception is slugged differently
   from ASTR 596's equivalent, the misconception graph cannot
   detect that a student passing through both courses
   encounters the same misconception twice. Curriculum-level
   pedagogy reasoning becomes impossible.

The review framed S3 as Sophie's *highest-leverage missing ADR*.
Anna's directive in the 2026-05-14 brainstorm was unambiguous:
ship the *seam* in v1, populate the seam *in a future ADR* once
recurrence patterns reveal themselves through actual course
authoring. The risk being designed against: pre-populating the
commons with a monolithic catalog freezes shape choices before
real authoring data exists, and discipline-specific shape choices
(astrophysics vs. computational science vs. biology) almost
certainly diverge enough that one universal catalog will be wrong
for any one discipline.

This ADR specifies the plugin system as the cross-course coherence
mechanism. Plugins are **content additions**, not invariant
additions — they cannot impose ERROR-level gates on consumer
courses.

## Decision

Sophie ships a **plugin system for LDS content sharing** with
**field-specific plugin packages** + **a small universal core**.
The package shape is:

- **`@sophie/commons-universal`** — universal cross-discipline
  content: a small set of misconceptions / concepts /
  interventions that recur across STEM fields (e.g., "students
  conflate correlation with causation"; the intervention
  *contrasting cases* from Schwartz & Bransford 1998). Ships with
  v1 of this ADR **empty** — the seam exists; the content lands
  in a successor ADR once recurrence patterns reveal themselves.

- **`@sophie/discipline-*`** — field-specific content packages,
  one per discipline. v1 will eventually carry
  `@sophie/discipline-astrophysics`, `@sophie/discipline-cs`,
  `@sophie/discipline-biology`, etc. **All v1 packages ship
  empty.** Content lands in successor ADRs (one per discipline)
  once Anna's own courses (ASTR 201, COMP 521) have authored
  enough material to surface real recurrence patterns.

- **Course `sophie.config.ts` declares plugins** the course uses:

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

### What a plugin contributes

A plugin is a TypeScript package exporting a `SophiePlugin` value:

```ts
import type { SophiePlugin } from "@sophie/cli";

const disciplineAstrophysics: SophiePlugin = {
  name: "@sophie/discipline-astrophysics",
  version: "1.0.0",
  description:
    "Astrophysics-discipline LDS content. Misconception taxonomy " +
    "following Bailey (2011) + Sadler (1992).",
  taxonomic_stance: "bailey-2011-extended",   // strongly encouraged
                                              // for content-bearing
                                              // plugins
  contributes: {
    misconceptions: [
      {
        slug: "intensity-vs-luminosity",
        description: "...",
        prerequisite_misconceptions: [],
      },
      // ...
    ],
    concepts: [
      {
        slug: "inverse-square-law",
        canonical_symbol: "F",
        aliases: ["flux"],
        unit: "erg s^-1 cm^-2",
      },
    ],
    interventions: [
      {
        slug: "flux-distance-contrasting-cases",
        type: "contrasting-cases",
        addresses: "intensity-vs-luminosity",
        body_template: "...",
      },
    ],
    moves: [
      // moves are scarcer at the plugin layer than catalog-level
      // ones in @sophie/move-index; most plugins won't author
      // moves. Slot reserved for completeness.
    ],
    equation_biographies: [
      // pre-authored biography fragments for canonical equations;
      // a course's <KeyEquation> uses these via slug reference or
      // can override per-equation.
    ],
  },
};

export default disciplineAstrophysics;
```

The `name`, `version`, and `contributes` fields are required.
`description` is a one-line summary surfaced in
`sophie audit --plugins` output. `taxonomic_stance` is optional
but **strongly encouraged** for content-bearing plugins —
astrophysics has multiple defensible misconception taxonomies
(Bailey 2011 vs. Sadler 1992 vs. Liu 2005); a plugin's taxonomic
stance lets consumer courses compare frameworks before adopting.
Convention: short slug like `"bailey-2011-extended"` or
`"hestenes-mechanics-baseline"`.

The course's `PedagogyIndex` is populated from (a) the consumer
chapters' `<MisconceptionDecl>` / `<KeyEquation>` / etc., **plus**
(b) plugin contributions registered in `sophie.config.ts`,
**plus** (c) plugin overrides the course chose to apply.

Plugins are **declarative**; they cannot execute arbitrary code at
audit time. The CLI loads each plugin's `contributes` block
statically.

### Plugin-resolution order

When `sophie audit` builds the populated PedagogyIndex with
plugins:

1. The plugin loader walks `sophie.config.ts`'s `plugins:`
   list **in declaration order**. On entry-slug collision
   between plugins, the **later plugin wins** (last-write-wins).
   Conventional ordering: universal core first, then
   discipline-specific.
2. Consumer-course `pedagogy-contract.yaml` `plugins.overrides:`
   are applied next — they modify (per-field) the plugin
   contributions from step 1.
3. `pedagogy-contract.yaml` `plugins.excludes:` removes the
   listed entries from the merged set.
4. Consumer chapters' own `<MisconceptionDecl>` /
   `<KeyEquation>` / etc. are then layered on top. A chapter's
   in-source declaration **wins over** any plugin-or-override
   value for the same slug.

The full precedence chain: **consumer chapters > pedagogy-contract
overrides > pedagogy-contract excludes > later plugins > earlier
plugins**. Step (4) — the chapter-source layer — is what
preserves consumer autonomy on individual chapters.

### Three autonomy guarantees

These are load-bearing constraints; they are what makes the
plugin system additive without becoming coercive.

1. **No plugin is required.** A course with no plugins declared in
   `sophie.config.ts` authors all content locally. The pedagogy
   contract validates exactly as if plugins didn't exist. This is
   the **v1 default** — Sophie does not push courses toward plugin
   adoption.

2. **Per-field override is always allowed within any plugin
   entry.** A course that uses
   `@sophie/discipline-astrophysics` can modify any individual
   *field* of any plugin entry while inheriting the rest from the
   plugin. The override mechanism uses three operators:

   ```yaml
   # courses/astr201-fa26/pedagogy-contract.yaml
   plugins:
     overrides:
       misconceptions:
         intensity-vs-luminosity:
           description: "ASTR 201 framing: ..."     # replace scalar
           aliases_add: ["irradiance"]              # extend array
           aliases_remove: ["legacy-alias"]         # trim array
           # All other fields inherit unchanged from the plugin.
     excludes:
       misconceptions:
         - unwanted-plugin-slug       # drop entire entry; not used
   ```

   - **Plain key (`<field>:`)** — replace the plugin's value for
     this field. Inherits all other plugin fields unchanged.
   - **`<field>_add:`** — for array fields, append to the
     plugin's array.
   - **`<field>_remove:`** — for array fields, remove specific
     entries from the plugin's array.
   - **`excludes:`** block — drop a plugin entry entirely.
     Use sparingly; the more common case is overriding fields.

   Nested-field overrides (modifying one element inside an array
   field like `assumptions[]`) are **not supported in v1**. To
   modify nested structure, replace the entire containing field.
   If real authoring data shows need, a future ADR can extend
   the grammar.

   Per-field granularity (rather than entry-level replace-only)
   is load-bearing: it makes plugin inheritance real. A consumer
   course that uses 19 of 20 plugin-contributed misconceptions
   and wants to tweak one description doesn't have to maintain a
   20-entry copy of the plugin's catalog.

3. **Plugins cannot impose ERROR-level audit invariants.** A
   plugin's content participates in *existing* foundation
   invariants (MG1–MG3, NR1–NR4, etc.), but a plugin cannot
   declare a new ERROR-severity invariant against consumer
   chapters. Plugin-declared invariants are capped at
   **WARNING**. The autonomy direction is one-way: ERROR-severity
   invariants are reserved for foundation ADRs themselves and
   for consumer-course local exceptions via
   [ADR 0053](./0053-conformance-failure-modes.md)'s
   `audit_overrides` surface (which *suppresses* findings, not
   *declares* new ones). Plugins have no symmetric authority.

   Mechanically: `SophiePlugin.contributes` does not include an
   `invariants` field. A future ADR may add a constrained
   `contributes.invariants` slot capped at WARNING; v1 omits it
   entirely. Plugins also cannot define `audit_overrides` for
   consumer chapters — that authority is consumer-side only
   (per ADR 0053).

### What ships in v1 of *this* ADR

- The plugin API surface (`SophiePlugin` TypeScript interface in
  `@sophie/cli`).
- The `defineSophieConfig({ plugins: [...] })` consumer surface.
- The audit-time plugin loader (reads each plugin's
  `contributes`, merges into the PedagogyIndex).
- The override mechanism (per-entry, type-safe).
- Stub packages `@sophie/commons-universal` and
  `@sophie/discipline-astrophysics` published empty, so consumer
  repos can import them without errors.

### What ships in successor ADRs

- **ADR 0048-A (TBD): `@sophie/commons-universal` content.** The
  universal-recurrence set. Triggered when ASTR 201 + COMP 521
  fa26 + sp27 reveal ≥5 shared misconceptions or concepts.

- **ADR 0048-B (TBD): `@sophie/discipline-astrophysics` content.**
  ASTR-specific recurrence: distance-ladder concepts, inverse-
  square misconceptions, blackbody assumptions, etc. Triggered
  after ASTR 201 fa26 closes.

- **ADR 0048-C (TBD): `@sophie/discipline-cs` content.** COMP
  521-driven. Triggered after COMP 521 fa26 closes.

Each successor ADR is a content-decision, not an architecture-
decision; the v1 ADR pins the architecture.

### Versioning + breakage

Plugins follow semver. Consumer `sophie.config.ts` pins a major
version range:

```ts
plugins: [commonsUniversal, disciplineAstrophysics],
// versions resolved via pnpm; lockfile pins exact
```

**Plugin breaking changes require a major version bump.** Adding
a new misconception slug is a minor; renaming an existing one is
a major; removing one is a major. Consumer courses get pinned
behavior; semantic drift cannot land silently.

**Course-level semver** (per [ADR 0051](0051-chapter-status-course-versioning.md))
tags include the plugin versions used; a `astr201-fa26-v1.0.0`
tag captures `@sophie/discipline-astrophysics@1.0.0` in the
lockfile.

### Interaction with `sophie audit`

When `sophie audit` runs in a consumer course:

The full plugin-resolution order (defined in the "Plugin-resolution
order" subsection of the Decision above) runs:

1. Plugins from `sophie.config.ts` merged in declaration order
   (last-write-wins on collisions).
2. `pedagogy-contract.yaml.plugins.overrides:` applied per-field.
3. `pedagogy-contract.yaml.plugins.excludes:` removes entries.
4. Consumer chapter declarations layer on top (highest
   precedence).
5. Existing foundation invariants (MG1–MG3, NR1–NR4, etc.) run
   against the merged index.

Plugin provenance is preserved in audit output: an MG3 firing on
a plugin-contributed misconception surfaces the plugin name, so
authors can see whether a finding traces to local authoring or to
a plugin entry.

## Rationale

### Field-specific plugins over a monolithic catalog with discipline tags

Q3-S3's central choice. The brainstorm considered three shapes:

- **(A) Monolithic `@sophie/commons` with discipline tags.** One
  package, every misconception/concept/intervention; consumer
  courses filter by tag. Pros: single import; cross-discipline
  comparisons trivial. Cons: every plugin update bumps every
  consumer; tag taxonomy fights between disciplines; package size
  grows unboundedly; a chemistry-only consumer downloads
  astrophysics + CS content.

- **(B) Field-specific plugins + universal core.** What this ADR
  picks. Each discipline maintains its own package; the universal
  core stays small and citation-grade.

- **(C) No platform plugins; courses fork from each other.**
  Sophie ships only the contract; cross-course sharing is
  ad-hoc. Pros: zero platform commitment. Cons: drift between
  forks is invisible; renaming a misconception in one course is
  not detected as the same misconception in another.

(B) earns its keep on three grounds:

1. **Plugin updates are scoped.** A change to
   `@sophie/discipline-astrophysics` does not bump CS or biology
   consumers; cross-discipline drift is bounded by package
   boundaries.
2. **Discipline-specific shape choices coexist.** Astrophysics
   conventions (CGS units, solar units, distance-ladder
   misconceptions) and CS conventions (data-structure-misuse
   patterns, complexity-class confusions) live in separate
   packages with separate maintainers, instead of fighting for
   slot semantics in one shared schema.
3. **The universal core stays honest.** When everything is in one
   monolith, the universal-vs-discipline distinction blurs; with
   separate packages, the universal core has to earn its place
   (a misconception graduates to `@sophie/commons-universal` only
   when it demonstrably recurs across disciplines).

### Empty v1 seam over pre-populated catalogs

S3 could have shipped with content. Anna's directive against
pre-population:

1. **Authoring data does not yet exist** for either Anna's own
   courses or external adopters. Without data, content choices
   are guesses; guesses freeze shape.
2. **Discipline shape choices diverge.** Pre-populating astrophysics
   with the misconceptions Anna currently teaches would over-fit
   to her chapter ordering; another astronomy course would
   inherit a shape it shouldn't.
3. **The autonomy guarantees matter most early.** If `@sophie/
   commons-universal` ships with 50 misconceptions in v1, every
   external adopter inherits them whether or not they fit; the
   override path exists but the default already misshapes the
   course. Empty default → adoption is genuinely opt-in.

The successor ADRs (0048-A, 0048-B, 0048-C) graduate content
*after* the recurrence pattern is empirically visible — typically
≥2 courses + ≥1 semester of stable authoring per discipline.

### Three autonomy guarantees as load-bearing constraints

Each guarantee defends a different failure mode:

- **"No plugin required"** defends against forced adoption. A
  course that wants to author everything locally is fully
  supported and structurally identical to a plugin-using course
  (the audit doesn't care which path produced the index).

- **"Per-entry override always allowed"** defends against
  monolithic adoption. A course can use 19 of 20 plugin entries
  without forking; the cost of partial adoption is zero.

- **"Plugins cannot impose ERROR invariants"** defends against
  coercion-through-CI. A plugin that could declare ERROR
  invariants against consumer chapters would functionally hold
  consumer courses hostage to plugin opinions. Capping plugin
  invariants at WARNING preserves the principle that *consumer
  courses, not plugin authors, decide what blocks CI*.

These three together make plugins **additive without being
coercive.** A plugin's value proposition is "use my pre-authored
content"; it is not "comply with my pedagogy or your CI fails."

### Declarative `contributes`, not arbitrary code

Plugins do not execute code at audit time. The `contributes` block
is static data; the CLI reads it and merges into the
PedagogyIndex. Two reasons:

1. **Auditability.** A plugin's behavior is `pnpm view @sophie/
   discipline-astrophysics`-inspectable; no hidden imperative
   logic.
2. **Supply-chain safety.** Sophie courses' CI builds run the
   pedagogy audit; an arbitrary-code plugin would mean every
   consumer course runs plugin code in CI. Declarative
   contributes constrain the trust surface to "data we read."

Future ADRs may relax this if a concrete need surfaces (e.g.,
plugin-provided audit-helpers); v1's strict declarative shape is
the conservative default.

### Pluralism over canonical ground-truth

A working pedagogy plugin system **does not pretend to be the
canonical source of truth.** Astrophysics has multiple defensible
misconception taxonomies (Bailey 2011 vs. Sadler 1992 vs.
Liu 2005). Sophie picks one *for each plugin*; courses can swap
plugins if they prefer a different taxonomy. The override path
covers the single-entry case; choosing a different plugin covers
the whole-taxonomy case.

This pluralism is explicit; the docs (per
[sophie-plugin-system.md](../reference/sophie-plugin-system.md))
will name the taxonomic stance of any content-bearing plugin in
its `package.json` `description` field.

## Consequences

**Easier:**

- Cross-course coherence becomes possible without monolithic
  catalogs.
- Anna's two courses can share `inverse-square-law` concept once
  `@sophie/discipline-astrophysics` lands content (post-fa26).
- External adopters get an opt-in path to pre-authored content
  without forced adoption.
- Plugin versioning + lockfile pin gives consumer courses
  reproducible builds.

**Harder:**

- Plugin maintenance is real work: a content-bearing
  `@sophie/discipline-astrophysics` needs an owner (likely Anna +
  collaborators); successor ADRs will name owners explicitly.
- Override mechanics need to be type-safe and well-documented
  ([sophie-plugin-system.md](../reference/sophie-plugin-system.md)
  carries the user-facing spec).
- Plugin-provenance in audit output needs to be readable (which
  entries came from where) without overwhelming the
  default-friendly mode.

**Triggers:**

- v1 of this ADR (docs-only) ships now.
- Plugin API surface lands in `@sophie/cli` (`SophiePlugin`
  interface, `defineSophieConfig({plugins})`).
- Empty `@sophie/commons-universal` + `@sophie/discipline-
  astrophysics` packages published to enable consumer-side
  imports.
- ADR 0048-A (universal commons content) — deferred until
  recurrence visible.
- ADR 0048-B (discipline-astrophysics content) — deferred until
  ASTR 201 fa26 closes.
- ADR 0048-C (discipline-cs content) — deferred until COMP 521
  fa26 closes.

## Alternatives considered

### Monolithic `@sophie/commons` with discipline tags

*Rejected.* See Rationale above. Single-package coupling, tag-
taxonomy fights, package-size growth.

### No platform plugins (fork-from-each-other)

*Rejected.* Drift between forks is invisible; cross-course
coherence is functionally lost. Ad-hoc copy-paste is what S3 was
written to prevent.

### Pre-populated v1 content

*Rejected.* See Rationale. Pre-populating without authoring data
freezes shape choices prematurely.

### Plugins that can declare ERROR invariants

*Rejected.* Coercion-through-CI is the failure mode this is
designed against. The autonomy guarantee is structural, not
diplomatic.

### Plugins that execute arbitrary code at audit time

*Rejected.* Supply-chain trust surface too wide. Declarative
contributes is sufficient for v1; future relaxation requires its
own ADR.

### Per-plugin override (whole-plugin replacement)

*Rejected.* Override granularity at entry level (one misconception)
is strictly more flexible than at plugin level (whole replacement
or none).

## References

- [ADR 0042 — Pedagogy Contract + AI Contribution Ledger](./0042-pedagogy-contract-and-ai-contribution-ledger.md)
  — `pedagogy-contract.yaml` is where overrides live.
- [ADR 0043 — Notation Registry + MultiRep + Alignment Audit](./0043-notation-registry-multirep-alignment-audit.md)
  — concepts in plugins use the same shape as local declarations.
- [ADR 0044 — Misconception Graph + Intervention Library](./0044-misconception-graph-and-intervention-library.md)
  — misconceptions + interventions in plugins use the same shape
  as local declarations.
- [ADR 0046 — Equation Biography](./0046-equation-biography.md)
  — biography fragments can ship in plugins; v1 cross-ref only.
- [ADR 0051 — Chapter Status + Course Versioning](./0051-chapter-status-course-versioning.md)
  — course tags pin plugin versions via lockfile.
- [ADR 0053 — Conformance Failure Modes](./0053-conformance-failure-modes.md)
  — `audit_overrides` is the consumer-side complement to plugin
  overrides; both modify the audit surface but at different
  layers.
- [sophie-plugin-system.md](../reference/sophie-plugin-system.md)
  — full plugin API + override semantics.
- [`vision/features/backlog.md`](../vision/features/backlog.md) —
  successor ADRs (0048-A/B/C) for content population.

## Revisions (2026-05-18 — Registry ecosystem amendment)

### R1 — Registries are the canonical unit of cross-course content sharing

[ADR 0060 — Registry Ecosystem](./0060-registry-ecosystem.md) names
the **unit of sharing** ADR 0048's plugin layer needed but didn't
specify. Cross-course content imports now have a concrete shape:
**one registry entry per shareable unit**, with the schema, loader,
and audit conventions ADR 0060 standardizes across registry types.

The thesis ADR 0048 articulated — Sophie Astro's equation registry
imported by Sophie Compute for a numerical-methods chapter, or
Sophie Compute's algorithm-analysis registry imported by Sophie Astro
for a computational-modeling unit — only makes sense if every shared
item follows one shape. Pre-0060, "cross-course content" was
necessarily abstract because the unit was undefined. Post-0060, the
unit is **a registry entry** (file at `src/content/<registry>/<id>.mdx`,
schema-validated, loader-resolved, audit-checked).

### R2 — Plugin override semantics extend to registries

The override conventions in [sophie-plugin-system.md](../reference/sophie-plugin-system.md)
extend naturally to registry-pulled content:

- **Content overrides** (`audit_overrides`, prerequisite revisions,
  symbol-collision overrides per ADR 0053) operate on registry
  entries the same way they operate on chapter inline content.
  An imported equation registry can be partially overridden by the
  consumer course without forking the entire registry.
- **Loader composition**: per ADR 0060's `loadRegistry<T>` helper,
  the plugin layer composes registry loaders — a consumer course's
  `loadEquationsRegistry()` reads its own `src/content/equations/`
  AND any plugin-imported registries, with consumer entries
  shadowing plugin entries on slug collision.

### R3 — Successor ADRs 0048-A/B/C are unblocked

The placeholder for content-population ADRs (0048-A/B/C) referenced
above no longer needs to define *what* content gets shared.
ADR 0060 specifies the content-shape contract; successor ADRs only
need to specify the *exchange* mechanics (versioning, dependency
resolution, plugin manifest format). Net: the content-population
ADRs become smaller and more focused than originally scoped.
