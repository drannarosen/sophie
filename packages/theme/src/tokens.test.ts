import { describe, expect, test } from "vitest";
import { generateCSS } from "../scripts/generate-css.ts";

const css = generateCSS();

describe.each([
  // [role, l_light, chroma, hue, l_dark]
  ["observable", "48", "0.02", "60", "73"],
  ["model", "58", "0.13", "195", "78"],
  ["inference", "63", "0.16", "12", "83"],
  ["approximation", "70", "0.04", "60", "85"],
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

describe("typography tokens", () => {
  test("emits --sophie-text-pill at 0.6875rem", () => {
    expect(css).toMatch(/--sophie-text-pill:\s*0\.6875rem/);
  });
});

describe("spacing tokens", () => {
  test("emits --sophie-space-half at 0.125rem", () => {
    expect(css).toMatch(/--sophie-space-half:\s*0\.125rem/);
  });
});
