import type { AuditFinding, ComponentContract } from "../../contract/types.ts";
import {
  type MiniGlossaryProps,
  MiniGlossaryPropsSchema,
} from "./MiniGlossary.schema.ts";
import { MiniGlossary } from "./MiniGlossary.tsx";
import { slugifyTerm } from "./slugifyTerm.ts";

// MiniGlossary is content-only. There's no per-instance state to
// serialize; `state` is `null`. Mirrors KeyEquation/Figure shape.
export const miniGlossaryContract: ComponentContract<MiniGlossaryProps, null> =
  {
    Component: MiniGlossary,
    schema: MiniGlossaryPropsSchema,
    serialize: (props) => ({
      type: "mini-glossary",
      props,
      state: null,
    }),
    // slugifyTerm dedupes collisions with a -2/-3 suffix, so render
    // is safe. But colliding terms produce surprising anchor URLs
    // (`#mg-term-wavelength` and `#mg-term-wavelength-2` rather than
    // descriptive distinguishers). Surface a warning so the author
    // can rename the second term or accept the suffix knowingly.
    audit: (props): AuditFinding[] => {
      const findings: AuditFinding[] = [];
      const collisions = new Map<string, string[]>();
      const seen = new Map<string, number>();
      for (const { term } of props.terms) {
        // Compute base slug WITHOUT advancing the dedupe Map so we can
        // detect raw collisions. The slug-dedupe is what production
        // uses; the audit looks at the pre-dedupe shape.
        const probe = new Map<string, number>();
        const base = slugifyTerm(term, probe);
        if (seen.has(base)) {
          const existing = collisions.get(base) ?? [];
          if (existing.length === 0) {
            // First time we detect the collision — include the
            // original term as well.
            const original = props.terms.find(
              (t) => slugifyTerm(t.term, new Map()) === base
            );
            if (original !== undefined) existing.push(original.term);
          }
          existing.push(term);
          collisions.set(base, existing);
        }
        seen.set(base, (seen.get(base) ?? 0) + 1);
      }
      for (const [base, terms] of collisions) {
        findings.push({
          severity: "warning",
          message: `Term slug collision on "${base}": ${terms.map((t) => `"${t}"`).join(", ")}. Dedupe will suffix later occurrences with -2/-3, producing anchor URLs like #${props.id}-term-${base}-2.`,
        });
      }
      return findings;
    },
    containedIn: ["chapter", "section"],
    forbidsContaining: [],
  };
