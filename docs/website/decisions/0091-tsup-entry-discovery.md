---
date: 2026-05-29T00:00:00.000Z
tags:
  - build
  - tsup
  - astro-integration
  - regression-class
  - structural-defense
  - ai-authoring
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-29"
  evidence:
    - kind: deployment
      ref: packages/astro/tsup.config.ts
      date: "2026-05-29"
      notes: "The `entry` map is now `{...INTRINSIC, ...discoverAstroEntries(SRC_DIR)}`. After building the map, the config calls `findMissingEntries(SRC_DIR, Object.keys(entry))` and throws at config-eval (build time) if any `.astro` value-import resolves to a buildable `src` module that is absent from the entry set. The throw is fail-loud at the package-build level, not advisory."
    - kind: deployment
      ref: packages/astro/src/build/discover-astro-entries.ts
      date: "2026-05-29"
      notes: "`discoverAstroEntries` parses each `.astro` frontmatter + `<script>` blocks via the TypeScript compiler API (value-vs-type discrimination); `findMissingEntries` is the independent regex-over-raw-text second-pass validator. The two use deliberately different parse mechanisms so the validator catches discovery's structured-parse blind spots (e.g. CRLF frontmatter, string-truncation edges)."
    - kind: test
      ref: packages/astro/src/build/discover-astro-entries.test.ts
      date: "2026-05-29"
      notes: "10 cases. Happy-path: discovered keys == the exact 16 `.astro`-derived entries; type-only imports (`module-nav-helpers`) excluded; extensionless `.ts` normalization. Red-path: `findMissingEntries` returns the offending entry when a value-import is absent (the live-not-dead proof); does NOT fire when present; no false-positive on a type-only import; catches a CRLF-frontmatter import end-to-end."
    - kind: review
      ref: packages/astro/tsup.config.ts
      date: "2026-05-29"
      notes: "Two superpowers:code-reviewer rounds on PR #226. Round 1 caught a Critical: the first guard checked INTRINSIC-vs-discovered key collision (wrong failure mode), was unfireable on the current tree (dead code), and compared relative vs absolute paths (latent false-positive). Round 2 verified the replacement validator is genuinely independent (reviewer constructed two silent-miss vectors discovery drops but the validator catches) and that the entry set + dist fingerprint are unchanged."
  notes: |
    Shipped in PR #226. The dynamic discovery eliminates the
    forget-an-entry bug class at the source (a new `.astro`→lib
    value-import now gets its entry automatically); the independent
    self-validation guard is the build-time backstop that converts any
    residual discovery silent-miss into a loud build failure rather than
    a green-locally / broken-at-consumer-build regression. Pairs with
    ADR 0084 (packed-smoke gate) as the build-config layer of the same
    consumer-shape defense family; ADR 0061-aligned (focused, testable
    build tooling).
---

# ADR 0091: Derive tsup entries from `.astro` imports + self-validation guard

:::{admonition} ADR metadata
- **Status**: shipped
- **Deciders**: anna
:::

## Context

`@sophie/astro` ships `.astro` chrome components and route files. The
package `build` script compiles `src/**/*.ts(x)` with tsup, then **copies
every `.astro` file verbatim** into `dist/` (`cp src/components/*.astro
dist/components/`, etc.). The `.astro` files are not transformed — Astro
in the consumer app compiles them. So when a copied `.astro` does

```ts
import { renderMath } from "../lib/math-render/render-math";
```

that import resolves at runtime to `dist/lib/math-render/render-math.js`,
which only exists if `render-math` is a tsup **entry**. The entry map in
`tsup.config.ts` was hand-maintained: ~20 keys, each with a paragraph
explaining why it must exist.

This map was a recurring source of a specific regression. Adding an
`.astro`→`lib` value-import without also adding the matching tsup entry
produced a build that:

- **passed `test:unit`** (unit tests import `lib` modules directly from
  `src`, never through the copied-`.astro` dist resolution path), and
- **passed `pnpm build`** (tsup happily builds the entries it's told
  about; it has no knowledge of what the verbatim-copied `.astro` files
  import), and
- **broke only at the smoke / consumer Astro build**, where the copied
  `.astro` finally tries to resolve `../lib/...` against `dist/` and finds
  nothing.

The bug class bit three times in recent work (twice in the ITEM 2 unified-
math + speech sprint — `render-math` and `enrich-equations-speech` — and
once in the course-info sprint). Each instance was caught late, by the
`smoke` or `packed-smoke` gate, after passing every earlier check. The
recurring shape is recorded in the `project_smoke_gate_catches_packaging_class`
project memory.

The map is **derivable**. The set of required entries is exactly "every
module a copied-verbatim `.astro` imports as a *value*." Type-only imports
erase at build and need no entry; modules imported only by `.ts` files get
bundled by tsup (`splitting: false`) and need no entry of their own.

## Decision

**The tsup `entry` map is derived from `.astro` imports at build time, and
an independent second-pass validator asserts coverage and throws on a
silent miss.** Anna approved the "dynamic discovery + self-validation"
shape over a lint-gate-keeps-the-map alternative.

Three pieces:

1. **Discovery** — `discoverAstroEntries(srcDir)` in
   `src/build/discover-astro-entries.ts` globs `src/**/*.astro`
   (`fs.readdirSync(..., { recursive: true })`, zero new deps), extracts
   each file's frontmatter fence + every `<script>` block, parses each
   chunk with the **TypeScript compiler API** (`ts.createSourceFile`),
   walks `ImportDeclaration` nodes, drops type-only imports (`import type`
   and all-`type` named blocks), keeps side-effect and value imports,
   resolves relative specifiers (extension-normalized, `/index` fallback,
   `.astro`-target excluded) to buildable `src/**/*.{ts,tsx}`, and maps
   each to its entry key. The final map is
   `{ ...INTRINSIC, ...discovered }`.

2. **INTRINSIC** — four entries that are *not* `.astro`-derived stay
   explicit, each with preserved rationale: `index` (package entrypoint),
   `client/SophieChapter` (client island), `lib/pedagogy-index-virtual-module`
   (a portable read-only surface for future consumers; imported only by
   `index.ts`/`integration.ts`), and `lib/pedagogy-audit/runner` (kept so
   the dist tree mirrors src; imported only by `integration.ts`/
   `audit-cache.ts`).

3. **Self-validation guard** — `findMissingEntries(srcDir, entryKeys)`
   re-scans each `.astro`'s **raw text** with a regex — a *deliberately
   different* mechanism than discovery's structured frontmatter/`<script>`
   extraction — collects relative value-import specifiers, resolves each to
   a buildable `src` target, and returns any whose expected key is absent
   from the final entry set. `tsup.config.ts` calls it after building the
   map and throws a per-miss error (naming the file + specifier + expected
   key) at config-eval. It skips type-only imports independently of
   discovery's classifier.

## Rationale

1. **Structural fix over targeted patch.** The hand-map is a manual
   re-derivation of information that already exists in the `.astro`
   imports. Inverting the source of truth (derive, don't transcribe)
   eliminates the whole class — a new `.astro`→lib value-import now gets
   its entry automatically, with no human step to forget. This is the
   "structural fixes over targeted patches" engineering principle; the
   rejected lint-gate alternative would have caught the miss earlier but
   left the manual map (and its maintenance) in place — a patch, not a
   fix.

2. **Independence is the safety property.** A validator that reused
   discovery's own output would be tautological — it could only confirm
   discovery agreed with itself. The guard instead parses the raw file
   text with a regex, so it sees imports even when discovery's structured
   extraction misses them. The reviewer constructed two concrete vectors
   (a bare `---` line inside a frontmatter template string; a `</script>`
   string literal inside a `<script>` block) where discovery silently
   returns `[]` but the validator catches the import and would throw.
   Two parsers that agree is confidence; two that disagree is the signal.

3. **The error asymmetry is intentional.** If *discovery* errs, the result
   is a silent broken consumer build — the exact bug being paid down. If
   the *guard* errs, the result is a loud build error a human resolves. So
   every design choice in the guard favours the loud-and-safe direction:
   the type-only skip only fires on unambiguous `import type` / all-`type`
   blocks, and a malformed specifier produces a spurious loud error, never
   a silent drop.

4. **Bounded, testable, AI-author-friendly.** The discovery + validator
   live in one focused module with a co-located test (ADR 0061 Rules 1 +
   6); the test proves both the happy path and the guard's red path. A
   future AI or human author adding an `.astro` component does not need to
   know the tsup entry convention exists — discovery handles it, and the
   guard fails loudly if anything slips through.

## Alternatives considered

### Option B — lint gate, keep the hand-map

Add a CI lint gate (in the R7/R11/R13 family) that scans `.astro`
value-imports and fails if any lacks a tsup entry.

**Rejected.** Lower blast radius (build config unchanged) and it would
catch the miss at lint instead of smoke — but it does **not** eliminate
the manual map. The author still transcribes entries by hand; the gate
only makes the omission louder. The recurring cost is the maintenance of
the map itself, which dynamic discovery removes entirely. A patch, not a
structural fix.

### Option C — status quo (keep the hand-map, no gate)

**Rejected.** This is what bit three times. The map's correctness depends
on every author remembering an invisible convention, verified only by the
slowest gate in the pipeline.

### Option D — discovery with a tautological assertion

The first implementation asserted "every discovered key ∈ entry," which is
vacuous (the entry map is built *from* the discovered set). Round-1 code
review caught this as a Critical: the guard was dead code targeting the
wrong failure mode. Replaced with the independent raw-text second pass
(the Decision above).

## Consequences

### Positive

- **The forget-an-entry regression class is eliminated at the source.** A
  new `.astro`→lib value-import gets its entry automatically; the guard
  backstops any residual discovery miss with a loud build failure.
- **Protects the live consumer's builds.** astr201 (and any future
  consumer) builds against `@sophie/astro`'s `dist/`; a platform
  contributor can no longer ship a half-wired `.astro` import that breaks
  the consumer build while passing every platform check.
- **The entry-map paragraphs become code.** The ~20 hand-written "must
  exist because…" comments are replaced by one mechanism + four INTRINSIC
  rationales; the derivation is self-documenting.

### Negative / risks

1. **Discovery is now build-config logic that can have its own bugs;** a
   discovery bug has a wider blast radius than a single missed entry.
   **Mitigation**: the independent guard converts a silent discovery miss
   into a loud build failure; the unit test pins the discovered set to the
   known-good 16; the smoke + packed-smoke gates remain the final check.

2. **Parser boundaries.** The frontmatter-fence and `<script>`-block
   extraction assume well-formed shapes; a literal `---` or `</script>`
   inside a string could truncate extraction. CRLF was a real, reachable
   vector and is fixed (`/^---\r?\n.../`). The remaining edges are
   documented in the module header and backstopped by the guard rather
   than silently tolerated (W1: don't hide confusion).

3. **The guard's type-only exclusion inspects only the `{...}` brace
   block,** so a default-binding import with an all-`type` brace reads as
   type-only. **Mitigation**: harmless in practice — discovery's own
   classifier handles that shape correctly, so the entry is present
   regardless; the validator's skip never causes a silent miss for any
   input discovery sees correctly. Documented in the function docblock.

## Validation

Validated by the artifacts in the frontmatter `validation.evidence` block:

1. **`tsup.config.ts`** wires discovery + the throwing guard at build time.
2. **`discover-astro-entries.ts`** holds both the TS-API discovery and the
   independent raw-text validator.
3. **`discover-astro-entries.test.ts`** (10 cases) proves the happy path
   (discovered == the 16 expected keys; type-only exclusion; `.ts`
   normalization) and the guard's red path (fires on a missing
   value-import; no false-positive on type-only; catches CRLF).
4. **Two code-review rounds** on PR #226 — a Critical caught and fixed.

The build's dist entry fingerprint is byte-identical before and after (the
validator only asserts; it never changes the entry set), and the smoke
example build is green. PR #226 shipped the change to `main`.

## References

- [ADR 0061](0061-ai-optimized-codebase-design.md) — AI-optimized codebase
  design; Rules 1 + 6 (focused files, tests split with source) govern the
  shape of the discovery module, and the citation-discoverable-ADR
  rationale applies to this build-config decision.
- [ADR 0084](0084-packed-smoke-ci-gate.md) — packed-smoke CI gate; the
  consumer-shape regression-class defense this decision pairs with at the
  build-config layer. The packed-smoke gate is what *caught* the entry
  misses; dynamic discovery is what *prevents* them.
- [PR #226](https://github.com/drannarosen/sophie/pull/226) — the PR that
  shipped dynamic discovery + the self-validation guard.
- `packages/astro/src/build/discover-astro-entries.ts` — discovery +
  validator.
- `packages/astro/tsup.config.ts` — the derived entry map + the throwing
  guard.
