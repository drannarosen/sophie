import { joinBase } from "@sophie/core/runtime";

/**
 * Prefix an author-written absolute path with the consumer's Astro
 * `base`. `import.meta.env.BASE_URL` is Vite's canonical base token,
 * replaced at the consumer's build time (`"/"` at root, `"/astr201/"`
 * under a non-root base). Astro does not auto-prefix `<a href>` /
 * asset URLs, so every internal link emitted by `@sophie/astro`
 * chrome must pass through here. See `@sophie/core/runtime`'s
 * `joinBase` for the join semantics.
 */
export function withBase(path: string): string {
  return joinBase(import.meta.env.BASE_URL, path);
}
