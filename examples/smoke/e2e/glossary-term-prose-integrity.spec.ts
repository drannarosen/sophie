import { expect, test } from "@playwright/test";

/**
 * Bug 1 regression test (2026-05-20 verify pass): a `<GlossaryTerm>`
 * paired with an inline `<Aside kind="definition" title="X">` in the
 * same chapter must not split the surrounding prose paragraph.
 *
 * Root cause was that GlossaryTerm.tsx rendered the definition body
 * (which starts `<p>...</p>`) via dangerouslySetInnerHTML into an
 * inline `<span>` — and HTML5's parser hoists the inner `<p>` out
 * of the parent paragraph, splitting the chapter sentence across
 * multiple top-level paragraphs. `stripWrappingParagraph` in
 * GlossaryTerm.tsx unwraps the outer `<p>` before injection. This
 * test pins the contract end-to-end through SSR + browser parsing.
 *
 * The pilot chapter (spectra-and-composition) has 22 first-use
 * GlossaryTerm callsites with matching `<Aside kind="definition">`
 * bodies — the densest pattern that surfaced the bug originally.
 */

const CHAPTER_URL = "/units/spectra-and-composition/reading";

test.describe("Bug 1 — GlossaryTerm prose integrity", () => {
  test("no chapter paragraph ends with a GlossaryTerm link followed by a sibling paragraph of definition body", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const stats = await page.evaluate(() => {
      // A "suspect" paragraph is one where:
      //   1. The paragraph contains a GlossaryTerm trigger anchor.
      //   2. The paragraph's text ENDS at the trigger's text (the
      //      sentence has been truncated mid-thought).
      //   3. The very next sibling is also a <p> containing the
      //      definition body that was supposed to be inline-hidden.
      // Allow legitimate end-of-sentence usage where the term IS
      // the last word of a complete sentence — in that case the
      // next sibling won't be a stranded definition body.
      const triggers = Array.from(
        document.querySelectorAll(".sophie-content a[class*='trigger']")
      );
      const suspects: Array<{ term: string; next: string }> = [];
      for (const a of triggers) {
        const p = a.closest("p");
        if (!p) continue;
        const text = (p.textContent || "").trim();
        const term = (a.textContent || "").trim();
        if (!text.endsWith(term)) continue;
        const next = p.nextElementSibling;
        if (next?.tagName !== "P") continue;
        const nextText = (next.textContent || "").trim();
        // A stranded definition body is non-empty and starts mid-
        // sentence (capital letter / sentence form). Bail when the
        // next paragraph is the start of a new authored paragraph
        // — they'd happen anyway. Heuristic: the original bug ALWAYS
        // produced a non-empty next-P, so any non-empty `nextText`
        // is suspicious. The known-good count for the pilot chapter
        // is zero or one (one term legitimately ending a paragraph
        // before a new prose paragraph).
        if (nextText.length > 0) {
          suspects.push({ term, next: nextText.slice(0, 80) });
        }
      }
      return { triggerCount: triggers.length, suspects };
    });
    // The pilot chapter has 22+ GlossaryTerm callsites; before the
    // fix 18 paragraphs were split. After the fix the only acceptable
    // suspect is the rare legitimate "term is last word of paragraph"
    // case followed by an authored sibling paragraph. Hard cap at 2
    // to leave room for one or two such edge cases without going
    // brittle on copy edits, while still catching the structural bug
    // (which produced 18 suspects).
    expect(stats.suspects.length).toBeLessThanOrEqual(2);
    expect(stats.triggerCount).toBeGreaterThan(10);
  });

  test("first-use footnote span does not contain a <p> tag", async ({
    page,
  }) => {
    // The fix is `stripWrappingParagraph`, which removes the outer
    // <p>...</p> from the definition body before injecting it into
    // the inline footnote span. If a regression re-introduces the
    // wrapping <p>, the browser's HTML5 parser will hoist it out of
    // the parent paragraph — but it also leaves the span EMPTY
    // (because the <p> is hoisted, and the surrounding text is the
    // only remaining content). Test the inverse: a populated, p-free
    // footnote span proves the fix is in place.
    await page.goto(CHAPTER_URL);
    const stats = await page.evaluate(() => {
      const fns = Array.from(
        document.querySelectorAll(".sophie-glossary-footnote")
      );
      const totalFootnotes = fns.length;
      const populated = fns.filter((s) => s.innerHTML.trim().length > 0);
      const containsBlock = populated.filter((s) =>
        /<(p|div|section|article|figure)[\s>]/i.test(s.innerHTML)
      );
      return {
        totalFootnotes,
        populatedFootnotes: populated.length,
        footnotesWithBlockTag: containsBlock.length,
      };
    });
    // Footnotes exist for every first-use term and carry definition
    // text inline; none contain block-level tags.
    expect(stats.totalFootnotes).toBeGreaterThan(10);
    expect(stats.populatedFootnotes).toBeGreaterThanOrEqual(
      stats.totalFootnotes - 1
    );
    expect(stats.footnotesWithBlockTag).toBe(0);
  });
});
