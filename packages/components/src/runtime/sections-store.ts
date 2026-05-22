import type { SectionEntry } from "@sophie/core/schema";
import { createPedagogyStore } from "./pedagogy-store.ts";

/**
 * Sections store. Per ADR 0067 (Section / Subsection / Unit / Artifact)
 * + Wedge B-followup design doc D1: consumer-app-owned data forwarded
 * from `getCollection('sections')` by `<TextbookLayout>`, surfaced via
 * the shared `createPedagogyStore<T>` factory.
 *
 * Used by `<SpacedReview section="…">` to look up a Section's `order`
 * and other metadata; future consumers (`<SectionRef>`, Library room,
 * Cockpit per ADR 0076) read it the same way.
 *
 * Lives in `runtime/` rather than under a specific component because
 * Sections are platform-wide content metadata, not tied to a single
 * consumer. When a `<SectionRef>` component lands, it imports from
 * here.
 *
 * Script-tag id: `sophie-pedagogy-sections` — joins the family of
 * `sophie-pedagogy-*` ids established by earlier stores.
 */

export const sectionStore = createPedagogyStore<SectionEntry>({
  scriptId: "sophie-pedagogy-sections",
  logTag: "[sections]",
  keyOf: (s) => s.slug,
});

export const __setSections = sectionStore.set;
