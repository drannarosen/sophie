import { describe, expect, it } from "vitest";
import { deriveAsideAnchor } from "./aside-anchor.ts";

/**
 * `deriveAsideAnchor` is the single source of truth for the
 * renderer-extractor anchor agreement (P1 unified-anchor PR).
 *
 * The precedence chain, derived from the extractors at
 * `packages/astro/src/lib/pedagogy-index/extractors/{key-insights,misconceptions}.ts`:
 *
 *   explicit `id` > kind-specific identifier (`name` for misconception)
 *   > slug(title) > caller-supplied fallback (extractor only)
 *
 * Same logic in both renderer (Aside.tsx) and extractors. No drift
 * possible because there's one function.
 */
describe("deriveAsideAnchor", () => {
  describe("explicit id wins", () => {
    it("returns slugified explicit id for definition", () => {
      expect(
        deriveAsideAnchor({
          kind: "definition",
          id: "Custom ID",
          title: "Photon",
        })
      ).toBe("custom-id");
    });

    it("returns slugified explicit id for misconception (overrides name)", () => {
      expect(
        deriveAsideAnchor({
          kind: "misconception",
          id: "explicit-anchor",
          name: "graph-id-here",
          title: "A common confusion",
        })
      ).toBe("explicit-anchor");
    });

    it("returns slugified explicit id for key-insight", () => {
      expect(
        deriveAsideAnchor({
          kind: "key-insight",
          id: "MY-INSIGHT",
          title: "Color is physics",
        })
      ).toBe("my-insight");
    });
  });

  describe("name (misconception graph identifier per ADR 0044)", () => {
    it("uses name over title for misconception", () => {
      expect(
        deriveAsideAnchor({
          kind: "misconception",
          name: "brighter-equals-intrinsically-brighter",
          title: "A common confusion about brightness",
        })
      ).toBe("brighter-equals-intrinsically-brighter");
    });

    it("ignores name for non-misconception kinds", () => {
      expect(
        deriveAsideAnchor({
          kind: "key-insight",
          name: "ignored",
          title: "Real Title",
        })
      ).toBe("real-title");
      expect(
        deriveAsideAnchor({
          kind: "definition",
          name: "ignored",
          title: "Photon",
        })
      ).toBe("photon");
    });
  });

  describe("title fallback", () => {
    it("slugifies title for definition", () => {
      expect(deriveAsideAnchor({ kind: "definition", title: "Photon" })).toBe(
        "photon"
      );
    });

    it("slugifies title for key-insight", () => {
      expect(
        deriveAsideAnchor({
          kind: "key-insight",
          title: "Color is encoded physics",
        })
      ).toBe("color-is-encoded-physics");
    });

    it("slugifies title for misconception with no name", () => {
      expect(
        deriveAsideAnchor({
          kind: "misconception",
          title: "A common confusion",
        })
      ).toBe("a-common-confusion");
    });

    it("slugifies title for note", () => {
      expect(
        deriveAsideAnchor({ kind: "note", title: "Aside about photons" })
      ).toBe("aside-about-photons");
    });
  });

  describe("caller-supplied fallback (extractor path)", () => {
    it("returns fallback when no id, name, or title (key-insight extractor)", () => {
      expect(deriveAsideAnchor({ kind: "key-insight", fallback: "ki-3" })).toBe(
        "ki-3"
      );
    });

    it("returns fallback when no id, name, or title (misconception extractor)", () => {
      expect(
        deriveAsideAnchor({ kind: "misconception", fallback: "misc-7" })
      ).toBe("misc-7");
    });

    it("returns undefined when no fallback and no derivable anchor (renderer path)", () => {
      expect(deriveAsideAnchor({ kind: "key-insight" })).toBeUndefined();
      expect(deriveAsideAnchor({ kind: "note" })).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("treats whitespace-only fields as absent", () => {
      expect(
        deriveAsideAnchor({
          kind: "definition",
          id: "   ",
          title: "Real Title",
        })
      ).toBe("real-title");
      expect(
        deriveAsideAnchor({
          kind: "misconception",
          name: "  \t  ",
          title: "Real Title",
        })
      ).toBe("real-title");
    });

    it("returns undefined for empty inputs with no fallback", () => {
      expect(
        deriveAsideAnchor({
          kind: "key-insight",
          id: "",
          name: "",
          title: "",
        })
      ).toBeUndefined();
    });
  });
});
