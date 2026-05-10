import { Callout } from "@sophie/components/Callout";
import { Figure } from "@sophie/components/Figure";

/**
 * @internal — hardcoded MDX component map injected by
 * `defineSophieIntegration()`. Per ADR 0023, the extension API
 * (consumers adding their own components) stays `@internal` until
 * Phase 1.
 */
export const sophieMdxComponents = {
  Callout,
  Figure,
} as const;
