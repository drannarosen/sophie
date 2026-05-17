// Ambient module declaration for CSS Modules companion shims.
//
// Source files import the build-output shim (`./Foo.module.css.js`)
// rather than the raw `.module.css` so tsup can treat the shim as a
// regular JS import. At test time, vitest's resolver alias rewrites
// the shim path back to the raw `.module.css` for native CSS Modules
// support. Mirrors `packages/components/src/css-modules.d.ts`.

declare module "*.module.css.js" {
  const styles: Record<string, string>;
  export default styles;
}
