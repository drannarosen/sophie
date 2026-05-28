import { describe, expect, test } from "vitest";
import type { MdxJsxFlowElement } from "../jsx-utils.ts";
import { extractWorkedExamples } from "./worked-examples.ts";

/**
 * Synthetic mdast trees, matching the OMIFlow test convention. We
 * build the minimum AST shape `extractWorkedExamples` consumes and
 * assert the per-callsite entry shape + the WE-3 findings list.
 *
 * `MdxJsxFlowElement` is the canonical type per R9-test
 * (AGENTS.md Conventions); test-local `TestRoot` stays local because
 * mdast's `Root.children` is wider than the union we want to keep
 * assignment-checked at construction sites.
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

const mdx = (
  name: string,
  attrs: Record<string, string> = {},
  children: ReadonlyArray<MdastChild> = []
): MdxJsxFlowElement => ({
  type: "mdxJsxFlowElement",
  name,
  attributes: Object.entries(attrs).map(([n, v]) => ({
    type: "mdxJsxAttribute",
    name: n,
    value: v,
  })),
  children,
});

const wePara = (text: string) => ({
  type: "paragraph",
  children: [{ type: "text", value: text }],
});

describe("extractWorkedExamples", () => {
  test("returns empty entries when no <WorkedExample> is present", () => {
    const tree = root([wePara("just prose")]);
    const result = extractWorkedExamples(tree as never, "unit", "reading");
    expect(result.entries).toEqual([]);
    expect(result.findings).toEqual([]);
  });

  test("extracts a complete WorkedExample (Problem + Step + DimCheck + Result)", () => {
    const tree = root([
      mdx("WorkedExample", { title: "Sun central pressure" }, [
        mdx("WorkedExample.Problem", {}, [wePara("Find Pc.")]),
        mdx("WorkedExample.Step", { label: "Substitute" }, [wePara("...")]),
        mdx("WorkedExample.DimCheck", {}, [wePara("[Pc]=dyne/cm^2")]),
        mdx("WorkedExample.Result", {}, [wePara("Pc ≈ 2.3e17.")]),
      ]),
    ]);
    const { entries, findings } = extractWorkedExamples(
      tree as never,
      "hydrostatic-equilibrium",
      "reading"
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      unit: "hydrostatic-equilibrium",
      anchor: "we-sun-central-pressure",
      title: "Sun central pressure",
      number: 1,
      slots: { problem: true, steps: 1, dimChecks: 1, result: true },
    });
    expect(findings).toEqual([]);
  });

  test("counter increments across multiple WorkedExamples in one unit", () => {
    const tree = root([
      mdx("WorkedExample", {}, [
        mdx("WorkedExample.Problem"),
        mdx("WorkedExample.Result"),
      ]),
      mdx("WorkedExample", {}, [
        mdx("WorkedExample.Problem"),
        mdx("WorkedExample.Result"),
      ]),
    ]);
    const { entries } = extractWorkedExamples(tree as never, "ch", "reading");
    expect(entries.map((e) => e.anchor)).toEqual([
      "reading-we-1",
      "reading-we-2",
    ]);
    expect(entries.map((e) => e.number)).toEqual([1, 2]);
  });

  test("anchor precedence: explicit id wins over title", () => {
    const tree = root([
      mdx(
        "WorkedExample",
        { id: "central-pressure-warmup", title: "Sun central pressure" },
        [mdx("WorkedExample.Problem"), mdx("WorkedExample.Result")]
      ),
    ]);
    const { entries } = extractWorkedExamples(tree as never, "ch", "reading");
    expect(entries[0]?.anchor).toBe("central-pressure-warmup");
  });

  test("slot counts: multiple Steps + DimChecks accumulate", () => {
    const tree = root([
      mdx("WorkedExample", {}, [
        mdx("WorkedExample.Problem"),
        mdx("WorkedExample.Step"),
        mdx("WorkedExample.Step"),
        mdx("WorkedExample.Step"),
        mdx("WorkedExample.DimCheck"),
        mdx("WorkedExample.DimCheck"),
        mdx("WorkedExample.Result"),
      ]),
    ]);
    const { entries } = extractWorkedExamples(tree as never, "ch", "reading");
    expect(entries[0]?.slots).toEqual({
      problem: true,
      steps: 3,
      dimChecks: 2,
      result: true,
    });
  });

  test("missing Problem / Result is allowed at extract time (WE-2 ERROR at audit time)", () => {
    const tree = root([
      mdx("WorkedExample", { id: "no-problem" }, [
        mdx("WorkedExample.Step"),
        mdx("WorkedExample.Result"),
      ]),
    ]);
    const { entries, findings } = extractWorkedExamples(
      tree as never,
      "ch",
      "reading"
    );
    expect(entries[0]?.slots).toMatchObject({ problem: false, result: true });
    // Extract doesn't emit WE-2 — that's the invariant's job (defense-
    // in-depth + better grouping in the audit report).
    expect(findings.filter((f) => f.code === "WE-2")).toEqual([]);
  });

  test("duplicate Problem throws at extract time (WE-2 over-count)", () => {
    const tree = root([
      mdx("WorkedExample", { id: "two-problems" }, [
        mdx("WorkedExample.Problem"),
        mdx("WorkedExample.Problem"),
        mdx("WorkedExample.Result"),
      ]),
    ]);
    expect(() => extractWorkedExamples(tree as never, "ch", "reading")).toThrow(
      /WorkedExample.Problem.*appears 2 times/
    );
  });

  test("unknown JSX flow child emits a WE-3 WARNING (R7 disposition)", () => {
    const tree = root([
      mdx("WorkedExample", { id: "rogue-child" }, [
        mdx("WorkedExample.Problem"),
        mdx("Callout", { variant: "deep-dive" }),
        mdx("WorkedExample.Result"),
      ]),
    ]);
    const { entries, findings } = extractWorkedExamples(
      tree as never,
      "ch",
      "reading"
    );
    expect(entries).toHaveLength(1);
    const we3 = findings.filter((f) => f.code === "WE-3");
    expect(we3).toHaveLength(1);
    expect(we3[0]?.message).toMatch(/Callout/);
    expect(we3[0]?.severity).toBe("WARNING");
  });

  test("intra-chapter anchor collision throws (defense-in-depth on id reuse)", () => {
    const tree = root([
      mdx("WorkedExample", { id: "dup" }, [
        mdx("WorkedExample.Problem"),
        mdx("WorkedExample.Result"),
      ]),
      mdx("WorkedExample", { id: "dup" }, [
        mdx("WorkedExample.Problem"),
        mdx("WorkedExample.Result"),
      ]),
    ]);
    expect(() => extractWorkedExamples(tree as never, "ch", "reading")).toThrow(
      /anchor collision/
    );
  });
});
