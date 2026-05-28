import { describe, expect, it } from "vitest";
import type { MdxJsxFlowElement } from "../jsx-utils.ts";
import { extractFormative } from "./formative.ts";

/**
 * Synthetic mdast trees (mirrors the worked-examples extractor test
 * convention). We build the minimum AST shape `extractFormative`
 * consumes and assert the per-callsite entry shape + the findings list
 * (AS-1 / AS-4 / AS-5 are pushed at extract-time; see formative.ts).
 *
 * `MdxJsxFlowElement` is the canonical type per R9-test (AGENTS.md).
 */

type MdastChild = MdxJsxFlowElement | Record<string, unknown>;
interface TestRoot {
  type: "root";
  children: ReadonlyArray<MdastChild>;
}

const root = (children: ReadonlyArray<MdastChild>): TestRoot => ({
  type: "root",
  children,
});

type AttrValue = string | boolean | null | { type: string; value?: unknown };

const mdx = (
  name: string,
  attrs: Record<string, AttrValue> = {},
  children: ReadonlyArray<MdastChild> = []
): MdxJsxFlowElement => ({
  type: "mdxJsxFlowElement",
  name,
  attributes: Object.entries(attrs).map(([n, v]) => ({
    type: "mdxJsxAttribute",
    name: n,
    value: v as never,
  })),
  children,
});

/** A `<X.Prompt>` wrapping a single text-bearing paragraph. */
const prompt = (parentName: string, text: string): MdxJsxFlowElement =>
  mdx(`${parentName}.Prompt`, {}, [
    { type: "paragraph", children: [{ type: "text", value: text }] },
  ]);

const expr = (raw: string): { type: string; value: string } => ({
  type: "mdxJsxAttributeValueExpression",
  value: raw,
});

const solution = () => mdx("Solution", {});
const hint = () => mdx("Hint", {});

describe("extractFormative — common shape", () => {
  it("returns empty when no formative parent is present", () => {
    const result = extractFormative(
      root([
        { type: "paragraph", children: [{ type: "text", value: "x" }] },
      ]) as never,
      "unit"
    );
    expect(result.entries).toEqual([]);
    expect(result.findings).toEqual([]);
  });

  it("auto-numbers anchors form-1, form-2 in source order", () => {
    const result = extractFormative(
      root([
        mdx("QuickCheck", { course: "c", unit: "u" }, [
          prompt("QuickCheck", "a"),
        ]),
        mdx("QuickCheck", { course: "c", unit: "u" }, [
          prompt("QuickCheck", "b"),
        ]),
      ]) as never,
      "unit"
    );
    expect(result.entries.map((e) => e.anchor)).toEqual(["form-1", "form-2"]);
  });

  it("an explicit id slug overrides the auto-counter", () => {
    const result = extractFormative(
      root([
        mdx("QuickCheck", { course: "c", unit: "u", id: "Photon Budget" }, [
          prompt("QuickCheck", "a"),
        ]),
      ]) as never,
      "unit"
    );
    expect(result.entries[0]?.anchor).toBe("photon-budget");
  });

  it("throws on intra-chapter explicit-id collision", () => {
    expect(() =>
      extractFormative(
        root([
          mdx("QuickCheck", { id: "dup" }, [prompt("QuickCheck", "a")]),
          mdx("QuickCheck", { id: "dup" }, [prompt("QuickCheck", "b")]),
        ]) as never,
        "unit"
      )
    ).toThrow(/collision/i);
  });

  it("reports hasSolution true/false and hintCount 0/1/3", () => {
    const result = extractFormative(
      root([
        mdx("QuickCheck", {}, [prompt("QuickCheck", "no reveals")]),
        mdx("QuickCheck", {}, [
          prompt("QuickCheck", "sol+1hint"),
          solution(),
          hint(),
        ]),
        mdx("QuickCheck", {}, [
          prompt("QuickCheck", "3 hints"),
          hint(),
          hint(),
          hint(),
        ]),
      ]) as never,
      "unit"
    );
    expect(result.entries[0]).toMatchObject({
      hasSolution: false,
      hintCount: 0,
    });
    expect(result.entries[1]).toMatchObject({
      hasSolution: true,
      hintCount: 1,
    });
    expect(result.entries[2]).toMatchObject({
      hasSolution: false,
      hintCount: 3,
    });
  });
});

describe("extractFormative — QuickCheck + PracticeProblem (solution-only)", () => {
  it("materializes a QuickCheck as solution-only / kind quickcheck", () => {
    const result = extractFormative(
      root([
        mdx("QuickCheck", {}, [prompt("QuickCheck", "Why?"), solution()]),
      ]) as never,
      "u"
    );
    expect(result.entries[0]).toMatchObject({
      kind: "quickcheck",
      prompt: "Why?",
      answer: { type: "solution-only" },
      hasSolution: true,
    });
  });

  it("materializes a PracticeProblem as solution-only / kind practice-problem", () => {
    const result = extractFormative(
      root([
        mdx("PracticeProblem", {}, [
          prompt("PracticeProblem", "Compute L."),
          solution(),
        ]),
      ]) as never,
      "u"
    );
    expect(result.entries[0]).toMatchObject({
      kind: "practice-problem",
      answer: { type: "solution-only" },
    });
  });
});

describe("extractFormative — MCQ (single-choice)", () => {
  it("slugifies the correct choice text into the answer", () => {
    const result = extractFormative(
      root([
        mdx("MCQ", {}, [
          prompt("MCQ", "Which force?"),
          mdx("MCQ.Choice", {}, [{ type: "text", value: "Gravity" }]),
          mdx("MCQ.Choice", { correct: null }, [
            { type: "text", value: "Pressure gradient" },
          ]),
        ]),
      ]) as never,
      "u"
    );
    expect(result.entries[0]).toMatchObject({
      kind: "mcq",
      answer: { type: "single-choice", correct: "pressure-gradient" },
    });
    expect(result.findings).toEqual([]);
  });

  it("honors an explicit choice id over the slugified text", () => {
    const result = extractFormative(
      root([
        mdx("MCQ", {}, [
          prompt("MCQ", "q"),
          mdx("MCQ.Choice", { correct: null, id: "pg" }, [
            { type: "text", value: "Pressure gradient" },
          ]),
          mdx("MCQ.Choice", {}, [{ type: "text", value: "Gravity" }]),
        ]),
      ]) as never,
      "u"
    );
    expect(result.entries[0]?.answer).toMatchObject({
      type: "single-choice",
      correct: "pg",
    });
  });

  it("pushes AS-1 ERROR when two choices are marked correct", () => {
    const result = extractFormative(
      root([
        mdx("MCQ", { id: "two-correct" }, [
          prompt("MCQ", "q"),
          mdx("MCQ.Choice", { correct: null }, [{ type: "text", value: "A" }]),
          mdx("MCQ.Choice", { correct: null }, [{ type: "text", value: "B" }]),
        ]),
      ]) as never,
      "u"
    );
    const as1 = result.findings.filter((f) => f.code === "AS-1");
    expect(as1).toHaveLength(1);
    expect(as1[0]).toMatchObject({
      severity: "ERROR",
      location: { unit: "u", anchor: "two-correct" },
    });
  });

  it("pushes AS-1 ERROR when zero choices are marked correct", () => {
    const result = extractFormative(
      root([
        mdx("MCQ", {}, [
          prompt("MCQ", "q"),
          mdx("MCQ.Choice", {}, [{ type: "text", value: "A" }]),
        ]),
      ]) as never,
      "u"
    );
    expect(result.findings.filter((f) => f.code === "AS-1")).toHaveLength(1);
  });

  it("throws on duplicate choice slug within one MCQ", () => {
    expect(() =>
      extractFormative(
        root([
          mdx("MCQ", {}, [
            prompt("MCQ", "q"),
            mdx("MCQ.Choice", { correct: null }, [
              { type: "text", value: "Same" },
            ]),
            mdx("MCQ.Choice", {}, [{ type: "text", value: "Same" }]),
          ]),
        ]) as never,
        "u"
      )
    ).toThrow(/choice/i);
  });
});

describe("extractFormative — MultiSelect (multi-choice)", () => {
  it("collects all correct choice slugs", () => {
    const result = extractFormative(
      root([
        mdx("MultiSelect", {}, [
          prompt("MultiSelect", "Pick all"),
          mdx("MultiSelect.Choice", { correct: null }, [
            { type: "text", value: "Alpha" },
          ]),
          mdx("MultiSelect.Choice", {}, [{ type: "text", value: "Beta" }]),
          mdx("MultiSelect.Choice", { correct: null }, [
            { type: "text", value: "Gamma" },
          ]),
        ]),
      ]) as never,
      "u"
    );
    expect(result.entries[0]).toMatchObject({
      kind: "multi-select",
      answer: { type: "multi-choice", correct: ["alpha", "gamma"] },
    });
    expect(result.findings.filter((f) => f.code === "AS-5")).toHaveLength(0);
  });

  it("pushes AS-5 ERROR + emits a parseable entry when zero correct", () => {
    const result = extractFormative(
      root([
        mdx("MultiSelect", { id: "none-correct" }, [
          prompt("MultiSelect", "q"),
          mdx("MultiSelect.Choice", {}, [{ type: "text", value: "Alpha" }]),
        ]),
      ]) as never,
      "u"
    );
    const as5 = result.findings.filter((f) => f.code === "AS-5");
    expect(as5).toHaveLength(1);
    expect(as5[0]).toMatchObject({
      severity: "ERROR",
      location: { unit: "u", anchor: "none-correct" },
    });
    // Entry still materializes with a non-empty, schema-valid placeholder.
    expect(result.entries[0]?.answer.type).toBe("multi-choice");
  });
});

describe("extractFormative — FillBlank (fill-blank)", () => {
  it("collects slot id/correct from inline self-closing slots", () => {
    const result = extractFormative(
      root([
        mdx("FillBlank", {}, [
          mdx("FillBlank.Prompt", {}, [
            { type: "text", value: "The Sun fuses " },
            mdx("FillBlank.Slot", { id: "fuel", correct: "hydrogen" }),
            { type: "text", value: " into " },
            mdx("FillBlank.Slot", { id: "ash", correct: "helium" }),
          ]),
        ]),
      ]) as never,
      "u"
    );
    expect(result.entries[0]).toMatchObject({
      kind: "fill-blank",
      answer: {
        type: "fill-blank",
        blanks: [
          { id: "fuel", correct: "hydrogen" },
          { id: "ash", correct: "helium" },
        ],
      },
    });
    expect(result.findings.filter((f) => f.code === "AS-3")).toHaveLength(0);
  });

  it("recurses into a paragraph for inline `mdxJsxTextElement` slots (real authored shape)", () => {
    // Real MDX wraps prose-embedded slots in a `paragraph` and emits each
    // slot as `mdxJsxTextElement` (phrasing content) — slots are
    // GRANDCHILDREN of the prompt, of the text-node type. This is the
    // shape the `fb-halpha-values` fixture produces; a direct-children
    // scan counted it as ZERO blanks and mis-fired AS-3. The recursive
    // `findFillBlankSlots` walk fixes it.
    const result = extractFormative(
      root([
        mdx("FillBlank", { id: "fb-halpha-values" }, [
          mdx("FillBlank.Prompt", {}, [
            {
              type: "paragraph",
              children: [
                { type: "text", value: "The H-alpha line has wavelength " },
                {
                  type: "mdxJsxTextElement",
                  name: "FillBlank.Slot",
                  attributes: [
                    { type: "mdxJsxAttribute", name: "id", value: "lambda" },
                    {
                      type: "mdxJsxAttribute",
                      name: "correct",
                      value: "656.3",
                    },
                  ],
                  children: [],
                },
                { type: "text", value: " nm and ends at " },
                {
                  type: "mdxJsxTextElement",
                  name: "FillBlank.Slot",
                  attributes: [
                    { type: "mdxJsxAttribute", name: "id", value: "nlower" },
                    { type: "mdxJsxAttribute", name: "correct", value: "2" },
                  ],
                  children: [],
                },
              ],
            },
          ]),
        ]),
      ]) as never,
      "u"
    );
    expect(result.entries[0]?.answer).toEqual({
      type: "fill-blank",
      blanks: [
        { id: "lambda", correct: "656.3" },
        { id: "nlower", correct: "2" },
      ],
    });
    expect(result.findings.filter((f) => f.code === "AS-3")).toHaveLength(0);
  });

  it("emits a zero-blank entry (AS-3 fires in the audit, not the extractor)", () => {
    const result = extractFormative(
      root([
        mdx("FillBlank", { id: "no-slots" }, [
          mdx("FillBlank.Prompt", {}, [
            { type: "text", value: "no slots here" },
          ]),
        ]),
      ]) as never,
      "u"
    );
    expect(result.entries[0]?.answer).toEqual({
      type: "fill-blank",
      blanks: [],
    });
    expect(result.findings).toEqual([]);
  });
});

describe("extractFormative — NumericQuestion (numeric)", () => {
  it("reads value/tolerance/toleranceKind/unit from the Answer child", () => {
    const result = extractFormative(
      root([
        mdx("NumericQuestion", {}, [
          prompt("NumericQuestion", "Central pressure?"),
          mdx("NumericQuestion.Answer", {
            value: expr("2.5e17"),
            tolerance: expr("0.1"),
            toleranceKind: "relative",
            unit: "dyne/cm^2",
          }),
        ]),
      ]) as never,
      "u"
    );
    expect(result.entries[0]).toMatchObject({
      kind: "numeric-question",
      answer: {
        type: "numeric",
        value: 2.5e17,
        tolerance: 0.1,
        toleranceKind: "relative",
        unit: "dyne/cm^2",
      },
    });
    expect(result.findings.filter((f) => f.code === "AS-4")).toHaveLength(0);
  });

  it("pushes AS-4 ERROR when there is no Answer child", () => {
    const result = extractFormative(
      root([
        mdx("NumericQuestion", { id: "no-answer" }, [
          prompt("NumericQuestion", "q"),
        ]),
      ]) as never,
      "u"
    );
    const as4 = result.findings.filter((f) => f.code === "AS-4");
    expect(as4).toHaveLength(1);
    expect(as4[0]).toMatchObject({
      severity: "ERROR",
      location: { unit: "u", anchor: "no-answer" },
    });
    expect(result.entries[0]?.answer.type).toBe("numeric");
  });

  it("pushes AS-4 ERROR when there are two Answer children", () => {
    const result = extractFormative(
      root([
        mdx("NumericQuestion", {}, [
          prompt("NumericQuestion", "q"),
          mdx("NumericQuestion.Answer", {
            value: expr("1"),
            tolerance: expr("0"),
            toleranceKind: "absolute",
          }),
          mdx("NumericQuestion.Answer", {
            value: expr("2"),
            tolerance: expr("0"),
            toleranceKind: "absolute",
          }),
        ]),
      ]) as never,
      "u"
    );
    expect(result.findings.filter((f) => f.code === "AS-4")).toHaveLength(1);
  });
});
