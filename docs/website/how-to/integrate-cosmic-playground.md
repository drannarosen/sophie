---
title: Integrate Cosmic Playground demos
short_title: Cosmic Playground
description: Embed Cosmic Playground simulations in Sophie chapters via the manifest + iframe + postMessage protocol.
tags: [cosmic-playground, demos, integration]
---

# Integrate Cosmic Playground demos

Sophie integrates with Cosmic Playground via a published manifest +
iframe + versioned postMessage protocol. The protocol is captured in
[ADR 0008](../decisions/0008-cosmic-playground-protocol.md); this
how-to is the practical recipe.

:::{important} Status
This is a Phase 0+ how-to: the `@sophie/cosmic-playground` adapter
exists in v1 but the full protocol shim on the Cosmic Playground
side rolls out per-demo as authors retrofit. Demos that don't
implement the protocol still render — events just aren't recorded.
:::

## What the integration gives you

- Sophie chapters reference demos by ID: `<Demo demoId="kepler-orbits" />`.
- The audit validates demoIds at *build time* against the published
  manifest. Broken refs fail the build.
- At runtime, demos render as iframes with proper sandbox + a11y
  attributes.
- Student interactions (parameter changes, play/pause) flow into
  `useInteractive` → `ResponseStore` so missions can record
  "demo-interaction" steps.
- Sophie's design tokens flow to demos via theme messages; demos
  that opt in honor them.

## The recipe

### 1. Configure the manifest URL in `sophie.config.ts`

```ts
// sophie.config.ts (in your course repo)
import { defineSophieConfig } from '@sophie/cli';

export default defineSophieConfig({
  course: 'astr201',
  cosmicPlayground: {
    manifestUrl: 'https://astrobytes-edu.github.io/cosmic-playground/manifest.json',
  },
});
```

At build time, `@sophie/cosmic-playground` fetches and validates the
manifest. The audit fails fast on a missing or malformed manifest.

### 2. Reference demos by ID in MDX

```mdx
import { Demo } from '@sophie/components';

<Demo demoId="kepler-orbits" />

<Demo
  demoId="blackbody-spectrum"
  parameters={{ temperature: 5800 }}
  caption="Blackbody emission at 5800 K (the Sun)."
/>
```

Available `demoId`s come from the manifest. If you reference a demo
that doesn't exist, `sophie audit` flags it before build.

### 3. Use demo events in missions

```mdx
<Mission id="kepler-explore">
  <DemoInteraction demoId="kepler-orbits"
    prompt="Increase the eccentricity. What happens to the orbital period?" />
  <Prediction id="..." question="..." />
</Mission>
```

Demo events flow into the [ResponseStore](../explanation/persistence-model.md):
parameter changes, play/pause, reset are recorded as part of the
mission step.

## Manifest format

Published at `https://astrobytes-edu.github.io/cosmic-playground/manifest.json`:

```json
{
  "schemaVersion": 1,
  "demos": [
    {
      "id": "kepler-orbits",
      "title": "Kepler's Three Laws",
      "concepts": ["kepler-laws", "orbital-mechanics"],
      "url": "/demos/kepler-orbits/",
      "parameters": [
        { "name": "semiMajorAxis", "type": "number", "min": 0.1, "max": 10, "unit": "AU" },
        { "name": "eccentricity", "type": "number", "min": 0, "max": 0.95 }
      ],
      "events": ["parameterChange", "play", "pause", "reset"],
      "estimatedHeight": "600px",
      "implementsProtocol": true
    }
  ]
}
```

The Zod schema for the manifest lives at
`@sophie/cosmic-playground/manifest-schema.ts`.

## postMessage protocol

```text
Parent (Sophie) → demo (Cosmic Playground iframe):
  { type: 'init', parameters: {...}, theme: 'light' | 'dark', a11y: {...} }
  { type: 'setParameters', parameters: {...} }
  { type: 'requestSnapshot' }

Demo → parent:
  { type: 'ready' }
  { type: 'event', kind: 'parameterChange' | 'play' | ..., data: {...} }
  { type: 'snapshot', state: {...} }
```

The Zod schema for protocol messages lives at
`@sophie/cosmic-playground/protocol-schema.ts`.

## For Cosmic Playground demo authors

To make a demo *fully* integrated (events flow into Sophie), add the
protocol shim. Roughly 50 LoC per demo. The shim:

1. Listens for `init` to receive initial parameters and theme.
2. Sends `ready` when the demo is loaded.
3. Sends `event` messages on user interaction.
4. Optionally honors theme messages by reading CSS custom properties.

A demo without the shim still renders in Sophie chapters; events just
aren't recorded. Backward-compatible.

## Theme bridge (optional)

When the demo opts in, Sophie sends current design tokens via
postMessage. The demo applies them as CSS variables:

```js
// inside a demo, optional
window.addEventListener('message', (e) => {
  if (e.data.type === 'init') {
    Object.entries(e.data.theme.tokens).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });
  }
});
```

This makes the demo follow Sophie's dark/light mode and design
tokens. Demos that don't honor the bridge keep their own styling.

## Accessibility

Embedded demos:

- Render in an `<iframe>` with a meaningful `title` attribute.
- Use the `sandbox` attribute to limit demo capabilities (no
  top-navigation, no popups).
- `aria-live` regions announce demo loading state.
- Keyboard focus management when the demo is interacted with.

Demos themselves are responsible for their internal accessibility —
the platform can't enforce that across an iframe boundary.

## Troubleshooting

- **`Demo demoId="..." not found in manifest`** at build time:
  the demo isn't published. Either typo'd the ID or the manifest
  needs republishing.
- **Demo loads but doesn't record events**: the demo doesn't
  implement the protocol. Either add the shim or accept that this
  demo's interactions don't flow into the ResponseStore.
- **Theme bridge doesn't change demo appearance**: the demo opted
  out of theme. Confirm with the demo author.

## See also

- [ADR 0008](../decisions/0008-cosmic-playground-protocol.md) — the
  rationale for this integration design.
- [Persistence model](../explanation/persistence-model.md) — how
  demo events flow through `useInteractive` → `ResponseStore`.
- Cosmic Playground repo: `astrobytes-edu/cosmic-playground`
  (separate from Sophie).
