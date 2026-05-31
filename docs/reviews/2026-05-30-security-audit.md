# Security Audit — Sophie Platform (Comprehensive)

**Date:** 2026-05-30
**Scope:** Whole-codebase security review (not a branch diff — working tree clean)
**Method:** Three independent adversarial review agents — (1) build-time /
HTML-injection surface, (2) client-side runtime + persistence surface, (3)
CLI / build-tooling / export + file-operation surface — followed by the
`/security-review` false-positive filter (drop anything below 8/10 confidence).
**Reviewer:** Claude Code (security-review workflow)

---

## TL;DR

**No exploitable vulnerabilities found.** Across every category examined,
Sophie is hardened by construction. Zero findings cleared the confidence ≥ 0.8
bar; zero High, zero Medium, zero Low-but-actionable. One CI-lint-script
robustness nit is documented below as explicitly **non-exploitable** and is not
counted as a finding.

This is a strong result, and it is not an accident — it falls out of three
deliberate architectural decisions: the **single HTML-injection chokepoint**
(R14 / ADR 0093), **default-safe KaTeX**, and the **"persisted value → React
state only"** persistence contract (ADRs 0004/0007/0029). The build-time SSG
threat model (content author = trusted party, no runtime server / DB / auth /
session layer) removes entire vulnerability classes a priori.

---

## Threat model

Sophie is a **build-time static-site generator**. The security-relevant
consequences:

| Classic web vuln class | Applicability to Sophie |
|---|---|
| SQL / NoSQL injection | **N/A** — no database, no queries |
| Auth bypass / privilege escalation / session fixation | **N/A** — no server-side auth, no sessions |
| SSRF | **N/A** — no server making outbound requests at runtime |
| Stored XSS (cross-user) | **Structurally absent** — persistence is per-origin IndexedDB (same user); no shared backend |
| DOM / reflected XSS | **In scope** — the real surface; audited below |
| Path traversal | **In scope** — build/CLI file ops; audited below |
| Command injection | **In scope** — CLI spawns + build scripts; audited below |
| Unsafe deserialization | **In scope** — YAML/JSON/MDX parsing; audited below |

The trust boundary throughout is **who authored the content**: author / build-time
input is trusted (the author runs their own build); the only genuinely untrusted
input is **runtime user input in the browser** (form values, search queries,
restored persistence) and any **third-party content/templates** a project might
consume.

---

## Categories examined — all verified secure

### 1. XSS / HTML injection — hardened (single chokepoint holds)

- **One sanctioned `dangerouslySetInnerHTML` site, lint-enforced.** A repo-wide
  grep for raw `dangerouslySetInnerHTML=` in shipped code returns exactly one
  file: `packages/components/src/runtime/BuildTimeHtml.tsx`. The R14 gate
  (`scripts/lint-no-raw-inner-html.ts`, wired into CI `lint`) keeps it that way.
- **The `trust` discriminator carries no runtime input and changes no behavior.**
  Every `BuildTimeHtmlTrust` value (`katex` / `mdx-serialized` / `extractor-body`
  / `pagefind-excerpt`) is fed build-time / author-authored content. The `trust`
  prop is `void`-ed at runtime (`BuildTimeHtml.tsx:66`) — it is documentation of
  *why the HTML is safe*, not a runtime sanitization switch. There is no value an
  attacker could pass to weaken handling.
- **KaTeX runs with default (safe) options.** `render-text-with-math.ts`,
  `math-render/render-math.ts`, and `EquationRef/equation-stories-prerender.ts`
  use `throwOnError:false` only — **no `trust:true`**. KaTeX's `\href` / `\url` /
  `\htmlData` HTML-injection vectors are disabled by default, so even *author*
  content cannot smuggle markup through math. Non-math text is HTML-escaped
  *before* the inline-markdown pass; the `**bold**` / `*italic*` regex only ever
  sees already-escaped text.
- **JSON hydration payloads escape the `</script>` breakout.**
  `serialize-pedagogy-hydration.ts:36` routes every
  `<script type="application/json">` payload (definitions, equations, figures,
  courseSpec, …) through `toScriptJson`, which applies
  `JSON.stringify(value).replace(/</g, "\\u003c")` — neutralizing a `</script>`
  substring inside any payload body. This directly defends the documented threat
  of AI-authored CS/web content containing literal `</script>` strings.
- **All `set:html` sinks consume build-time extractor output or KaTeX** (glossary
  / key-insight / misconception / observable / model / inference bodies, figure
  captions, equation TeX). Author trust boundary; no runtime input reaches them.
- **Pagefind search excerpts are correctly trusted.** `ResultCard.tsx` injects
  `result.excerpt` via `BuildTimeHtml trust='pagefind-excerpt'` and
  `result.meta.html` via `trust='katex'`. Pagefind builds excerpts from
  build-indexed author content, HTML-escaping body text and injecting only
  structural `<mark>` tags. The runtime query influences only highlight
  *positions*, never injected markup content — escape-safe by construction
  (accepted ADR 0093 design).
- **Preference boot scripts are injection-free.** `preferences/define.ts:125`
  builds inline boot scripts purely from hardcoded preference definitions
  (`key` / `values` / `attribute` / `resolveExpression`), all `JSON.stringify`-
  encoded; the restored `localStorage` value is validated against a fixed
  `values` allowlist before being reflected onto a `data-*` attribute via
  `setAttribute` (not an HTML/script sink). No dynamic value is interpolated into
  script source.

### 2. Client-side persistence (useInteractive / IndexedDB) — secure

Full lifecycle of a persisted/restored value (read
`useInteractive.ts`, `IndexedDBResponseStore.ts`, `BroadcastChannel.ts`):

- **Restore (IDB read):** `store.get(...)` → `setLocalValue(persisted.value)` →
  React `useState`.
- **Cross-tab (BroadcastChannel, same-origin by spec):** `message.value` →
  `setLocalValue(...)` → React `useState`. The LWW gate (ADR 0029) defensively
  rejects non-numeric `ts` from broadcast messages.
- **Render:** every `<Interactive*>` consumer renders `value` as a React child /
  controlled input value — **auto-escaped**.

No restored or broadcast value ever reaches `innerHTML`,
`dangerouslySetInnerHTML`, `eval`, `location`, or dynamic import. IndexedDB keys
are composite `profile:unit:key` strings built from build-time component props,
not runtime input. IndexedDB is per-origin / same-user, so there is no
cross-user stored-XSS vector even structurally.

### 3. URL / navigation / postMessage — secure

- **No URL-param/hash parsing anywhere in client runtime** — grep for
  `location.search`, `location.hash`, `URLSearchParams`, `.searchParams`,
  `new URL(`, `decodeURIComponent` returned zero hits in shipped client code.
- **`window.location.href = r.url`** (`SearchModal.tsx:122`) navigates to a
  Pagefind result URL drawn from the build-time index (author pages), not from a
  user-supplied string — not an open redirect.
- **postMessage:** only `BroadcastChannel.postMessage` (same-origin by spec);
  payload reaches React state only. No cross-window `postMessage(msg, origin)`,
  no `window.addEventListener("message")`.
- **`sophie:search-open` CustomEvent** `detail.query` is the same-page input's
  value, used only to seed a controlled input — no sink.

### 4. Command injection — not exploitable

- **Shipped CLI** (`spawn-orchestrator.ts`, `run-preview.ts`,
  `build-if-missing.ts`): all `execa` calls use **hardcoded binaries** (`astro`,
  `pnpm`) with **array-form args** (no shell). User-influenced values (`--port`,
  `--host`) pass as separate argv elements — no shell interpolation. `port` is
  integer-coerced with a NaN guard. Worst case is an invalid astro flag, not
  injection.
- **CI lint scripts** (`scripts/lint-*.ts`): `execSync` interpolates only
  hardcoded constants and repo file paths discovered by `find` over committed
  files (same-trust-party). CI-only tooling, never a runtime surface.

### 5. Path traversal — not exploitable (two plausible vectors, both closed)

- **`info_pages` slug → route + `existsSync` probe** (`integration.ts:286,291`):
  slug is schema-constrained at `course-spec-v02-info-pages.ts:94` to
  `^[a-z][a-z0-9-]*$` (no `/`, `.`, `..`) plus a reserved-slug refine. The only
  path use is a read-existence shadow-warning probe — cannot traverse given the
  regex.
- **Figure registry `file` / `name` → fs read** (`resolve-figure-file.ts`):
  returns only members of `availableFiles` (real basenames from `readdirSync` of
  `src/figures/`); an explicit `entry.file` is rejected unless present in that
  set. No registry value becomes an unbounded path. `prose/<slug>` compose
  fragments load via Astro's `getCollection("course-info")` content API, not raw
  path joins.
- **CLI `figures downscale` writes** (`commands/figures.ts:157`) target
  `join(dir, file)` where `file` comes from `readdirSync` of the operator's own
  `--dir` (real on-disk basenames), dry-run by default. Operator's own
  filesystem; no external path component.
- **All other file writes** use **fixed filenames** at config/build-controlled
  directories (`dist/.sophie/pedagogy-index.json`, `pedagogy-audit.json`,
  `dist/pagefind`, `status/validation.md`, `dist/*.css`). No slug / id /
  frontmatter value is ever used as a write-path segment.

### 6. Unsafe deserialization — secure

- **YAML** (`course-spec-loader.ts:35`, `notation-registry-loader.ts`) uses the
  `yaml` package's `parse` — safe by default (no js-yaml-style unsafe `load` /
  custom-tag code execution). All parsed output is validated through Zod
  (`CourseSpecSchema.safeParse`, `NotationRegistrySchema.parse`) before use.
- **MDX build-time execution:** authored MDX compiles to JS and *can* execute at
  build time — but this is the **intended trust model** (author = the party
  running the build; no runtime ingestion of untrusted MDX). The only
  `new Function(...)` occurrences are in preference tests exercising boot-script
  output, not shipped code.

### 7. Archive / export (LMS / SCORM / zip) — no surface exists

Grep for `scorm | imscc | imsmanifest | archiver | jszip | yazl | tar |
createWriteStream | \.zip` across all packages returned **zero hits**. The
LMS-export capability is design-only / unbuilt — no zip-slip surface to audit
today. (Flagged here so a future export implementation gets a zip-slip review.)

### 8. Secrets / client-bundle data exposure — clean

- No hardcoded API keys, tokens, or passwords in shipped code (grep for
  credential-shaped literals returned nothing outside `process.env` reads and
  test fixtures).
- **No `import.meta.env.PUBLIC_*` reads** anywhere — no env value is shipped to
  the client bundle. All `process.env` / `import.meta.env` reads are build/SSR-
  only machinery (`NODE_ENV` dev-warning gating, `BASE_URL` path prefixing,
  `SOPHIE_CLI_TEST_HARNESS` / `SOPHIE_DOCS_INCLUDE_VALIDATION` build flags).

---

## Non-finding (documented for completeness, NOT counted)

`scripts/lint-axe-render.ts:185,205` interpolate a `find`-discovered file path
into `execSync("grep ... \"${path}\"")`. A filename containing shell
metacharacters would break the command — but such a filename could only be
introduced by a developer with commit access (the trusted party), and the
script is CI-only, never a runtime surface. Exploitability by an untrusted
actor: ~0.05. **Not a security boundary crossing.** If desired as a robustness
cleanup, switch to `execFileSync("grep", [..., path])` (array args, no shell) —
but this is hygiene, not a vulnerability.

---

## Forward-looking notes (not vulnerabilities today)

These are **not** current findings — they are the places a *future* change would
re-open a now-closed surface, worth a targeted re-review when they land:

1. **LMS / SCORM / IMSCC export** (design-only today): when built, audit for
   **zip-slip** (entry names with `../` written to disk) and for unintended
   files leaking into bundles.
2. **Any future runtime server / API** (e.g. SoTL telemetry ingestion, an
   instructor dashboard backend): would introduce the auth / authz / SSRF /
   injection classes that are N/A today. Re-run this audit against that surface.
3. **A CLI `init` / scaffold command** (absent today): if added, ensure a
   user-supplied project name/slug cannot traverse paths or reach a shell — the
   classic scaffolder bug. The existing schema-regex + filesystem-allowlist
   patterns are the right templates to reuse.
4. **Relaxing KaTeX `trust`** or adding a new `BuildTimeHtmlTrust` variant: both
   must extend ADR 0093 with an explicit "why this HTML is safe" rationale
   rather than re-introducing a raw injection site (R14).

---

## Files reviewed (representative)

- `packages/components/src/runtime/BuildTimeHtml.tsx`
- `packages/components/src/runtime/render-text-with-math.ts`
- `packages/components/src/runtime/useInteractive.ts`
- `packages/components/src/runtime/IndexedDBResponseStore.ts`
- `packages/components/src/runtime/BroadcastChannel.ts`
- `packages/components/src/components/.../GlossaryTerm.tsx`
- `packages/components/src/components/Search/{SearchModal,ResultCard,ResultList}.tsx`
- `packages/astro/src/lib/serialize-pedagogy-hydration.ts`
- `packages/astro/src/components/{TextbookLayout,TextbookHead}.astro`
- `packages/astro/src/preferences/{define,theme}.ts`
- `packages/astro/src/lib/course-spec-loader.ts`
- `packages/astro/src/lib/mdx-plugins/skill-review-resolver.ts`
- `packages/astro/src/integration.ts`
- `packages/cli/src/lib/{spawn-orchestrator,resolve-consumer-root,build-if-missing,run-preview}.ts`
- `packages/cli/src/commands/figures.ts`
- `packages/core/src/schema/{course-spec-v02-info-pages,resolve-figure-file}.ts`
- `scripts/lint-*.ts`

## Verdict

**Pass.** No remediation required. The codebase's single-chokepoint HTML
discipline (R14 / ADR 0093), default-safe KaTeX, schema-anchored + filesystem-
allowlisted path handling, shell-free array-arg process spawns, and
"persisted-value → React-state-only" contract make the audited surfaces
structurally resistant to the classes hunted. Re-review when any forward-looking
item above lands.
