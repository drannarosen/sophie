# `@sophie/*` peerDep ↔ lockfile sweep

**Date**: 2026-05-13
**Trigger**: Bucket B PR 5
([#34](https://github.com/drannarosen/sophie/pull/34)) hit a CI
failure on first push because `@sophie/astro`'s `vite: ^7.3.0`
peerDep didn't satisfy what the lockfile actually resolved
(`vite@8.0.11`). The drift was pre-existing — only `pnpm add
lucide-static` triggered the relock that surfaced it. This sweep
checks every other `@sophie/*` peerDep for similar latent drift
before the next dep add catches us.
**Verdict**: **No active drift**; one structural inefficiency
worth flagging.

---

## Method

For each `@sophie/*` workspace package: enumerate the
`peerDependencies` block in `package.json`, then check each
peer specifier against the actual version pnpm resolved in
`pnpm-lock.yaml`'s importer block for that package. CI's
`pnpm install --frozen-lockfile` gate is the authoritative
oracle — if it passes locally, the workspace is consistent.

```bash
pnpm install --frozen-lockfile   # Done in 305ms — green.
```

---

## Per-package audit

### `@sophie/astro`

| Peer | Declared range | Lockfile resolution | Status |
|---|---|---|---|
| `astro` | `^6.0.0` | `6.3.1` | ✅ |
| `esbuild` | `^0.27.0` | `0.27.7` | ✅ |
| `react` | `^19.2.6` | `19.2.6` | ✅ |
| `react-dom` | `^19.2.6` | `19.2.6` | ✅ |
| `vite` | `^7.3.0 \|\| ^8.0.0` | `7.3.3` | ✅ |

`vite`'s peerDep was widened in PR #34 (commit `0750772`) from
`^7.3.0` to `^7.3.0 || ^8.0.0` after the storybook 10.3.6 vite@8
transitive dep caused a future relock to violate the narrow
range. The widening is defensive — vite@7.3.3 still resolves
locally, but a `pnpm dedupe` or any future `pnpm add` could
promote to vite@8.0.11 without breaking the peer.

### `@sophie/components`

| Peer | Declared range | Lockfile resolution | Status |
|---|---|---|---|
| `react` | `^19.2.6` | `19.2.6` | ✅ |
| `react-dom` | `^19.2.6` | `19.2.6` | ✅ |

### `@sophie/core` and `@sophie/theme`

No peerDependencies declared. Nothing to audit.

---

## Structural inefficiency (not active drift)

The lockfile contains **two distinct vite resolutions** for
`vitest`:

```
$ grep -E "version: 4.1.5\(.*vitest" pnpm-lock.yaml \
    | grep -oE "vite@[0-9.]+" | sort | uniq -c
   1 vite@7.3.3   # @sophie/astro's vitest
   2 vite@8.0.11  # @sophie/components + @sophie/core's vitest
```

The split happens because `@sophie/astro`'s vite peer was
historically `^7.3.0` (narrower than storybook's vite@8); pnpm
pinned `@sophie/astro`'s vitest to a vite@7-compatible resolution
while other packages got storybook's vite@8.

**Cost**: duplicate vite in `node_modules` (~2-3 MB extra).
**Functional impact**: zero — tests pass under both resolutions.

**Resolution paths** (not urgent; flagging so it's a known choice):

1. **Run `pnpm dedupe`** — unifies vitest's vite to `8.0.11`
   workspace-wide. May trigger other re-resolutions; needs a
   full local pipeline + CI run to validate.
2. **Bump `@sophie/astro`'s `astro` peerDep when astro 6 is
   verified against vite 8 upstream** — astro 6.3.1's own peer
   is `vite: ^7.3.2`. If a future astro 6.x publishes with
   `vite: ^7 || ^8`, the resolution will naturally unify.
3. **Leave as-is.** The split is functionally harmless; the
   widened `^7.3.0 || ^8.0.0` peer means future relocks won't
   surface as CI failures.

Recommend path 3 until the next dep-related CI failure or
deliberate hygiene PR.

---

## Process lesson

CI's `pnpm install --frozen-lockfile` is a **leading indicator
of latent lockfile drift, not a fault localizer**. Local `pnpm
install` tolerates peer/lockfile inconsistencies by design; CI
refuses to proceed. A drift introduced by transitive-dep
upgrade (here, storybook 10.3.6 → vite@8) can live on `main`
indefinitely until a PR triggers a relock that surfaces it.

Two ways to surface drift earlier:

1. **Add a `pnpm install --frozen-lockfile` step to the
   local pre-commit / pre-push hook.** Currently lint + tests
   run locally; adding the frozen-lockfile gate would catch
   the issue at commit time, not at CI time.

2. **Periodic peerDep audit (this doc).** Run after each
   storybook / astro / framework upgrade — the major
   ecosystem moves are the ones most likely to cascade
   transitive vite/react peer-range changes.

---

## P-backlog

- **P3-NEW**: Add `pnpm install --frozen-lockfile` to a local
  pre-push hook (or doc the manual command in
  `CONTRIBUTING.md`). Catches drift before CI does.
- **P3-NEW**: When storybook next bumps a major version, re-run
  this audit. Storybook is the workspace's biggest transitive
  vite/react/typescript anchor.

---

## References

- [PR #34](https://github.com/drannarosen/sophie/pull/34) — the
  vite peerDep widening that motivated this sweep.
- [pnpm peer dependencies docs](https://pnpm.io/package_json#peerdependencies)
  — the spec for what `--frozen-lockfile` actually enforces.
