#!/usr/bin/env bash
# Re-builds @sophie/{core,theme,astro,components} from the workspace,
# packs each into a tarball, and installs the tarballs into
# examples/packed-smoke/.
#
# Per the post-PR-#172 packed-smoke design (PR-D1, ADR-0082 follow-up):
# this consumer is OUTSIDE the pnpm workspace by design, so it surfaces
# packed-vs-workspace regressions (e.g. React #418 hydration mismatches)
# that the in-workspace smoke target cannot exercise by construction —
# pnpm resolves workspace specs to source, not the built dist/ that
# file:-packed consumers consume.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PACKED_SMOKE="$REPO_ROOT/examples/packed-smoke"

echo "→ Building workspace @sophie/* packages..."
cd "$REPO_ROOT"
pnpm turbo run build --filter='@sophie/core' --filter='@sophie/theme' --filter='@sophie/components' --filter='@sophie/astro'

echo "→ Packing tarballs..."
mkdir -p "$PACKED_SMOKE/vendor"
rm -f "$PACKED_SMOKE/vendor/sophie-"*".tgz"

for pkg in core theme components astro; do
  cd "$REPO_ROOT/packages/$pkg"
  pnpm pack --pack-destination "$PACKED_SMOKE/vendor"
done

# pnpm pack rewrites `workspace:*` specs to literal version numbers
# (e.g. "@sophie/core": "0.0.0") in the tarball's package.json. When
# installed outside the workspace, pnpm then tries to resolve those
# specs from the npm registry and fails (the packages aren't published).
#
# Strip inter-@sophie deps from each tarball's package.json. The
# consumer (examples/packed-smoke/package.json) declares all four
# @sophie/* tarballs as direct deps, so pnpm hoists them at the top
# level and Node's module resolution finds them when @sophie/astro
# (etc.) imports @sophie/core. This is faithful to the registry-
# install model (an end-user installing a single @sophie/astro from
# npm would also see those deps installed at the top level), while
# keeping packed-smoke fully outside the pnpm workspace.
echo "→ Stripping inter-@sophie deps from tarballs..."
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
for pkg in core theme components astro; do
  TGZ="$PACKED_SMOKE/vendor/sophie-${pkg}-0.0.0.tgz"
  EXTRACT="$WORK/${pkg}"
  mkdir -p "$EXTRACT"
  tar -xzf "$TGZ" -C "$EXTRACT"
  node -e '
    const fs = require("node:fs");
    const p = process.argv[1];
    const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
    for (const field of ["dependencies", "peerDependencies"]) {
      const deps = pkg[field];
      if (!deps) continue;
      for (const name of Object.keys(deps)) {
        if (name.startsWith("@sophie/")) {
          delete deps[name];
        }
      }
    }
    fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + "\n");
  ' "$EXTRACT/package/package.json"
  (cd "$EXTRACT" && tar -czf "$TGZ" package)
done

echo "→ Installing into examples/packed-smoke..."
cd "$PACKED_SMOKE"
rm -rf node_modules
# pnpm install exits non-zero with ERR_PNPM_IGNORED_BUILDS when the
# allowBuilds set is incomplete — we approve them in the next step, so
# the non-zero exit here is expected; suppress to keep `set -e` happy.
pnpm install --force --ignore-workspace || true

echo "→ Approving postinstall scripts (esbuild, sharp)..."
# pnpm 11 hard-fails any subsequent script run with
# ERR_PNPM_IGNORED_BUILDS unless these are approved. The workspace
# root's pnpm-workspace.yaml lists allowBuilds for esbuild/sharp/
# @swc/core/unrs-resolver, but packed-smoke is OUTSIDE that workspace
# by design, so it needs its own approval. The local pnpm-workspace.yaml
# (in this directory) is INTENTIONALLY empty of `packages:` entries —
# it only carries the allowBuilds map.
pnpm approve-builds --all || true

echo "✓ packed-smoke synced. Tarballs:"
ls -la "$PACKED_SMOKE/vendor/"*.tgz
