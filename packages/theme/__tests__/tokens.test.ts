import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const THEME_CSS = readFileSync(
  join(__dirname, "..", "dist", "theme.css"),
  "utf-8",
);

describe("role color tokens", () => {
  test("emits --sophie-role-observable in light + dark theme blocks", () => {
    expect(THEME_CSS).toMatch(
      /--sophie-role-observable:\s*oklch\(48%\s+0\.02\s+60\)/,
    );
    expect(THEME_CSS).toMatch(
      /\[data-theme="dark"\][\s\S]*--sophie-role-observable:\s*oklch\(73%\s+0\.02\s+60\)/,
    );
  });
});
