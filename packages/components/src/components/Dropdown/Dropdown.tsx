import * as Accordion from "@radix-ui/react-accordion";
import { Children, isValidElement, type ReactNode } from "react";
import { HydrationAnnouncer } from "../../runtime/HydrationAnnouncer.tsx";
import { useInteractive } from "../../runtime/useInteractive.ts";
import styles from "./Dropdown.module.css.js";
import type { DropdownItemProps, DropdownProps } from "./Dropdown.schema.ts";

/**
 * Slugify a label into the Radix Accordion item `value`. Matches
 * `<Tabs>`'s slug rule so the two chrome primitives share authoring
 * intuition.
 */
function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Compound child — only meaningful inside `<Dropdown>`. The render
 * itself returns `null`; the parent walks children and emits the Radix
 * Item/Header/Trigger/Content quad inline. Authoring surface stays
 * `<Dropdown.Item label="…">body</Dropdown.Item>`.
 */
function DropdownItem(_props: DropdownItemProps): null {
  return null;
}
DropdownItem.displayName = "Dropdown.Item";

interface NormalizedItem {
  slug: string;
  label: string;
  body: ReactNode;
}

function normalizeItems(
  children: ReactNode,
  shorthandLabel: string | undefined
): NormalizedItem[] {
  // Single-item shorthand: collapse the entire `children` payload into
  // one synthetic item. Authors cannot mix shorthand with
  // <Dropdown.Item> children — throw to make the error loud.
  if (shorthandLabel !== undefined) {
    for (const child of Children.toArray(children)) {
      if (isValidElement(child) && child.type === DropdownItem) {
        throw new Error(
          "<Dropdown> cannot mix the `label` shorthand with <Dropdown.Item> children. Use one form or the other."
        );
      }
    }
    return [
      { slug: slugify(shorthandLabel), label: shorthandLabel, body: children },
    ];
  }

  const items: NormalizedItem[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    if (child.type !== DropdownItem) continue;
    const { label, children: body } = child.props as DropdownItemProps;
    items.push({ slug: slugify(label), label, body });
  }
  return items;
}

function DropdownBase({
  course,
  unit,
  id,
  label,
  defaultOpen,
  allowMultiple = false,
  children,
}: DropdownProps) {
  const items = normalizeItems(children, label);

  // Duplicate-slug check — same loud-feedback contract as <Tabs>.
  const seen = new Set<string>();
  for (const { slug, label: itemLabel } of items) {
    if (seen.has(slug)) {
      throw new Error(
        `<Dropdown> duplicate item slug "${slug}" (derived from label "${itemLabel}"). Two items cannot slugify to the same value.`
      );
    }
    seen.add(slug);
  }

  const {
    value: openSlugs,
    setValue: setOpenSlugs,
    hydrated,
    controlProps,
  } = useInteractive<string[]>(
    course,
    unit,
    `dropdown:${id}:open`,
    defaultOpen ?? []
  );

  // Radix Accordion has two type-disjoint shapes: type="single" takes
  // value: string, type="multiple" takes value: string[]. Our state
  // storage is always `string[]` so single-mode marshals through the
  // first element of the array.
  //
  // The `sophie-dropdown` global class is the print-mode contract hook
  // — `packages/astro/src/styles/textbook-layout.css:1532` force-expands
  // any element under `.sophie-dropdown [data-state]` so handouts print
  // open. Must be on BOTH branches; the single-mode form is the most
  // common author shape and was silently dropping the class pre-R+CR C1.
  const rootClassName = `${styles.root} sophie-dropdown`;
  if (allowMultiple) {
    return (
      <Accordion.Root
        type='multiple'
        value={openSlugs}
        onValueChange={(next) => setOpenSlugs(next)}
        className={rootClassName}
      >
        {items.map(({ slug, label: itemLabel, body }) => (
          <Accordion.Item key={slug} value={slug} className={styles.item}>
            <Accordion.Header className={styles.header}>
              <Accordion.Trigger {...controlProps} className={styles.trigger}>
                <span className={styles.chevron} aria-hidden='true' />
                <span className={styles.label}>{itemLabel}</span>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className={styles.content}>
              {body}
            </Accordion.Content>
          </Accordion.Item>
        ))}
        <HydrationAnnouncer
          hydrated={hydrated}
          label={`${id} dropdown ready`}
        />
      </Accordion.Root>
    );
  }

  return (
    <Accordion.Root
      type='single'
      collapsible
      value={openSlugs[0] ?? ""}
      onValueChange={(next) => setOpenSlugs(next ? [next] : [])}
      className={rootClassName}
    >
      {items.map(({ slug, label: itemLabel, body }) => (
        <Accordion.Item key={slug} value={slug} className={styles.item}>
          <Accordion.Header className={styles.header}>
            <Accordion.Trigger {...controlProps} className={styles.trigger}>
              <span className={styles.chevron} aria-hidden='true' />
              <span className={styles.label}>{itemLabel}</span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className={styles.content}>
            {body}
          </Accordion.Content>
        </Accordion.Item>
      ))}
      <HydrationAnnouncer hydrated={hydrated} label={`${id} dropdown ready`} />
    </Accordion.Root>
  );
}

/**
 * Compound component export — `Dropdown.Item` is matched by component
 * identity in the parent's child walker.
 */
export const Dropdown = Object.assign(DropdownBase, {
  Item: DropdownItem,
});
