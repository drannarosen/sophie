import type { FC } from "react";
import type { z } from "zod";

export interface SerializedNode<TProps = unknown, TState = unknown> {
  type: string;
  props: TProps;
  state?: TState;
}

export interface AuditFinding {
  severity: "error" | "warning";
  message: string;
}

export interface ComponentContract<TProps, TState = void> {
  Component: FC<TProps>;
  schema: z.ZodType<TProps>;
  serialize: (props: TProps, state?: TState) => SerializedNode<TProps, TState>;
  audit?: (props: TProps) => AuditFinding[];
  containedIn?: string[];
  forbidsContaining?: string[];
}
