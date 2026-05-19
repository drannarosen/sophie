## Summary

<!-- 1–3 bullets: what changed and why. Lead with intent, not mechanics. -->

## ADR alignment

<!-- Cite ADRs by number when the change touches a locked decision.
     Examples: "Per ADR 0061 Rule 3 (LOC budget)"; "Amends ADR 0060
     §Consequences". Delete this section for trivial fixes. -->

## Docs landed atomically with code (ADR 0061 Rule 5)

<!-- Sophie's "docs no drift" principle: when code renames, reshapes,
     or replaces anything that appears in `docs/website/` (component
     names, prop shapes, ADR examples, schema fields, MyST TOC
     entries, package paths), the docs updates land in the SAME PR.
     Check all that apply: -->

- [ ] N/A — this PR doesn't touch authoring shapes, ADR examples, or anything else docs reference.
- [ ] Docs are updated to match the new shape (or were already correct).
- [ ] `pnpm lint:links` passes (no new broken local links) — informational, not blocking.
- [ ] `pnpm lint:loc` passes — non-exempt source files stay under the 800-LOC error threshold.

## Test plan

<!-- Bulleted checklist of how the PR was validated. Examples:

- [x] `pnpm exec biome check .` — 0/0
- [x] `pnpm exec turbo run typecheck` — 11/11
- [x] `pnpm --filter @sophie/X exec vitest run` — N/N tests
- [x] `pnpm exec turbo run build --filter=smoke` — audit baseline preserved (0/16/9)
- [ ] CI green (pending)

-->

🤖 Generated with [Claude Code](https://claude.com/claude-code)
