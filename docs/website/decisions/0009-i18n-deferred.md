---
date: 2026-05-09T00:00:00.000Z
tags:
  - i18n
  - l10n
  - scope
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0009: i18n posture — `lang` reserved, no real i18n in v1

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

{abbr}`i18n` (internationalization) is the design discipline that
makes a system *adaptable* to different languages and locales without
code changes; {abbr}`l10n` (localization) is the actual adaptation
work for a specific locale.

Real i18n requires:

- Every UI string in translation files (not hardcoded).
- Locale-prefixed routes.
- `Intl.NumberFormat` / `Intl.DateTimeFormat` for locale-aware
  formatting.
- Right-to-left layout support via CSS logical properties.
- Font subsets for needed character sets.

The cost of doing real i18n in v1 is ~1 week of upfront work plus an
ongoing tax on every interactive component (`t('key')` instead of
hardcoded strings). The cost of doing it later, after content scales,
is several weeks under teaching pressure.

Sophie's first consumers are English-language US university courses.
The probability of needing a non-English fork in the first 1–2 years
is low.

## Decision

**Reserve `Chapter.lang: string` field on the schema (default `'en'`).
Do no other i18n work in v1.** Real string externalization, locale
routing, RTL CSS — all deferred to v3+ unless a real consumer signal
emerges.

## Rationale

- **The schema reservation costs nothing.** A `lang` field with a
  default doesn't change build, validation, or runtime; future
  l10n efforts can populate it without breaking the schema.
- **Real i18n has compounding cost in v1.** Every component author
  pays the `t('predict.submit')` overhead. Many translations don't
  exist; missing-key handling needs design; layout under longer
  German strings needs testing. None of that is justified by current
  consumers.
- **The retrofit cost (~3 weeks later) is bounded** if components are
  written with extractable strings (i.e., simple JSX text, no
  string-template logic). Discipline now means easy retrofit later.
- **Light insurance, not commitment.** Reserving `lang` says "we
  thought about this" without committing engineering resources.

## Alternatives considered

- **Don't reserve the field; Sophie is English-only on principle.**
  Pros: simpler schema. Cons: if a translation ever happens, the
  schema breaks and adopters need to upgrade. Rejected: ~30 seconds
  of preparation buys real optionality.

- **Do real i18n in v1.** ~+1 week in Phase 1 + ongoing tax. Worth it
  only if you expect non-English consumers within the first year or
  two. Rejected: that signal isn't there.

- **Defer even the schema reservation.** Rejected: ~zero cost to do
  it now; non-zero cost to add later.

## Consequences

**Easier:**

- Schema is honest about its scope.
- A future Spanish/Chinese fork doesn't have to upgrade Sophie for
  the schema field.

**Harder:**

- Component authors should still write extractable strings
  (avoid string concatenation, avoid plurals via `+1`/`+s` logic)
  to make later i18n retrofit feasible. This is good discipline
  anyway but worth flagging.
- If Sophie hits the open-source release with a non-English
  early adopter, the i18n work compresses into release-prep —
  acceptable risk given low probability.

**Triggers:**

- `Chapter.lang: z.string().default('en')` in the schema.
- Component authoring guideline: write extractable strings.
- Re-evaluate when (a) a real non-English consumer emerges, or
  (b) Sophie's open-source release has external adopters who ask
  for translation support.

## References

- Brainstorming session, i18n Q (May 2026).
- [reference/content-schema.md](../reference/content-schema.md) — the
  reserved `lang` field.
