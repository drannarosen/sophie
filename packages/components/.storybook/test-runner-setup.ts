/**
 * Storybook test-runner setup hook.
 *
 * Extends Jest's global `expect` with `toMatchImageSnapshot` from
 * `jest-image-snapshot` so that visual-regression assertions in
 * `test-runner.ts` resolve at runtime.
 *
 * `@storybook/test-runner` v0.24.x runs each story's `postVisit` hook
 * inside a Jest worker (see its `dependencies` block in
 * `node_modules/@storybook/test-runner/package.json` — `jest@^30`),
 * which means `expect` is globally available without import.
 *
 * Per ADR 0057, this matcher is the regression-gate primitive for
 * Workstream 3 visual polish. The TypeScript module augmentation
 * lives alongside in `test-runner.d.ts`.
 */
import { toMatchImageSnapshot } from "jest-image-snapshot";

expect.extend({ toMatchImageSnapshot });
