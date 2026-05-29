#!/usr/bin/env bash
# Base-path regression guard (CI-gated).
#
# Astro does NOT auto-prefix author-written `<a href>` / `<img src>` with
# the configured `base`; only its own pipeline assets (`/_astro/`,
# `astro:assets` `<Image>`) get prefixed. Every internal link/asset
# @sophie/* emits therefore has to pass through `withBase` (→ joinBase →
# import.meta.env.BASE_URL) or it 404s under a non-root consumer deploy
# (e.g. GitHub Pages `base: "/astr201"`). This script is the durable
# defense for that whole class of bug (cf. the packed-smoke gate for the
# React #418 hydration class).
#
# Two assertions, both fail-loud:
#   1. The smoke target BUILDS under a non-root base (exit 0). Guards the
#      info-page dispatcher build-breaker: under a base the route
#      `pathname` is `/base-probe/<slug>/`, so the slug lookup must use
#      the LAST path segment (deriveInfoSlug), not strip-leading-slash —
#      otherwise the dispatcher invariant throws and the build dies.
#   2. The emitted dist HTML carries ZERO unprefixed internal links in
#      Sophie's route + asset namespaces. A correct link under
#      `/base-probe` reads `href="/base-probe/units/..."`; a leak reads
#      `href="/units/..."`. The grep below matches the leak shape and
#      NOT the prefixed shape (the char after `="/` is the namespace
#      letter for a leak, `b` (base-probe) for a correct link).
#
# Namespace list — WHY each is here (every Sophie-owned absolute path
# that is NOT auto-prefixed by Astro's own pipeline):
#   units sections equations library decisions  — route namespaces
#   pagefind                                     — runtime search index
#   figures                                      — registry <img src>
#                                                  (plain <img>, NOT
#                                                  astro:assets, so not
#                                                  auto-prefixed)
# Astro's own `/_astro/` IS auto-prefixed, so it is deliberately absent.
#
# Scope boundary: this scan covers emitted HTML internal links only. The
# Pagefind loader URL (SearchModal) lives in a JS island bundle — it is
# covered by withBase + the Vite BASE_URL replacement baked into that
# bundle (verified) + the unit/typecheck layer, NOT by this HTML grep.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SMOKE="$REPO_ROOT/examples/smoke"
BASE="/base-probe"
NAMESPACES="units|sections|equations|library|decisions|pagefind|figures"

# Two-phase build. Phase 1: build the @sophie/* workspace dep graph via
# turbo (cached, follows the dependency order core → components/theme →
# astro). Phase 2: build smoke DIRECTLY (not through turbo) so the
# SOPHIE_SMOKE_BASE env var reaches astro.config.ts — turbo 2.x runs in
# strict env mode and strips any env var not declared in turbo.json, so a
# turbo-driven smoke build would silently see no base (the leak this
# guard exists to catch would itself be masked). Building smoke directly
# is the same shape the packed-smoke CI job uses for its consumer.
echo "→ Phase 1: building @sophie/* workspace deps (turbo)..."
cd "$REPO_ROOT"
pnpm exec turbo run build --filter=@sophie/astro --filter=@sophie/components --filter=@sophie/core --filter=@sophie/theme

echo "→ Phase 2: building smoke under non-root base ($BASE)..."
SOPHIE_SMOKE_BASE="$BASE" pnpm --dir "$SMOKE" build

echo "→ Scanning dist HTML for unprefixed internal links..."
# `="/<namespace>/` with NO base prefix in front == leak. The base-
# prefixed form `="/base-probe/<namespace>/` does not match because the
# character class after `="/` is the namespace's first letter only.
LEAKS="$(grep -rnoE "(href|src)=\"/(${NAMESPACES})/" "$SMOKE/dist" --include="*.html" || true)"

if [ -n "$LEAKS" ]; then
  echo "✗ BASE-PATH LEAK: unprefixed internal links found in dist HTML."
  echo "  Every internal link/asset must pass through withBase so it"
  echo "  resolves under a non-root consumer deploy. Offending lines:"
  echo "$LEAKS"
  exit 1
fi

echo "✓ Base-path guard passed: build exit 0 + zero unprefixed internal links."
