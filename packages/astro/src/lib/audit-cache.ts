/**
 * One-shot audit cache for `runPedagogyAudit` calls from
 * `TextbookLayout.astro` (I6 from comprehensive review).
 *
 * The audit's inputs are deterministic across the lifetime of a single
 * Astro build (one-shot Node process producing N static pages → audit
 * input is identical across page renders). In dev mode the long-running
 * Node process retains state across HMR reloads, so we re-run on every
 * render to keep audit feedback fresh as the author edits content.
 *
 * The cache decision splits cleanly:
 *
 *   - Production build (`import.meta.env.PROD === true`): cache after
 *     first call; subsequent calls within the same process return
 *     `null` so the caller knows the audit already ran (and printed
 *     its report) on an earlier page.
 *   - Dev (`import.meta.env.PROD === false`): always re-run.
 *
 * Lifted from `TextbookLayout.astro`'s inline cache so the inverted-
 * condition logic gets a named helper + a colocated comment, and tests
 * can exercise the cache decision without going through the .astro
 * component.
 */
import type { PedagogyIndex } from "@sophie/core/schema";
import {
  type AuditExtras,
  type AuditReport,
  auditExitCode,
  formatAuditReport,
  runPedagogyAudit,
} from "./pedagogy-audit.ts";

interface CacheSlot {
  __sophiePedagogyAuditDone?: boolean;
}

const CACHE_KEY = "__sophiePedagogyAuditDone" as const;

/**
 * Run the pedagogy audit ONCE per Node process in production, EVERY call
 * in dev. Returns the report on the call that actually executed, and
 * `null` on subsequent cached calls (production only).
 *
 * Callers handle the `null` return as "audit already ran this build;
 * don't re-print, don't re-fail." Callers also decide what to do when
 * a real report comes back — typically `console.log(formatAuditReport(...))`
 * + throw if `auditExitCode !== 0`.
 *
 * @param isProd  Pass `import.meta.env.PROD` from the caller (the
 *                .astro component's frontmatter). Wired this way so the
 *                helper has zero Astro-specific imports and stays
 *                unit-testable.
 */
export function runAuditOncePerProcess(
  index: PedagogyIndex,
  extras: AuditExtras,
  isProd: boolean
): AuditReport | null {
  const cache = globalThis as unknown as CacheSlot;
  // Inverted-condition matrix:
  //   dev (!isProd):       always re-run; cache state ignored.
  //   prod + uncached:     run, then mark cached.
  //   prod + cached:       return null (the caller already saw the report).
  if (isProd && cache[CACHE_KEY] === true) {
    return null;
  }
  const report = runPedagogyAudit(index, extras);
  if (isProd) {
    cache[CACHE_KEY] = true;
  }
  return report;
}

/**
 * Reset the cache slot. Test-only — production never resets.
 */
export function __resetAuditCacheForTesting(): void {
  const cache = globalThis as unknown as CacheSlot;
  delete cache[CACHE_KEY];
}

/** Re-export the helpers callers usually want alongside the cached runner. */
export { auditExitCode, formatAuditReport };
