import { describe, expect, test } from "vitest";
import { generateCSS } from "../scripts/generate-css.ts";

const css = generateCSS();

describe.each([
  // [role, l_light, chroma, hue, l_dark]
  ["observable", "48", "0.02", "60", "73"],
  ["model", "58", "0.13", "195", "78"],
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
