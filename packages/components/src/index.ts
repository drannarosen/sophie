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
export type { CollapsibleCardProps } from "./components/CollapsibleCard/index.ts";
export {
  CollapsibleCard,
  CollapsibleCardPropsSchema,
  collapsibleCardContract,
} from "./components/CollapsibleCard/index.ts";
export type {
  ComprehensionGateProps,
  ComprehensionLevel,
} from "./components/ComprehensionGate/index.ts";
export {
  ComprehensionGate,
  ComprehensionGatePropsSchema,
  comprehensionGateContract,
} from "./components/ComprehensionGate/index.ts";
export type {
  ConfidenceCheckProps,
  ConfidenceScale,
} from "./components/ConfidenceCheck/index.ts";
export {
  ConfidenceCheck,
  ConfidenceCheckPropsSchema,
  confidenceCheckContract,
} from "./components/ConfidenceCheck/index.ts";
export type {
  EffortLevel,
  EffortLogProps,
} from "./components/EffortLog/index.ts";
export {
  EffortLog,
  EffortLogPropsSchema,
  effortLogContract,
} from "./components/EffortLog/index.ts";
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
export type { KeyEquationProps } from "./components/KeyEquation/index.ts";
export {
  KeyEquation,
  KeyEquationPropsSchema,
  keyEquationContract,
} from "./components/KeyEquation/index.ts";
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
  GlossaryTerm,
  MiniGlossaryProps,
} from "./components/MiniGlossary/index.ts";
export {
  GlossaryTermSchema,
  MiniGlossary,
  MiniGlossaryPropsSchema,
  miniGlossaryContract,
} from "./components/MiniGlossary/index.ts";
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
export type { ReflectionProps } from "./components/Reflection/index.ts";
export {
  Reflection,
  ReflectionPropsSchema,
  reflectionContract,
} from "./components/Reflection/index.ts";

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
  SelfAssessmentWidget,
  SyncedResponseStore,
  UseInteractiveResult,
} from "./runtime/index.ts";
export {
  IndexedDBResponseStore,
  ProfileProvider,
  useInteractive,
  useProfile,
  useSelfAssessment,
} from "./runtime/index.ts";
