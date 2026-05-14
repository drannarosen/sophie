// Components

export type { AsideProps } from "./components/Aside/Aside.schema.ts";
export {
  Aside,
  AsideKind,
  AsidePropsSchema,
  asideContract,
} from "./components/Aside/index.ts";
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
export type { EqRefProps } from "./components/EqRef/EqRef.schema.ts";
// Internal-use setters: @sophie/astro's <TextbookLayout> calls these
// to hydrate the pedagogy index (definitions, equations, ...) from
// `virtual:sophie/pedagogy-index` at render time. Not part of the
// public authoring API; underscore-prefix flags internal-use.
export { __setEquations } from "./components/EqRef/equations-store.ts";
export {
  EqRef,
  EqRefPropsSchema,
  eqRefContract,
} from "./components/EqRef/index.ts";
export type { FigureProps } from "./components/Figure/Figure.schema.ts";
export {
  Figure,
  FigurePropsSchema,
  figureInlineContract,
  figureRegistryContract,
} from "./components/Figure/index.ts";
export type { FigureRefProps } from "./components/FigureRef/FigureRef.schema.ts";
// Internal-use setters: @sophie/astro's <TextbookLayout> calls these
// to hydrate the two-tier figure stores (registry + usages) from
// `virtual:sophie/pedagogy-index` (usages) and the consumer-owned
// figure-registry prop (registry) at render time. Not part of the
// public authoring API; underscore-prefix flags internal-use.
export { __setFigureRegistry } from "./components/FigureRef/figure-registry-store.ts";
export { __setFigureUsages } from "./components/FigureRef/figure-usages-store.ts";
export {
  FigureRef,
  FigureRefPropsSchema,
  figureRefContract,
} from "./components/FigureRef/index.ts";
export { __setGlossaryDefinitions } from "./components/GlossaryTerm/definitions-store.ts";
export type { GlossaryTermProps } from "./components/GlossaryTerm/index.ts";
export {
  GlossaryTerm,
  GlossaryTermPropsSchema,
  glossaryTermContract,
} from "./components/GlossaryTerm/index.ts";
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
  FigureRegistry,
  FigureRegistryEntry,
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
