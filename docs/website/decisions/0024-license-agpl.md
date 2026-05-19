---
date: 2026-05-10T00:00:00.000Z
tags:
  - license
  - governance
  - foundation
  - phase-0
status: shipped
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0024: License — AGPL-3.0-or-later for platform code

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Sophie launches as a standalone open-source platform
([ADR 0001](./0001-platform-not-monorepo.md)). The Phase 0 holding
pattern deferred the license decision; this ADR finalizes it before
the first push to the public `drannarosen/sophie` repo.

Sophie's primary audience is academia, with the strong likelihood of
SaaS-hosting use cases (course-as-a-service, institution-hosted
textbook portals, etc.). Anna intends to retain optionality to
dual-license, close future versions, or move to a hosted commercial
offering — provided that contribution flow is set up correctly.

The decision must also account for course content (e.g. the eventual
`drannarosen/astr201` repo): course prose is authored separately and
should not become AGPL-burdened by depending on `@sophie/*` packages.

## Decision

**AGPL-3.0-or-later** for the platform code in `drannarosen/sophie`
(all `@sophie/*` packages, the `sophie` CLI, examples, docs).

Course content repositories that depend on `@sophie/*` at runtime
remain independently licensed (typically CC BY for prose, MIT for
course code) and are not derivative under AGPL's definitions.

## Rationale

1. **Network copyleft, deliberately.** AGPL-3 closes the SaaS loophole
   that MIT/Apache leave open: anyone running a modified Sophie as a
   network service must release their modifications. Sophie is a
   textbook-rendering platform; SaaS deployments are a foreseeable
   use case. Permissive licensing would invite extraction without
   reciprocity.

2. **Counter-argument review.** The Snyk-style "permissive maximizes
   adoption" argument was considered and rejected. Sophie's audience
   is academia, where copyleft is well-tolerated and where platform
   integrity matters more than maximum corporate uptake. Open-source
   academic infrastructure (Jupyter, MyST, Quarto) thrives under
   strong-copyleft and similar licenses.

3. **"Privatize later" clarified.** AGPL is one-way for past
   releases — they stay AGPL forever, redistributable by anyone under
   AGPL terms. While Anna retains 100% copyright (true until
   contributors arrive), she can:
   - Dual-license future versions under different terms.
   - Close future-version source while keeping past versions AGPL.
   - Move to a hosted commercial offering using the AGPL'd code.

   What she *cannot* do: retract or relicense past AGPL releases
   distributed to others. This is true under any OSS license — not
   an AGPL-specific limitation.

4. **CLA preserves dual-licensing.** The moment a non-Anna PR is
   accepted, copyright fragments unless contributors sign a CLA
   transferring or licensing their contribution to Anna. A CLA setup
   (DCO-lite or full CLA via cla-assistant.io) is a triggered task
   on first non-Anna PR; documented in the Phase 1 handoff. Until
   then, Sophie is solo-authored and Anna retains 100% copyright.

5. **Course content separability.** Course repos depend on
   `@sophie/*` via npm; that is "use" not "derivation" under AGPL.
   Anna's course prose stays under CC BY without AGPL leakage. This
   is the same boundary that lets MIT-licensed apps depend on
   AGPL-licensed databases.

## Alternatives considered

- **MIT or Apache-2.0**: maximum adoption, no copyleft. Rejected:
  hosted-fork-without-contribute is exactly the failure mode AGPL
  exists to prevent, and Sophie is squarely in that risk zone.
  Contributors are also more reliable under copyleft for academic
  infrastructure projects.

- **GPL-3.0-or-later (non-AGPL)**: copyleft for distributed binaries,
  but not for network services. Rejected for the same reason as MIT:
  hosted Sophie would be a SaaS fork without obligation to share.

- **BSL (Business Source License) → MIT after N years**: hybrid
  commercial protection. Rejected as premature: BSL is for projects
  with funding/staff to defend; solo academic project doesn't have
  the bandwidth to manage BSL well. Revisit if Sophie becomes a
  funded venture.

- **MPL-2.0**: file-level copyleft. Rejected as too permissive for
  the stated SaaS-protection goal — modified Sophie deployed as a
  service wouldn't trigger MPL's share-back unless internal files
  themselves were modified.

## Consequences

**Easier:**

- Legal clarity from day one for downstream consumers.
- Strong contribution-back norm for SaaS integrators.
- Standard OSI-approved license; familiar to academia.

**Harder:**

- Some commercial adopters will not engage with AGPL — accepted
  trade-off, as Sophie targets academia not enterprise SaaS.
- Anna's own future hosted commercial offering needs careful
  CLA management to remain dual-license-able.
- LICENSE-compliance review needed when Sophie ever wraps a
  permissively-licensed dependency that contributors might want
  re-released MIT.

**Triggers:**

- LICENSE file at repo root containing AGPL-3.0-or-later text.
- README banner identifying the license clearly.
- Per-package `package.json` `license` field set to
  `"AGPL-3.0-or-later"`.
- CLA setup as a triggered Phase 1 task on first non-Anna PR
  (documented in `phase-1-plan.md`).
- Notice in `contributing/coding-standards.md` once contributors
  arrive.

## References

- [ADR 0001: Standalone platform repo](./0001-platform-not-monorepo.md) —
  the decision that made a license decision necessary.
- [ADR 0023: Vertical-slice build order](./0023-vertical-slice-build-order.md) —
  deferred the license decision to step 10.
- AGPL-3.0 text: <https://www.gnu.org/licenses/agpl-3.0.en.html>
- OSI summary: <https://opensource.org/license/agpl-v3>
