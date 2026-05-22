---
date: 2026-05-21T00:00:00.000Z
tags:
  - data-model
  - privacy
  - ferpa
  - lti
  - schema
  - course-website
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0066: Pseudonymous-first data model

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Amends**: [0007](./0007-persistence-indexeddb.md) (extends with stable user_id + course_id + schema-version pattern), [0029](./0029-broadcast-lww.md) (LWW timestamps now load-bearing for cross-tier sync)
- **Related**: [0065](./0065-lti-1-3-integration.md) (provides the pseudonymous sub claim), [0072](./0072-three-tier-build-priority.md) (tier-aware persistence)
:::

## Context

Sophie persists per-student state today via IndexedDB + `useInteractive`
+ `ResponseStore` ([ADR 0007](./0007-persistence-indexeddb.md)). The
state schema is currently unstructured around two concerns that will
become load-bearing as Sophie grows:

1. **FERPA + privacy**: when Sophie eventually accepts authenticated
   sessions at Tier 3 ([ADR 0072](./0072-three-tier-build-priority.md)),
   it must avoid becoming a FERPA "education record custodian" in the
   regulatory sense. Holding PII (name, email, SID) crosses that line;
   holding pseudonymous IDs does not.
2. **Tier 2 → Tier 3 migration**: per-browser state at Tier 1/2 must
   flow into authenticated server-side state at Tier 3 without a
   schema migration. Without a stable record shape, this becomes a
   painful rewrite later.

The
[Course-Website Platform Roadmap](../status/course-website-roadmap.md)
locks these concerns by committing Sophie to a **pseudonymous-first
data model** with a forward-compatible record shape. This ADR codifies
that commitment.

## Decision

**Every persisted record in Sophie — at Tier 1, Tier 2, or Tier 3 —
shall key on a pseudonymous `user_id` and carry a stable set of
identification + audit fields, with PII deliberately excluded by
default.**

### Required fields on every persisted record

| Field | Type | Purpose |
|---|---|---|
| `user_id` | `string` | Per-browser UUID at Tier 1/2; LTI `sub` claim at Tier 3. Same field name + shape; uniformly treated. |
| `course_id` | `string` | Prevents cross-course state merges. Required even on per-browser records. |
| `schema_version` | `string` | Semver-style; tracks future schema migrations. |
| `created_at` | `ISO 8601 string` | Initial write timestamp. |
| `updated_at` | `ISO 8601 string` | Last write timestamp. LWW conflict resolution per [ADR 0029](./0029-broadcast-lww.md). |
| `state_type` | `string` | Typed record kind: `bkt_mastery` \| `fsrs_state` \| `predict_response` \| `practice_attempt` \| etc. |

### PII exclusion default

- **Sophie does NOT store**: student names, email addresses, student
  IDs (SDSU RedID), photos, contact info, demographic data
- **Sophie MAY store** (only when authoring or pedagogy demands):
  per-skill mastery state, response history, retrieval-prompt
  performance, bookmarks, reading progress, opt-in SoTL telemetry
  events
- **At Tier 3**: name/email can be released by Canvas admin choice; if
  released, Sophie holds them transiently for UI rendering only,
  never persists them

### Per-browser user_id generation (Tier 1/2)

On first interactive use, Sophie generates a v4 UUID and stores it in
IndexedDB. This UUID is **per-browser, per-origin** — same browser on
the same domain gets the same ID across visits; different browser or
device gets a different ID. No cross-device linkage at Tier 1/2.

### LTI sub claim (Tier 3)

When a student launches Sophie via LTI 1.3 ([ADR 0065](./0065-lti-1-3-integration.md)),
the `sub` claim from the LTI JWT replaces the per-browser UUID as the
`user_id`. The migration UX (auto-import per-browser state on first LTI
launch) is detailed in the
[course-website roadmap](../status/course-website-roadmap.md) §"Tier 2
→ Tier 3 migration path".

### Schema versioning

Every typed record carries a `schema_version`. When Sophie's schema
evolves, migration scripts run against IndexedDB records (at Tier 1/2)
or server-side records (at Tier 3) to upgrade. Records that fail
migration are surfaced to the user with a clear "your saved state is
older than this Sophie version; export to JSON before upgrading"
prompt.

## Consequences

### Positive

- **FERPA-elegant**: Sophie isn't a regulatory PII custodian. Joining
  Sophie data to a student name requires going through Canvas — where
  access is already FERPA-audited.
- **Migration-friendly**: Tier 2 → Tier 3 transition is mechanical
  because the schema doesn't change shape.
- **Privacy-preserving by default**: Sophie can be deployed as a
  public OER reading site without any privacy considerations.
- **Audit-friendly**: timestamps + schema versions on every record
  enable rich audit trails.
- **Cross-browser leakage impossible**: per-browser UUIDs don't link
  state across devices; students using two browsers get two
  independent profiles (a feature, not a bug, at Tier 1/2).

### Negative

- **No cross-device sync at Tier 1/2**: a student switching from
  laptop to phone loses local state. Mitigation: "Export my state"
  affordance for manual save/restore. Cross-device sync arrives with
  Tier 3 auth.
- **Slight authoring burden**: developers must remember to populate
  the required fields on every persisted record. Mitigation: helper
  utility in `@sophie/core` that wraps record creation
  (`createPedagogyRecord(state_type, payload)` injects the boilerplate).
- **Pseudonymous IDs are not anonymous**: a determined adversary with
  Canvas access could correlate. Sophie's privacy posture is
  pseudonymity (not anonymity); IRB protocols handle the residual risk
  for SoTL research.

### Neutral

- **Per-browser fingerprinting is irrelevant**: Sophie does not attempt
  to identify a returning student across browsers via fingerprinting.
  Cross-device identity is a Tier 3 feature, not a Tier 1/2 hack.

## Implementation notes

- Update `@sophie/core/schema` to add the required-fields union to all
  persisted record types
- Add `createPedagogyRecord` helper in `@sophie/core/runtime`
- Update existing `ResponseStore` records to backfill `course_id` +
  `schema_version` + timestamps (migration script for existing local
  state)
- Add `getUserId(course_id)` helper that returns per-browser UUID at
  Tier 1/2 or LTI sub at Tier 3 (uniform call site)
- Document the data model contract in
  `docs/website/explanation/data-model.md` (new file, future PR)

## References

- [Course-Website Platform Roadmap](../status/course-website-roadmap.md)
- [FERPA primary text — 34 CFR Part 99](https://www.ecfr.gov/current/title-34/subtitle-A/part-99)
- [LTI 1.3 sub claim semantics](https://www.imsglobal.org/spec/lti/v1p3/#user-identity-claims)
