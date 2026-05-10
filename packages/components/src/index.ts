// Components

export type {
  CalloutProps,
  CalloutVariant,
  InteractiveCalloutProps,
} from "./components/Callout/Callout.schema.ts";
export {
  Callout,
  CalloutPropsSchema,
  calloutContract,
  InteractiveCallout,
  InteractiveCalloutPropsSchema,
  interactiveCalloutContract,
} from "./components/Callout/index.ts";
export type { FigureProps } from "./components/Figure/Figure.schema.ts";
export {
  Figure,
  FigurePropsSchema,
  figureInlineContract,
  figureRegistryContract,
} from "./components/Figure/index.ts";
export type { InteractiveCheckboxProps } from "./components/InteractiveCheckbox/InteractiveCheckbox.schema.ts";
export {
  InteractiveCheckbox,
  InteractiveCheckboxPropsSchema,
  interactiveCheckboxContract,
} from "./components/InteractiveCheckbox/index.ts";
export type {
  LearningObjectivesProps,
  LearningObjectivesState,
  Objective,
} from "./components/LearningObjectives/index.ts";
export {
  LearningObjectives,
  LearningObjectivesPropsSchema,
  learningObjectivesContract,
  ObjectiveSchema,
} from "./components/LearningObjectives/index.ts";
export type {
  PredictPrompt,
  PredictProps,
  PredictState,
} from "./components/Predict/index.ts";
export {
  Predict,
  PredictPromptSchema,
  PredictPropsSchema,
  predictContract,
} from "./components/Predict/index.ts";

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

// Runtime — public surface re-exported from runtime/index.ts
export type {
  BroadcastChannelLayer,
  BroadcastMessage,
  FigureEntry,
  FigureRegistry,
  InteractiveControlProps,
  InteractiveStatus,
  Profile,
  ResponseStore,
  SyncedResponseStore,
  UseInteractiveResult,
} from "./runtime/index.ts";
export {
  IndexedDBResponseStore,
  ProfileProvider,
  useInteractive,
  useProfile,
} from "./runtime/index.ts";
