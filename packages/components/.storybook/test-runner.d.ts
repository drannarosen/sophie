/**
 * TypeScript module augmentation for the Storybook test-runner's
 * Jest-based `expect`.
 *
 * `@storybook/test-runner` v0.24.x runs assertions inside Jest workers,
 * so `expect.extend(...)` in `test-runner-setup.ts` augments Jest's
 * global `expect`. `@types/jest-image-snapshot` already declares the
 * matcher on `jest.Matchers` via `declare global { namespace jest { ... } }`,
 * but it depends on `@types/jest` being resolvable. The triple-slash
 * directive below makes that dependency explicit so this file's typing
 * survives any reshuffle of pnpm's hoist behavior.
 *
 * See ADR 0057 (Visual-regression baseline) for context.
 */

/// <reference types="jest" />
/// <reference types="jest-image-snapshot" />

export {};
