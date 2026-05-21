/**
 * Uniform icon export surface for `@sophie/astro` chrome.
 *
 * Two adapters serve the platform per the icon strategy resolved
 * during PR 5 planning (and codified by the future ADR 0037):
 *
 *   - This file (`@sophie/astro/icons`) — SVG strings imported from
 *     `lucide-static` and bespoke icons co-located beside them.
 *     Consumed by Astro chrome primitives via
 *     `<Fragment set:html={IconName} />`. No React; aligns with
 *     ADR 0032.
 *
 *   - `@sophie/components` will adopt `lucide-react` in a follow-up
 *     refactor PR. Same Lucide icon vocabulary, different runtime.
 *
 * Consumers import from this barrel ONLY — never from
 * `./view-mode` or directly from `lucide-static`. The wrapper
 * gives us a single place to swap adapters, override an individual
 * icon, or add aliasing.
 */

// Re-exports from lucide-static. Add icons here as new chrome
// primitives need them (e.g. PR 7 search will add `Search`).
export {
  ChevronsDownUp,
  ChevronsUpDown,
  List,
  Menu,
  Moon,
  Sun,
  SunMoon,
  X,
} from "lucide-static";

// Bespoke icons that have no clean Lucide equivalent.
export { ViewModeDefault, ViewModeFocused, ViewModeWide } from "./view-mode";
