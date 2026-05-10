import type { ComponentContract } from "./types.ts";

/**
 * @internal — registry shape used by `@sophie/astro` to wire components
 * into MDX rendering. Not yet stable; subject to change in Phase 1.
 */
const registry = new Map<string, ComponentContract<unknown, unknown>>();

export function registerComponent<TProps, TState = void>(
  name: string,
  contract: ComponentContract<TProps, TState>
): void {
  registry.set(name, contract as ComponentContract<unknown, unknown>);
}

export function getRegistered(
  name: string
): ComponentContract<unknown, unknown> | undefined {
  return registry.get(name);
}

export function listRegistered(): readonly string[] {
  return Array.from(registry.keys());
}
