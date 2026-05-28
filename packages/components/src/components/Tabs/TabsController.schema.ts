import { z } from "zod";

/**
 * Props for `<TabsController>` — the childless ARIA-tabs controller
 * island that `sophieCompoundExpandRemarkPlugin` emits when it lowers an
 * authored `<Tabs><Tab label="…">body</Tab>…</Tabs>` into static ARIA-
 * tabs markup (Task 6 of the compound-island transform).
 *
 * Tabs is CHROME, not pedagogy: NO `course` / `unit` namespace, NO
 * persistence (selection is ephemeral and resets per page load). The
 * controller scopes to its own `<div data-sophie-tabs
 * data-tabs-id="${id}">` and wires the standard WAI-ARIA tabs pattern
 * (automatic activation: Arrow keys roll focus + selection across tabs;
 * Home/End jump to first/last; click activates).
 *
 * `id` is non-empty (ADR 0003 — Zod is the source of truth). When the
 * author omits `id` on `<Tabs>`, the transform assigns
 * `sophie-tabs-${N}` (N = 1-indexed document order). Either way the
 * controller receives a real string and uses it as the
 * `[data-tabs-id]` scope.
 */
export const TabsControllerPropsSchema = z.object({
  id: z.string().min(1),
});

export type TabsControllerProps = z.infer<typeof TabsControllerPropsSchema>;
