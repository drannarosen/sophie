import { describe, expect, test } from "vitest";
import { generateCSS } from "../scripts/generate-css.ts";

describe("role color tokens", () => {
  const css = generateCSS();

  test("emits --sophie-role-observable in light + dark theme blocks", () => {
    expect(css).toMatch(
      /--sophie-role-observable:\s*oklch\(48%\s+0\.02\s+60\)/
    );
    expect(css).toMatch(
      /\[data-theme="dark"\][\s\S]*--sophie-role-observable:\s*oklch\(73%\s+0\.02\s+60\)/
    );
  });
});
