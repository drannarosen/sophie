import { execa, type ResultPromise } from "execa";
import { prefixStream } from "./prefix-stream.ts";

export interface SpawnSpec {
  astro: { cwd: string; args: string[] };
  componentsWatch: { cwd: string } | null;
  themeWatch: { cwd: string } | null;
}

export interface OrchestratorHandle {
  done: Promise<{ exitCode: number }>;
}

/**
 * Spawn 1-3 children concurrently. `astro` is mandatory; the two watch
 * children are optional (monorepo mode only). Each child's stdout/stderr
 * is prefix-streamed to process.stdout/stderr. SIGINT/SIGTERM received
 * by the parent are forwarded to all children. On any child's non-zero
 * exit, fail-fast: SIGTERM the siblings, resolve `done` with that
 * child's exit code.
 */
export function spawnOrchestrator(spec: SpawnSpec): OrchestratorHandle {
  const children: Array<{
    label: "astro" | "components" | "theme";
    handle: ResultPromise;
  }> = [];

  const astro = execa("astro", spec.astro.args, {
    cwd: spec.astro.cwd,
    reject: false,
  });
  astro.stdout?.pipe(prefixStream("astro")).pipe(process.stdout);
  astro.stderr?.pipe(prefixStream("astro")).pipe(process.stderr);
  children.push({ label: "astro", handle: astro });

  if (spec.componentsWatch) {
    const comp = execa("pnpm", ["exec", "tsup", "--watch"], {
      cwd: spec.componentsWatch.cwd,
      reject: false,
    });
    comp.stdout?.pipe(prefixStream("components")).pipe(process.stdout);
    comp.stderr?.pipe(prefixStream("components")).pipe(process.stderr);
    children.push({ label: "components", handle: comp });
  }

  if (spec.themeWatch) {
    const theme = execa("pnpm", ["exec", "tsup", "--watch"], {
      cwd: spec.themeWatch.cwd,
      reject: false,
    });
    theme.stdout?.pipe(prefixStream("theme")).pipe(process.stdout);
    theme.stderr?.pipe(prefixStream("theme")).pipe(process.stderr);
    children.push({ label: "theme", handle: theme });
  }

  const forwardSignal = (sig: NodeJS.Signals) => () => {
    for (const c of children) c.handle.kill(sig);
  };
  process.on("SIGINT", forwardSignal("SIGINT"));
  process.on("SIGTERM", forwardSignal("SIGTERM"));

  let firstExitCode: number | null = null;
  const watchers = children.map(({ label, handle }) =>
    handle.then((result) => {
      const code = result.exitCode ?? 0;
      if (firstExitCode === null && code !== 0) {
        firstExitCode = code;
        for (const sibling of children) {
          if (sibling.handle !== handle) sibling.handle.kill("SIGTERM");
        }
        process.stderr.write(
          `\n[${label}] exited with code ${code}; terminating siblings.\n`
        );
      }
      return { label, code };
    })
  );

  const done = Promise.all(watchers).then(() => ({
    exitCode: firstExitCode ?? 0,
  }));

  return { done };
}
