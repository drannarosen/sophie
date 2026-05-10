# Archived design docs

These eight Markdown files (including the original `README.md`) were
the flat-file design docs for Sophia (May 2026). Their content has
been **ported into the MyST docs site** at
[`../docs/website/`](../docs/website/) and reorganized under
[Diátaxis](https://diataxis.fr) sections.

The canonical source for Sophia's design documentation is now the
docs site, not these files.

## Mapping to the new docs site

| Archived file | Replaced by |
|---|---|
| `README.md` | [`docs/website/index.md`](../docs/website/index.md) + [`decisions/0001-platform-not-monorepo.md`](../docs/website/decisions/0001-platform-not-monorepo.md) |
| `design-notes.md` | [`explanation/architecture.md`](../docs/website/explanation/architecture.md) + [`explanation/persistence-model.md`](../docs/website/explanation/persistence-model.md) + ADRs 0001, 0002, 0007 |
| `content-schema.md` | [`reference/content-schema.md`](../docs/website/reference/content-schema.md) + [`decisions/0003-zod-as-source-of-truth.md`](../docs/website/decisions/0003-zod-as-source-of-truth.md) |
| `component-contract.md` | [`reference/component-contract.md`](../docs/website/reference/component-contract.md) + [`decisions/0004-component-contract-revisions.md`](../docs/website/decisions/0004-component-contract-revisions.md) |
| `audit-and-authoring.md` | [`explanation/audit-and-ai-authoring.md`](../docs/website/explanation/audit-and-ai-authoring.md) + [`reference/cli.md`](../docs/website/reference/cli.md) |
| `dual-profile-builds.md` | [`how-to/set-up-dual-profile.md`](../docs/website/how-to/set-up-dual-profile.md) + [`how-to/set-up-cloudflare-access.md`](../docs/website/how-to/set-up-cloudflare-access.md) |
| `pedagogical-innovations.md` | [`explanation/pedagogical-foundations.md`](../docs/website/explanation/pedagogical-foundations.md) |
| `roadmap.md` | [`status/roadmap.md`](../docs/website/status/roadmap.md) |

## Why archived rather than deleted

This directory was not under git when the conversion happened, so
deletion would have been irreversible. The archive preserves a
recoverable record of the pre-conversion state in case any porting
errors surface later. Once the parent `platform-design/` is
initialized as a git repo (or migrated into the future Sophia repo),
this archive can be removed.

## Do not edit these files

Any updates to design content should go to the docs site, not here.
Editing archived files creates two sources of truth.
