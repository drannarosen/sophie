# Sophie Course-Website Architecture — Design Spec

**Date:** 2026-05-30
**Status:** design brainstorm concluded 2026-05-30 — four foundational decisions LOCKED
(§1 taxonomy/unit-model, §2 shell/nav, §4 aesthetic); §5–6 proposed for Anna's redline.
**Sequencing decision (2026-05-30):** WS2 figures (ADR 0094) ships next; the CourseShell arc
(Sprint 1+) follows. This spec becomes a new ADR (layout taxonomy + CourseShell contract,
amends ADR 0082, generalizes ADR 0095) when Sprint 1 starts. NOT yet approved for build.
**Driver:** Anna — "I need complete course website capabilities; we had chapter because
that's what we started with." Move from a chapter-centric implementation to a first-class
page-type + layout taxonomy.
**Builds on:** the approved Course-Website Capability Roadmap
(`~/.claude/plans/we-need-to-continue-lazy-ripple.md`, 2026-05-21, 27 decisions) and
ADR 0080 (course-spec), ADR 0070 (library rooms), ADR 0082 (chapter layout), ADR 0095
(shared document head — the CSS-delivery decoupling this spec generalizes to chrome).

---

## 0. The core problem (why this spec exists)

The global course chrome — header, course navigation, theme toggle, search, footer —
is **trapped inside `TextbookLayout`**, which only `reading`/`practice` mount. So the
chapter is the only page type with an identity; landing, section, and info pages render
as bare content with no header/nav/footer. This is the same class of defect ADR 0095
fixed for CSS (trapped in the chapter React root). "Chapter" became the gravity well
because all the chrome accreted there. We don't have *page types* — we have one real
layout and a fallback.

## 1. Reframe + taxonomy (LOCKED 2026-05-30)

**The Unit is the atom; "chapter/reading" is one face of it.** A Unit (lecture/topic)
has several faces on the same source: **Reading · Slides · Practice · Lab**. Each face is
a peer page-type; the Unit is first-class.

**Unit model (LOCKED): hub + peer face-routes.**
```
/units/[u]/            ← Unit hub: overview, objectives, face-picker, progress, due, est. time
  ├─ /reading          ChapterLayout   (face)
  ├─ /slides           SlidesLayout    (face)
  ├─ /practice         PracticeLayout  (face)
  └─ /lab              LabLayout       (face, Tier 2)
[ Reading | Slides | Practice | Lab ]  ← face tabs in a shared UnitLayout sub-frame
```
Faces are equal, deep-linkable, print/SEO-friendly (static-first), and adding Slides/Lab
is additive, not a fork.

**Complete page-type taxonomy.** All composed on one `CourseShell` → page-type layout → content.

**Principle — optional, course-composable zones.** A course enables only the zones it needs;
the masthead nav (§3) is *generated from what's declared* in `course.sophie.yaml`. ASTR 201
(Fundamentals + Labs + Schedule) ≠ COMP 521 (different mix). Required spine: Dashboard,
Sections, Units, Reading, Practice, Syllabus. Everything else is opt-in.

| Zone | Page type | Route | Layout | Tier | Optional? |
|---|---|---|---|---|---|
| Entry | Course Home / Dashboard | `/` | DashboardLayout | 1 | required |
| Structure | Section overview | `/sections/[s]/` | SectionLayout | 1 | required |
| | Unit hub | `/units/[u]/` | UnitLayout | 1 | required |
| Learning (faces) | Reading (chapter) | `/units/[u]/reading` | ChapterLayout | 1 | required |
| | Slides / deck | `/units/[u]/slides` | SlidesLayout | 1 | optional |
| | Practice | `/units/[u]/practice` | PracticeLayout | 1 | optional |
| | Lab face (unit-scoped, Pyodide) | `/units/[u]/lab` | LabLayout | 2 | **optional** |
| **Course zones** | **Fundamentals / prereqs** ("Section 0": refresher readings + prereq SkillReviews) | `/fundamentals/` (+ units) | SectionLayout | 1 | **optional** |
| | **Labs** (weekly cross-unit activities/in-class) | `/labs/`, `/labs/[lab]/` | LabsLayout | 1–2 | **optional** |
| Reference | Library home | `/library/` | LibraryLayout | 1 | optional |
| | Registry spec entry | `/library/[reg]/[entry]` | SpecLayout | 1 | optional |
| | Cheatsheets | `/library/cheatsheets/[…]` | LibraryLayout | 1 | optional |
| | Glossary (course-wide) | `/glossary/` | LibraryLayout | 1 | optional |
| | Search results | `/search/` | SearchLayout | 1 | optional |
| Course mgmt | Schedule / calendar | `/schedule/` | ScheduleLayout | 1 | optional |
| | Syllabus · Policies · Accommodations · Instructor · Contact | `/<slug>/` | InfoLayout | 1 | optional |
| | Assignments hub | `/assignments/` | InfoLayout | 1–3 | optional |
| Instructor | Console + Prep (private) | `/instructor/…` | InstructorLayout | 3 | optional |
| System | 404 · Print/PDF · LMS export | various | minimal | 1–3 | — |

Notes: **Fundamentals** = an optional course-level zone modeled like a Section (holds
refresher units/readings) that also surfaces prerequisite SkillReviews/diagnostics — the
roadmap's threshold-skills home. **Labs (zone)** ≠ the unit `/lab` *face*: the zone is a
course-level collection of weekly/in-class activities that span multiple units; the face is
one unit's own computational lab. A course may use either, both, or neither.

`ChapterLayout` stops being the root; it becomes a peer page-type layout composing CourseShell.

---

## 2. Layout composition + CourseShell (LOCKED 2026-05-30)

`SophieHead` (ADR 0095) → **`CourseShell`** (global chrome) → **page-type layout** → content.
`CourseShell` owns L1 + footer on every page; each page-type layout owns its working chrome.

```
┌─ CourseShell ──────────────────────────────────────────────┐
│  MASTHEAD: [Course title→home] [global nav] [search] [☾]    │  L1 persistent
├────────────────────────────────────────────────────────────┤
│  [ page-type layout ]                                       │
├────────────────────────────────────────────────────────────┤
│  FOOTER: identity · license · a11y · links                  │
└────────────────────────────────────────────────────────────┘
```

**Nav model (LOCKED): masthead + contextual left rail.**
- Slim persistent masthead (identity + global nav + search + theme) on EVERY page.
- Collapsible left **course-outline rail** (sections→units) ONLY on learning + reference
  pages (reading/slides/practice/lab/library/glossary).
- Dashboard, landing, section, schedule = **full-bleed designed canvases**, no left rail.
- Reading keeps its right-rail TOC (L3). Reading-only `TopBar` view/column controls become
  a reading-local subheader (not global).

This generalizes ADR 0095: global chrome moves out of `TextbookLayout` into `CourseShell`;
`ChapterLayout` becomes a peer that composes the shell.

## 3. Navigation / IA (LOCKED with §2)

- **L1 global (masthead):** Home + the declared optional zones (Fundamentals · Sections ·
  Labs · Schedule · Library · Syllabus…) — **generated from `course.sophie.yaml`**, not
  hard-coded — plus search + theme. Course title links home. Breadcrumbs render under the
  masthead on all non-home pages (Course › Section/Zone › Unit › Face).
- **L2 contextual:** course-outline rail (learning/reference); face tabs (unit pages);
  view toggles (schedule).
- **L3 in-page:** chapter TOC (reading right rail).
- **Mobile:** masthead collapses to identity + hamburger (global nav + outline) + search
  icon; fixes review F5/B5 (controls overflow). Face tabs become a scrollable strip.

## 4. Visual identity / design system (LOCKED 2026-05-30: editorial core + observatory atmosphere)

Platform language is **discipline-neutral**; per-course theming layers identity on top
(ADR 0005). "Calm to study, atmospheric to orient."

- **Type (keep + extend ADR 0005):** Fraunces (variable serif) display; IBM Plex Sans body
  at the 17px/1.65 reading measure; **IBM Plex Mono promoted to an *instrument-label* role**
  on orienting surfaces (eyebrow labels, metadata, ticks) — e.g. `MOD 02 · 3 UNITS · ~45m`.
- **Color:** warm stone grounds (existing). **Readings stay light/calm.** Orienting surfaces
  (dashboard/section/schedule/landing) use a **deeper ground** with atmosphere. Pedagogical
  teal/rose/violet roles preserved unchanged. Per-course **accent hue** + optional discipline
  **motif** (ASTR: restrained starfield/nebula hero; COMP: different). Tokens drive all of it.
- **Atmosphere (orienting surfaces ONLY; readings stay clean):** faint film grain overlay +
  a subtle gradient-mesh/aurora behind heroes; fine measured grids and tick rules as
  structural ornament. Must stay tasteful — texture is a whisper, never a theme-park.
- **Motion:** precise, instrument-like — staggered reveals on page-load (`animation-delay`),
  condition-based (not timed). Respect `prefers-reduced-motion`. One orchestrated load moment
  per orienting page; readings stay still.
- **New tokens (theme):** `--sophie-ground-deep`, `--sophie-grain-*`, `--sophie-mesh-*`,
  `--sophie-tick-*`, `--sophie-course-accent`, `--sophie-course-motif-*`. Live in
  `@sophie/theme` per ADR 0005; orienting-surface CSS consumes them. Reading layer untouched.

## 5. Per-page-type layout designs (proposed — for review)

All compose `CourseShell` (masthead + footer). "Rail" = contextual course-outline left rail.

- **DashboardLayout `/` (full-bleed):** hero (course identity + per-course motif), **Continue**
  (last unit/face, IndexedDB progress), **Sections grid** (cards: title, unit count, est time,
  progress ring), **This week** (schedule-at-a-glance + what's due), quick links (Syllabus,
  Library, Fundamentals/Labs if declared). Observatory atmosphere; staggered reveal.
- **SectionLayout `/sections/[s]/` (full-bleed):** section eyebrow + title + intro, learning
  objectives, **Unit list** (rich cards: faces available, est time, status/progress), prev/next
  section. Reused by the **Fundamentals** zone.
- **UnitLayout `/units/[u]/` (rail):** unit hub — overview, objectives, **face picker**
  (Reading/Slides/Practice/Lab as the primary CTA set), est time, what's due, prerequisite
  SkillReviews. Wraps the face routes with a face-tab subframe + unit context.
- **ChapterLayout `/units/[u]/reading` (rail + TOC):** today's reading, now composing
  CourseShell; reading-local subheader for view-mode/columns. Calm light surface (unchanged feel).
- **SlidesLayout `/units/[u]/slides` (full-bleed):** deck view from the SAME source as the
  reading (roadmap "slides↔readings SETTLED"; RevealJS per ADR 0006). Presenter affordances;
  slide↔reading cross-links. Slide engine package per roadmap.
- **PracticeLayout `/units/[u]/practice` (rail):** formative set (ADR 0073 components),
  per-browser responses (ADR 0007). Reading-adjacent calm.
- **LabLayout `/units/[u]/lab` (rail, Tier 2):** Pyodide computational lab (roadmap stack);
  code cells + prose + outputs.
- **LabsLayout `/labs/` + `/labs/[lab]/` (full-bleed list → rail detail, optional zone):**
  weekly cross-unit activities/in-class; each lab references multiple units' concepts; may
  embed Pyodide. Ties to Schedule (weekly).
- **Fundamentals `/fundamentals/` (SectionLayout, optional):** prereq "Section 0" — refresher
  readings + prerequisite SkillReviews/diagnostic (threshold-skills home).
- **LibraryLayout `/library/` + SpecLayout `/library/[reg]/[entry]` (rail, optional):**
  registry browser + auto-generated per-entry Spec pages + Cheatsheets + course Glossary
  (ADR 0070). Already partly built (LibraryCollectionShell).
- **ScheduleLayout `/schedule/` (full-bleed, optional):** calendar/list/week views, iCal
  export, event taxonomy, mid-semester changes (roadmap "Schedule SETTLED").
- **SearchLayout `/search/` (full-bleed, optional):** full-page faceted results (complements
  the existing command-palette modal).
- **InfoLayout `/<slug>/` (centered prose, optional):** syllabus/policies/accommodations/
  instructor/contact/assignments (today's InfoPageShell content, restyled to the system).
- **InstructorLayout (Tier 3, private):** Console + Prep tabs — designed-in, deferred.
- **System:** 404 (CourseShell + friendly), Print/PDF (reading), LMS export (Tier 3).

## 6. Implementation sequencing (proposed sprints)

Builds on WS1 (ADR 0095, shipped) and the figure work (ADR 0094, queued). Each = branch + PR.

1. **CourseShell extraction (foundation).** Pull L1 masthead + footer + global nav (generated
   from course-spec) + breadcrumbs out of `TextbookLayout` into `CourseShell`; reframe
   `ChapterLayout`/`InfoPageShell`/spine to compose it. Mobile nav (fixes F5/B5). New ADR
   (layout taxonomy + CourseShell contract). *This resolves the `SophieChapter.css` naming
   question in context — the chunk story is settled when chrome ownership is settled.*
2. **Observatory design tokens + atmosphere primitives** in `@sophie/theme` (deep ground,
   grain, mesh, tick, course-accent/motif) + the orienting-surface base styles.
3. **DashboardLayout + SectionLayout + UnitLayout** (the spine becomes designed; Continue +
   progress via IndexedDB).
4. **ScheduleLayout** (roadmap-settled; iCal).
5. **SlidesLayout + slide engine package** (slides↔readings killer feature).
6. **Fundamentals + Labs zones** (optional, course-composable).
7. **Library/Spec/Glossary/Search polish**; Practice/Lab face layouts.
8. **Tier 3** (Instructor, LMS) — deferred per roadmap.

Per-course theming (accent + motif) lands with step 2; ASTR 201 adopts as each surface ships.
