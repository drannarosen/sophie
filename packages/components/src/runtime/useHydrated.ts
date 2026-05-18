import { useEffect, useState } from "react";

/**
 * Returns `true` once the component has mounted on the client.
 *
 * Use as a gate for "React is interactive" signals consumed by e2e
 * tests via `data-react-hydrated="true"`. On the SSR pass and the
 * initial client render `useHydrated()` returns `false`; after
 * `useEffect` fires it flips to `true` and stays there for the
 * lifetime of the component.
 *
 * Background (followup #10, PR-C3 closeout audit): Radix HoverCard
 * consumers (`<GlossaryTerm>`, `<EquationRef>`, `<FigureRef>`) were ~33%
 * flaky in full-suite Playwright runs. Specs waited on
 * `page.waitForLoadState("networkidle")` before hovering, but
 * `networkidle` is a network-level signal — it fires before React
 * hydration completes on `client:visible` islands when assets are
 * cached (full-suite, reused browser context). The hover handler is
 * registered on the DOM but Radix's controlled-state machine is not
 * yet listening, so the popover never opens.
 *
 * Wiring pattern at the consumer:
 *
 *   const hydrated = useHydrated();
 *   return (
 *     <HoverCard.Root>
 *       <HoverCard.Trigger asChild>
 *         <a data-react-hydrated={hydrated ? "true" : undefined}>...</a>
 *       </HoverCard.Trigger>
 *       ...
 *     </HoverCard.Root>
 *   );
 *
 * `undefined` means "no attribute" (React drops it from the output),
 * so the SSR HTML doesn't carry `data-react-hydrated=""`. Only the
 * hydrated runtime sets `data-react-hydrated="true"`, and Playwright
 * waits on that exact value before hovering.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
