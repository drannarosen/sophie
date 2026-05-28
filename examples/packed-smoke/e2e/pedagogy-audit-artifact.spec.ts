import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/**
 * ADR 0088 integration proof. The prod build's `astro:build:done` hook runs
 * the corpus-wide pedagogy audit and emits a deterministic
 * `dist/.sophie/pedagogy-audit.json`. This asserts it lands in a real
 * packed-tarball consumer — workspace smoke can't, since pnpm resolves
 * `@sophie/astro` to source and the artifact is a build-output contract.
 *
 * Filesystem assertion on the built dist (no browser): the build runs before
 * `pnpm test:e2e` (sync → build → test:e2e), so the artifact exists by now.
 */
test("prod build emits dist/.sophie/pedagogy-audit.json with the versioned envelope", () => {
  const artifactPath = fileURLToPath(
    new URL("../dist/.sophie/pedagogy-audit.json", import.meta.url)
  );
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));

  expect(artifact.artifact_version).toBe("0.1");
  expect(artifact.summary).toMatchObject({
    errors: expect.any(Number),
    warnings: expect.any(Number),
    infos: expect.any(Number),
  });
  expect(Array.isArray(artifact.errors)).toBe(true);
  expect(Array.isArray(artifact.warnings)).toBe(true);
  expect(Array.isArray(artifact.infos)).toBe(true);

  // Envelope integrity: summary counts match the arrays.
  expect(artifact.summary.errors).toBe(artifact.errors.length);
  expect(artifact.summary.warnings).toBe(artifact.warnings.length);
  expect(artifact.summary.infos).toBe(artifact.infos.length);

  // The packed-smoke fixture is clean — a non-zero error count would have
  // failed the build (the gate throws), so this build's artifact is 0 errors.
  expect(artifact.summary.errors).toBe(0);
});
