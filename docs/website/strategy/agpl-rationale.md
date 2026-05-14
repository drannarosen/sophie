---
title: AGPL rationale
short_title: AGPL rationale
description: Why Sophie is AGPL-3.0-or-later, what that means for adopters and contributors, and how it preserves a future dual-licensing option.
tags: [strategy, license, agpl, commercialization]
---

# AGPL rationale

Sophie's platform code is licensed
[AGPL-3.0-or-later](https://www.gnu.org/licenses/agpl-3.0.html). This
page explains *why*, what the choice forecloses, and what it preserves
for later. Canonical decision record:
[ADR 0024](../decisions/0024-license-agpl.md).

## The one-sentence rationale (use this with skeptical reviewers)

> AGPL-3.0 ensures Sophie cannot be enclosed as proprietary IP by any
> contributor or downstream user; the platform remains as freely
> modifiable for educators in 20 years as it is today.

## Why not MIT / Apache / BSD?

Permissive licenses (MIT, Apache 2.0, BSD) allow downstream forks to
be *closed*. A well-funded commercial actor — a textbook publisher, an
edtech vendor — could take MIT-licensed Sophie, add proprietary
features, sell it back to universities, and never contribute back. For
infrastructure intended to serve educators long-term, this is the
failure mode AGPL exists to prevent.

The historical pattern is clear: educational software repeatedly gets
enclosed (Blackboard, Turnitin, Coursera, Pearson revel). Permissive
licensing accelerates enclosure. Copyleft slows it.

## Why AGPL specifically and not GPL?

The "A" in AGPL closes the "SaaS loophole" in GPL: if a downstream
user runs Sophie as a hosted service (without distributing binaries),
plain GPL would not require source disclosure. AGPL does. For a
platform whose natural commercial path is hosted-SaaS, AGPL is the
license that keeps the source obligation aligned with the actual
distribution model.

## What AGPL forecloses

Be honest about costs:

- **Some commercial users will not adopt Sophie at all.** Companies
  with strict policies against AGPL software (large enterprises,
  certain government contractors) cannot use Sophie even internally.
  This narrows the addressable commercial market significantly.
- **Sophie cannot accept contributions back into a permissive
  upstream** (e.g., contributing a Sophie module back to Quarto's
  MIT-licensed core). Contributions flow one way: out from MIT/Apache
  upstreams, never back from AGPL Sophie into them.
- **Venture-scale commercialization is structurally incompatible.**
  VCs typically reject AGPL because it limits exit options. This is
  consistent with the [Funding roadmap](funding-roadmap.md): Path 3
  (VC-scale) is off the table regardless.

These costs are real. They were weighed when AGPL was selected and
judged acceptable because Sophie's primary mission is to serve
educators sustainably, not to maximize commercial reach.

## What AGPL preserves

Three things AGPL specifically protects:

1. **The "remains free in 20 years" guarantee.** Any future Sophie
   user can fork, modify, and self-host without permission. No
   enclosure path exists.
2. **The contributor-fairness invariant.** Anyone who contributes to
   Sophie knows their contribution cannot be enclosed by anyone else.
   This shapes contributor expectations cleanly.
3. **The dual-licensing future option** — see next section.

## Dual-licensing: the deferred commercial option

AGPL is compatible with **dual-licensing**: the same code can be
offered under AGPL (for OSS use) *and* under a commercial license (for
users who can't or won't comply with AGPL terms). MongoDB, Sentry, and
Elastic have all used this pattern.

For Sophie, dual-licensing becomes viable post-tenure (see
[Commercialization](commercialization.md)) as one of several optional
commercial paths. The pattern works as follows:

- **AGPL** — free for everyone; downstream must release source if
  redistributing or hosting publicly.
- **Commercial license** — paid per-seat or per-institution; permits
  closed downstream use.
- Sophie remains the same code; the license a given user operates
  under depends on their contract.

### The CLA prerequisite

Dual-licensing requires Sophie to **own** all contributions outright
(or hold a sufficiently broad license to relicense them). If external
contributors retain copyright on their contributions and Sophie has
only an AGPL inbound grant, Sophie cannot offer those contributions
under a commercial license — the dual-licensing option closes the
moment the first external AGPL-only contribution merges.

This is the load-bearing pre-condition for preserving commercial
optionality: **set up a Contributor License Agreement (CLA) or
copyright-assignment process before accepting external contributions.**

Two viable structures:

- **CLA with broad license grant** (Apache CLA style) — contributor
  retains copyright but grants Sophie a perpetual, irrevocable,
  sublicensable license. Permissive but sufficient.
- **Copyright assignment** (FSF style) — contributor assigns
  copyright to Sophie. More legally robust but higher friction.

The CLA decision is currently an
[open question](../strategy/index.md#operating-constraints) flagged
for follow-up. Until it is resolved, accepting external contributions
risks foreclosing the dual-licensing option permanently.

Practical immediate action: even before formal CLA tooling, Sophie's
`CONTRIBUTING.md` should state that contributions are accepted under
terms compatible with future relicensing (e.g., Developer Certificate
of Origin + broad license grant in the commit signoff).

## Communicating AGPL to grant reviewers

Some grant reviewers — particularly in NSF MPS directorates that do
not see AGPL frequently — may flag the license as a concern. The
one-sentence rationale at the top of this page is the answer.
Reinforcements:

- **Sustainability**: AGPL prevents enclosure, which is the dominant
  failure mode for educational software infrastructure. Cite the
  Blackboard / Turnitin / Pearson pattern.
- **Broader impacts**: AGPL guarantees the platform remains accessible
  to under-resourced institutions (HSIs, community colleges) without
  ever being held hostage to a commercial license fee.
- **Precedent**: Major scientific OSS projects use copyleft
  successfully — for example, R is GPL-2; many bioinformatics tools
  are GPL-3.

## See also

- [License: AGPL — ADR 0024](../decisions/0024-license-agpl.md) — canonical decision record
- [Commercialization](commercialization.md) — how dual-licensing fits into the post-tenure strategy
- [Funding roadmap](funding-roadmap.md) — why VC-scale is off the table regardless
