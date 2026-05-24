import * as RadixTabs from "@radix-ui/react-tabs";
import { Children, isValidElement, type ReactNode } from "react";
import styles from "./Tabs.module.css.js";
import type { TabProps, TabsProps } from "./Tabs.schema.ts";

/**
 * Convert a tab label into a Radix `value` identity. Lowercases,
 * replaces non-alphanumeric runs with `-`, and trims leading/trailing
 * `-`. Pure — the same label always maps to the same slug, so the
 * mapping is stable across renders.
 */
function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Compound child — only meaningful inside `<Tabs>`. The render function
 * itself returns `null`; `<Tabs>` walks its children, reads each
 * `<Tab>`'s props directly, and emits Radix `Trigger` + `Content`
 * pairs. This keeps the author surface clean (`<Tab label="…">body</Tab>`)
 * without exposing Radix's internal Trigger/Content split.
 */
export function Tab(_props: TabProps): null {
  return null;
}
Tab.displayName = "Tab";

export function Tabs({ defaultLabel, id, className, children }: TabsProps) {
  // Walk children once; pull props off each <Tab>. Anything that isn't
  // a <Tab> is silently dropped (chrome primitive — author error
  // surfaces via the empty render).
  const tabs: { slug: string; label: string; body: ReactNode }[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    if (child.type !== Tab) continue;
    const { label, children: body } = child.props as TabProps;
    tabs.push({ slug: slugify(label), label, body: body as ReactNode });
  }

  // Collision detection — duplicate slugs would silently break Radix's
  // value-based selection. Throw at render so authors hit the error
  // immediately during dev rather than in production (Q1 lock).
  const seen = new Set<string>();
  for (const { slug, label } of tabs) {
    if (seen.has(slug)) {
      throw new Error(
        `<Tabs> duplicate tab slug "${slug}" (derived from label "${label}"). Two tabs cannot slugify to the same value.`
      );
    }
    seen.add(slug);
  }

  // When defaultLabel is omitted, default to the first tab's slug —
  // Radix Tabs is fully uncontrolled here and won't auto-select a tab
  // without an explicit defaultValue (mounting state is "no panel
  // open", which leaves the trigger bar nameless to screen readers).
  const defaultValue =
    defaultLabel !== undefined ? slugify(defaultLabel) : tabs[0]?.slug;
  const rootClassName = [styles.root, className].filter(Boolean).join(" ");

  return (
    <RadixTabs.Root
      defaultValue={defaultValue}
      className={rootClassName}
      {...(id !== undefined ? { id } : {})}
    >
      <RadixTabs.List className={styles.list}>
        {tabs.map(({ slug, label }) => (
          <RadixTabs.Trigger key={slug} value={slug} className={styles.trigger}>
            {label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {tabs.map(({ slug, body }) => (
        <RadixTabs.Content key={slug} value={slug} className={styles.content}>
          {body}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
