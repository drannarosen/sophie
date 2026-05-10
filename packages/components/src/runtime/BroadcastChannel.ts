/**
 * Typed wrapper around the browser's BroadcastChannel for cross-tab
 * useInteractive sync. One channel per chapter; messages carry the
 * composite key + new value + a senderId so the originating tab can
 * ignore its own broadcast.
 */
export interface BroadcastMessage {
  senderId: string;
  key: string;
  value: unknown;
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

export function chapterChannelName(course: string, chapter: string): string {
  return `sophie-${course}:${chapter}`;
}
