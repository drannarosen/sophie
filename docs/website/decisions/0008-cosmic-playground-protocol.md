---
status: accepted
date: 2026-05-09
deciders: [anna]
supersedes: ~
superseded-by: ~
tags: [cosmic-playground, demos, integration, postmessage]
---

# ADR 0008: Cosmic Playground integration via manifest + iframe + postMessage protocol

## Context

Cosmic Playground is a separate Astro site at
`astrobytes-edu.github.io/cosmic-playground` hosting interactive
astronomy simulations: SVG-based, vanilla JS/TS with KaTeX math,
slider controls, the Predict-Play-Explain pedagogical framework.
~18 demos exist for ASTR 101 today. It has its own repo, deploy, and
release cadence.

Sophie chapters reference these demos via `<Demo demoId="...">`. The
question is the integration *protocol*, not where demos live (they
stay in their own repo, with their own release).

The earlier roadmap flagged this as a Phase 4 risk needing design
before deep migration. It needs to be resolved now to unblock chapter
authoring.

## Decision

**Manifest + iframe + versioned postMessage protocol** via a new
`@sophie/cosmic-playground` adapter package.

- Cosmic Playground publishes `manifest.json` with each demo's ID,
  URL, parameter schema, event schema.
- Sophie's `<Demo demoId="...">` validates demoIds at *build time*
  against the manifest. Audit catches broken refs.
- At runtime, `<Demo>` renders an iframe with proper sandbox + title
  attributes; opens a `postMessage` channel to the parent.
- Events flow into `useInteractive` → `ResponseStore` so a
  `<Mission>` step like `kind: 'demo-interaction'` records what the
  student actually did.
- Theme bridge: Sophie sends current tokens; demos opt into honoring
  them.

## Rationale

- **Decoupled deploys.** Cosmic Playground releases on its own
  schedule; Sophie doesn't have to coordinate. A demo update doesn't
  require a Sophie release.
- **Fault isolation.** A broken demo shows a fallback in the iframe,
  doesn't break the chapter.
- **What the existing deployment supports.** Cosmic Playground is
  already an Astro site that's iframe-friendly; the protocol is
  additive, not architectural.
- **Theme bridge is optional.** Demos can ignore the theme messages
  and look however they look; Sophie's design tokens flow only to
  demos that opt in.
- **Future-proof.** Any tool conforming to the manifest +
  postMessage contract can be a "demo provider" — not just Cosmic
  Playground. The protocol is a real contract, not a Cosmic-
  Playground-specific bridge.

## Alternatives considered

- **Direct package import (`@cosmic-playground/demos`).** Pros:
  tighter integration, no iframe overhead. Cons: couples release
  cadences; pulls the SVG/animation engine into chapter bundles;
  Cosmic Playground's vanilla-JS architecture doesn't lend itself
  to React-component packaging without a wrapper layer. Rejected:
  too tight a coupling.

- **Web Components (Custom Elements).** Pros: avoids iframe
  overhead. Cons: requires Cosmic Playground's runtime to coexist
  with Sophie's in the same DOM; more brittle than iframe
  isolation. Rejected: isolation is worth the small iframe overhead.

- **Defer the protocol to Phase 4.** Pros: less Phase 0 work.
  Cons: chapter authoring would proceed without a clear contract,
  and retrofitting a protocol to a working dataset of `<Demo>`
  references would be painful. Rejected: design now, ship later.

- **Sophie "owns" Cosmic Playground (absorb into Sophie repo).**
  Pros: vertical integration. Cons: enormous; loses Cosmic
  Playground's independent release; conflates demo authoring with
  textbook authoring. Rejected.

## Consequences

**Easier:**

- Demo updates ship without Sophie coordination.
- Iframe a11y is well-understood (proper title, sandbox attributes,
  manage focus).
- Audit catches broken demoIds at build start, not at runtime.
- A future second demo provider (e.g., a chemistry instructor's
  custom demos) plugs in via the same protocol.

**Harder:**

- Manifest versioning needs care (`schemaVersion` field on
  manifest itself).
- iframe overhead per demo (small but measurable).
- Cosmic Playground side needs the protocol shim — small per-demo
  retrofit (~50 LoC) plus the manifest publication.
- Theme bridge means demos opt-in; not all will, leading to slight
  visual heterogeneity.

**Triggers:**

- `@sophie/cosmic-playground` package created in Phase 0.
- Manifest schema published as `@sophie/cosmic-playground/manifest-schema.ts`
  (Zod).
- postMessage protocol schema published as
  `@sophie/cosmic-playground/protocol-schema.ts` (Zod).
- Cosmic Playground side: publish `manifest.json` at a stable URL;
  add the protocol shim per demo.
- Audit rule: `<Demo demoId="...">` references must resolve in the
  manifest.

## References

- Brainstorming session, demo-integration Q (May 2026).
- [how-to/integrate-cosmic-playground.md](../how-to/integrate-cosmic-playground.md)
  — concrete how-to once we have it.
- Cosmic Playground repo: `astrobytes-edu/cosmic-playground` (separate).
