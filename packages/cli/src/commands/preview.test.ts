import { runCommand } from "citty";
import { describe, expect, it } from "vitest";
import { previewCommand } from "./preview.ts";

describe("preview command — arg parsing", () => {
  it("parses --port flag", async () => {
    const result = await runCommand(previewCommand, {
      rawArgs: ["--port", "3000", "./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { port: 3000 } });
  });

  it("parses --no-build flag", async () => {
    const result = await runCommand(previewCommand, {
      rawArgs: ["--no-build", "./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { build: false } });
  });

  it("defaults build to true", async () => {
    const result = await runCommand(previewCommand, {
      rawArgs: ["./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { build: true } });
  });

  it("defaults port to 4321", async () => {
    const result = await runCommand(previewCommand, {
      rawArgs: ["./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { port: 4321 } });
  });
});
