/**
 * Bespoke view-mode icons.
 *
 * Lucide doesn't ship icons that match the "three-column /
 * narrow-centered-panel / wide-centered-panel" semantic the
 * `<ViewModeToggle>` needs, so these are hand-drawn.
 *
 * Designed to match Lucide's stroke convention (24×24 viewBox,
 * stroke-width 2, stroke="currentColor", fill="none", round
 * line caps + joins) so that when these sit next to re-exported
 * Lucide icons in the toolbar there's no visual discontinuity.
 *
 * The icons are exported as SVG strings (the same shape as
 * `lucide-static`'s exports) so consumers use the same
 * `<Fragment set:html={...} />` pattern regardless of source.
 *
 * Vertical extent is locked to y=4 .. y=20 (height 16) across
 * all three so the icons feel like a family; horizontal shape
 * carries the semantic.
 */

/**
 * Default mode: outer frame with two interior dividers — the
 * three-column layout (sidebar + content + right). Same shape as
 * Lucide's `Columns3` but kept bespoke for parallel naming with
 * `ViewModeFocused` + `ViewModeWide`.
 */
export const ViewModeDefault =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sophie-icon sophie-icon--view-mode-default"><rect width="18" height="16" x="3" y="4" rx="2"/><path d="M9 4v16"/><path d="M15 4v16"/></svg>';

/**
 * Focused mode: a single narrow centered panel. No outer frame —
 * the chrome is gone, only content remains.
 */
export const ViewModeFocused =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sophie-icon sophie-icon--view-mode-focused"><rect width="6" height="16" x="9" y="4" rx="1.5"/></svg>';

/**
 * Wide mode: a single wider centered panel. Same composition as
 * Focused, scaled out — content fills more of the viewport.
 */
export const ViewModeWide =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sophie-icon sophie-icon--view-mode-wide"><rect width="14" height="16" x="5" y="4" rx="1.5"/></svg>';
