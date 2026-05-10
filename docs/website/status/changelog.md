---
title: Changelog
short_title: Changelog
description: Versioned release notes for Sophie packages, auto-generated from Changesets once the platform repo lands.
tags: [changelog, releases, semver]
---

# Changelog

:::{important} Status: pending Phase 0
This page becomes the auto-generated release-notes feed once
Sophie's platform repo lands and Changesets is wired into CI. Until
then, the brainstorming session and design docs are the
"changelog" — every locked decision is captured as an
[{abbr}`ADR`](../decisions/template.md).
:::

## How releases work (planned)

Sophie uses [Changesets](https://github.com/changesets/changesets)
across the `@sophie/*` packages:

- Every PR that changes a package adds a changeset describing the
  impact: `patch` (bug fix), `minor` (additive change), or `major`
  (breaking).
- A release PR aggregates pending changesets into version bumps and
  release notes.
- Merging the release PR publishes to npm and tags the release on
  GitHub.

This page becomes the rendered view of those release notes.

## Pre-release: what's been decided so far

Until v0.1.0 ships, the audit trail is:

- The 10 ADRs in [`decisions/`](../decisions/template.md).
- The roadmap (`status/roadmap.md`).
- This site's git history once the platform repo lands.

## SemVer policy

`@sophie/*` packages follow [SemVer 2.0.0](https://semver.org):

- **MAJOR** version bumps signal breaking API changes; require a
  migration script (`sophie upgrade`) and an ADR.
- **MINOR** version bumps add functionality in a backward-compatible
  way (e.g., new components, new audit checks, new CLI subcommands).
- **PATCH** version bumps are bug fixes that don't change behavior.

`@experimental` exports may change in minor versions; consumers opt
in knowingly. `@internal` exports may change at any time. See
[Plugin API](../reference/plugin-api.md) for the stability tiers.

## Changeset categories

When authoring a changeset, categorize the change:

- `:rocket: feature` — new component, new audit check, new CLI command.
- `:bug: fix` — bug fix without behavior change.
- `:warning: breaking` — requires consumer action; bumps MAJOR.
- `:lock: security` — security fix; bumps PATCH minimum, sometimes
  MAJOR.
- `:art: dx` — developer-experience improvement (docs, scripts,
  tooling) without consumer-visible change.
- `:wastebasket: deprecate` — marks an export as deprecated; pairs
  with a follow-on `breaking` removal in a future MAJOR.

## See also

- [Plugin API → Stability tiers](../reference/plugin-api.md).
- [ADR 0001](../decisions/0001-platform-not-monorepo.md) — public API
  discipline from v1.
- [Roadmap](roadmap.md) — phase-level planning.
