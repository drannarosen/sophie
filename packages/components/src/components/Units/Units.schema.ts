import { NonEmptyString } from "@sophie/core/schema";
import { z } from "zod";

/**
 * Component-side props schema for `<Units>` per ADR 0046 + 2026-05-17
 * design hardening §D1. NO `epistemicRole` const — `<Units>` is
 * descriptive metadata per ADR 0058 §"components that don't fit any
 * role are likely chrome." The symbol/unit pair grounds the equation's
 * notation against the registry (PR-δ NR-prefix audits), but the entry
 * itself encodes no inference, model, or assumption.
 *
 * Authoring shape (self-closing, one entry per symbol; registry MDX body
 * per ADR 0060):
 *
 * ```mdx
 * ---
 * id: wiens-law
 * title: "Wien's Law"
 * tex: "\\lambda_{peak} = b \\, T^{-1}"
 * symbols: ["T", "\\lambda_{peak}"]
 * ...
 * ---
 *
 * <Units symbol="T" unit="K" />
 * <Units symbol="\\lambda_{peak}" unit="cm" />
 * ```
 *
 * Note: per ADR 0046 §R10, unit information is preferentially resolved
 * from the notation registry by symbol; per-equation `<Units>` children
 * are now optional, used only when the notation registry doesn't cover
 * a symbol.
 *
 * `symbol` is TeX-form (e.g., `\lambda_{peak}`) — not slug, not unit.
 * `unit` is a unit string in any standard form (e.g., `K`, `cm`,
 * `erg s^-1 cm^-2`) — not slug because of mixed case and spaces.
 */
export const UnitsPropsSchema = z.object({
  symbol: NonEmptyString,
  unit: NonEmptyString,
});

export type UnitsProps = z.infer<typeof UnitsPropsSchema>;
