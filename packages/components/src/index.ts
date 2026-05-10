// Components

export type {
  CalloutProps,
  CalloutVariant,
} from "./components/Callout/Callout.schema.ts";
export { Callout, calloutContract } from "./components/Callout/index.ts";
export type { FigureProps } from "./components/Figure/Figure.schema.ts";
export { Figure, figureContract } from "./components/Figure/index.ts";

// Contract
export type {
  AuditFinding,
  ComponentContract,
  SerializedNode,
} from "./contract/index.ts";
export {
  getRegistered,
  listRegistered,
  registerComponent,
} from "./contract/index.ts";
export type {
  BroadcastChannelLayer,
  BroadcastMessage,
  FigureEntry,
  FigureRegistry,
  InteractiveStatus,
  Profile,
  ResponseStore,
  SophieConfig,
  SyncedResponseStore,
  UseInteractiveResult,
} from "./runtime/index.ts";
// Runtime — public surface re-exported from runtime/index.ts
export {
  FigureRegistryProvider,
  IndexedDBResponseStore,
  ProfileProvider,
  SophieConfigProvider,
  useFigureRegistry,
  useInteractive,
  useProfile,
  useSophieConfig,
} from "./runtime/index.ts";
