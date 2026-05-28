import type { Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxFromMarkdown } from "mdast-util-mdx";
import type {
  MdxJsxAttribute,
  MdxJsxFlowElement,
  MdxJsxTextElement,
} from "mdast-util-mdx-jsx";
import { mdxjs } from "micromark-extension-mdxjs";
import { unified } from "unified";
import { describe, expect, test } from "vitest";
import {
  SOPHIE_AUTO_IMPORTED_COMPONENTS,
  SOPHIE_CONTENT_AUTO_IMPORT,
  SOPHIE_FORMATIVE_CHILDREN,
  SOPHIE_FORMATIVE_PARENTS,
  SOPHIE_INTERACTIVE_COMPONENTS,
  sophieAutoImportsRemarkPlugin,
} from "./sophie-auto-imports.ts";

/**
 * Local structural type matching `mdast-util-mdxjs-esm`'s `MdxjsEsm`
 * — declared here (not imported) to avoid pulling in a type-only
 * dependency just for tests. Mirrors the shape used inside the
 * plugin itself for the same W3 reason.
 */
interface MdxjsEsmNode {
  type: "mdxjsEsm";
  value: string;
  data?: {
    estree?: {
      body: ReadonlyArray<{
        type: string;
        source?: { value?: unknown };
        specifiers?: ReadonlyArray<{
          type: string;
          imported?: { type: string; name?: string };
        }>;
      }>;
    } | null;
  };
}

function parseMdx(source: string): Root {
  return fromMarkdown(source, {
    extensions: [mdxjs()],
    mdastExtensions: [mdxFromMarkdown()],
  });
}

async function applyPlugin(
  source: string,
  filePath = "test-chapter.mdx"
): Promise<Root> {
  const tree = parseMdx(source);
  await unified()
    .use(sophieAutoImportsRemarkPlugin)
    .run(tree, { path: filePath } as never);
  return tree;
}

function collectImports(tree: Root): MdxjsEsmNode[] {
  return tree.children
    .filter((c) => c.type === "mdxjsEsm")
    .map((c) => c as unknown as MdxjsEsmNode);
}

function importSpecifiers(node: MdxjsEsmNode): string[] {
  const program = node.data?.estree;
  if (!program) return [];
  const out: string[] = [];
  for (const stmt of program.body) {
    if (stmt.type !== "ImportDeclaration") continue;
    if (
      typeof stmt.source?.value !== "string" ||
      stmt.source.value !== "@sophie/components"
    ) {
      continue;
    }
    for (const spec of stmt.specifiers ?? []) {
      if (spec.type !== "ImportSpecifier") continue;
      if (spec.imported?.type === "Identifier" && spec.imported.name) {
        out.push(spec.imported.name);
      }
    }
  }
  return out;
}

function findFirstJsxByName(
  tree: Root,
  name: string
): MdxJsxFlowElement | MdxJsxTextElement | null {
  let found: MdxJsxFlowElement | MdxJsxTextElement | null = null;
  const walk = (node: unknown): void => {
    if (found) return;
    if (!node || typeof node !== "object") return;
    const n = node as {
      type?: string;
      name?: string;
      children?: ReadonlyArray<unknown>;
    };
    if (
      (n.type === "mdxJsxFlowElement" || n.type === "mdxJsxTextElement") &&
      n.name === name
    ) {
      found = node as MdxJsxFlowElement | MdxJsxTextElement;
      return;
    }
    if (Array.isArray(n.children)) {
      for (const c of n.children) walk(c);
    }
  };
  walk(tree);
  return found;
}

function getAttr(
  el: MdxJsxFlowElement | MdxJsxTextElement,
  name: string
): MdxJsxAttribute | undefined {
  return el.attributes.find(
    (a): a is MdxJsxAttribute => a.type === "mdxJsxAttribute" && a.name === name
  );
}

describe("sophieAutoImportsRemarkPlugin — Job 1: auto-import", () => {
  test("injects an import for a single interactive component", async () => {
    const tree = await applyPlugin(`<GlossaryTerm name="parsec" />`);
    const imports = collectImports(tree);
    expect(imports).toHaveLength(1);
    expect(importSpecifiers(imports[0] as MdxjsEsmNode)).toEqual([
      "GlossaryTerm",
    ]);
  });

  test("import statement is the first child of the tree", async () => {
    const tree = await applyPlugin(
      `# Heading\n\n<GlossaryTerm name="parsec" />`
    );
    expect(tree.children[0]?.type).toBe("mdxjsEsm");
  });

  test("multiple components are imported alphabetically in a single statement", async () => {
    const tree = await applyPlugin(
      `<PracticeProblem course="c" unit="u" id="p">
  <Hint number={1}>hint</Hint>
  <Solution>sol</Solution>
</PracticeProblem>`
    );
    const imports = collectImports(tree);
    expect(imports).toHaveLength(1);
    expect(importSpecifiers(imports[0] as MdxjsEsmNode)).toEqual([
      "Hint",
      "PracticeProblem",
      "Solution",
    ]);
  });

  test("merges with an existing author-written @sophie/components import (no duplicate names)", async () => {
    const tree = await applyPlugin(
      `import { Hint } from "@sophie/components";

<PracticeProblem course="c" unit="u" id="p">
  <Hint number={1}>hint</Hint>
  <Solution>sol</Solution>
</PracticeProblem>`
    );
    const imports = collectImports(tree);
    expect(imports).toHaveLength(1);
    expect(importSpecifiers(imports[0] as MdxjsEsmNode)).toEqual([
      "Hint",
      "PracticeProblem",
      "Solution",
    ]);
  });

  test("preserves sibling non-Sophie imports in the same ESM node when merging", async () => {
    // MDX parses consecutive `import` lines without blank separators
    // into a SINGLE `mdxjsEsm` node carrying multiple ImportDeclarations.
    // The plugin must merge specifiers into the @sophie/components
    // ImportDeclaration WITHOUT touching the sibling default-import.
    const tree = await applyPlugin(
      `import { LearningObjectives } from "@sophie/components";
import ChapterMultiReps from "@sophie/astro/components/ChapterMultiReps.astro";

<LearningObjectives />
<GlossaryTerm name="parsec" />`
    );
    // The merged @sophie/components import now carries both names.
    const imports = collectImports(tree);
    const sophieNode = imports.find((n) =>
      n.data?.estree?.body.some(
        (s) =>
          s.type === "ImportDeclaration" &&
          s.source?.value === "@sophie/components"
      )
    );
    expect(sophieNode).toBeDefined();
    expect(importSpecifiers(sophieNode as MdxjsEsmNode).sort()).toEqual([
      "GlossaryTerm",
      "LearningObjectives",
    ]);
    // The sibling .astro default import is still present in the same
    // mdxjsEsm node's estree program body.
    const stillHasAstroImport = sophieNode?.data?.estree?.body.some(
      (s) =>
        s.type === "ImportDeclaration" &&
        s.source?.value === "@sophie/astro/components/ChapterMultiReps.astro"
    );
    expect(stillHasAstroImport).toBe(true);
  });

  test("no import emitted when only static-mapped components are used", async () => {
    const tree = await applyPlugin(`<Aside kind="note">Note</Aside>`);
    expect(collectImports(tree)).toHaveLength(0);
  });

  test("no import emitted for a plain-prose file with no JSX", async () => {
    const tree = await applyPlugin(`# Just a heading\n\nSome prose.`);
    expect(collectImports(tree)).toHaveLength(0);
  });
});

describe("sophieAutoImportsRemarkPlugin — Job 2: client:load injection", () => {
  test("adds client:load to a bare interactive component", async () => {
    const tree = await applyPlugin(`<GlossaryTerm name="parsec" />`);
    const node = findFirstJsxByName(tree, "GlossaryTerm");
    expect(node).not.toBeNull();
    const directive = getAttr(node as MdxJsxFlowElement, "client:load");
    expect(directive).toBeDefined();
    expect(directive?.value).toBeNull();
  });

  test("client:load is NOT added if author already declared client:visible", async () => {
    const tree = await applyPlugin(
      `<GlossaryTerm name="parsec" client:visible />`
    );
    const node = findFirstJsxByName(tree, "GlossaryTerm");
    expect(getAttr(node as MdxJsxFlowElement, "client:load")).toBeUndefined();
    expect(getAttr(node as MdxJsxFlowElement, "client:visible")).toBeDefined();
  });

  test("client:load is NOT added twice when an explicit client:load already exists", async () => {
    const tree = await applyPlugin(
      `<GlossaryTerm name="parsec" client:load />`
    );
    const node = findFirstJsxByName(tree, "GlossaryTerm");
    const loads = (node as MdxJsxFlowElement).attributes.filter(
      (a) => a.type === "mdxJsxAttribute" && a.name === "client:load"
    );
    expect(loads).toHaveLength(1);
  });

  test("static-mapped components do not receive client:load", async () => {
    const tree = await applyPlugin(`<Aside kind="note">Note</Aside>`);
    const node = findFirstJsxByName(tree, "Aside");
    expect(getAttr(node as MdxJsxFlowElement, "client:load")).toBeUndefined();
  });
});

describe("sophieAutoImportsRemarkPlugin — Job 3: parent-prop threading", () => {
  test("threads course/unit/parentId to <Solution> from <PracticeProblem>", async () => {
    const tree = await applyPlugin(
      `<PracticeProblem course="astr101" unit="u-3" id="p-7">
  <Solution>The answer.</Solution>
</PracticeProblem>`
    );
    const solution = findFirstJsxByName(tree, "Solution");
    expect(getAttr(solution as MdxJsxFlowElement, "course")?.value).toBe(
      "astr101"
    );
    expect(getAttr(solution as MdxJsxFlowElement, "unit")?.value).toBe("u-3");
    expect(getAttr(solution as MdxJsxFlowElement, "parentId")?.value).toBe(
      "p-7"
    );
  });

  test("threads course/unit/parentId to <Hint> AND preserves author's `number` prop", async () => {
    const tree = await applyPlugin(
      `<PracticeProblem course="astr101" unit="u-3" id="p-7">
  <Hint number={1}>First nudge.</Hint>
</PracticeProblem>`
    );
    const hint = findFirstJsxByName(tree, "Hint");
    expect(getAttr(hint as MdxJsxFlowElement, "course")?.value).toBe("astr101");
    expect(getAttr(hint as MdxJsxFlowElement, "unit")?.value).toBe("u-3");
    expect(getAttr(hint as MdxJsxFlowElement, "parentId")?.value).toBe("p-7");
    // number={1} is an expression-valued attribute — preserved as-is.
    const numberAttr = getAttr(hint as MdxJsxFlowElement, "number");
    expect(numberAttr).toBeDefined();
  });

  test("explicit child override is preserved (author intent wins)", async () => {
    const tree = await applyPlugin(
      `<PracticeProblem course="astr101" unit="u-3" id="p-7">
  <Solution parentId="custom-override">Override.</Solution>
</PracticeProblem>`
    );
    const solution = findFirstJsxByName(tree, "Solution");
    expect(getAttr(solution as MdxJsxFlowElement, "parentId")?.value).toBe(
      "custom-override"
    );
    // course/unit still injected (no override on those)
    expect(getAttr(solution as MdxJsxFlowElement, "course")?.value).toBe(
      "astr101"
    );
    expect(getAttr(solution as MdxJsxFlowElement, "unit")?.value).toBe("u-3");
  });

  test("throws when a formative parent is missing course + unit", async () => {
    await expect(
      applyPlugin(
        `<PracticeProblem id="p-7"><Solution>sol</Solution></PracticeProblem>`,
        "/abs/path/practice.mdx"
      )
    ).rejects.toThrow(
      /<PracticeProblem>.*\/abs\/path\/practice\.mdx.*missing required attribute.*course.*unit/s
    );
  });

  test("throws when a formative parent is missing id", async () => {
    await expect(
      applyPlugin(
        `<PracticeProblem course="c" unit="u"><Solution>sol</Solution></PracticeProblem>`
      )
    ).rejects.toThrow(/missing required attribute.*id/);
  });

  test("nested formative parents: nearest-ancestor's props win for inner Solution", async () => {
    const tree = await applyPlugin(
      `<PracticeProblem course="outer-c" unit="outer-u" id="outer-id">
  <PracticeProblem course="inner-c" unit="inner-u" id="inner-id">
    <Solution>nested</Solution>
  </PracticeProblem>
</PracticeProblem>`
    );
    const solution = findFirstJsxByName(tree, "Solution");
    expect(getAttr(solution as MdxJsxFlowElement, "course")?.value).toBe(
      "inner-c"
    );
    expect(getAttr(solution as MdxJsxFlowElement, "unit")?.value).toBe(
      "inner-u"
    );
    expect(getAttr(solution as MdxJsxFlowElement, "parentId")?.value).toBe(
      "inner-id"
    );
  });

  test("Solution outside any formative parent receives no threaded attrs", async () => {
    const tree = await applyPlugin(`<Solution>orphan</Solution>`);
    const solution = findFirstJsxByName(tree, "Solution");
    expect(getAttr(solution as MdxJsxFlowElement, "course")).toBeUndefined();
    expect(getAttr(solution as MdxJsxFlowElement, "unit")).toBeUndefined();
    expect(getAttr(solution as MdxJsxFlowElement, "parentId")).toBeUndefined();
    // ...but auto-import + client:load still apply (it's interactive)
    expect(collectImports(tree)).toHaveLength(1);
    expect(importSpecifiers(collectImports(tree)[0] as MdxjsEsmNode)).toEqual([
      "Solution",
    ]);
    expect(getAttr(solution as MdxJsxFlowElement, "client:load")).toBeDefined();
  });
});

describe("sophieAutoImportsRemarkPlugin — component registries", () => {
  test("SOPHIE_INTERACTIVE_COMPONENTS contains the auto-imported v1 formative family + reveals (NOT virtual tags)", () => {
    // Reveals + every React-rendered formative parent are auto-imported
    // and `client:load`-injected by this plugin, so they live here.
    for (const name of [
      "PracticeProblem",
      "Hint",
      "Solution",
      "FillBlank",
      "NumericQuestion",
      "QuickCheck",
    ]) {
      expect(SOPHIE_INTERACTIVE_COMPONENTS.has(name)).toBe(true);
    }
    // `MCQ` (Task 3) and `MultiSelect` (Task 4) are VIRTUAL authoring
    // tags: expanded to static markup + a self-injected controller by
    // sophieCompoundExpandRemarkPlugin, so neither the tag nor the
    // controller is auto-imported here. Asserting their ABSENCE is an
    // invariant that stays true throughout the multi-task conversion.
    expect(SOPHIE_INTERACTIVE_COMPONENTS.has("MCQ")).toBe(false);
    expect(SOPHIE_INTERACTIVE_COMPONENTS.has("MCQController")).toBe(false);
    expect(SOPHIE_INTERACTIVE_COMPONENTS.has("MultiSelect")).toBe(false);
    expect(SOPHIE_INTERACTIVE_COMPONENTS.has("MultiSelectController")).toBe(
      false
    );
  });

  test("SOPHIE_INTERACTIVE_COMPONENTS excludes static-mapped components (chrome / static media)", () => {
    for (const name of [
      "Aside",
      "Callout",
      "Figure",
      "Video",
      "WorkedExample",
      "Due",
      "OfficeHours",
      "Points",
      "Reading",
      "Week",
      "KeyEquation",
    ]) {
      expect(SOPHIE_INTERACTIVE_COMPONENTS.has(name)).toBe(false);
    }
  });

  test("SOPHIE_FORMATIVE_PARENTS is the six v1 formative-parent shells", () => {
    expect([...SOPHIE_FORMATIVE_PARENTS].sort()).toEqual([
      "FillBlank",
      "MCQ",
      "MultiSelect",
      "NumericQuestion",
      "PracticeProblem",
      "QuickCheck",
    ]);
  });

  test("SOPHIE_FORMATIVE_CHILDREN is Hint + Solution", () => {
    expect([...SOPHIE_FORMATIVE_CHILDREN].sort()).toEqual(["Hint", "Solution"]);
  });

  test("every formative child is auto-imported; every formative parent is auto-imported OR a virtual tag", () => {
    // Children (`<Solution>` / `<Hint>`) are always real React islands.
    for (const name of SOPHIE_FORMATIVE_CHILDREN) {
      expect(SOPHIE_INTERACTIVE_COMPONENTS.has(name)).toBe(true);
    }
    // A formative parent is EITHER auto-imported here (React-rendered:
    // `<PracticeProblem>`, `<FillBlank>`, …) OR a virtual authoring tag
    // expanded by the compound-island transform (`<MCQ>`,
    // `<MultiSelect>`), which self-injects its controller instead. This
    // disjunction is the invariant that survives the whole
    // compound-island conversion.
    const VIRTUAL_PARENTS: ReadonlySet<string> = new Set([
      "MCQ",
      "MultiSelect",
    ]);
    for (const name of SOPHIE_FORMATIVE_PARENTS) {
      const autoImported = SOPHIE_INTERACTIVE_COMPONENTS.has(name);
      const virtual = VIRTUAL_PARENTS.has(name);
      expect(autoImported || virtual).toBe(true);
      // Exactly one strategy — never both (a virtual tag must not also
      // be auto-imported, or the transform's self-injected import would
      // duplicate this plugin's).
      expect(autoImported && virtual).toBe(false);
    }
  });

  test("every auto-imported interactive component resolves to a real @sophie/components barrel export", async () => {
    // Invariant true throughout the conversion: the plugin never names a
    // component the barrel doesn't export (a dangling auto-import would
    // be a build-time ERR_MODULE_NOT_FOUND in the consumer course). Read
    // the barrel's named exports and assert coverage.
    const barrel = await import("@sophie/components");
    for (const name of SOPHIE_INTERACTIVE_COMPONENTS) {
      expect(name in barrel).toBe(true);
    }
  });

  test("SOPHIE_INTERACTIVE_COMPONENTS and SOPHIE_CONTENT_AUTO_IMPORT are disjoint", () => {
    // A component is either hydration-bearing (interactive) or pure
    // content (no client:load) — never both. The plugin reads the
    // narrow interactive set to decide on `client:load` and the union
    // for auto-import; overlap would produce the wrong directive.
    for (const name of SOPHIE_CONTENT_AUTO_IMPORT) {
      expect(SOPHIE_INTERACTIVE_COMPONENTS.has(name)).toBe(false);
    }
  });

  test("SOPHIE_AUTO_IMPORTED_COMPONENTS is the union", () => {
    for (const name of SOPHIE_INTERACTIVE_COMPONENTS) {
      expect(SOPHIE_AUTO_IMPORTED_COMPONENTS.has(name)).toBe(true);
    }
    for (const name of SOPHIE_CONTENT_AUTO_IMPORT) {
      expect(SOPHIE_AUTO_IMPORTED_COMPONENTS.has(name)).toBe(true);
    }
    expect(SOPHIE_AUTO_IMPORTED_COMPONENTS.size).toBe(
      SOPHIE_INTERACTIVE_COMPONENTS.size + SOPHIE_CONTENT_AUTO_IMPORT.size
    );
  });

  test("SOPHIE_CONTENT_AUTO_IMPORT covers the biography children, Reasoning-OS primitives, layout primitives, and MultiRep slots", () => {
    // Biography children authored inside equation-registry MDX
    for (const name of [
      "Assumption",
      "BreaksWhen",
      "CommonMisuse",
      "DerivationStep",
    ]) {
      expect(SOPHIE_CONTENT_AUTO_IMPORT.has(name)).toBe(true);
    }
    // Reasoning-OS primitives
    for (const name of ["Intervention", "MultiRep", "Observable", "OMIFlow"]) {
      expect(SOPHIE_CONTENT_AUTO_IMPORT.has(name)).toBe(true);
    }
    // MultiRep slot children
    for (const name of ["RepEquation", "RepFigure", "RepVerbal"]) {
      expect(SOPHIE_CONTENT_AUTO_IMPORT.has(name)).toBe(true);
    }
    // Layout primitives + equation-registry inline metadata
    for (const name of ["Card", "Grid", "Units"]) {
      expect(SOPHIE_CONTENT_AUTO_IMPORT.has(name)).toBe(true);
    }
  });

  test("SOPHIE_INTERACTIVE_COMPONENTS includes the hydration-bearing figures and interactive primitives", () => {
    // Domain figure with hooks per ADR 0058 §M5
    expect(SOPHIE_INTERACTIVE_COMPONENTS.has("BlackbodyExplorer")).toBe(true);
    // Linked-parameter ADR 0059 primitives
    expect(SOPHIE_INTERACTIVE_COMPONENTS.has("ParameterCursor")).toBe(true);
    expect(SOPHIE_INTERACTIVE_COMPONENTS.has("ParameterSlider")).toBe(true);
    // Radix-backed tabs (needs hydration for tab switching)
    expect(SOPHIE_INTERACTIVE_COMPONENTS.has("Tab")).toBe(true);
    expect(SOPHIE_INTERACTIVE_COMPONENTS.has("Tabs")).toBe(true);
  });

  test("content-only components are auto-imported but NOT marked client:load", async () => {
    const tree = await applyPlugin(
      `<Card>
  <Assumption>$M_\\odot \\gg m$</Assumption>
</Card>`
    );
    // Auto-import covers both
    const imports = collectImports(tree);
    expect(imports).toHaveLength(1);
    expect(importSpecifiers(imports[0] as MdxjsEsmNode)).toEqual([
      "Assumption",
      "Card",
    ]);
    // No client:load on content-only components
    const card = findFirstJsxByName(tree, "Card");
    const assumption = findFirstJsxByName(tree, "Assumption");
    expect(getAttr(card as MdxJsxFlowElement, "client:load")).toBeUndefined();
    expect(
      getAttr(assumption as MdxJsxFlowElement, "client:load")
    ).toBeUndefined();
  });
});

describe("sophieAutoImportsRemarkPlugin — expression-valued parent attrs (I2)", () => {
  test("throws a distinct error when course is a JSX expression", async () => {
    await expect(
      applyPlugin(
        `<PracticeProblem course={courseSlug} unit="u" id="p">
  <Solution>sol</Solution>
</PracticeProblem>`,
        "/abs/path/practice.mdx"
      )
    ).rejects.toThrow(
      /declares.*course.*JSX expression.*static string literal/
    );
  });

  test("expression-valued error names all expression-valued attrs together", async () => {
    await expect(
      applyPlugin(
        `<PracticeProblem course={x} unit={y} id="p"><Solution>sol</Solution></PracticeProblem>`
      )
    ).rejects.toThrow(/declares `course`, `unit`/);
  });

  test("missing-attribute error stays separate from expression-valued error", async () => {
    // When one attr is expression and others are present strings,
    // expression case wins (more actionable diagnosis).
    await expect(
      applyPlugin(
        `<PracticeProblem course={x} unit="u" id="p"><Solution>sol</Solution></PracticeProblem>`
      )
    ).rejects.toThrow(/JSX expression/);
  });

  test("empty-string attr is treated as missing (M1)", async () => {
    await expect(
      applyPlugin(
        `<PracticeProblem course="" unit="u" id="p"><Solution>sol</Solution></PracticeProblem>`
      )
    ).rejects.toThrow(/missing required attribute.*course/);
  });
});

describe("sophieAutoImportsRemarkPlugin — top-down walk discipline (M2)", () => {
  test("three-level nested formative parents: innermost ctx wins for descendant <Solution>", async () => {
    // 3-level nesting MCQ > PracticeProblem > MultiSelect > Solution.
    // The Solution should get parentId="ms" (nearest), NOT "m" or "p".
    // Note: MCQ/MultiSelect components aren't shipped yet (PRs 5–9),
    // but the plugin treats them as formative parents by registry.
    const tree = await applyPlugin(
      `<MCQ course="a" unit="x" id="m">
  <PracticeProblem course="b" unit="x" id="p">
    <MultiSelect course="c" unit="x" id="ms">
      <Solution>nested</Solution>
    </MultiSelect>
  </PracticeProblem>
</MCQ>`
    );
    const solution = findFirstJsxByName(tree, "Solution");
    expect(getAttr(solution as MdxJsxFlowElement, "course")?.value).toBe("c");
    expect(getAttr(solution as MdxJsxFlowElement, "unit")?.value).toBe("x");
    expect(getAttr(solution as MdxJsxFlowElement, "parentId")?.value).toBe(
      "ms"
    );
  });

  test("sibling formative parents thread their own ctx independently", async () => {
    const tree = await applyPlugin(
      `<PracticeProblem course="ca" unit="u" id="a">
  <Solution>A</Solution>
</PracticeProblem>

<PracticeProblem course="cb" unit="u" id="b">
  <Solution>B</Solution>
</PracticeProblem>`
    );
    // Both Solutions should reflect their respective parent's ctx.
    const solutions: Array<MdxJsxFlowElement | MdxJsxTextElement> = [];
    const walk = (node: unknown): void => {
      if (!node || typeof node !== "object") return;
      const n = node as {
        type?: string;
        name?: string;
        children?: ReadonlyArray<unknown>;
      };
      if (
        (n.type === "mdxJsxFlowElement" || n.type === "mdxJsxTextElement") &&
        n.name === "Solution"
      ) {
        solutions.push(node as MdxJsxFlowElement | MdxJsxTextElement);
      }
      if (Array.isArray(n.children)) for (const c of n.children) walk(c);
    };
    walk(tree);
    expect(solutions).toHaveLength(2);
    const [first, second] = solutions;
    expect(getAttr(first as MdxJsxFlowElement, "parentId")?.value).toBe("a");
    expect(getAttr(second as MdxJsxFlowElement, "parentId")?.value).toBe("b");
  });
});

describe("sophieAutoImportsRemarkPlugin — inline JSX (M3)", () => {
  test("handles `mdxJsxTextElement` (inline-form JSX) for auto-import + client:load", async () => {
    // Inline-form: `<GlossaryTerm>` embedded in a sentence.
    const tree = await applyPlugin(
      `Some text <GlossaryTerm name="parallax">parallax</GlossaryTerm> more text.`
    );
    // Auto-import injected
    expect(collectImports(tree)).toHaveLength(1);
    expect(importSpecifiers(collectImports(tree)[0] as MdxjsEsmNode)).toEqual([
      "GlossaryTerm",
    ]);
    // client:load injected on the inline JSX too
    const node = findFirstJsxByName(tree, "GlossaryTerm");
    expect(node).not.toBeNull();
    expect(node?.type).toBe("mdxJsxTextElement");
    expect(getAttr(node as MdxJsxTextElement, "client:load")).toBeDefined();
  });

  test("threads parent props through to inline-form <Solution> nested inside a block-level formative parent", async () => {
    // Authoring this shape is unusual but the plugin should handle it
    // — the formative-child set is checked against `name`, not against
    // the JSX node variant (flow vs text).
    const tree = await applyPlugin(
      `<PracticeProblem course="astr201" unit="m1" id="inline-q">
A prompt with an inline <Solution>$T$ = 1 year</Solution> reveal.
</PracticeProblem>`
    );
    const solution = findFirstJsxByName(tree, "Solution");
    // The plugin doesn't constrain JSX variant — inline <Solution>
    // is parsed as mdxJsxTextElement here.
    expect(getAttr(solution as MdxJsxTextElement, "course")?.value).toBe(
      "astr201"
    );
    expect(getAttr(solution as MdxJsxTextElement, "parentId")?.value).toBe(
      "inline-q"
    );
  });
});

describe("sophieAutoImportsRemarkPlugin — error positions (S2)", () => {
  test("error message includes file:line position", async () => {
    await expect(
      applyPlugin(
        `# Heading

<PracticeProblem id="p"><Solution>sol</Solution></PracticeProblem>`,
        "/abs/path/practice.mdx"
      )
    ).rejects.toThrow(/\/abs\/path\/practice\.mdx:3/);
  });
});
