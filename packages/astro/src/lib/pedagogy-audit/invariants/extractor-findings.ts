import type { PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

/**
 * Extractor-layer audit findings passthrough (V0 + V8) per ADR 0056 PR 3.
 *
 * The contract-validations extractor (`validation/extractor.ts`) reads
 * each ADR / reference doc's raw frontmatter; it emits V0 (schema parse
 * failure, ERROR) when `ValidationSchema.safeParse` fails, and V8
 * (unknown key, INFO) when a key falls outside `KNOWN_VALIDATION_KEYS`.
 * Those findings ride on `PedagogyIndex.extractorFindings` and merge
 * into the audit report here so all validation-tracker findings surface
 * in one place.
 *
 * V0 + V8 live at the extractor layer (not in V1–V7's audit-layer
 * invariants) because they need raw `Record<string, unknown>` access to
 * detect schema rejection and stripped keys before the schema-parse
 * coerces inputs into the typed `Validation` shape.
 */
export function passthroughExtractorFindings(
  index: PedagogyIndex,
  sink: FindingSink
): void {
  for (const finding of index.extractorFindings) {
    if (finding.severity === "ERROR") {
      sink.errors.push(finding);
    } else if (finding.severity === "WARNING") {
      sink.warnings.push(finding);
    } else {
      sink.info.push(finding);
    }
  }
}
