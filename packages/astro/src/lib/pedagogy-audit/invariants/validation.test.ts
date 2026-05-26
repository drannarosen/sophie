import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  ContractValidationEntry,
  PedagogyIndex,
} from "@sophie/core/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runPedagogyAudit } from "../index.ts";
import { buildPedagogyIndex } from "../test-helpers.ts";

/**
 * Tests for the validation audit invariants V1–V7 implemented in
 * `validation.ts`. Split out of `runner.test.ts` per A+ Phase E
 * (ADR 0061 Rule 3).
 *
 * V0 (parse failure) and V8 (unknown key) are extractor-layer findings
 * — see `validation-extractor.test.ts`. The extractorFindings merge
 * test stays in `runner.test.ts` (orchestration concern). V1–V7 here
 * run against already-typed `Validation` blocks, mirroring the
 * runtime layer split.
 */

function emptyIndex(): PedagogyIndex {
  return buildPedagogyIndex();
}

describe("validation audit invariants — V1 (ADR missing validation block)", () => {
  it("emits an ERROR for an ADR without a validation block (promoted in PR 6)", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0001-platform-not-monorepo.md",
      validation: undefined,
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V1")).toBe(true);
    expect(report.errors.find((e) => e.code === "V1")?.message).toContain(
      "docs/website/decisions/0001-platform-not-monorepo.md"
    );
  });

  it("does not fire V1 when the ADR has a validation block", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0001-platform-not-monorepo.md",
      validation: {
        status: "unvalidated",
        last_validated_date: null,
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V1")).toBe(false);
  });

  it("does not fire V1 for the decisions template.md file", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/template.md",
      validation: undefined,
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V1")).toBe(false);
  });
});

describe("validation audit invariants — V2 (reference doc missing block)", () => {
  it("emits an ERROR for a reference doc without a validation block (promoted in PR 6)", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/reference/content-schema.md",
      validation: undefined,
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V2")).toBe(true);
    expect(report.errors.find((e) => e.code === "V2")?.message).toContain(
      "docs/website/reference/content-schema.md"
    );
  });

  it("does not fire V2 when the reference doc has a validation block", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/reference/content-schema.md",
      validation: {
        status: "unvalidated",
        last_validated_date: null,
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V2")).toBe(false);
  });
});

describe("validation audit invariants — V3 (validated requires date, defense-in-depth)", () => {
  // Defense-in-depth: schema-layer refinement (PR #43) catches this case at
  // parse time, and extractor V0 surfaces parse failures explicitly. V3
  // here fires only on inputs that bypassed both — guards against direct
  // ContractValidationEntry construction (tests, future synthesizers).
  it("emits an ERROR when status=validated but last_validated_date is null", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: null,
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V3")).toBe(true);
  });

  it("emits an ERROR when status=re-validation-needed but last_validated_date is null", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "re-validation-needed",
        last_validated_date: null,
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V3")).toBe(true);
  });

  it("does not fire V3 when status=validated has a date", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V3")).toBe(false);
  });
});

describe("validation audit invariants — V4 (unvalidated must be clean)", () => {
  it("emits an ERROR when status=unvalidated has evidence", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "unvalidated",
        last_validated_date: null,
        evidence: [
          // V4 is about "has evidence" — null ref keeps this focused
          // on V4 without dragging the V5 disk-resolution path in.
          {
            kind: "test",
            ref: null,
            date: "2026-05-14",
          },
        ],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V4")).toBe(true);
  });

  it("emits an ERROR when status=unvalidated has a last_validated_date", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "unvalidated",
        last_validated_date: "2026-05-14",
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V4")).toBe(true);
  });

  it("does not fire V4 when status=unvalidated is clean", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "unvalidated",
        last_validated_date: null,
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V4")).toBe(false);
  });
});

// V5 runs against a tmp repoRoot so existence checks are deterministic.
describe("validation audit invariants — V5 (evidence ref must resolve)", () => {
  let tmpRoot = "";
  beforeAll(async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), "sophie-v5-"));
    await mkdir(join(tmpRoot, "packages", "components", "src"), {
      recursive: true,
    });
    await writeFile(
      join(tmpRoot, "packages", "components", "src", "Predict.test.tsx"),
      "// fixture"
    );
  });

  it("emits an ERROR when an evidence ref does not exist on disk", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [
          {
            kind: "test",
            ref: "packages/components/src/DoesNotExist.test.tsx",
            date: "2026-05-14",
          },
        ],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index, { repoRoot: tmpRoot });
    expect(report.errors.some((e) => e.code === "V5")).toBe(true);
  });

  it("does not fire V5 when the evidence ref exists on disk", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [
          {
            kind: "test",
            ref: "packages/components/src/Predict.test.tsx",
            date: "2026-05-14",
          },
        ],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index, { repoRoot: tmpRoot });
    expect(report.errors.some((e) => e.code === "V5")).toBe(false);
  });

  it("does not fire V5 when the evidence ref is null (deferred evidence)", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [
          { kind: "manual", ref: null, date: "2026-05-14", notes: "TODO" },
        ],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index, { repoRoot: tmpRoot });
    expect(report.errors.some((e) => e.code === "V5")).toBe(false);
  });

  it("fires V5 when the evidence ref is an absolute path (escape guard)", () => {
    // path.resolve(repoRoot, "/etc/hosts") returns "/etc/hosts" — the
    // absolute path overrides repoRoot. Without the escape guard, V5
    // would existence-check against the host system instead of the repo.
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [{ kind: "test", ref: "/etc/hosts", date: "2026-05-14" }],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index, { repoRoot: tmpRoot });
    const v5 = report.errors.find((e) => e.code === "V5");
    expect(v5).toBeDefined();
    expect(v5?.message).toContain("repo-root-relative");
  });

  it("fires V5 when the evidence ref escapes via ../", () => {
    // ../../../etc/passwd resolves outside tmpRoot. The relative path
    // would start with "..", triggering the escape guard.
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [
          {
            kind: "test",
            ref: "../../../etc/passwd",
            date: "2026-05-14",
          },
        ],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index, { repoRoot: tmpRoot });
    const v5 = report.errors.find((e) => e.code === "V5");
    expect(v5).toBeDefined();
    expect(v5?.message).toContain("repo-root-relative");
  });

  afterAll(async () => {
    // tmp dirs from os.tmpdir() are reaped by the OS; no explicit cleanup
    // needed. Variable kept for symmetry with beforeAll's binding.
    void tmpRoot;
  });
});

describe("validation audit invariants — V6 (evidence date must be ISO)", () => {
  it("emits an ERROR for a malformed evidence date", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [{ kind: "manual", ref: null, date: "May 14, 2026" }],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V6")).toBe(true);
  });

  it("does not fire V6 for a valid ISO date", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [{ kind: "manual", ref: null, date: "2026-05-14" }],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V6")).toBe(false);
  });

  it("does not fire V6 when the evidence date is null", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [{ kind: "manual", ref: null, date: null }],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V6")).toBe(false);
  });
});

describe("validation audit invariants — V7 (last_validated_date not in future)", () => {
  it("emits a WARNING when last_validated_date is in the future", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2999-01-01",
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.warnings.some((w) => w.code === "V7")).toBe(true);
  });

  it("does not fire V7 for a past date", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2020-01-01",
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.warnings.some((w) => w.code === "V7")).toBe(false);
  });
});
