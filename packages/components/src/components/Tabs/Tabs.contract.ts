import type { ComponentContract } from "../../contract/types.ts";
import { type TabsProps, TabsPropsSchema } from "./Tabs.schema.ts";
import { Tabs } from "./Tabs.tsx";

export const tabsContract: ComponentContract<TabsProps> = {
  Component: Tabs,
  schema: TabsPropsSchema,
  serialize: (props) => ({
    type: "tabs",
    props,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
