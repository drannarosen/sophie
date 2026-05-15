# Project Quality Reviews

Periodic state-of-the-project audits. Each review captures test
metrics, a quality grade (out of 100, mapped to a letter), and a
prioritized P1–P5 backlog.

Reviews are triggered by:

- Cross-cutting changes (component migrations, theme updates, batch
  ports, design-system overhauls).
- Closing a Phase / Trio / major milestone.
- Anna asking "how are we doing?" or "let's harden the code".

Reviews are *not* per-PR code review — those live on the PRs
themselves.

## Reviews

| Date | Topic | Grade | Trigger | Status |
|---|---|---|---|---|
| 2026-05-10 | [Phase 1 hardening audit](2026-05-10-phase-1-hardening-audit.md) | B− (73) | Trio 3 closed (PR #15 merged); pre-Trio-4 hardening | Closed — every P1 item shipped in PRs #17–#23 |
| 2026-05-10 | [Post-hardening audit](2026-05-10-post-hardening-audit.md) | B+ (84) | Phase 1 hardening sprint closed (PRs #17–#23 merged); refreshed grade | Closed — every P2 sprint-to-A item shipped in PRs #24–#27 |
| 2026-05-10 | [Sprint-to-A audit](2026-05-10-sprint-to-a-audit.md) | A (91) | P2 sprint-to-A closed (PRs #24–#27 merged); refreshed grade | Closed — Phase 2 chrome work folded into Bucket B audit below |
| 2026-05-12 | [Bucket B PR 2 audit](2026-05-12-bucket-b-pr2-audit.md) | A (93) | Bucket B PRs 1 + 2 + token-rename closed (PRs #28–#31 merged); refreshed grade | Open — capability inventory snapshot; P2/P3 backlog awaits Bucket B PRs 3–10 fold-in |
| 2026-05-15 | [LDS foundation hardening pass quality audit](2026-05-15-hardening-pass-quality-audit.md) | C+ (59) | 12-commit LDS hardening pass closed (commits e2bad73→0083dc7); three parallel critical-review agents | Open — 8 BLOCKING + ~22 IMPORTANT issues across the new ADRs / reference docs / amendments; P1 fix-up commit recommended before ASTR 201 Module 1 migration |
