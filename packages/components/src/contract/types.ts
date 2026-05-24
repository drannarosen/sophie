import type { FC } from "react";
import type { z } from "zod";

export interface SerializedNode<TProps = unknown, TState = unknown> {
  type: string;
  props: TProps;
  state?: TState;
}

/**
 * Per-component contract self-audit return type. Distinct from
 * `@sophie/core/schema`'s `AuditFinding` (the pipeline-level finding
 * shape with `code` + `location`): this is the minimal `{ severity,
 * message }` pair a component's `audit?` hook returns. Renamed
 * post-W4c PR 4 (M5) from `AuditFinding` to `ComponentAuditFinding`
 * to resolve the R9-production naming collision — the two types
 * happened to share a name but represent different scopes (per-
 * component contract audit vs. pipeline-level audit-report finding).
 */
export interface ComponentAuditFinding {
  severity: "error" | "warning";
  message: string;
}

export interface ComponentContract<TProps, TState = void> {
  Component: FC<TProps>;
  schema: z.ZodType<TProps>;
  serialize: (props: TProps, state?: TState) => SerializedNode<TProps, TState>;
  audit?: (props: TProps) => ComponentAuditFinding[];
  containedIn?: string[];
  forbidsContaining?: string[];
}
