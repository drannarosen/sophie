import { beforeEach, describe, expect, test, vi } from "vitest";
import { indexAccumulator } from "./pedagogy-index-extractor.ts";
import {
  PEDAGOGY_INDEX_VIRTUAL_ID,
  pedagogyIndexVirtualModule,
} from "./pedagogy-index-virtual-module.ts";

/**
 * The Vite virtual module resolves
 * `virtual:sophie/pedagogy-index` to a JS source string that
 * exports the current accumulator state. Consumers
 * (<ChapterGlossary />, <CourseGlossary />, <GlossaryTerm>)
 * import from this module synchronously; Astro's content-
 * collection eager parsing guarantees the accumulator is
 * populated by the time any consumer renders.
 */

const RESOLVED_ID = `\0${PEDAGOGY_INDEX_VIRTUAL_ID}`;

beforeEach(() => {
  // Reset the accumulator between tests (it's a module singleton).
  indexAccumulator.clearChapter("test-ch-a");
  indexAccumulator.clearChapter("test-ch-b");
});

describe("pedagogyIndexVirtualModule — resolveId", () => {
  test("resolves the public virtual id to the canonical internal id", () => {
    const plugin = pedagogyIndexVirtualModule();
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId(PEDAGOGY_INDEX_VIRTUAL_ID)).toBe(RESOLVED_ID);
  });

  test("returns undefined for unrelated ids", () => {
    const plugin = pedagogyIndexVirtualModule();
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId("react")).toBeUndefined();
    expect(resolveId("./local-file.ts")).toBeUndefined();
  });
});

describe("pedagogyIndexVirtualModule — load", () => {
  test("emits valid JS source for an empty accumulator", () => {
    const plugin = pedagogyIndexVirtualModule();
    const load = plugin.load as (id: string) => string | undefined;
    const src = load(RESOLVED_ID);

    expect(src).toBeDefined();
    expect(src).toContain("export const definitions");
    expect(src).toContain("export const equations");
    expect(src).toContain("export const keyInsights");
    expect(src).toContain("export const figureRegistry");
    expect(src).toContain("export const figureUsages");
    expect(src).toContain("export const misconceptions");
  });

  test("emitted source serializes a populated definitions array", () => {
    indexAccumulator.addDefinitions([
      {
        term: "Parallax",
        slug: "parallax",
        body: "<p>shift</p>",
        chapter: "test-ch-a",
        anchor: "parallax",
      },
    ]);

    const plugin = pedagogyIndexVirtualModule();
    const load = plugin.load as (id: string) => string | undefined;
    const src = load(RESOLVED_ID);

    expect(src).toBeDefined();
    expect(src).toContain('"term":"Parallax"');
    expect(src).toContain('"slug":"parallax"');
    expect(src).toContain('"chapter":"test-ch-a"');
  });

  test("ignores load() calls for unrelated ids", () => {
    const plugin = pedagogyIndexVirtualModule();
    const load = plugin.load as (id: string) => string | undefined;
    expect(load("not-the-virtual-id")).toBeUndefined();
  });
});

describe("pedagogyIndexVirtualModule — handleHotUpdate", () => {
  test("invalidates the virtual module when an .mdx file changes", () => {
    const plugin = pedagogyIndexVirtualModule();
    const handleHotUpdate = plugin.handleHotUpdate as (ctx: {
      file: string;
      server: {
        moduleGraph: {
          getModuleById: (id: string) => unknown;
          invalidateModule: (mod: unknown) => void;
        };
      };
    }) => void;

    const mockModule = { id: RESOLVED_ID };
    const invalidateModule = vi.fn();
    handleHotUpdate({
      file: "/path/to/chapter.mdx",
      server: {
        moduleGraph: {
          getModuleById: vi.fn().mockReturnValue(mockModule),
          invalidateModule,
        },
      },
    });

    expect(invalidateModule).toHaveBeenCalledWith(mockModule);
  });

  test("does not invalidate for non-.mdx file changes", () => {
    const plugin = pedagogyIndexVirtualModule();
    const handleHotUpdate = plugin.handleHotUpdate as (ctx: {
      file: string;
      server: {
        moduleGraph: {
          getModuleById: (id: string) => unknown;
          invalidateModule: (mod: unknown) => void;
        };
      };
    }) => void;

    const invalidateModule = vi.fn();
    handleHotUpdate({
      file: "/path/to/component.tsx",
      server: {
        moduleGraph: {
          getModuleById: vi.fn(),
          invalidateModule,
        },
      },
    });

    expect(invalidateModule).not.toHaveBeenCalled();
  });

  test("is resilient when the virtual module isn't in the graph yet", () => {
    const plugin = pedagogyIndexVirtualModule();
    const handleHotUpdate = plugin.handleHotUpdate as (ctx: {
      file: string;
      server: {
        moduleGraph: {
          getModuleById: (id: string) => unknown;
          invalidateModule: (mod: unknown) => void;
        };
      };
    }) => void;

    const invalidateModule = vi.fn();
    // No module in the graph yet (consumer never imported it).
    expect(() =>
      handleHotUpdate({
        file: "/path/to/chapter.mdx",
        server: {
          moduleGraph: {
            getModuleById: vi.fn().mockReturnValue(undefined),
            invalidateModule,
          },
        },
      })
    ).not.toThrow();
    expect(invalidateModule).not.toHaveBeenCalled();
  });
});
