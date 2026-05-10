export type {
  BroadcastChannelLayer,
  BroadcastMessage,
} from "./BroadcastChannel.ts";
export { createBroadcastChannel } from "./BroadcastChannel.ts";
export { IndexedDBResponseStore } from "./IndexedDBResponseStore.ts";
export type { Profile } from "./ProfileContext.tsx";
export { ProfileProvider, useProfile } from "./ProfileContext.tsx";
export {
  chapterKeyRange,
  compositeKey,
  type ResponseStore,
} from "./ResponseStore.ts";
export type { SyncedResponseStore } from "./SyncedResponseStore.ts";
export type {
  InteractiveStatus,
  UseInteractiveResult,
} from "./useInteractive.ts";
export { useInteractive } from "./useInteractive.ts";

/** FigureRegistry shape used by <Figure registry={...}> and consumers. */
export interface FigureEntry {
  name: string;
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
}
export type FigureRegistry = Record<string, FigureEntry>;
