import type { PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

/**
 * Chapter-title collision audit.
 *
 * Surfaced 2026-05-20 verify pass: the smoke fixture had three
 * chapters whose titles all started with "Lecture 3:" — one in the
 * Foundations module ("Lecture 3: Misconceptions and Interventions")
 * and two in the Stars module ("Lecture 3: Spectra & Composition",
 * "Lecture 3: Stellar Evolution"). The sidebar listed them with the
 * same `Lecture 3:` prefix, making them visually indistinguishable
 * to a student scanning the nav.
 *
 * The collision is an authoring problem, not a code bug — but Sophie
 * can flag it so it's caught at audit time instead of by a confused
 * reader. Two invariants:
 *
 *   - **CT-1** (WARN, per-module): two or more chapter titles in the
 *     same module share the same `^Lecture N(?:\.\d+)?:` prefix.
 *     This is the original repro shape — two siblings called
 *     "Lecture 3" are unambiguously a collision.
 *
 *   - **CT-2** (WARN, course-wide): two or more chapters in the same
 *     course share the EXACT same lecture-number prefix across
 *     modules. Cross-module collisions are softer (a student can
 *     navigate by module) but still worth flagging — and they
 *     surfaced in the same pilot.
 *
 * `Lecture` is matched as the prefix because Sophie's astronomy
 * consumer (ASTR 201) uses that convention. If a future consumer
 * uses different prefixes (`Chapter`, `Topic`, `Week`), extend the
 * regex below — the pattern is intentionally narrow so it doesn't
 * mis-fire on free-form titles like "Spectra & Composition".
 */

const LECTURE_PREFIX_RE = /^(Lecture\s+\d+(?:\.\d+)?)\s*[:.—]/i;

interface IndexedChapter {
  slug: string;
  title: string;
  module: string;
}

function extractLecturePrefix(title: string): string | undefined {
  const match = title.match(LECTURE_PREFIX_RE);
  return match?.[1];
}

export function checkChapterTitleCollisions(
  index: PedagogyIndex,
  sink: FindingSink
): void {
  // Per-module collision (CT-1)
  const byModuleAndPrefix = new Map<string, IndexedChapter[]>();
  // Course-wide collision (CT-2)
  const byPrefix = new Map<string, IndexedChapter[]>();

  for (const ch of index.chapters) {
    const prefix = extractLecturePrefix(ch.title);
    if (!prefix) continue;
    const normalized = prefix.toLowerCase().replace(/\s+/g, " ");
    const moduleKey = `${ch.module}::${normalized}`;
    const moduleBucket = byModuleAndPrefix.get(moduleKey) ?? [];
    moduleBucket.push(ch);
    byModuleAndPrefix.set(moduleKey, moduleBucket);
    const prefixBucket = byPrefix.get(normalized) ?? [];
    prefixBucket.push(ch);
    byPrefix.set(normalized, prefixBucket);
  }

  for (const [key, bucket] of byModuleAndPrefix) {
    if (bucket.length < 2) continue;
    const [, prefix] = key.split("::");
    const moduleName = bucket[0]?.module ?? "(unknown)";
    const titles = bucket.map((c) => `"${c.title}"`).join(", ");
    sink.warnings.push({
      severity: "WARNING",
      code: "CT-1",
      message: `CT-1: module "${moduleName}" has ${bucket.length} chapters sharing the same "${prefix}" lecture-number prefix: ${titles}. Sidebar entries will be visually indistinguishable. Resolution: renumber one of the chapters so each module's chapter titles carry a unique lecture-number prefix.`,
      location: { chapter: bucket[0]?.slug ?? "(unknown)" },
    });
  }

  for (const [prefix, bucket] of byPrefix) {
    if (bucket.length < 2) continue;
    // Skip the per-module case — CT-1 already covers when collisions
    // are inside one module. CT-2 only fires when the collision spans
    // modules (i.e., the bucket has chapters from 2+ distinct modules).
    const modulesInBucket = new Set(bucket.map((c) => c.module));
    if (modulesInBucket.size < 2) continue;
    const titles = bucket
      .map((c) => `"${c.title}" (module: ${c.module})`)
      .join(", ");
    sink.warnings.push({
      severity: "WARNING",
      code: "CT-2",
      message: `CT-2: ${bucket.length} chapters across modules share the same "${prefix}" lecture-number prefix: ${titles}. Cross-module collisions weaken the lecture numbering's role as a unique reference handle. Resolution: align lecture numbers across modules (e.g., module 1 uses Lecture 1–3, module 2 uses Lecture 4–6) or drop the prefix from titles.`,
      location: { chapter: bucket[0]?.slug ?? "(unknown)" },
    });
  }
}
