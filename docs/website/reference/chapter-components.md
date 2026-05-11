---
title: Chapter components reference
short_title: Chapter components
description: Every Sophie component a chapter author can use, with import patterns and the static-vs-interactive distinction.
tags: [components, authoring, mdx, reference]
---

# Chapter components

Every Sophie component a chapter author can drop into MDX, the two
categories they fall into, and how each one wires up to Astro.

The platform draws a hard line between **static** components
(no per-instance state; render once, server-side) and
**persistence-bearing** components (own state in IndexedDB; hydrate as
React islands). The two categories use different MDX import patterns,
and mixing them up is the most common authoring mistake — either form
fails silently in ways the page render won't catch.

:::{seealso}
The architectural rationale lives in
[ADR 0027 — MDX render boundary prop threading](../decisions/0027-mdx-render-boundary-prop-threading.md).
This page is the chapter author's quick reference.
:::

## The inventory

Sophie ships 13 components after Phase 1 closes. Each row tells you
the category, the MDX import pattern, and whether `client:load` is
needed:

| Component | Category | Needs `client:load`? | Import via |
|---|---|---|---|
| `<Callout>` | Static | No | `makeStaticComponents` map |
| `<InteractiveCallout>` | Persistence-bearing | Yes | Direct import |
| `<Figure>` | Static | No | `makeStaticComponents` map |
| `<KeyEquation>` | Static | No | `makeStaticComponents` map |
| `<MiniGlossary>` | Static | No | `makeStaticComponents` map |
| `<InteractiveCheckbox>` | Persistence-bearing | Yes | Direct import |
| `<LearningObjectives>` | Persistence-bearing | Yes | Direct import |
| `<Predict>` | Persistence-bearing | Yes | Direct import |
| `<ConfidenceCheck>` | Persistence-bearing | Yes | Direct import |
| `<ComprehensionGate>` | Persistence-bearing | Yes | Direct import |
| `<EffortLog>` | Persistence-bearing | Yes | Direct import |
| `<Reflection>` | Persistence-bearing | Yes | Direct import |
| `<CollapsibleCard>` | Persistence-bearing | Yes | Direct import |

The four static components flow through the Astro components map
configured by `makeStaticComponents` in `@sophie/astro`. The nine
persistence-bearing components hydrate as React islands and need an
explicit import + `client:load` directive on every instance.

## The two import patterns

### Static components — through `<Content components={...}>`

Static components are wired up once, at the chapter page level. The
chapter author writes the tag in MDX and never imports it:

```mdx
{/* No import statement needed for static components. */}

<Callout variant="info" title="Definition">
A photon is a packet of light.
</Callout>

<Figure name="hubble-deep-field" caption="A deep-field image." />

<KeyEquation id="wiens-law" title="Wien's Law">
$$\lambda_{\text{peak}} = b \, T^{-1}$$
</KeyEquation>

<MiniGlossary id="ch1-terms" title="Key terms" terms={[
  { term: "Photon", definition: "A packet of light." },
]} />
```

The page that renders the MDX wires the map:

```astro
---
import { makeStaticComponents } from "@sophie/astro";
import { figures } from "../content/figures.ts";

const { Content } = await Astro.glob("../content/chapters/*.mdx")[0];
---

<Content components={makeStaticComponents({ figures })} />
```

Sophie's `makeStaticComponents` accepts a figure registry (for
`<Figure name=...>` lookups) and returns the four static components
ready to wire in.

### Persistence-bearing components — direct import + `client:load`

Persistence-bearing components don't flow through the components map.
Astro's `<Content components={...}>` map can't carry hydration
metadata, so each instance must be imported into the MDX file and
marked for hydration:

```mdx
import {
  CollapsibleCard,
  ComprehensionGate,
  ConfidenceCheck,
  EffortLog,
  InteractiveCallout,
  InteractiveCheckbox,
  LearningObjectives,
  Predict,
  Reflection,
} from "@sophie/components";

<LearningObjectives
  client:load
  course="astr201"
  chapter="ch1"
  id="lo"
  heading="By the end of this lecture, you will be able to:"
  objectives={[
    { id: "thesis", verb: "State", body: "the course thesis." },
  ]}
/>

<InteractiveCallout
  client:load
  course="astr201"
  chapter="ch1"
  id="reviewed-1"
  variant="tip"
>
Take a moment to confirm you can re-derive the result.
</InteractiveCallout>
```

Every persistence-bearing component takes three threading props —
`course`, `chapter`, `id` — which compose into the IndexedDB key.
The `client:load` directive tells Astro to hydrate the component as
a React island on page load.

## Common failure modes

Three mistakes catch every author at least once:

**Importing a static component AND using `client:load` on it.**
Hydrates a stateless component as an isolated React island for no
benefit. The page works but ships extra JavaScript. Audit will flag
this in a future Sophie release; today it's a silent waste.

**Using a persistence-bearing component without `client:load`.**
The component renders server-side once with its `initialValue` and
never hydrates, so state changes are lost and the IndexedDB
persistence never engages. Looks correct on first paint; breaks the
moment a student tries to interact.

**Forgetting the `course`/`chapter`/`id` props on a persistence-bearing
component.** TypeScript catches `course` and `chapter` as required.
`id` is also required; without it, two instances on the same page
share an IndexedDB key and clobber each other.

## When to use each component

| Use case | Component |
|---|---|
| A heading and a paragraph of side info | `<Callout>` |
| Side info that's also "check yourself" | `<InteractiveCallout>` (with reviewed-toggle) |
| An image with caption + credit | `<Figure>` (registry or inline) |
| A named equation block with anchor | `<KeyEquation>` |
| A cluster of vocabulary terms | `<MiniGlossary>` |
| A single checkbox for a tracked item | `<InteractiveCheckbox>` |
| The chapter-opening "you will be able to..." list | `<LearningObjectives>` |
| A "predict before the answer" prompt | `<Predict>` |
| A confidence rating (1–5 or 1–7) | `<ConfidenceCheck>` |
| A "did you understand?" gate | `<ComprehensionGate>` |
| An effort-level self-report | `<EffortLog>` |
| A free-text reflection prompt | `<Reflection>` |
| A "Deep Dive" disclosure block | `<CollapsibleCard>` |

Pick by pedagogical intent first; the static-vs-interactive split
follows automatically from that.

## References

- [ADR 0001](../decisions/0001-platform-not-monorepo.md) — repo shape.
- [ADR 0004](../decisions/0004-component-contract-revisions.md) — component contract.
- [ADR 0007](../decisions/0007-persistence-indexeddb.md) — IndexedDB + ResponseStore + BroadcastChannel.
- [ADR 0027](../decisions/0027-mdx-render-boundary-prop-threading.md) — static vs persistence-bearing render boundary.
- [Component contract](component-contract.md) — the TypeScript interface every component implements.
- [Add a custom component](../how-to/add-a-custom-component.md) — recipe for new components.
