import { Transform } from "node:stream";
import pc from "picocolors";

type Label = "astro" | "components" | "theme";

const COLOR: Record<Label, (s: string) => string> = {
  astro: pc.blue,
  components: pc.green,
  theme: pc.magenta,
};

/**
 * Transform stream that prepends a colored `[label]` prefix to each
 * line of input. Lines spanning chunks are buffered until the newline
 * arrives; a trailing partial line without newline is emitted as-is
 * with one prefix (preserves spinner-style updates from child tools).
 */
export function prefixStream(label: Label): Transform {
  const tag = `${COLOR[label](`[${label}]`)} `;
  let buffer = "";
  let lineStarted = false;

  return new Transform({
    transform(chunk: Buffer, _enc, callback) {
      buffer += chunk.toString();
      let out = "";
      let idx = buffer.indexOf("\n");
      while (idx !== -1) {
        const line = buffer.slice(0, idx);
        out += `${lineStarted ? "" : tag}${line}\n`;
        buffer = buffer.slice(idx + 1);
        lineStarted = false;
        idx = buffer.indexOf("\n");
      }
      if (buffer.length > 0 && !lineStarted) {
        out += `${tag}${buffer}`;
        buffer = "";
        lineStarted = true;
      }
      callback(null, out);
    },
    flush(callback) {
      if (buffer.length > 0) {
        callback(null, lineStarted ? buffer : `${tag}${buffer}`);
      } else {
        callback();
      }
    },
  });
}
