import { Readable } from "node:stream";
import pc from "picocolors";
import { describe, expect, it } from "vitest";
import { prefixStream } from "./prefix-stream.js";

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences require the \x1b control character by definition
const stripAnsi = (text: string) => text.replace(/\x1b\[[0-9;]*m/g, "");

async function collect(
  chunks: string[],
  label: "astro" | "components" | "theme"
): Promise<string> {
  const source = Readable.from(chunks);
  const transformed = source.pipe(prefixStream(label));
  let out = "";
  for await (const chunk of transformed) {
    out += chunk.toString();
  }
  return out;
}

describe("prefixStream", () => {
  it("prepends [label] to each line", async () => {
    const out = await collect(["line one\nline two\nline three\n"], "astro");
    expect(stripAnsi(out)).toBe(
      "[astro] line one\n[astro] line two\n[astro] line three\n"
    );
  });

  it("handles partial lines spanning chunks", async () => {
    const out = await collect(["par", "tial ", "line\nsecond\n"], "components");
    expect(stripAnsi(out)).toBe(
      "[components] partial line\n[components] second\n"
    );
  });

  it("does not emit a stray prefix for trailing partial line without newline", async () => {
    const out = await collect(["complete\ntrailing"], "theme");
    expect(stripAnsi(out)).toBe("[theme] complete\n[theme] trailing");
  });

  it("applies color to the label per picocolors (blue for astro)", async () => {
    const out = await collect(["hello\n"], "astro");
    expect(out).toBe(`${pc.blue("[astro]")} hello\n`);
  });
});
