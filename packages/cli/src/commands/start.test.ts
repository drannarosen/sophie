import { runCommand } from "citty";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startCommand } from "./start.ts";

describe("start command — arg parsing", () => {
  beforeAll(() => {
    process.env.SOPHIE_CLI_TEST_HARNESS = "1";
  });
  afterAll(() => {
    delete process.env.SOPHIE_CLI_TEST_HARNESS;
  });

  it("parses --port flag as number", async () => {
    const result = await runCommand(startCommand, {
      rawArgs: ["--port", "3000", "./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { port: 3000 } });
  });

  it("parses --host flag as string", async () => {
    const result = await runCommand(startCommand, {
      rawArgs: ["--host", "0.0.0.0", "./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { host: "0.0.0.0" } });
  });

  it("parses --open flag as boolean", async () => {
    const result = await runCommand(startCommand, {
      rawArgs: ["--open", "./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { open: true } });
  });

  it("defaults port to 4321", async () => {
    const result = await runCommand(startCommand, {
      rawArgs: ["./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { port: 4321 } });
  });

  it("defaults host to localhost", async () => {
    const result = await runCommand(startCommand, {
      rawArgs: ["./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { host: "localhost" } });
  });

  it("captures positional path arg", async () => {
    const result = await runCommand(startCommand, {
      rawArgs: ["./examples/smoke"],
    });
    expect(result.result).toMatchObject({ args: { path: "./examples/smoke" } });
  });
});
