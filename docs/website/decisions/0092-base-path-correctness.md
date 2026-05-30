---
date: 2026-05-29T00:00:00.000Z
tags:
  - build
  - astro-integration
  - consumer-deploy
  - regression-class
  - structural-defense
  - accessibility
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-29"
  evidence:
    - kind: deployment
      ref: packages/core/src/runtime/join-base.ts
      date: "2026-05-29"
      notes: "Pure `joinBase(base, path)` is the single source of truth for prefixing an internal path with the site base. Passes external / `data:` / protocol-relative URLs through untouched (review M1). Zero-dep; Node-safe (no `import.meta.env`)."
    - kind: deployment
      ref: packages/astro/src/lib/with-base.ts
      date: "2026-05-29"
      notes: "`withBase(path) = joinBase(getSophieBaseUrl() ?? import.meta.env?.BASE_URL ?? \"/\", path)` for `@sophie/astro` chrome `.astro` files; exported from the package barrel for consumer-authored `.astro` pages. Mirror wrapper at `packages/components/src/utils/with-base.ts` for the framework-pure React package. Per **Amendment 1**, the base is read from a globalThis SSR-setter first (set by the route `.astro` layer) and only falls back to the Vite primitive `import.meta.env?.BASE_URL` on the client — because `import.meta.env` is undefined when the tsup dist runs externalized in Astro's Node prerender. `import.meta.env` is a Vite primitive, not an `astro:*` import — ADR 0001 holds."
    - kind: deployment
      ref: packages/core/src/runtime/base-url.ts
      date: "2026-05-29"
      notes: "Amendment 1 — `setSophieBaseUrl`/`getSophieBaseUrl` (globalThis-backed, pure, Node-safe). The route `.astro` layer sets the base; the externalized-in-Node SSR `withBase` reads it via the getter. Resolves the `packed-smoke` prerender crash (`import.meta.env` undefined in externalized dist)."
    - kind: deployment
      ref: packages/astro/src/lib/derive-info-slug.ts
      date: "2026-05-29"
      notes: "`deriveInfoSlug(pathname)` = last non-empty path segment, used by `info-page.astro`. Base-agnostic by construction (no BASE_URL dependency); correct because `info_pages` keys are schema-constrained to single-segment kebab-case and injected as the final path segment."
    - kind: test
      ref: examples/smoke/scripts/check-base-path.sh
      date: "2026-05-29"
      notes: "The `base-path` CI job builds the smoke target under a non-root base (`SOPHIE_SMOKE_BASE=/base-probe`) and fails on either a non-zero build (the info-page build-breaker regression) OR any emitted-HTML internal link lacking the base prefix — both Sophie's route namespaces and the bare-root `href=\"/\"` breadcrumb-home shape (Amendment 2). Structural defense, cf. ADR 0084's packed-smoke gate."
    - kind: test
      ref: packages/core/src/runtime/join-base.test.ts
      date: "2026-05-29"
      notes: "`joinBase` (10 cases): root/non-root base, trailing-slash normalization, missing leading slash, hash fragments, empty base, and external/`data:`/protocol-relative passthrough. `derive-info-slug.test.ts` (4): non-root base, root base, no-trailing-slash."
  notes: |
    Shipped in PR #227. Closes the consumer-base regression class: a
    build-breaker (info-page slug) plus a leak class (~34 author-written
    internal links + the Pagefind loader + figure `<img src>` paths that
    Astro does not auto-prefix). The smoke base-path CI job is the durable
    structural defense. Pairs with ADR 0084 (packed-smoke) as a
    consumer-shape gate; the new helpers auto-registered as tsup entries
    via the ADR 0091 discovery mechanism.
---

# ADR 0092: Base-path correctness for non-root consumer deploys

:::{admonition} ADR metadata
- **Status**: shipped
- **Deciders**: anna
:::

## Context

Astro consumers can deploy under a non-root `base` — most commonly a
GitHub Pages **project** site served at `https://<org>.github.io/<repo>/`,
which requires `base: "/<repo>"`. The astr201 course site
(`base: "/astr201"`) is the first real instance. Standing up that deploy
surfaced two distinct failures in `@sophie/*`.

**1. Build-breaker — the info-page slug.** `info-page.astro` is a
dispatcher reused across every `info_pages` route. It deliberately carries
no `[param]` segment, so it read the slug from the URL:

```ts
const slug = Astro.url.pathname.replace(/^\/|\/$/g, "");
```

Under `base: "/astr201"`, `Astro.url.pathname` for the injected
`/astr201/accommodations/` route is `/astr201/accommodations/`. Stripping
only the outer slashes yields `astr201/accommodations`, which misses the
bare-slug `info_pages` lookup, and the build-time invariant throws — the
consumer build dies on the first info page.

**2. Base-leak class — author-written internal URLs.** Astro
**auto-prefixes its own pipeline output** (`/_astro/*`, `astro:assets`
`<Image>`), but it does **not** rewrite author-written `<a href>` /
`<img src>` absolute paths. Sophie's chrome and components carry ~34 such
sites: cross-chapter links (`href={\`/units/${u}/reading\`}`), registry
links (`/equations/<id>`, `/library/topics/<id>/`), the Pagefind loader
(`"/pagefind/pagefind.js"`), and figure image `src` values (figures render
through a plain `<img src={string}>`, not `astro:assets`, so they are not
auto-prefixed). Under a non-root base every one resolves to the wrong
origin — broken navigation, broken site search, broken figures.

The leak class spans both `@sophie/astro` chrome `.astro` files **and**
framework-pure `@sophie/components` React files (including five
`client:load` islands), so the fix has a framework-purity dimension
(ADR 0001) and a hydration dimension (ADR 0084 — SSR and client output
must agree to avoid React #418).

## Decision

**A single pure base-join primitive, a thin per-package wrapper that reads
the Vite-injected base, a base-agnostic slug derivation, and a CI gate
that builds a consumer under a non-root base.**

1. **`joinBase(base, path)` — pure, in `@sophie/core`.** The one place
   that prefixes an internal path with the site base. Normalizes the base
   (strips trailing slashes) and the path (ensures a leading slash), and
   **passes external / `data:` / protocol-relative URLs through
   untouched**. Zero-dep and Node-safe (no `import.meta.env`), so it is
   unit-testable and usable from any package.

2. **`withBase(path)` — a wrapper in each consuming package.** Resolves
   the base as `getSophieBaseUrl() ?? import.meta.env?.BASE_URL ?? "/"`,
   then `joinBase(base, path)` (see **Amendment 1** — the original shape
   read `import.meta.env.BASE_URL` directly, which throws in Astro's
   externalized-Node prerender). Lives in `@sophie/astro`
   (`lib/with-base.ts`, exported from the package barrel so consumers
   authoring their own `.astro` pages can emit base-correct links) and in
   `@sophie/components` (`utils/with-base.ts`). `import.meta.env` is a
   Vite primitive (not an `astro:*` import), so the components wrapper does
   not violate ADR 0001's framework-purity rule.

3. **`deriveInfoSlug(pathname)` — last non-empty path segment.** Replaces
   the base-fragile slash-strip in `info-page.astro`. Base-agnostic by
   construction: it depends on no `BASE_URL` semantics and directly
   inverts the integration's `pattern: \`/${slug}/\`` injection. Correct
   because `info_pages` keys are schema-constrained to single-segment
   kebab-case (`course-spec-v02-info-pages.ts`).

4. **The `base-path` CI gate.** A script
   (`examples/smoke/scripts/check-base-path.sh`) builds the smoke target
   under `SOPHIE_SMOKE_BASE=/base-probe` and fails on a non-zero build
   (the info-page regression) or any emitted-HTML internal link lacking
   the base prefix — both in Sophie's route namespaces and the bare-root
   `href="/"` shape (the course-home breadcrumb class; see **Amendment
   2**). The smoke `base` is env-parametrized (`base:
   process.env.SOPHIE_SMOKE_BASE || undefined`), so the gate is additive —
   the existing root-base smoke build is a no-op when the var is unset.

## Rationale

1. **Structural fix over targeted patch.** Sprinkling
   `import.meta.env.BASE_URL` into 34 call sites would be a patch that the
   35th site silently violates. One primitive + one wrapper + one CI gate
   defends the whole class: a new internal link is correct if it goes
   through `withBase`, and the gate fails loudly if one doesn't.

2. **A shared base helper over prop-threading — and the SSR-setter that
   makes it correct.** The alternative (thread `base` as a prop/context
   into every linking React component) is more invasive and reintroduces
   the leak class as "forgot the prop." A pre-merge spike confirmed Vite
   replaces `import.meta.env.BASE_URL` in the tsup-built dist for the
   **client-island bundle** and for **workspace-bundled SSR**. It did
   **not** cover Astro's static **prerender** environment, which
   externalizes the dist and runs it in Node — where `import.meta.env` is
   undefined. **Amendment 1** closes that gap with a globalThis SSR-setter
   (the definitions/figures store doctrine): the route `.astro` layer,
   which has reliably Vite-replaced `import.meta.env.BASE_URL`, calls
   `setSophieBaseUrl`; the externalized-in-Node wrapper reads it via
   `getSophieBaseUrl()`. SSR (setter) and client (Vite-inlined env) resolve
   to the same consumer base, so the five `client:load` ref components stay
   hydration-consistent — no React #418, the class ADR 0084 defends.

3. **Last-segment slug eliminates an entire dependency.** Deriving the
   slug from the final path segment removes any reliance on `BASE_URL`
   trailing-slash semantics or a `startsWith` prefix guard — the
   single-segment schema guarantee makes it provably correct.

4. **External-URL passthrough makes the public helper safe.** Because
   `withBase` is now public API and a consumer figure `src` may be an
   external CDN URL, `joinBase` must not mangle `https://…` / `data:` /
   `//cdn/…` into `/<base>/https://…`. The scheme/protocol-relative guard
   makes the primitive correct for arbitrary input.

## Alternatives considered

### Option B — thread `base` as a prop/context into components

Pass `import.meta.env.BASE_URL` from the `.astro` layer down to every
linking React component.

**Rejected.** Purest re ADR 0001 (components stay env-agnostic), but
invasive (a prop on every linking component and SSR call site), it widens
the island hydration prop surface, and it reintroduces the exact leak
class as a "forgot to pass the prop" silent failure. `import.meta.env`
is a Vite primitive available wherever Vite bundles, defaults to `"/"` in
Storybook/Vitest, and is replaced uniformly across SSR + client — so the
purity cost of reading it is minimal and the robustness gain is large.

### Option C — fix only the build-breaker, defer the leak class

**Rejected.** The build would complete, but astr201's own deploy
leak-check + Playwright base-path spec re-block immediately on the ~34
unprefixed links. Fixing only the throw moves the block; it does not ship
a working site.

### Option D — narrow the CI guard to platform-emitted HTML only

Scan only Sophie-injected route output, excluding consumer-authored
fixture pages.

**Rejected.** The consumer-authored page is exactly where the leak class
also lives. Fixing the smoke fixture pages and letting the guard assert
over **all** emitted HTML dogfoods the public `withBase` API and proves
the consumer story end-to-end; a narrower guard would be blind to the
consumer-authored half of the class.

## Consequences

### Positive

- **Consumers can deploy under a non-root base.** astr201's GitHub Pages
  subpath deploy unblocks; the build completes and navigation, search, and
  figures resolve correctly.
- **The class is closed structurally.** `withBase` + the `base-path` CI
  gate prevent regressions; a future internal link is correct by going
  through the helper, and a miss fails the gate loudly.
- **`withBase` is a documented public surface** for consumer-authored
  `.astro` pages, matching how the platform chrome emits links.

### Negative / risks

1. **The `base-path` gate scans emitted HTML only;** the Pagefind loader
   URL lives in a JS island bundle, so that one site is covered by
   `withBase` + the Vite `BASE_URL` bundle replacement + the unit/typecheck
   layer, not by the HTML grep. Documented in the script header.

2. **The two `virtual-modules.d.ts` ambient `ImportMetaEnv` augmentations**
   are load-bearing for the tsup DTS build. They are src-only (not emitted
   to `dist/`), so there is no duplicate-declaration conflict with a
   consumer's `vite/client` types; the field shape matches Vite's.

3. **`ChapterFooter.astro` hardcodes a `/decisions/…` link** that targets a
   platform-docs route absent in consumer repos. Base-wrapped only here
   (W3 scope discipline); its consumer-appropriateness is a separate
   content question.

## Validation

Validated by the artifacts in the frontmatter `validation.evidence` block:
`joinBase` (core, pure, tested) + the two `withBase` wrappers +
`deriveInfoSlug` + the `base-path` CI gate, plus the **Amendment 1**
SSR-setter (`getSophieBaseUrl`/`setSophieBaseUrl`). An independent code
review disassembled the built client bundle to confirm hydration
consistency and re-ran both the `base-path` gate (zero leaks) and the
`packed-smoke` gate (build complete + #418 spec green) under the
externalized-prerender path. PR #227 shipped the change to `main`.

## Amendment 1 — SSR base via globalThis setter (packed-prerender externalization, 2026-05-29)

The Decision's original `withBase(path) = joinBase(import.meta.env.BASE_URL,
path)` shape passed the `base-path` gate (workspace-bundled SSR) but **failed
`packed-smoke`**: in Astro's static **prerender** environment, `@sophie/components`
runs as the **externalized tsup dist in Node**, where `import.meta.env` is
`undefined` — so `import.meta.env.BASE_URL` threw `Cannot read properties of
undefined (reading 'BASE_URL')` while server-rendering non-`useHydrated`-gated
components (`SectionLanding`, `CourseLanding/SimpleList`, `Figure`). The
`useHydrated`-gated island refs were unaffected (their `withBase` runs only on
the client, where Vite replaces `import.meta.env.BASE_URL`).

A bare `?? "/"` guard would stop the throw but emit **unprefixed** SSR links
under a non-root base — a silent reintroduction of the leak class. The fix
adopts the **globalThis SSR-setter doctrine** (same pattern as the
definitions/figures cross-chapter stores):

- `@sophie/core/runtime` exports `setSophieBaseUrl(base)` / `getSophieBaseUrl()`
  — pure, Node-safe, globalThis-backed (no `import.meta.env`).
- Each injected route `.astro` calls `setSophieBaseUrl(import.meta.env.BASE_URL)`
  at frontmatter entry, where the value is reliably Vite-replaced (the `.astro`
  layer is consumer-Vite-processed).
- Both `withBase` wrappers resolve the base as
  `getSophieBaseUrl() ?? import.meta.env?.BASE_URL ?? "/"` — globalThis (SSR) →
  Vite-inlined env (client) → root default. The optional chain on
  `import.meta.env?.BASE_URL` never throws in externalized Node and is still
  statically replaced by Vite in the client bundle (verified by disassembly).

This refines, not reverses, the "shared base helper over prop-threading"
decision: the helper stays; the env read is split into an SSR seam (setter) and
a client fallback. The originating finding is the PR #227 `packed-smoke`
failure; the lesson — run `packed-smoke` locally before pushing changes to
`@sophie/components` SSR behavior — is recorded in the
`project_smoke_gate_catches_packaging_class` memory.

## Amendment 2 — bare-root breadcrumb leak + guard coverage (2026-05-29)

The original sweep wrapped namespaced internal links (`/units/…`,
`/equations/…`, etc.) but missed two **bare-root** course-home links —
`SectionLanding.tsx:33` and `SchedulePage.astro:32`, both `<a href="/">`.
Under a non-root base these resolve to the deploy **origin**, not
`/<base>/`, so the course-title breadcrumb pointed off-site. The
`base-path` guard did not catch them: its leak grep required a namespace
segment (`="/<namespace>/"`), and a bare `="/"` has none.

Fix: both sites now use `withBase("/")` (→ `/<base>/`), and the guard
gained a second assertion that flags the bare-root `(href|src)="/"` shape
(the prefixed `="/<base>/"` form does not match). This closes the
namespace-only blind spot for the whole course-home class. The deeper
**MDX-content link** class (author-written markdown links like
`[x](/chapters/…)` rendered by the default `<a>`, which Sophie does not
yet base-prefix) remains a separate, larger gap — out of scope here,
flagged for a future rehype-level pass.

## References

- [ADR 0001](0001-platform-not-monorepo.md) — package boundaries +
  framework purity; `import.meta.env.BASE_URL` is a Vite primitive, not an
  `astro:*` import, so the `@sophie/components` wrapper holds the rule.
- [ADR 0084](0084-packed-smoke-ci-gate.md) — packed-smoke gate; the
  consumer-shape regression-class defense family this `base-path` gate
  joins, and the React #418 hydration class the island-ref links must not
  regress.
- [ADR 0091](0091-tsup-entry-discovery.md) — tsup entry discovery; the new
  `lib/with-base` + `lib/derive-info-slug` modules auto-registered as
  entries with no manual tsup-config edit.
- [PR #227](https://github.com/drannarosen/sophie/pull/227) — the PR that
  shipped the base-path fix.
- `packages/core/src/runtime/join-base.ts` — the pure primitive.
- `examples/smoke/scripts/check-base-path.sh` — the CI gate.
- [Prerender runtime doctrine](../reference/prerender-runtime-doctrine.md) —
  why `joinBase` is Node-safe (no `import.meta.env`) and how the SSR base-URL
  setter fits the globalThis-singleton doctrine.
