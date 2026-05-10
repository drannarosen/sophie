# `examples/smoke` — Phase 0 smoke target (throwaway)

This is the vertical-slice acceptance target for Sophie Phase 0
(per ADR 0023). It renders the trimmed first ASTR 201 reading
(`lecture-01-spoiler-alerts-reading.qmd` from
`/Users/anna/Teaching/astr201-sp26`) through every `@sophie/*` package
to prove the slice works end-to-end: schema → MDX → component
mapping → theme → islands → persistence runtime → CSS Modules → HMR
→ audit CLI.

**Throwaway.** The real `drannarosen/astr201` consumer is Phase 1.
Don't deploy this. Don't migrate the rest of ASTR 201 here.

## Run it

```bash
pnpm install                       # from repo root
pnpm --filter smoke figures        # generate src/content/figures.ts + copy 19 images
pnpm --filter smoke dev            # http://localhost:4321
pnpm --filter smoke audit          # sophie audit on the chapter MDX
pnpm --filter smoke build          # static build
```

## Course slug for IndexedDB namespacing

`smoke` (per ADR 0007 per-course DB pattern). Clean isolation from
any future `drannarosen/astr201` DB. The throwaway IS the smoke
target.

## Callout type mapping (Quarto → `<Callout>`)

The lecture source uses 14 distinct Quarto callout types and 22
`column-margin` blocks. The Phase 0 `<Callout>` schema admits 4
variants (`info | warning | tip | caution`). The lossy mapping is
locked here; Phase 1's SCSS port is the place to expand the variant
enum to richer pedagogical types. Reproduced from the plan file:

| Source `:::{.callout-*}` | Count | → `<Callout variant="...">` | Notes |
|---|---|---|---|
| `note` | 1 | `info` | direct |
| `tip` | 3 | `tip` | direct |
| `important` | 1 | `warning` | toolkit / must-know framing |
| `key-insight` | 5 | `tip` | core concept emphasis |
| `why-this-matters` | 1 | `info` | context/motivation |
| `roadmap` | 3 | `info` | navigation framing |
| `summary` | 3 | `info` | section recap |
| `deep-dive` | 8 | `info` | optional-extension framing; loses the "click to expand" affordance (Phase 1 collapsible variant) |
| `worked-example` | 2 | `info` | step-by-step |
| `check-yourself` | 6 | `tip` + **`interactive`** | self-assessment; persistence-bearing |
| `prediction` | 1 | `tip` | engagement prompt |
| `the-more-you-know` | 1 | `info` | trivia/extension |
| `misconception` | 1 | `caution` | "do not believe X" framing |
| `column-margin` | 22 | n/a — `<aside class="margin-note">` | inline; layout deferred |

All 6 `check-yourself` callouts carry `interactive` + a unique `id`,
so each one round-trips through `useInteractive` →
`IndexedDBResponseStore` → `BroadcastChannel`.

## Figure registry

`src/content/figures.ts` is generated from
`/Users/anna/Teaching/astr201-sp26/assets/figures.yml` by
`scripts/build-figures.ts`. The script also copies the 19 image
files referenced by the chapter into `public/figures/`. Re-run
`pnpm --filter smoke figures` if either the YAML or the chapter's
figure list changes.

The generated file is committed for hermetic builds (throwaway repo
lifetime). Don't edit it by hand.

## Note on `content.config.ts` form

This example uses Astro 6's content-layer canonical form
(`loader: glob({ ... })` from `astro/loaders`). The
`@sophie/astro/README.md` recipe still shows the legacy
`type: "content"` form — both work in Astro 6.3.1 but `glob` is the
forward-compatible default. The README will be updated in Phase 0
step 10.

## Deferred (per ADR 0023 / parent plan)

- Real chapter migration — Phase 1 (`drannarosen/astr201`).
- Deploy / Pagefind / search / nav / dark-mode toggle.
- Column-margin layout — Phase 1's `<MarginNote>` component.
- Glossary, code cells, demos, slides — Phases 1–3.
- Image optimization via `astro:assets` — Phase 1+.
