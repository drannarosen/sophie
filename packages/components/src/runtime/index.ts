// Canonical asset-data shape lives in @sophie/core/schema
// (per ADR 0001 + PR-C3 decision #11).
export type { FigureRegistryEntry } from "@sophie/core/schema";
export type {
  BroadcastChannelLayer,
  BroadcastMessage,
} from "./BroadcastChannel.ts";
export { createBroadcastChannel } from "./BroadcastChannel.ts";
export { IndexedDBResponseStore } from "./IndexedDBResponseStore.ts";
export { MathText } from "./MathText.tsx";
export type { Profile } from "./ProfileContext.tsx";
export { ProfileProvider, useProfile } from "./ProfileContext.tsx";
export {
  chapterKeyRange,
  compositeKey,
  type ResponseStore,
} from "./ResponseStore.ts";
export { renderTextWithMath } from "./render-text-with-math.ts";
export type { SyncedResponseStore } from "./SyncedResponseStore.ts";
export { useHydrated } from "./useHydrated.ts";
export type {
  InteractiveControlProps,
  InteractiveStatus,
  UseInteractiveResult,
} from "./useInteractive.ts";
export { useInteractive } from "./useInteractive.ts";
export type { SelfAssessmentWidget } from "./useSelfAssessment.ts";
export { useSelfAssessment } from "./useSelfAssessment.ts";

/** FigureRegistry shape used by <Figure registry={...}> and consumers. */
export type FigureRegistry = Record<
  string,
  import("@sophie/core/schema").FigureRegistryEntry
>;
