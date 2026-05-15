import { describe, expect, it } from "vitest";
import {
  buildValidationAdmonitionNode,
  extractLastRevisedDate,
  isContractFile,
  renderValidationAdmonition,
} from "./validation-admonition-plugin";

describe("renderValidationAdmonition", () => {
  it("emits a validated admonition for status=validated", () => {
    const md = renderValidationAdmonition({
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [{ kind: "test", ref: "x.test.ts", date: "2026-05-12" }],
      },
      lastRevisedDate: null,
    });
    expect(md).toMatch(/:::\{admonition\}\s+Validation/);
    expect(md).toMatch(/:class:\s+validation-validated/);
    expect(md).toMatch(/Last validated.*2026-05-14/);
    expect(md).toMatch(/Status:.*validated/);
  });

  it("emits an in-progress admonition for status=in-progress", () => {
    const md = renderValidationAdmonition({
      validation: {
        status: "in-progress",
        last_validated_date: null,
        evidence: [],
      },
      lastRevisedDate: null,
    });
    expect(md).toMatch(/:class:\s+validation-in-progress/);
    expect(md).toMatch(/Status:.*in-progress/);
  });

  it("emits an unvalidated admonition for status=unvalidated", () => {
    const md = renderValidationAdmonition({
      validation: {
        status: "unvalidated",
        last_validated_date: null,
        evidence: [],
      },
      lastRevisedDate: null,
    });
    expect(md).toMatch(/:class:\s+validation-unvalidated/);
    expect(md).toMatch(/Status:.*unvalidated/);
  });

  it("auto-flips to re-validation-needed when revisions post-date validation", () => {
    const md = renderValidationAdmonition({
      validation: {
        status: "validated",
        last_validated_date: "2026-04-30",
        evidence: [],
      },
      lastRevisedDate: "2026-05-15",
    });
    expect(md).toMatch(/:class:\s+validation-re-validation-needed/);
    expect(md).toMatch(/Revised after validation/);
    expect(md).toMatch(/2026-05-15/);
  });

  it("keeps status=validated when revision predates last validated date", () => {
    const md = renderValidationAdmonition({
      validation: {
        status: "validated",
        last_validated_date: "2026-05-15",
        evidence: [],
      },
      lastRevisedDate: "2026-04-30",
    });
    expect(md).toMatch(/:class:\s+validation-validated/);
    expect(md).not.toMatch(/Revised after validation/);
  });

  it("does not auto-flip statuses other than validated", () => {
    // `in-progress` blocks may legitimately have an older revision than
    // the validation date without becoming stale — the author is still
    // working on validating the contract.
    const md = renderValidationAdmonition({
      validation: {
        status: "in-progress",
        last_validated_date: null,
        evidence: [],
      },
      lastRevisedDate: "2099-01-01",
    });
    expect(md).toMatch(/:class:\s+validation-in-progress/);
    expect(md).not.toMatch(/Revised after validation/);
  });

  it("emits unvalidated admonition for missing block", () => {
    const md = renderValidationAdmonition({
      validation: undefined,
      lastRevisedDate: null,
    });
    expect(md).toMatch(/:class:\s+validation-unvalidated/);
    expect(md).toMatch(/Status:.*unvalidated/);
  });

  it("formats evidence with present-with-date check marks", () => {
    const md = renderValidationAdmonition({
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [
          { kind: "test", ref: "x.test.ts", date: "2026-05-12" },
          { kind: "chapter", ref: "ch1.mdx", date: "2026-05-13" },
        ],
      },
      lastRevisedDate: null,
    });
    expect(md).toMatch(/test \(2026-05-12\)/);
    expect(md).toMatch(/chapter \(2026-05-13\)/);
  });

  it("formats deferred evidence with pause icon", () => {
    const md = renderValidationAdmonition({
      validation: {
        status: "in-progress",
        last_validated_date: null,
        evidence: [
          { kind: "deployment", ref: null, date: null, notes: "fa26 pending" },
        ],
      },
      lastRevisedDate: null,
    });
    expect(md).toMatch(/deployment \(deferred\)/);
  });

  it("renders notes when present", () => {
    const md = renderValidationAdmonition({
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [],
        notes: "Cross-tab sync covered via BroadcastChannel.",
      },
      lastRevisedDate: null,
    });
    expect(md).toMatch(/Notes:.*Cross-tab sync covered/);
  });

  it("respects SOPHIE_DOCS_INCLUDE_VALIDATION=0 by returning empty string", () => {
    const previous = process.env.SOPHIE_DOCS_INCLUDE_VALIDATION;
    process.env.SOPHIE_DOCS_INCLUDE_VALIDATION = "0";
    try {
      const md = renderValidationAdmonition({
        validation: {
          status: "validated",
          last_validated_date: "2026-05-14",
          evidence: [],
        },
        lastRevisedDate: null,
      });
      expect(md).toBe("");
    } finally {
      if (previous === undefined) {
        delete process.env.SOPHIE_DOCS_INCLUDE_VALIDATION;
      } else {
        process.env.SOPHIE_DOCS_INCLUDE_VALIDATION = previous;
      }
    }
  });

  it("renders the admonition by default (env var unset)", () => {
    const previous = process.env.SOPHIE_DOCS_INCLUDE_VALIDATION;
    delete process.env.SOPHIE_DOCS_INCLUDE_VALIDATION;
    try {
      const md = renderValidationAdmonition({
        validation: {
          status: "validated",
          last_validated_date: "2026-05-14",
          evidence: [],
        },
        lastRevisedDate: null,
      });
      expect(md).not.toBe("");
      expect(md).toMatch(/:::\{admonition\}\s+Validation/);
    } finally {
      if (previous !== undefined) {
        process.env.SOPHIE_DOCS_INCLUDE_VALIDATION = previous;
      }
    }
  });
});

describe("extractLastRevisedDate", () => {
  it("returns null when no Revisions section is present", () => {
    const source = "# Title\n\nBody text only.";
    expect(extractLastRevisedDate(source)).toBeNull();
  });

  it("extracts a single Revisions entry date", () => {
    const source = [
      "# Title",
      "",
      "## Revisions",
      "",
      "**§1 — 2026-05-12 — first revision**",
      "",
      "Notes about the revision.",
    ].join("\n");
    expect(extractLastRevisedDate(source)).toBe("2026-05-12");
  });

  it("returns the most recent date when multiple revisions are present", () => {
    const source = [
      "## Revisions",
      "",
      "**§1 — 2026-04-30 — first revision**",
      "",
      "**§2 — 2026-05-12 — second revision**",
      "",
      "**§3 — 2026-05-15 — third revision**",
    ].join("\n");
    expect(extractLastRevisedDate(source)).toBe("2026-05-15");
  });

  it("ignores §-headers that lack an ISO date", () => {
    const source = [
      "**§1 — TBD — placeholder**",
      "**§2 — 2026-05-12 — real revision**",
    ].join("\n");
    expect(extractLastRevisedDate(source)).toBe("2026-05-12");
  });

  it("returns null for non-Revisions §-references", () => {
    // Bare `§5` references in prose without the **§N — YYYY-MM-DD —**
    // header shape must not be misread as a revision entry.
    const source = "See §5 for the locked decision.";
    expect(extractLastRevisedDate(source)).toBeNull();
  });

  it("extracts the date from the H2 'Revisions (YYYY-MM-DD ...)' shape", () => {
    // ADRs 0038/0041 use this shape today; the regex matches both
    // the canonical `**§N — date —**` shape and the H2-inline shape.
    const source = [
      "## Revisions (2026-05-13 — post-PR-C1)",
      "",
      "Some prose.",
      "",
      "## Revisions (2026-05-14 — post-PR-C2)",
      "",
      "More prose.",
    ].join("\n");
    expect(extractLastRevisedDate(source)).toBe("2026-05-14");
  });

  it("picks the most recent date across mixed revision shapes", () => {
    const source = [
      "## Revisions (2026-04-30 — first)",
      "",
      "**§1 — 2026-05-12 — second revision**",
      "",
      "**§2 — 2026-05-15 — third revision**",
    ].join("\n");
    expect(extractLastRevisedDate(source)).toBe("2026-05-15");
  });
});

describe("buildValidationAdmonitionNode", () => {
  it("returns null when env var SOPHIE_DOCS_INCLUDE_VALIDATION=0", () => {
    const previous = process.env.SOPHIE_DOCS_INCLUDE_VALIDATION;
    process.env.SOPHIE_DOCS_INCLUDE_VALIDATION = "0";
    try {
      const node = buildValidationAdmonitionNode({
        validation: undefined,
        lastRevisedDate: null,
      });
      expect(node).toBeNull();
    } finally {
      if (previous === undefined) {
        delete process.env.SOPHIE_DOCS_INCLUDE_VALIDATION;
      } else {
        process.env.SOPHIE_DOCS_INCLUDE_VALIDATION = previous;
      }
    }
  });

  it("builds an admonition node with the status-keyed class", () => {
    const node = buildValidationAdmonitionNode({
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [],
      },
      lastRevisedDate: null,
    });
    expect(node).not.toBeNull();
    expect(node?.type).toBe("admonition");
    expect(node?.class).toBe("validation-validated");
  });

  it("builds an admonition with kind=note for native MyST styling", () => {
    const node = buildValidationAdmonitionNode({
      validation: undefined,
      lastRevisedDate: null,
    });
    expect(node?.kind).toBe("note");
  });

  it("emits a title child with text 'Validation'", () => {
    const node = buildValidationAdmonitionNode({
      validation: undefined,
      lastRevisedDate: null,
    });
    const title = node?.children[0];
    expect(title?.type).toBe("admonitionTitle");
    expect(title?.children).toEqual([{ type: "text", value: "Validation" }]);
  });

  it("auto-flips class to validation-re-validation-needed on stale revision", () => {
    const node = buildValidationAdmonitionNode({
      validation: {
        status: "validated",
        last_validated_date: "2026-04-30",
        evidence: [],
      },
      lastRevisedDate: "2026-05-15",
    });
    expect(node?.class).toBe("validation-re-validation-needed");
  });
});

describe("isContractFile", () => {
  it("matches files under decisions/", () => {
    expect(isContractFile("docs/website/decisions/0001-foo.md")).toBe(true);
    expect(isContractFile("/abs/path/decisions/0042-bar.md")).toBe(true);
  });

  it("matches files under reference/", () => {
    expect(isContractFile("docs/website/reference/content-schema.md")).toBe(
      true
    );
  });

  it("does not match files outside decisions/ or reference/", () => {
    expect(isContractFile("docs/website/explanation/foo.md")).toBe(false);
    expect(isContractFile("docs/website/how-to/bar.md")).toBe(false);
    expect(isContractFile("docs/website/tutorials/quux.md")).toBe(false);
    expect(isContractFile("docs/website/index.md")).toBe(false);
  });

  it("normalizes Windows-style backslashes", () => {
    expect(isContractFile("docs\\website\\decisions\\0001.md")).toBe(true);
  });

  it("does not match nested directories under decisions/", () => {
    // Defensive: only top-level *.md files inside decisions/ count as
    // contracts. A future docs/decisions/draft/foo.md should not pick
    // up an admonition automatically.
    expect(isContractFile("docs/website/decisions/draft/foo.md")).toBe(false);
  });
});
