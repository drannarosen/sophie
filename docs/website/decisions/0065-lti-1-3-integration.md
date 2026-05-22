---
date: 2026-05-21T00:00:00.000Z
tags:
  - lms
  - integration
  - canvas
  - lti
  - tier-3
  - course-website
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0065: LTI 1.3 as Sophie's primary LMS integration path

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Related**: [0001](./0001-platform-not-monorepo.md) (platform shape), [0007](./0007-persistence-indexeddb.md) (current per-browser persistence), [0030](./0030-audience-and-ai-author-model.md) (authoring model), [0066](./0066-pseudonymous-first-data-model.md) (data model this enables), [0072](./0072-three-tier-build-priority.md) (tier placement)
:::

## Context

Sophie must integrate with Canvas LMS at SDSU (and ideally other Canvas /
Blackboard / Moodle / D2L instances elsewhere) for at least three reasons:

1. **Gradebook of record**: FERPA + university policy require official
   grades to live in the institutional LMS.
2. **Roster sync**: official enrollment lives in the SIS-fed LMS roster;
   Sophie should not maintain a parallel roster.
3. **Accommodations**: disability-resource accommodations flow through
   LMS; Sophie should not duplicate.

Multiple integration patterns exist:

- **Custom OAuth federation** to SDSU's identity provider (SAML /
  Shibboleth) — works for SDSU only, requires central IT cooperation,
  doesn't get roster/gradebook integration
- **Canvas REST API direct calls** — vendor-specific, brittle to Canvas
  evolution, doesn't propagate course-context cleanly
- **LTI 1.1** — legacy ed-tech standard; deprecated; superseded
- **LTI 1.3** (IMS Global Learning Consortium) — current state of art
  in ed-tech integration; portable across LMS vendors; FERPA-aligned by
  design

[Course-Website Platform Roadmap](../status/course-website-roadmap.md)
commits LMS integration to Tier 3 with LTI 1.3 as the chosen pattern.
This ADR locks that decision and its implications.

## Decision

**Sophie's primary LMS integration mechanism shall be LTI 1.3 (Learning
Tools Interoperability v1.3, IMS Global Learning Consortium standard).**

### Services Sophie consumes

LTI 1.3 provides four services Sophie uses:

| Service | Purpose |
|---|---|
| **Resource Link Launch** | Student clicks Sophie link in Canvas → authenticated Sophie session via OpenID Connect + OAuth 2.0 + JWT |
| **NRPS** (Names and Roles Provisioning Service) | Auto-sync course roster Canvas → Sophie |
| **AGS** (Assignment and Grade Service) | Sophie pushes grades back to Canvas gradebook |
| **Deep Linking 2.0** | Instructor picks specific Sophie components from Canvas's UI when authoring a Canvas assignment |

### Pseudonymous-first identity

LTI 1.3 provides the student's identity via an opaque pseudonymous
`sub` claim — stable per-(platform, user, tool) but not PII. Sophie's
data model keys all per-student state on this pseudonymous identifier
([ADR 0066](./0066-pseudonymous-first-data-model.md) details the data
model commitment).

PII (name, email, SID) can be released optionally by Canvas admin
configuration; Sophie's default posture is to **not** request or store
PII. Joining Sophie data back to a student name requires going through
Canvas — where access is already FERPA-audited.

### Tier placement

LTI 1.3 is **Tier 3** per
[ADR 0072](./0072-three-tier-build-priority.md):

- Tier 1+2 operate as static-deploy sites with per-browser state
  ([ADR 0007](./0007-persistence-indexeddb.md)); no LTI, no auth, no
  PII
- Tier 3 activates LTI when Sophie's server-side infrastructure
  arrives; per-browser state migrates to authenticated server-side
  state via the forward-compatible schema design

### Forward-compatibility commitment

Tier 1/2 record schemas use a stable `user_id` field shape: per-browser
UUID at Tier 1/2; LTI `sub` claim at Tier 3. Sophie treats both
uniformly. This means **no schema migration is required** when a course
moves from Tier 2 to Tier 3 — the records flow through unchanged
(detailed migration UX in the course-website roadmap §"Tier 2 → Tier 3
migration path").

## Consequences

### Positive

- **Portable**: LTI 1.3 is supported by Canvas, Blackboard, Moodle,
  D2L, Schoology, Brightspace, and most modern LMSes. Not locked to
  SDSU's vendor choice.
- **FERPA-aligned by default**: pseudonymous-first identity keeps
  Sophie out of the regulatory-custodian role.
- **Zero student account management**: no Sophie passwords, no
  registration flow, no account-recovery support burden.
- **Future-proof**: IMS Global's continued investment; new LTI services
  (e.g., LTI Advantage extensions) layer on without rework.
- **Standard tooling**: established libraries exist
  (`lti-1.3-tool` for Node, `pylti1.3` for Python, etc.).

### Negative

- **Tier 3 complexity**: LTI 1.3 requires a server (the tool host),
  TLS certificates, OAuth2 token management, and JWT signing keys.
  Adds operational scope when Tier 3 activates.
- **Canvas-side configuration**: instructors register Sophie as an
  external tool in their course (or institution administrators
  register course-wide). Documentation must include Canvas-side setup
  steps.
- **Public deployments require dual mode**: a course can be public
  (Tier 1 static, no LTI) AND have an LTI-mounted Tier 3 variant for
  authenticated students. Sophie's deployment topology must support
  both.

### Neutral

- **Multiple LMS support is opt-in per institution**: Sophie ships LTI
  1.3 generically; institution-specific quirks (Canvas's particular
  Deep Linking flow, Blackboard's role-claim variations) get handled
  via configuration, not code forks.

## Implementation notes (deferred to Tier 3)

When Tier 3 implementation begins:

1. New package `@sophie/lti` wrapping `lti-1.3-tool` or equivalent
2. JWK pair generation + key rotation policy
3. LTI launch endpoints (`/lti/launch`, `/lti/login`, `/lti/jwks`)
4. NRPS poll-on-cadence or event-driven roster sync
5. AGS grade push hooks wired to `Assessment` completion events (see
   [ADR 0073](./0073-unified-assessment-schema.md))
6. Deep Linking 2.0 picker UI for instructor-side assignment authoring
7. Canvas registration flow documentation in
   `docs/website/explanation/lms-integration-and-compliance.md`

## References

- [IMS Global LTI 1.3 Core Specification](https://www.imsglobal.org/spec/lti/v1p3/)
- [LTI Advantage services overview](https://www.imsglobal.org/activity/learning-tools-interoperability)
- [Course-Website Platform Roadmap](../status/course-website-roadmap.md)
