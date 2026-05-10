import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach, beforeEach } from "vitest";
import { __resetRuntimeCaches } from "./src/runtime/useInteractive.ts";

beforeEach(() => {
  __resetRuntimeCaches();
});

afterEach(() => {
  __resetRuntimeCaches();
});
