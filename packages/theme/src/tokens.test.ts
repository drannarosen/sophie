import { describe, expect, test } from "vitest";
import { generateCSS } from "../scripts/generate-css.ts";

const css = generateCSS();

describe.each([
  // [role, l_light, chroma, hue, l_dark]
  // Sprint B palette refresh (anchors.ts 2026-05-21):
  // - observable → brand-teal (hue 195)
  // - model      → brand-violet (hue 295)
  // - inference  → brand-rose (hue 0)
  // - approximation → warm-stone neutral (hue 60, low chroma)
  // L values calibrated for prose-color use in light + legibility
  // against Stone 800 surface-1 in dark.
  ["observable", "50", "0.085", "195", "80"],
  ["model", "50", "0.10", "295", "80"],
  ["inference", "55", "0.13", "0", "80"],
  ["approximation", "60", "0.025", "60", "80"],
])("role color: %s", (role, lLight, chroma, hue, lDark) => {
  test(`emits --sophie-role-${role} in :root with oklch(${lLight}% ${chroma} ${hue})`, () => {
    const escaped = chroma.replace(".", "\\.");
    expect(css).toMatch(
      new RegExp(
        `--sophie-role-${role}:\\s*oklch\\(${lLight}%\\s+${escaped}\\s+${hue}\\)`
      )
    );
  });

  test(`emits --sophie-role-${role} in [data-theme="dark"] with oklch(${lDark}% ${chroma} ${hue})`, () => {
    const escaped = chroma.replace(".", "\\.");
    expect(css).toMatch(
      new RegExp(
        `\\[data-theme="dark"\\][\\s\\S]*--sophie-role-${role}:\\s*oklch\\(${lDark}%\\s+${escaped}\\s+${hue}\\)`
      )
    );
  });
});

// Tier-3 biography-child label-bar tints (PR-B P1-2 / Phase B audit §2.8).
// Scheme-invariant — emitted once inside `:root {}`, NOT re-emitted in
// `[data-theme="dark"]`. Mix base is `surface-2` (not `surface-1` like
// callouts). Each variant gets one CSS var; the shared
// `_shared/Tier3Card.module.css` reads `--sophie-tier3-label-bg` which
// each biography component rebinds to its variant slot here.
describe.each([
  ["observable", "brand-violet", "6"],
  ["assumption", "brand-violet", "6"],
  ["breaks-when", "status-warning", "8"],
  ["common-misuse", "status-danger", "8"],
  ["derivation-step", "brand-violet", "6"],
])("tier3 label-bg: %s", (variant, accent, tintPct) => {
  test(`emits --sophie-tier3-${variant}-label-bg with color-mix(${accent} ${tintPct}%, surface-2)`, () => {
    expect(css).toMatch(
      new RegExp(
        `--sophie-tier3-${variant}-label-bg:\\s*color-mix\\(in oklch,\\s*var\\(--sophie-${accent}\\)\\s*${tintPct}%,\\s*var\\(--sophie-surface-2\\)\\)`
      )
    );
  });
});

test.each([
  "observable",
  "assumption",
  "breaks-when",
  "common-misuse",
  "derivation-step",
])("tier3 label-bg var %s is emitted exactly once (scheme-invariant)", (variant) => {
  // Sanity check: the generator places tier3LabelBgBlock() inside the
  // main `:root {}` only — NOT in [data-theme="dark"] or @media print
  // re-emits — because the values reference `--sophie-brand-violet`
  // etc. by var, which already swap per scheme. A duplicate emit on
  // ANY variant would be a regression of the scheme-invariant property;
  // checking all 4 catches selective-re-emit refactors too (e.g., a
  // future generator that re-emits some but not all tier3 vars).
  const matches = css.match(
    new RegExp(`--sophie-tier3-${variant}-label-bg:`, "g")
  );
  expect(matches).toHaveLength(1);
});

// Retrieval-family left-band colors (Wedge B1). One per public
// component — RetrievalPrompt / SpacedReview / SkillReview. Light
// values target Tailwind-500 family; dark lifts to ~400 for legibility
// on Stone 800 surface-1.
describe.each([
  ["retrieval", "#f59e0b", "#fbbf24"], // amber-500 / amber-400
  ["spaced", "#06b6d4", "#22d3ee"], // cyan-500 / cyan-400
  ["skill", "#8b5cf6", "#a78bfa"], // violet-500 / violet-400
])("retrieval band: %s", (band, hexLight, hexDark) => {
  test(`emits --sophie-${band}-band in :root with ${hexLight}`, () => {
    expect(css).toMatch(
      new RegExp(`--sophie-${band}-band:\\s*${hexLight.replace("#", "#")}`)
    );
  });

  test(`emits --sophie-${band}-band in [data-theme="dark"] with ${hexDark}`, () => {
    expect(css).toMatch(
      new RegExp(
        `\\[data-theme="dark"\\][\\s\\S]*--sophie-${band}-band:\\s*${hexDark.replace("#", "#")}`
      )
    );
  });
});

describe("typography tokens", () => {
  test("emits --sophie-text-pill at 0.6875rem", () => {
    expect(css).toMatch(/--sophie-text-pill:\s*0\.6875rem/);
  });

  // Marginalia-voice slots used by Aside body, Callout title,
  // ChromeTitleBar, ChapterTitle subtitle, textbook breadcrumbs +
  // status chips. References predate the tokens; 2026-05-21 fix
  // emits them so those declarations stop being silently dropped.
  test("emits --sophie-text-small at 0.875rem (alias of sm)", () => {
    expect(css).toMatch(/--sophie-text-small:\s*0\.875rem/);
  });
  test("emits --sophie-text-tiny at 0.75rem (alias of xs)", () => {
    expect(css).toMatch(/--sophie-text-tiny:\s*0\.75rem/);
  });
  test("emits --sophie-text-body at 1.0625rem (prose-reading slot)", () => {
    expect(css).toMatch(/--sophie-text-body:\s*1\.0625rem/);
  });
});

describe("spacing tokens", () => {
  test("emits --sophie-space-half at 0.125rem", () => {
    expect(css).toMatch(/--sophie-space-half:\s*0\.125rem/);
  });
});
