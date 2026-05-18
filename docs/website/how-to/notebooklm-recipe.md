---
title: Generate chapter audio with NotebookLM
short_title: NotebookLM recipe
description: A dual-audience recipe — students using NotebookLM as a study aid, and instructors using it as a cheap alternative to recording their own chapter audio. Includes a prompt scaffold for role-aware grounding on Sophie chapter structure.
tags: [how-to, notebooklm, audio, students, ai-citation, multimedia]
---

# Generate chapter audio with NotebookLM

This recipe covers two audiences:

1. **Students** using [NotebookLM](https://notebooklm.google.com/) to
   generate a study-aid audio summary of any Sophie chapter.
2. **Instructors** adopting Sophie courses who want a low-effort
   alternative to recording their own chapter audio.

Both audiences benefit from the same prompt scaffold (§4 below) that
makes NotebookLM walk Sophie's epistemic role contract explicitly,
rather than producing the platform's default generic banter.

## What an "Audio Overview" actually is

NotebookLM is a free Google research tool that ingests source
documents and generates AI-grounded outputs. Its
**Audio Overview** feature produces an 8-15 minute synthetic
podcast in which two AI hosts discuss the source material
conversationally — one host plays "the curious explainer," the
other plays "the curious friend asking questions." The two-host
format is engineered: humans metabolize unfamiliar material more
effectively when an explainer is responding to a questioner than
when a single narrator delivers a monologue. Audio Overview is
distinct from text TTS — it generates a fresh script and renders
disfluencies, breath, and prosody that read as natural rather than
robotic.

The model is grounded on whatever sources you upload — it does not
hallucinate from outside the corpus unless you explicitly invite
it to. This makes it well-suited to chapter-shaped content with a
bounded scope.

## For students

Audio summaries help you metabolize chapter material on a different
cognitive channel — they pair well with walking, commuting, or
pre-reading a chapter you'll cover in class.

**Quick start.** Open [notebooklm.google.com](https://notebooklm.google.com/)
and sign in with any Google account.

1. Click **Create new notebook**.
2. Click **Add source**, then either:
   - Paste the chapter's URL (if Sophie is deployed to the web), or
   - Copy the chapter's full Markdown source from the course
     repository (ask your instructor where) and paste as a text
     source.
3. Click **Generate Audio Overview** (or look for the "🎧 Audio
   Overview" tile on the notebook home page).
4. Optionally, before generating, paste the prompt scaffold from §4
   below into the "Customize" field. NotebookLM lets you steer the
   hosts' focus.
5. Wait 1-3 minutes. The mp3 will appear when ready; you can
   download it to listen offline.

**How to use it well.** Audio Overviews are *supplements*, not
*substitutes*. The chapter itself is the source of record — the
audio compresses ~30 pages of text into ~12 minutes, which means
nuance is lost. Listen *before* reading to prime your attention, or
*after* reading to consolidate. Don't skip the chapter.

**AI-citation policy.** If your course's AI policy requires citation
(ASTR 201 does), note "Used NotebookLM to generate an Audio Overview
of Chapter N" in your Grade Memo's AI-use reflection. This is a
permitted use; the citation is the structural requirement, not the
permission.

## For instructors

If you adopt a Sophie course and don't want to record your own
voice for chapter audio, NotebookLM is your cheap path. Workflow:

1. For each chapter you want audio for, create a NotebookLM
   notebook with the chapter MDX source as the input.
2. Paste the prompt scaffold from §4 into the Customize field
   before generating.
3. Generate the Audio Overview, listen all the way through, and
   note any errors. If the audio has substantive errors, regenerate
   (NotebookLM is non-deterministic) or sharpen the prompt.
4. Download the mp3 and drop it into your course repository's
   `public/audio/` directory.
5. Embed in the chapter MDX via a plain HTML5 `<audio>` tag:
   ```mdx
   <audio src="/audio/chapter-07-notebooklm.mp3" controls />
   ```

Cost: ~5 minutes per chapter at zero monetary cost. Trade-off: the
audio is synthetic and the hosts are anonymous, so students don't
build continuity-of-instructor rapport with a familiar voice. At
small-class scale, your own recorded voice is preferable; at large
courses, online courses, or shared-instructor teaching teams, the
NotebookLM path may be the right shape.

If you want the role-aware audio quality of NotebookLM without the
Google dependency (for institutional reasons, OSS distribution, or
self-hosting requirements), see
[`speculative.md` S11](../vision/features/speculative.md) — Sophie
has a potential `sophie podcast` CLI pipeline on the speculative
list that would solve this. It's not built; promotion criteria are
documented there.

## §4 — Prompt scaffold for role-aware grounding

Default NotebookLM produces serviceable but generic banter. The
scaffold below makes the hosts walk Sophie's epistemic role
contract ([ADR 0058](../decisions/0058-epistemic-component-contract.md))
explicitly. Paste it into the "Customize" field before generating
the Audio Overview.

```text
Focus on the observable → model → inference chain in this chapter.

When you discuss an observable, name the instrument or method that
produced it (which telescope, which catalog, which technique).

When you discuss a model, name its core assumptions and the regime
where it breaks. Be honest about approximations.

If the chapter flags a misconception, address it explicitly and
name the correct intuition that replaces it — don't gloss over it.

Assume the student already knows the concepts from chapters
[LIST PRIOR CHAPTER CONCEPTS HERE]; don't re-explain those from
scratch.

Keep it under 12 minutes. Conversational, but rigorous.
```

**Good vs. bad prompts — examples.**

| Bad | Why bad | Better |
|---|---|---|
| "Make it engaging." | NotebookLM's default is already conversational; this adds nothing. | Replace with substantive epistemic guidance. |
| "Cover everything." | Forces hosts to skim → all surface, no depth. | "Focus on observable → inference; skip historical context." |
| "Make it accurate." | Too vague to constrain anything. | "Name the instrument behind each observable. Don't say 'scientists' — name the team or telescope." |
| "Be excited." | Synthetic excitement reads as performative. | Drop entirely; let the conversational format carry tone. |

## Recommended preprocessing

The Audio Overview is only as accurate as its source. A few
preprocessing moves improve output meaningfully:

- **Paste the full MDX**, not the rendered HTML. NotebookLM handles
  Markdown well, and component names (`<Predict>`, `<Aside>`,
  `<Misconception>`) signal pedagogical structure that the model
  picks up on.
- **Include the chapter's pedagogy-index JSON** if you can extract
  it (Sophie emits `<script id="sophie-pedagogy-*">` tags on built
  pages — copy that JSON as a second source). This gives the model
  explicit role-coded structure to ground on.
- **Trim irrelevant frontmatter and footnote-noise** before pasting
  — license blocks, build-tooling boilerplate, etc. distract the
  model from the chapter substance.
- **For multi-chapter sequences**, give each chapter its own
  notebook; don't combine. Audio Overview gets confused when one
  source contains material from multiple distinct chapters.

## Known failure modes

Watch for these when listening back before publishing:

- **Hallucinated specifics.** NotebookLM occasionally invents a
  number, citation, or instrument name that isn't in the source.
  Always spot-check claims that sound suspiciously precise.
- **Epistemic flattening.** Hosts sometimes collapse a careful
  observable → assumption → inference chain into a sloppy "it's
  complicated." The §4 scaffold reduces but doesn't eliminate this.
- **LaTeX pronounced literally.** If the chapter has unrendered
  LaTeX like `$\lambda_\text{peak}$`, NotebookLM will pronounce
  "lambda underscore peak" instead of "lambda peak." Strip raw
  LaTeX to plain prose ("lambda peak equals 502 nanometers") before
  pasting, or accept the awkward reading.
- **Misconception inversion.** Rarely, hosts will *state* a
  misconception as if it were correct because they pattern-matched
  the misconception's prose without picking up the framing as
  "wrong model students bring." Listen carefully through any
  misconception section.

The rule is **listen before publish**, always. If audio quality
matters and time permits, the §4 scaffold + listen-back loop takes
~15 minutes per chapter — still cheap.

## Helpful links

- **NotebookLM** — [notebooklm.google.com](https://notebooklm.google.com/)
- **Audio Universe** (sonification project, related multimedia
  genre) — [audiouniverse.org](https://www.audiouniverse.org/)
- **Related Sophie docs:**
  - [`pair-misconceptions-with-interventions.md`](pair-misconceptions-with-interventions.md)
    — how Sophie structures misconceptions in chapter source (the
    epistemic structure the scaffold leverages).
  - [`speculative.md` S11](../vision/features/speculative.md)
    — the speculative `sophie podcast` CLI pipeline (self-hosted
    alternative to NotebookLM).
  - [Multimedia portfolio](../vision/design/multimedia-portfolio.md)
    — the strategic landscape map this recipe sits inside.
- **ADR 0058** —
  [Epistemic component contract](../decisions/0058-epistemic-component-contract.md),
  which defines the eight roles (observable, model, inference,
  assumption, approximation, uncertainty, numerical, misconception)
  the scaffold asks NotebookLM to walk.
