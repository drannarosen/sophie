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

describe("typography tokens", () => {
  test("emits --sophie-text-pill at 0.6875rem", () => {
    expect(css).toMatch(/--sophie-text-pill:\s*0\.6875rem/);
  });
});
