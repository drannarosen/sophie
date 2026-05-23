/**
 * Typed wrapper around the browser's BroadcastChannel for cross-tab
 * useInteractive sync. One channel per unit; messages carry the
 * composite key + new value + a senderId so the originating tab can
 * ignore its own broadcast.
 *
 * Per ADR 0029, every message carries the originating write's
 * `Date.now()` timestamp. Receivers compare against their own most-
 * recent observed ts and ignore stale broadcasts (last-write-wins).
 */
export interface BroadcastMessage {
  senderId: string;
  key: string;
  value: unknown;
  ts: number;
}

export interface BroadcastChannelLayer {
  post(message: BroadcastMessage): void;
  subscribe(handler: (message: BroadcastMessage) => void): () => void;
  close(): void;
}

const noop = () => {};

class BrowserBroadcast implements BroadcastChannelLayer {
  private channel: BroadcastChannel;
  private handlers = new Set<(message: BroadcastMessage) => void>();

  constructor(name: string) {
    this.channel = new BroadcastChannel(name);
    this.channel.onmessage = (event) => {
      const message = event.data as BroadcastMessage;
      for (const handler of this.handlers) handler(message);
    };
  }

  post(message: BroadcastMessage): void {
    // Fire same-tab subscribers synchronously so sibling hooks observing
    // the same channel (e.g., `useInteractiveRange` aggregating writes
    // committed by `useInteractive` in the same tab) update immediately.
    // The browser `BroadcastChannel` API does NOT echo a tab's own
    // `postMessage` back to its `onmessage` listener; without this
    // local fan-out, same-tab cross-hook sync would silently fail.
    // The `senderId` guard in subscribers prevents the originating
    // hook from acting on its own message. Cross-tab delivery is
    // unchanged — `postMessage` still posts to the channel.
    for (const handler of this.handlers) handler(message);
    this.channel.postMessage(message);
  }

  subscribe(handler: (message: BroadcastMessage) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  close(): void {
    this.handlers.clear();
    this.channel.close();
  }
}

class NoopBroadcast implements BroadcastChannelLayer {
  post(): void {}
  subscribe(): () => void {
    return noop;
  }
  close(): void {}
}

export function createBroadcastChannel(name: string): BroadcastChannelLayer {
  if (typeof BroadcastChannel === "undefined") return new NoopBroadcast();
  return new BrowserBroadcast(name);
}

export function chapterChannelName(course: string, unit: string): string {
  return `sophie-${course}:${unit}`;
}
