import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { VoiceContractSchema } from "./voice-contract.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "__fixtures__");

function loadFixture(name: string): unknown {
  return parseYaml(readFileSync(join(FIXTURE_DIR, name), "utf8"));
}

describe("VoiceContractSchema", () => {
  it("accepts the anna-rosen design-doc draft", () => {
    const data = loadFixture("voice-anna-rosen.yaml");
    expect(() => VoiceContractSchema.parse(data)).not.toThrow();
  });

  it("parses the expected register ids", () => {
    const data = loadFixture("voice-anna-rosen.yaml");
    const parsed = VoiceContractSchema.parse(data);
    expect(parsed.registers.map((r) => r.id)).toEqual([
      "sophomore-quantitative",
      "intro-non-major",
      "scientific-computing",
    ]);
  });

  it("rejects an empty registers array (.min(1))", () => {
    const data = loadFixture("voice-anna-rosen.yaml") as Record<
      string,
      unknown
    >;
    expect(() =>
      VoiceContractSchema.parse({ ...data, registers: [] })
    ).toThrow();
  });

  it("rejects missing base_voice", () => {
    const data = loadFixture("voice-anna-rosen.yaml") as Record<
      string,
      unknown
    >;
    const { base_voice: _omit, ...rest } = data;
    expect(() => VoiceContractSchema.parse(rest)).toThrow();
  });

  it("rejects unknown top-level keys (.strict)", () => {
    const data = loadFixture("voice-anna-rosen.yaml") as Record<
      string,
      unknown
    >;
    expect(() =>
      VoiceContractSchema.parse({ ...data, extra_field: "nope" })
    ).toThrow();
  });

  it("rejects non-slug register id", () => {
    const data = loadFixture("voice-anna-rosen.yaml") as Record<
      string,
      unknown
    >;
    const broken = {
      ...data,
      registers: [
        { id: "Sophomore_Quantitative", pitch: "Mixed-case + underscores." },
      ],
    };
    expect(() => VoiceContractSchema.parse(broken)).toThrow();
  });

  it("rejects empty base_voice.rules", () => {
    const data = loadFixture("voice-anna-rosen.yaml") as Record<
      string,
      unknown
    >;
    const broken = { ...data, base_voice: { rules: [] } };
    expect(() => VoiceContractSchema.parse(broken)).toThrow();
  });
});
