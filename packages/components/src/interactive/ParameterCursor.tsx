import { type ReactElement, useLayoutEffect, useRef } from "react";
import {
  type ParameterCursorProps,
  ParameterCursorPropsSchema,
} from "./ParameterCursor.schema.ts";
import { useParameterStore } from "./store.ts";

const SECTION_TAGS = new Set(["SECTION", "ARTICLE", "MAIN", "DETAILS"]);

function resolveSectionScope(node: Element | null): string | null {
  let cursor: Element | null = node?.parentElement ?? null;
  while (cursor) {
    if (SECTION_TAGS.has(cursor.tagName) && cursor.id) {
      return cursor.id;
    }
    cursor = cursor.parentElement;
  }
  return null;
}

function buildKey(
  rawName: string,
  scope: "section" | "page" | undefined,
  cursorGroup: string | undefined,
  anchor: string | null
): string {
  if (cursorGroup) return `group:${cursorGroup}:${rawName}`;
  if (scope === "page") return rawName;
  if (anchor) return `${anchor}:${rawName}`;
  return rawName;
}

/**
 * Declarative cursor definition. Renders a hidden marker span so the
 * effect can resolve section scope by walking the DOM ancestors;
 * `hidden` + `aria-hidden` keep it out of the layout and a11y tree
 * (per `<KeyEquation>` precedent for invisible mount markers).
 *
 * On mount, registers the cursor with the page-local parameter store
 * (per ADR 0059). Per ADR 0058, `<ParameterCursor>` is chrome — it
 * carries no epistemic role. Subscribers (anything calling
 * `useLinkedParameter(name)`) declare their own roles.
 */
export function ParameterCursor(rawProps: ParameterCursorProps): ReactElement {
  const parsed = ParameterCursorPropsSchema.parse(rawProps);
  const {
    name,
    min,
    max,
    default: defaultValue,
    unit,
    step,
    scope,
    cursorGroup,
  } = parsed;
  const markerRef = useRef<HTMLSpanElement | null>(null);
  const register = useParameterStore((s) => s.register);
  const unregister = useParameterStore((s) => s.unregister);

  useLayoutEffect(() => {
    const anchor = resolveSectionScope(markerRef.current);
    const key = buildKey(name, scope, cursorGroup, anchor);
    register({
      name: key,
      min,
      max,
      default: defaultValue,
      unit,
      step,
    });
    return () => unregister(key);
  }, [
    name,
    min,
    max,
    defaultValue,
    unit,
    step,
    scope,
    cursorGroup,
    register,
    unregister,
  ]);

  return (
    <span ref={markerRef} hidden aria-hidden='true' data-sophie-cursor={name} />
  );
}
