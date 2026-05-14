---
title: Commercialization
short_title: Commercialization
description: Honest assessment of Sophie's commercial paths, why none of them happen pre-tenure, and which post-tenure options are realistic.
tags: [strategy, commercialization, revenue, post-tenure, saas, speaking]
---

# Commercialization

How Sophie generates revenue, if ever, and why none of it happens
before 2028. This page is an honest assessment, not a marketing
pitch: most plausible commercial paths are either incompatible with
pre-tenure status or have realistic-revenue ceilings that don't
justify the risk.

## The pre-tenure stance (now → 2028)

**No commercial activity on the Sophie codebase.** This is a hard
constraint, not a preference.

Reasons:

- **SDSU CoI/CoC policies.** SDSU has Conflict of Interest and
  Conflict of Commitment policies for faculty consulting / outside
  income. Sophie commercial activity would require formal disclosure
  and possibly recusal. The political cost — being seen by the
  tenure committee as having divided loyalties — is too high.
- **Time math.** Pre-tenure time is finite and tenure-case-critical.
  Building a business steals time from papers and proposals that
  *do* count.
- **License preservation.** Sophie stays AGPL. No Sophie Cloud
  hosted offering. No dual-licensing for commercial users yet (the
  dual-license option is *preserved* by AGPL + future CLA, but not
  *exercised* yet — see [AGPL rationale](agpl-rationale.md)).

What this stance forecloses (acceptably):

- Any 2026–2027 commercial revenue from Sophie itself.
- Hypothetical "early-mover advantage" in the AI-authoring SaaS space.

What this stance preserves:

- Sophie's reputation as credible open-source academic infrastructure
  (commercial activity early would muddy this).
- Anna's tenure case (no CoI/CoC drama on the record).
- The post-tenure commercial option (license + CLA infrastructure
  remain compatible).

## The one commercial-adjacent thing to do now

**Build the speaking / workshop / consulting muscle.**

This is allowed pre-tenure, counts as service (which counts for
tenure), and builds the reputation that makes post-tenure
speaking lucrative. Concrete actions starting summer 2026:

- Volunteer for AAS-EPD workshops at AAS meetings.
- Submit session proposals to AAPT (American Association of Physics
  Teachers), PERC (Physics Education Research Conference), and DBER-2
  conferences.
- Offer guest lectures / workshops to other CSU astronomy departments
  on AI-augmented authoring.
- When Sophie v1 launches (fall 2026), pitch a SciAct or AAS-EPD
  webinar.

These are unpaid or honorarium-only ($0–$500 typically). The
*compounding* value — over 2–3 years of consistent appearances — is
a post-tenure speaking circuit that pays $5K–$20K per engagement.

## Post-tenure (2028+) — revenue stream assessment

Once tenure is granted, Path 2 (Sophie SaaS / dual-licensed) becomes
viable. Here is the honest 5-year realistic revenue picture for each
stream, assuming serious post-tenure execution:

| Stream | 5-yr realistic revenue | When viable | Pre-tenure risk |
|--------|------------------------|-------------|------------------|
| **Sophie Cloud (hosted SaaS)** | $50K–$500K ARR | post-tenure | High (CoI, time) |
| **Dual-licensing (commercial users)** | $20K–$200K/yr | post-tenure | Medium |
| **Enterprise university contracts** | $20K–$300K/contract × 3–5 active | post-tenure | High |
| **Speaking + workshops + consulting** | **$30K–$150K/yr** | **start cultivating now** | **Low** |
| **Sophie-authored book** | $5K–$30K one-time | post-Sophie-v1 | Low |

### Sophie Cloud (hosted SaaS)

The core commercial play. Sophie remains AGPL OSS for self-hosters;
Sophie Cloud is the managed-hosting version with:

- Managed builds and deploys
- Content storage and backup
- Premium AI authoring features (e.g., access to better LLM tiers)
- Cross-institutional analytics

Pricing model: $X/instructor/month or $Y/institution/year. Realistic
5-year ceiling executed seriously: $200K–$500K ARR. Build cost
(infra + support): probably $50K–$100K/yr ongoing once running.
Net: lifestyle-business margin, not life-changing.

### Dual-licensing

For commercial users who can't accept AGPL terms (large enterprises,
specific edtech vendors), Sophie offers a paid commercial license.
Requires [CLA infrastructure](agpl-rationale.md#the-cla-prerequisite)
in place first.

Realistic revenue: $20K–$200K/yr. Variable; depends on whether any
significant commercial adopter materializes. Possibly zero for years.

### Enterprise contracts

Institutional licenses to universities for Sophie-supported authoring
+ training + custom-component development. Realistic deals:
$20K–$300K per contract; aspirationally 3–5 active at steady state.

Concern: enterprise sales for OSS infra is a real sales motion. Anna
is not a salesperson; this would require hiring or partnering. Don't
plan on this stream without explicit operational investment.

### Speaking + workshops + consulting

The under-appreciated stream. A tenured faculty member with a
credible AI-authoring platform, 3+ published papers, and a public
speaking record can charge $5K–$20K per engagement at
faculty-development workshops, edtech conferences, AI-in-education
panels, and corporate training events.

Estimated realistic income: $30K–$150K/yr depending on bandwidth and
visibility. Low overhead. Fully compatible with continued academic
employment.

**This is likely Sophie's highest-EV commercial path for Anna
specifically.** Start cultivating the reputation pre-tenure (free
appearances); harvest post-tenure (paid).

### Sophie-authored book

A "best practices for AI-augmented STEM authoring" book published by
Princeton University Press, MIT Press, or O'Reilly. Modest
royalty income ($5K–$30K one-time + small ongoing royalties).
The book's *real* value is positioning for paid speaking and
consulting — it's marketing collateral with a marginal revenue
stream attached.

## What's *not* on the table

For clarity:

- **Textbook sales** — the academic textbook market is brutal
  (Pearson, McGraw, Cengage extract ~$5B/yr from US college students
  and have spent two decades pricing OER into a corner). Indie
  textbook authors make $5K–$100K/yr in rare cases. Sophie's
  commercial story is *infrastructure + service*, not content sales.
- **VC funding** — see [Funding roadmap → Path 3](funding-roadmap.md#path-3--vc-scale-company).
  Incompatible with AGPL, incompatible with academia, and the EdTech
  VC track record is grim.
- **Acquisition by a publisher** — Pearson/Cengage/McGraw acquiring
  Sophie would mean closing it (against AGPL spirit). Possible at
  some point but would require relicensing and structural changes
  outside this strategy.

## Realistic 5-year (post-tenure) revenue ceiling

Stacking everything together, executed seriously over 5 years
post-tenure (2028–2033):

- Sophie Cloud: $200K–$500K ARR steady state
- Speaking + consulting: $50K–$150K/yr
- Dual-licensing: $20K–$100K/yr
- Book + ancillary: $10K–$30K/yr

**Total: $300K–$800K/yr at the upper end of plausible.** Meaningful,
not life-changing. Compatible with continued academic salary.

This is the right shape for the "Sophie as faculty-led OSS platform"
identity. The implicit decision: Sophie's value is *cultural*
(serving educators) and *career* (Anna's reputation and tenure case)
more than *financial*. The financial returns are real but capped.

If you wanted more, you would have to give up AGPL, give up
academia, take VC, or aim at a completely different market. None of
those trade-offs look attractive given the current shape.

## See also

- [Funding roadmap](funding-roadmap.md) — Path 1 + Path 4 spine
- [AGPL rationale](agpl-rationale.md) — license + dual-licensing future
- [2026 calendar](2026-calendar.md) — what happens before any of this
