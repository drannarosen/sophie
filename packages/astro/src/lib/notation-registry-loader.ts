import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type NotationRegistry,
  NotationRegistrySchema,
} from "@sophie/core/schema";
import { parse as parseYaml } from "yaml";

/**
 * Notation Registry loader per ADR 0043 + 2026-05-17 design hardening §D7.
 *
 * Layered API:
 * - `parsePedagogyContract(text)` — pure: detects opt-in from contract YAML.
 * - `parseNotationRegistry(text)` — pure: parses + validates registry YAML.
 * - `loadConsumerRegistry(root)` — IO wrapper used by the audit pass.
 *
 * Per ADR 0042 the contract's `math_and_units_standards.notation_registry`
 * field is the opt-in seam: when absent or empty, the audit skips all
 * NR/MR invariants for that consumer repo (Sophie-Compose creative-
 * writing courses, COMP 521 prerequisite drills, etc. don't carry a
 * registry).
 */

export interface PedagogyContractResult {
  /**
   * `true` when the contract declares
   * `math_and_units_standards.notation_registry` with a non-empty
   * course slug. Audit invariants NR/MR fire only when this is `true`.
   */
  optedIn: boolean;
}

export interface ConsumerRegistryResult {
  /** The parsed registry, or `null` when the consumer hasn't opted in. */
  registry: NotationRegistry | null;
  /** Whether the contract's `notation_registry` field is set. */
  optedIn: boolean;
  /** Whether `pedagogy-contract.yaml` was found at the consumer root. */
  contractFound: boolean;
}

export function parsePedagogyContract(text: string): PedagogyContractResult {
  const parsed = parseYaml(text);
  if (parsed === null || typeof parsed !== "object") {
    return { optedIn: false };
  }
  const contract = parsed as Record<string, unknown>;
  const mathStandards = contract.math_and_units_standards;
  if (!mathStandards || typeof mathStandards !== "object") {
    return { optedIn: false };
  }
  const registryField = (mathStandards as Record<string, unknown>)
    .notation_registry;
  const optedIn = typeof registryField === "string" && registryField.length > 0;
  return { optedIn };
}

export function parseNotationRegistry(text: string): NotationRegistry {
  const parsed = parseYaml(text);
  // NotationRegistrySchema.parse throws on validation failure with a
  // ZodError; the audit's caller surfaces the message verbatim. Letting
  // the throw propagate (vs returning Result<...>) matches the "fail
  // loud at build time" cadence the rest of the audit pass uses.
  return NotationRegistrySchema.parse(parsed);
}

/**
 * Module-level cache (PR-ε): deduplicates file IO across the multiple
 * consumers that call `loadConsumerRegistry` in a single Astro build.
 * In-MDX `<ChapterMultiReps>` evaluates BEFORE its enclosing
 * `<TextbookLayout>` frontmatter (Astro's children-before-parent
 * evaluation order), so we can't share registry state via the
 * accumulator — every consumer that needs the registry calls this
 * loader directly. The cache makes the second-through-Nth call a
 * map lookup.
 *
 * Keyed by `consumerRoot` so test cases that exercise multiple
 * roots don't share state across that parameter boundary. Production
 * builds always pass the same `process.cwd()`, so the cache hits
 * after the first call within a build. Test-only reset via
 * `__resetConsumerRegistryCacheForTesting()`.
 */
const consumerRegistryCache = new Map<string, ConsumerRegistryResult>();

export function __resetConsumerRegistryCacheForTesting(): void {
  consumerRegistryCache.clear();
}

export function loadConsumerRegistry(
  consumerRoot: string
): ConsumerRegistryResult {
  const cached = consumerRegistryCache.get(consumerRoot);
  if (cached !== undefined) return cached;

  const contractPath = join(consumerRoot, "pedagogy-contract.yaml");
  const registryPath = join(consumerRoot, "notation-registry.yaml");

  const result = computeConsumerRegistry(contractPath, registryPath);
  consumerRegistryCache.set(consumerRoot, result);
  return result;
}

function computeConsumerRegistry(
  contractPath: string,
  registryPath: string
): ConsumerRegistryResult {
  if (!existsSync(contractPath)) {
    return { registry: null, optedIn: false, contractFound: false };
  }

  const contractText = readFileSync(contractPath, "utf8");
  const { optedIn } = parsePedagogyContract(contractText);

  if (!optedIn) {
    return { registry: null, optedIn: false, contractFound: true };
  }

  if (!existsSync(registryPath)) {
    throw new Error(
      `pedagogy-contract.yaml opts into the Notation Registry but notation-registry.yaml is missing at ${registryPath}. Resolution: create the registry file (per docs/website/reference/notation-registry-schema.md) or remove the math_and_units_standards.notation_registry opt-in.`
    );
  }

  const registryText = readFileSync(registryPath, "utf8");
  const registry = parseNotationRegistry(registryText);

  return { registry, optedIn: true, contractFound: true };
}
