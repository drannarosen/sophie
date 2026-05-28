import { useEffect } from "react";
import type { TabsControllerProps } from "./TabsController.schema.ts";

// Styling note (ADR 0005): the transform-emitted Tabs markup carries no
// CSS-Module class names — it never reaches React — so its `:global`
// rules live in `Tabs/Tabs.module.css`, which ships via the shared
// `dist/styles.css` bundle (see MCQController.tsx for the full
// rationale). The controller therefore needs NO CSS import.

/**
 * `<TabsController>` — the ARIA-tabs interactivity island for a `<Tabs>`
 * whose structure (a `<div role="tablist">` of native `<button
 * role="tab">` triggers + sibling `<div role="tabpanel">` bodies) is
 * emitted as STATIC HTML by `sophieCompoundExpandRemarkPlugin` at
 * MDX-compile time (Task 6). This island renders NOTHING visible and
 * has NO authored children — it is a thin behavior layer over the
 * static buttons + panels, which is what lets panel bodies host their
 * own hydrating islands (a `<GlossaryTerm>` inside a tab body hydrates
 * as a normal page island).
 *
 * **No persistence.** Tabs is chrome (NOT a formative parent): selection
 * is ephemeral view state that resets per page load. There is no
 * `course`/`unit`/`id` namespace because there is nothing to store.
 *
 * **Wired keyboard pattern (WAI-ARIA tabs — automatic activation):**
 *   - Click on a tab → make it active (selection + focus).
 *   - ArrowLeft / ArrowRight → cycle through tabs with roving focus and
 *     automatic activation (selection follows focus, the simpler of the
 *     two ARIA tabs variants). Wraps at both ends.
 *   - Home / End → jump to first / last tab (selection follows).
 *
 * Initial selection is whatever the transform stamped
 * `aria-selected="true"` on (the `defaultLabel`'s tab, or the first
 * tab); the controller never overrides it on mount, so SSR ↔ post-
 * hydration agree and there is no flash of selected-tab change.
 *
 * Props are typed from `TabsControllerPropsSchema` (ADR 0003 — Zod is
 * the source of truth). The transform validates `id` upstream from the
 * authored `<Tabs>` (or generates a stable `sophie-tabs-${N}` auto-id).
 */
export function TabsController({ id }: TabsControllerProps) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(
      `[data-sophie-tabs][data-tabs-id="${id}"]`
    );
    if (!root) return;
    const tabs = Array.from(
      root.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    );
    if (tabs.length === 0) return;
    const panels = new Map<string, HTMLElement>();
    for (const tab of tabs) {
      const controlsId = tab.getAttribute("aria-controls");
      if (!controlsId) continue;
      const panel = root.querySelector<HTMLElement>(
        `#${CSS.escape(controlsId)}`
      );
      if (panel) panels.set(tab.id, panel);
    }

    /**
     * Activate the tab at `nextIndex`: set ARIA + tabindex on every tab,
     * toggle `hidden` on every panel, and (when `withFocus`) move
     * keyboard focus to the newly active tab. `withFocus` separates
     * click-activation (focus stays where the pointer fired) from
     * keyboard activation (focus must follow selection for the roving-
     * focus pattern).
     */
    const activate = (nextIndex: number, withFocus: boolean): void => {
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        if (!tab) continue;
        const isActive = i === nextIndex;
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
        tab.setAttribute("tabindex", isActive ? "0" : "-1");
        const panel = panels.get(tab.id);
        if (panel) {
          if (isActive) panel.removeAttribute("hidden");
          else panel.setAttribute("hidden", "");
        }
      }
      const target = tabs[nextIndex];
      if (withFocus && target) target.focus();
    };

    const handlers: Array<{
      el: HTMLButtonElement;
      click: (e: MouseEvent) => void;
      key: (e: KeyboardEvent) => void;
    }> = [];

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      if (!tab) continue;
      const click = (_e: MouseEvent): void => {
        activate(i, false);
      };
      const key = (e: KeyboardEvent): void => {
        let next = -1;
        if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft")
          next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = tabs.length - 1;
        if (next === -1) return;
        e.preventDefault();
        activate(next, true);
      };
      tab.addEventListener("click", click);
      tab.addEventListener("keydown", key);
      handlers.push({ el: tab, click, key });
    }

    // Hydration signal: marks the tab group interactive once listeners are
    // wired. Lets tests wait on a real state change (condition-based, not a
    // timeout) before driving the controls, and gives CSS/UX a hook to know
    // the controller is live.
    root.setAttribute("data-hydrated", "true");

    return () => {
      for (const h of handlers) {
        h.el.removeEventListener("click", h.click);
        h.el.removeEventListener("keydown", h.key);
      }
      root.removeAttribute("data-hydrated");
    };
  }, [id]);

  return null;
}
